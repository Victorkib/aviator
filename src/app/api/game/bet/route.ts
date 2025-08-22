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
        { error: 'Invalid bet amount (1-1000)' },
        { status: 400 }
      );
    }

    if (autoCashout && autoCashout <= 1.0) {
      return NextResponse.json(
        { error: 'Auto-cashout must be greater than 1.0x' },
        { status: 400 }
      );
    }

    if (!roundId) {
      return NextResponse.json(
        { error: 'Round ID is required' },
        { status: 400 }
      );
    }

    console.log('Processing bet:', {
      userId: session.user.id,
      amount,
      autoCashout,
      roundId,
    });

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

    const validation = validationData?.[0];
    if (!validation?.is_valid) {
      return NextResponse.json(
        { error: validation?.error_message || 'Bet validation failed' },
        { status: 400 }
      );
    }

    // Create bet record
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        user_id: session.user.id,
        round_id: roundId,
        amount,
        auto_cashout: autoCashout,
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
    const { data: balanceResult, error: balanceError } = await supabase.rpc(
      'update_user_balance',
      {
        p_user_id: session.user.id,
        p_amount: -amount,
        p_transaction_type: 'bet',
        p_description: `Bet for round ${roundId}`,
        p_round_id: roundId,
        p_bet_id: bet.id,
      }
    );

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Rollback bet
      await supabase.from('bets').delete().eq('id', bet.id);
      return NextResponse.json(
        { error: 'Failed to process bet' },
        { status: 500 }
      );
    }

    const balanceUpdate = balanceResult?.[0];
    if (!balanceUpdate?.success) {
      // Rollback bet
      await supabase.from('bets').delete().eq('id', bet.id);
      return NextResponse.json(
        { error: balanceUpdate?.error_message || 'Failed to process bet' },
        { status: 400 }
      );
    }

    // Invalidate user balance cache
    await CacheManager.invalidateUserBalance(session.user.id);

    console.log('Bet placed successfully:', {
      betId: bet.id,
      newBalance: balanceUpdate.new_balance,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: bet.id,
        amount,
        autoCashout,
        roundId,
        createdAt: bet.created_at,
        newBalance: Number(balanceUpdate.new_balance),
      },
    });
  } catch (error) {
    console.error('Bet API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
