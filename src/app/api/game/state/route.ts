import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get active round information
    const { data: roundData, error: roundError } = await supabase.rpc(
      'get_active_round'
    );

    if (roundError) {
      console.error('Error fetching active round:', roundError);
      return NextResponse.json(
        { error: 'Failed to fetch game state' },
        { status: 500 }
      );
    }

    // Handle case where no active round exists
    const activeRound = roundData && roundData.length > 0 ? roundData[0] : null;

    // Get user's bet for current round if exists
    let userBet = null;
    if (activeRound?.round_id) {
      const { data: betData } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('round_id', activeRound.round_id)
        .single();

      userBet = betData;
    }

    // Get recent multipliers from cache or database
    let recentMultipliers: number[] = [];
    try {
      const { data: multiplierData } = await supabase.rpc(
        'get_recent_multipliers',
        { p_limit: 10 }
      );
      recentMultipliers =
        multiplierData?.map(
          (row: { crash_multiplier: number }) => row.crash_multiplier
        ) || [];
    } catch (error) {
      console.error('Error fetching recent multipliers:', error);
    }

    // Calculate current multiplier if in flying phase
    let currentMultiplier = 1.0;
    if (activeRound?.phase === 'flying' && activeRound.flight_started_at) {
      const timeElapsed =
        Date.now() - new Date(activeRound.flight_started_at).getTime();
      currentMultiplier = Math.pow(1.0024, timeElapsed / 10);
    }

    const gameState = {
      roundId: activeRound?.round_id || null,
      roundNumber: activeRound?.round_number || 0,
      phase: activeRound?.phase || 'preparing',
      multiplier: currentMultiplier,
      timeElapsed:
        activeRound?.phase === 'flying'
          ? Date.now() - new Date(activeRound.flight_started_at).getTime()
          : 0,
      bettingTimeLeft:
        activeRound?.phase === 'betting'
          ? Math.max(
              0,
              new Date(activeRound.betting_ended_at).getTime() - Date.now()
            )
          : 0,
      crashMultiplier: activeRound?.crash_multiplier || 0,
      totalBets: activeRound?.total_bets || 0,
      totalWagered: activeRound?.total_wagered || 0,
      serverSeedHash: activeRound?.server_seed_hash || '',
      clientSeed: activeRound?.client_seed || '',
      nonce: activeRound?.nonce || 0,
      startedAt: activeRound?.betting_started_at || new Date().toISOString(),
      bettingEndsAt: activeRound?.betting_ended_at || new Date().toISOString(),
      userBet,
      recentMultipliers,
    };

    return NextResponse.json({ success: true, data: gameState });
  } catch (error) {
    console.error('Game state API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
