import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Use your working database function
    const { data: statsData, error } = await supabase.rpc(
      'get_game_statistics'
    );

    if (error) {
      console.error('Error fetching game statistics:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch game statistics',
        },
        { status: 500 }
      );
    }

    const stats = statsData?.[0];
    if (!stats) {
      return NextResponse.json(
        {
          success: false,
          error: 'No statistics available',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRounds: Number(stats.total_rounds) || 0,
        totalPlayers: Number(stats.total_players) || 0,
        totalWagered: Number(stats.total_wagered) || 0,
        averageMultiplier: Number(stats.average_multiplier) || 0,
        highestMultiplier: Number(stats.highest_multiplier) || 0,
      },
    });
  } catch (error) {
    console.error('Game stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
