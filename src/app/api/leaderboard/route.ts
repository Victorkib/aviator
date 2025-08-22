import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all_time';
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '50'),
      100
    );

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'all_time'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid period. Must be one of: daily, weekly, monthly, all_time',
        },
        { status: 400 }
      );
    }

    // Try cache first
    const cacheKey = `${period}_${limit}`;
    const cachedLeaderboard = await CacheManager.getLeaderboard(cacheKey);
    if (cachedLeaderboard) {
      return NextResponse.json({
        success: true,
        data: cachedLeaderboard,
        period,
        cached: true,
      });
    }

    const supabase = getSupabaseAdmin();

    // Calculate date range based on period
    let dateFilter = '';
    const now = new Date();

    switch (period) {
      case 'daily':
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFilter = `AND b.created_at >= '${today.toISOString()}'`;
        break;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        dateFilter = `AND b.created_at >= '${weekStart.toISOString()}'`;
        break;
      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = `AND b.created_at >= '${monthStart.toISOString()}'`;
        break;
      case 'all_time':
      default:
        dateFilter = '';
        break;
    }

    // Query leaderboard data using direct Supabase queries
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        balance,
        total_wagered,
        total_won,
        games_played
      `)
      .not('username', 'is', null)
      .order('balance', { ascending: false })
      .limit(limit);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to fetch leaderboard data');
    }

    // Get bet statistics for each user
    const leaderboardData = await Promise.all(
      (users || []).map(async (user, index) => {
        // Get user's bet statistics
        const { data: bets } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', user.id);

        const userBets = bets || [];
        const totalBets = userBets.length;
        const totalWagered = userBets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
        const totalWinnings = userBets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
        const netProfit = totalWinnings - totalWagered;
        const winRate = totalBets > 0 ? (userBets.filter(bet => bet.cashed_out && bet.payout > 0).length / totalBets) * 100 : 0;
        const biggestWin = Math.max(...userBets.map(bet => bet.payout || 0), 0);

        return {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          total_bets: totalBets,
          total_winnings: totalWinnings,
          total_wagered: totalWagered,
          net_profit: netProfit,
          win_rate: winRate,
          biggest_win: biggestWin,
          games_played: totalBets,
          rank: index + 1
        };
      })
    );

    // Sort by net profit
    leaderboardData.sort((a, b) => b.net_profit - a.net_profit);

    if (usersError) {
      console.error('Error fetching leaderboard:', usersError);

      // Fallback to simpler query if the complex one fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select(
          `
          id,
          username,
          display_name,
          avatar_url,
          balance
        `
        )
        .not('username', 'is', null)
        .order('balance', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch leaderboard',
          },
          { status: 500 }
        );
      }

      const formattedFallback = (fallbackData || []).map(
        (user: any, index: number) => ({
          rank: index + 1,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
          },
          stats: {
            totalBets: 0,
            totalWinnings: user.balance || 0,
            totalWagered: 0,
            netProfit: user.balance || 0,
            winRate: 0,
          },
        })
      );

      // Cache the fallback result
      await CacheManager.setLeaderboard(cacheKey, formattedFallback);

      return NextResponse.json({
        success: true,
        data: formattedFallback,
        period,
        fallback: true,
      });
    }

    const formattedData = (leaderboardData || []).map(
      (row: any, index: number) => ({
        rank: index + 1,
        user: {
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
        },
        stats: {
          totalBets: Number.parseInt(row.total_bets) || 0,
          totalWinnings: Number.parseFloat(row.total_winnings) || 0,
          totalWagered: Number.parseFloat(row.total_wagered) || 0,
          netProfit: Number.parseFloat(row.net_profit) || 0,
          winRate: Number.parseFloat(row.win_rate) || 0,
        },
      })
    );

    // Cache the result
    await CacheManager.setLeaderboard(cacheKey, formattedData);

    return NextResponse.json({
      success: true,
      data: formattedData,
      period,
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
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
