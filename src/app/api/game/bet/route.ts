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
    const { amount, autoCashout, roundId } = body;

    // Validate input
    if (!amount || amount < 1 || amount > 1000) {
      return NextResponse.json(
        { error: 'Invalid bet amount' },
        { status: 400 }
      );
    }

    if (autoCashout && autoCashout < 1.01) {
      return NextResponse.json(
        { error: 'Auto-cashout must be at least 1.01x' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate bet placement
    const { data: validationData, error: validationError } = await supabase.rpc(
      'validate_bet_placement',
      {
        p_user_id: session.user.id,
        p_round_id: roundId,
        p_amount: amount,
        p_auto_cashout: autoCashout,
      }
    );

    if (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Bet validation failed' },
        { status: 400 }
      );
    }

    // Handle validation result
    const validation =
      validationData && validationData.length > 0 ? validationData[0] : null;
    if (!validation?.is_valid) {
      return NextResponse.json(
        { error: validation?.error_message || 'Bet validation failed' },
        { status: 400 }
      );
    }

    // Start transaction
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        user_id: session.user.id,
        round_id: roundId,
        amount,
        auto_cashout_multiplier: autoCashout,
        cashed_out: false,
        payout: 0,
        profit: -amount,
      })
      .select()
      .single();

    if (betError) {
      console.error('Error creating bet:', betError);
      return NextResponse.json(
        { error: 'Failed to place bet' },
        { status: 500 }
      );
    }

    // Update user balance
    const { error: balanceError } = await supabase.rpc('update_user_balance', {
      p_user_id: session.user.id,
      p_amount: -amount,
      p_transaction_type: 'bet',
      p_description: `Bet for round ${roundId}`,
      p_round_id: roundId,
      p_bet_id: bet.id,
    });

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Rollback bet
      await supabase.from('bets').delete().eq('id', bet.id);
      return NextResponse.json(
        { error: 'Failed to process bet' },
        { status: 500 }
      );
    }

    // Cache bet data
    await CacheManager.setPlayerBet(roundId, session.user.id, {
      id: bet.id,
      amount,
      autoCashout,
      cashedOut: false,
      timestamp: Date.now(),
    });

    // Update round statistics - FIXED: Remove the problematic .raw() usage
    // Get current values first, then update
    const { data: currentRound } = await supabase
      .from('game_rounds')
      .select('total_bets, total_wagered')
      .eq('id', roundId)
      .single();

    if (currentRound) {
      const { error: updateError } = await supabase
        .from('game_rounds')
        .update({
          total_bets: (currentRound.total_bets || 0) + 1,
          total_wagered: (currentRound.total_wagered || 0) + amount,
        })
        .eq('id', roundId);

      if (updateError) {
        console.error('Error updating round stats:', updateError);
        // Don't fail the bet for this, just log it
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: bet.id,
        amount,
        autoCashout,
        roundId,
        createdAt: bet.created_at,
      },
    });
  } catch (error) {
    console.error('Bet API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
