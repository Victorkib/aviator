import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { betId, multiplier } = body;

    // Validate input
    if (!betId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bet ID is required',
        },
        { status: 400 }
      );
    }

    if (!multiplier || multiplier < 1.01) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid multiplier',
        },
        { status: 400 }
      );
    }

    console.log('Processing cashout:', {
      userId: session.user.id,
      betId,
      multiplier,
    });

    const supabase = getSupabaseAdmin();

    // Check if we have the process_cashout function, otherwise use direct query
    try {
      const { data: cashoutResult, error: cashoutError } = await supabase.rpc(
        'process_cashout',
        {
          p_user_id: session.user.id,
          p_bet_id: betId,
          p_multiplier: multiplier,
        }
      );

      if (cashoutError) {
        console.error('Cashout function error:', cashoutError);
        throw new Error('Function not available');
      }

      const result = cashoutResult?.[0];
      if (!result?.success) {
        return NextResponse.json(
          {
            success: false,
            error: result?.error_message || 'Cashout failed',
          },
          { status: 400 }
        );
      }

      // Invalidate user balance cache
      await CacheManager.invalidateUserBalance(session.user.id);

      return NextResponse.json({
        success: true,
        data: {
          betId,
          multiplier,
          payout: Number(result.payout),
          profit: Number(result.profit),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (functionError) {
      // Fallback to direct database operations
      console.log('Using fallback cashout logic');

      // Get the bet
      const { data: bet, error: betError } = await supabase
        .from('bets')
        .select('*')
        .eq('id', betId)
        .eq('user_id', session.user.id)
        .eq('cashed_out', false)
        .single();

      if (betError || !bet) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bet not found or already cashed out',
          },
          { status: 404 }
        );
      }

      const payout = bet.amount * multiplier;
      const profit = payout - bet.amount;

      // Update bet status
      const { error: updateError } = await supabase
        .from('bets')
        .update({
          cashed_out: true,
          cashout_multiplier: multiplier,
          payout: payout,
          profit: profit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', betId);

      if (updateError) {
        console.error('Error updating bet:', updateError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to process cashout',
          },
          { status: 500 }
        );
      }

      // Update user balance
      const { error: balanceError } = await supabase.rpc(
        'update_user_balance',
        {
          p_user_id: session.user.id,
          p_amount: payout,
          p_transaction_type: 'cashout',
          p_description: `Cashout at ${multiplier}x`,
          p_round_id: bet.round_id,
          p_bet_id: bet.id,
        }
      );

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        // Note: In production, you'd want to rollback the bet update here
      }

      // Invalidate caches
      await CacheManager.invalidateUserBalance(session.user.id);

      return NextResponse.json({
        success: true,
        data: {
          betId,
          multiplier,
          payout,
          profit,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Cashout API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
