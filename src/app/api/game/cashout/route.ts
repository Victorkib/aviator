import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roundId, multiplier } = body;

    if (!roundId) {
      return NextResponse.json(
        { error: 'Round ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get user's active bet for this round
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('round_id', roundId)
      .eq('cashed_out', false)
      .single();

    if (betError || !bet) {
      return NextResponse.json(
        { error: 'No active bet found' },
        { status: 400 }
      );
    }

    // Check if round is still in flying phase
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 400 });
    }

    const now = new Date();
    const flightStarted = new Date(round.flight_started_at);
    const crashed = round.crashed_at ? new Date(round.crashed_at) : null;

    if (now < flightStarted || (crashed && now >= crashed)) {
      return NextResponse.json(
        { error: 'Cannot cash out at this time' },
        { status: 400 }
      );
    }

    // Calculate current multiplier if not provided
    const timeElapsed = now.getTime() - flightStarted.getTime();
    const currentMultiplier = multiplier || Math.pow(1.0024, timeElapsed / 10);

    // Calculate payout
    const payout = bet.amount * currentMultiplier;
    const profit = payout - bet.amount;

    // Update bet record
    const { error: updateError } = await supabase
      .from('bets')
      .update({
        cashed_out: true,
        cashout_multiplier: currentMultiplier,
        cashout_time_ms: timeElapsed,
        payout,
        profit,
      })
      .eq('id', bet.id);

    if (updateError) {
      console.error('Error updating bet:', updateError);
      return NextResponse.json(
        { error: 'Failed to process cashout' },
        { status: 500 }
      );
    }

    // Credit user balance
    const { error: balanceError } = await supabase.rpc('update_user_balance', {
      p_user_id: session.user.id,
      p_amount: payout,
      p_transaction_type: 'win',
      p_description: `Cashout at ${currentMultiplier.toFixed(2)}x`,
      p_round_id: roundId,
      p_bet_id: bet.id,
    });

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Rollback bet update
      await supabase
        .from('bets')
        .update({
          cashed_out: false,
          cashout_multiplier: null,
          cashout_time_ms: null,
          payout: 0,
          profit: -bet.amount,
        })
        .eq('id', bet.id);
      return NextResponse.json(
        { error: 'Failed to process cashout' },
        { status: 500 }
      );
    }

    // Update cache
    await CacheManager.setPlayerBet(roundId, session.user.id, {
      id: bet.id,
      amount: bet.amount,
      autoCashout: bet.auto_cashout_multiplier,
      cashedOut: true,
      cashoutMultiplier: currentMultiplier,
      payout,
      profit,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      data: {
        multiplier: currentMultiplier,
        payout,
        profit,
        timeElapsed,
      },
    });
  } catch (error) {
    console.error('Cashout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
