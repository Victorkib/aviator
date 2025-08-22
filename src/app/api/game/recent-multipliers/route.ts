import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '20'),
      50
    );

    // Try cache first
    const cachedMultipliers = await CacheManager.getRecentMultipliers();
    if (cachedMultipliers) {
      return NextResponse.json({
        success: true,
        data: cachedMultipliers.slice(0, limit),
        cached: true,
      });
    }

    const supabase = getSupabaseAdmin();

    // Use the database function to get recent multipliers
    const { data, error } = await supabase.rpc('get_recent_multipliers', {
      p_limit: limit,
    });

    if (error) {
      console.error('Error fetching recent multipliers:', error);

      // Fallback to direct query if function fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('game_rounds')
        .select('round_number, crash_multiplier, created_at')
        .eq('phase', 'crashed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch recent multipliers',
          },
          { status: 500 }
        );
      }

      const formattedFallback = (fallbackData || []).map((round: any) => ({
        roundNumber: round.round_number,
        crashMultiplier: Number.parseFloat(round.crash_multiplier) || 1.0,
        createdAt: round.created_at,
      }));

      // Cache the fallback result
      await CacheManager.setRecentMultipliers(formattedFallback);

      return NextResponse.json({
        success: true,
        data: formattedFallback,
        fallback: true,
      });
    }

    const multipliers = Array.isArray(data) ? data : [data];
    const formattedData = multipliers.map((item: any) => ({
      roundNumber: item.round_number,
      crashMultiplier: Number.parseFloat(item.crash_multiplier) || 1.0,
      createdAt: item.created_at,
    }));

    // Cache the result
    await CacheManager.setRecentMultipliers(formattedData);

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Recent multipliers API error:', error);
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
