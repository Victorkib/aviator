'use client';

import { useGameSocket } from '@/hooks/useGameSocket';
import { useGamePolling } from '@/hooks/useGamePolling';
import { useSession } from 'next-auth/react';

export default function GameInterface() {
  const { data: session } = useSession();
  const { gameState, activeBets, connected, placeBet, cashout } =
    useGameSocket();
  const { gameState: pollingState } = useGamePolling(!connected); // Fallback when WebSocket fails

  const currentGameState = gameState || pollingState;

  if (!currentGameState) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="game-interface">
      <div className="connection-status">
        {connected ? '🟢 Live' : '🟡 Polling'}
      </div>

      <div className="multiplier">
        {currentGameState.multiplier.toFixed(2)}x
      </div>

      <div className="phase">Phase: {currentGameState.phase}</div>

      {currentGameState.phase === 'betting' && (
        <button
          onClick={() => session?.user?.id && placeBet(session.user.id, 10)}
        >
          Bet $10
        </button>
      )}

      {currentGameState.phase === 'flying' && (
        <button onClick={() => session?.user?.id && cashout(session.user.id)}>
          Cash Out at {currentGameState.multiplier.toFixed(2)}x
        </button>
      )}
    </div>
  );
}
