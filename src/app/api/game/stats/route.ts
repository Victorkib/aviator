import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(_request: NextRequest) {
  try {
    // Try to get stats from cache first
    const cachedStats = await CacheManager.getGameStats();
    if (cachedStats) {
      return NextResponse.json({ success: true, data: cachedStats });
    }

    const supabase = getSupabaseAdmin();

    // Get game statistics
    const { data: statsData, error } = await supabase.rpc(
      'get_game_statistics'
    );

    if (error) {
      console.error('Error fetching game stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Handle stats result
    const stats = statsData && statsData.length > 0 ? statsData[0] : null;

    // Get recent multipliers
    const { data: recentData, error: _recentError } = await supabase.rpc(
      'get_recent_multipliers',
      { p_limit: 10 }
    );

    const recentMultipliers =
      recentData?.map(
        (row: { crash_multiplier: number }) => row.crash_multiplier
      ) || [];

    const gameStats = {
      totalRounds: stats?.total_rounds || 0,
      totalPlayers: stats?.total_players || 0,
      totalWagered: stats?.total_wagered || 0,
      averageMultiplier: stats?.average_multiplier || 0,
      highestMultiplier: stats?.highest_multiplier || 0,
      recentMultipliers,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the stats for 5 minutes
    await CacheManager.updateGameStats(gameStats, 300);

    return NextResponse.json({ success: true, data: gameStats });
  } catch (error) {
    console.error('Game stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
