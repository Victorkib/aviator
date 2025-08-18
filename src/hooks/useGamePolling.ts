'use client';

import { useEffect, useState } from 'react';
import { GameState } from '@/lib/websocket-server';
import { supabase } from '@/lib/supabase';

// Fallback polling when WebSocket is not available
export function useGamePolling(enabled = false) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const pollGameState = async () => {
      try {
        // Get latest game round
        const { data: round } = await supabase
          .from('game_rounds')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (round) {
          // Determine current phase based on timestamps
          const now = new Date();
          const bettingEnd = new Date(round.betting_ended_at);
          const flightStart = new Date(round.flight_started_at);
          const crashTime = new Date(round.crashed_at);

          let phase: GameState['phase'] = 'preparing';
          let multiplier = 1.0;
          let timeElapsed = 0;

          if (now < bettingEnd) {
            phase = 'betting';
          } else if (now < crashTime) {
            phase = 'flying';
            timeElapsed = now.getTime() - flightStart.getTime();
            multiplier = Math.pow(1.0024, timeElapsed / 10);
          } else {
            phase = 'crashed';
            multiplier = round.crash_multiplier;
          }

          setGameState({
            roundId: round.id,
            phase,
            multiplier,
            timeElapsed,
            bettingTimeLeft: Math.max(0, bettingEnd.getTime() - now.getTime()),
            totalBets: round.total_bets || 0,
            totalWagered: round.total_wagered || 0,
            activePlayers: 0, // Would need separate query
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Poll every 100ms during flight, 1s otherwise
    const interval = setInterval(
      pollGameState,
      gameState?.phase === 'flying' ? 100 : 1000
    );

    return () => clearInterval(interval);
  }, [enabled, gameState?.phase]);

  return { gameState };
}
