import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '20'),
      100
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get('offset') || '0'),
      0
    );

    // Try to get from cache for first page only
    if (offset === 0) {
      const cachedHistory = await CacheManager.getGameHistory(session.user.id);
      if (cachedHistory) {
        return NextResponse.json({
          success: true,
          data: cachedHistory,
          cached: true,
        });
      }
    }

    const supabase = getSupabaseAdmin();

    // Get user game history using database function
    const { data: history, error: historyError } = await supabase.rpc(
      'get_user_game_history',
      {
        p_user_identifier: session.user.id,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (historyError) {
      console.error('Error fetching user game history:', historyError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch game history',
          details: historyError.message,
        },
        { status: 500 }
      );
    }

    const formattedHistory = (history || []).map((bet: any) => ({
      id: bet.bet_id,
      roundId: bet.round_id,
      roundNumber: bet.round_number,
      amount: Number(bet.amount),
      autoCashout: bet.auto_cashout ? Number(bet.auto_cashout) : null,
      cashedOut: bet.cashed_out,
      cashoutMultiplier: bet.cashout_multiplier
        ? Number(bet.cashout_multiplier)
        : null,
      payout: Number(bet.payout || 0),
      profit: Number(bet.profit || 0),
      crashMultiplier: Number(bet.crash_multiplier),
      createdAt: bet.created_at,
      status: bet.cashed_out ? 'won' : 'lost',
    }));

    // Cache first page only
    if (offset === 0) {
      await CacheManager.setGameHistory(session.user.id, formattedHistory);
    }

    return NextResponse.json({
      success: true,
      data: formattedHistory,
      pagination: {
        limit,
        offset,
        hasMore: formattedHistory.length === limit,
      },
      cached: false,
    });
  } catch (error) {
    console.error('Game history API error:', error);
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
