'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useGameState } from '@/lib/game-state-manager';
import { GamePhase, type PlayerBet } from '@/lib/game-engine';
import { toast } from '@/hooks/use-toast';

// WebSocket message types
interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

// Game engine hook for client-side game management
export function useGameEngine() {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    gameState,
    isLoading,
    error,
    setGameState,
    setUserBet,
    setConnectionStatus,
    addRecentMultiplier,
    canPlaceBet,
    canCashout,
    getCurrentMultiplier,
    getBettingTimeLeft,
    getPotentialPayout,
    reset,
  } = useGameState();

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      switch (message.type) {
        case 'game_state':
          setGameState({
            roundId: message.data.roundId as string,
            roundNumber: message.data.roundNumber as number,
            phase: message.data.phase as GamePhase,
            multiplier: message.data.multiplier as number,
            timeElapsed: message.data.timeElapsed as number,
            bettingTimeLeft: message.data.bettingTimeLeft as number,
            crashMultiplier: message.data.crashMultiplier as number,
            totalBets: message.data.totalBets as number,
            totalWagered: message.data.totalWagered as number,
            activePlayers: message.data.activePlayers as number,
            serverSeedHash: message.data.serverSeedHash as string,
            clientSeed: message.data.clientSeed as string,
            nonce: message.data.nonce as number,
            startedAt: new Date(message.data.startedAt as string),
            bettingEndsAt: new Date(message.data.bettingEndsAt as string),
          });
          break;

        case 'new_round':
          setGameState({
            roundId: message.data.roundId as string,
            roundNumber: message.data.roundNumber as number,
            phase: GamePhase.BETTING,
            multiplier: 1.0,
            timeElapsed: 0,
            bettingTimeLeft: message.data.bettingTimeLeft as number,
            totalBets: 0,
            totalWagered: 0,
            activePlayers: 0,
          });
          setUserBet(undefined);
          toast({
            title: 'New Round Started',
            description: 'Place your bets now!',
          });
          break;

        case 'betting_update':
          setGameState({
            bettingTimeLeft: message.data.timeLeft as number,
          });
          break;

        case 'flight_started':
          setGameState({
            phase: GamePhase.FLYING,
            multiplier: 1.0,
            timeElapsed: 0,
          });
          break;

        case 'multiplier_update':
          setGameState({
            multiplier: message.data.multiplier as number,
            timeElapsed: message.data.timeElapsed as number,
          });
          break;

        case 'game_crashed':
          setGameState({
            phase: GamePhase.CRASHED,
            multiplier: message.data.crashMultiplier as number,
          });
          addRecentMultiplier(message.data.crashMultiplier as number);

          if (gameState?.userBet && !gameState.userBet.cashedOut) {
            toast({
              title: 'Round Crashed!',
              description: `The plane crashed at ${(
                message.data.crashMultiplier as number
              ).toFixed(2)}x`,
              variant: 'destructive',
            });
          }
          break;

        case 'bet_confirmed':
          const bet: PlayerBet = {
            id: message.data.id as string,
            userId: message.data.userId as string,
            roundId: message.data.roundId as string,
            amount: message.data.amount as number,
            autoCashout: message.data.autoCashout as number | undefined,
            cashedOut: false,
            payout: 0,
            profit: -(message.data.amount as number),
            createdAt: new Date(message.data.createdAt as string),
          };
          setUserBet(bet);
          toast({
            title: 'Bet Placed',
            description: `$${(message.data.amount as number).toFixed(
              2
            )} bet placed successfully!`,
          });
          break;

        case 'cashout_success':
          if (gameState?.userBet) {
            const updatedBet: PlayerBet = {
              ...gameState.userBet,
              cashedOut: true,
              cashoutMultiplier: message.data.multiplier as number,
              cashoutTime: message.data.timeElapsed as number,
              payout: message.data.payout as number,
              profit: message.data.profit as number,
            };
            setUserBet(updatedBet);
            toast({
              title: 'Cashed Out!',
              description: `You won $${(message.data.payout as number).toFixed(
                2
              )} at ${(message.data.multiplier as number).toFixed(2)}x!`,
            });
          }
          break;

        case 'bet_error':
          toast({
            title: 'Bet Failed',
            description: message.data.message as string,
            variant: 'destructive',
          });
          break;

        case 'cashout_error':
          toast({
            title: 'Cashout Failed',
            description: message.data.message as string,
            variant: 'destructive',
          });
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    },
    [setGameState, setUserBet, addRecentMultiplier, gameState?.userBet]
  );

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!session?.user?.id) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
    const ws = new WebSocket(`${wsUrl}?userId=${session.user.id}`);

    ws.onopen = () => {
      console.log('🔌 Connected to game server');
      setConnectionStatus(true);
      reconnectAttempts.current = 0;

      // Request current game state
      ws.send(JSON.stringify({ type: 'get_state' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 Disconnected from game server', event.code, event.reason);
      setConnectionStatus(false, 'Connection lost');

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else {
        toast({
          title: 'Connection Lost',
          description:
            'Unable to reconnect to game server. Please refresh the page.',
          variant: 'destructive',
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus(false, 'Connection error');
    };

    wsRef.current = ws;
  }, [session?.user?.id, setConnectionStatus, handleWebSocketMessage]);

  // Place a bet
  const placeBet = useCallback(
    (amount: number, autoCashout?: number) => {
      if (!wsRef.current || !canPlaceBet()) return;

      wsRef.current.send(
        JSON.stringify({
          type: 'place_bet',
          data: {
            userId: session?.user?.id,
            amount,
            autoCashout,
          },
        })
      );
    },
    [canPlaceBet, session?.user?.id]
  );

  // Cash out
  const cashOut = useCallback(() => {
    if (!wsRef.current || !canCashout()) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'cashout',
        data: {
          userId: session?.user?.id,
        },
      })
    );
  }, [canCashout, session?.user?.id]);

  // Connect on mount and session change
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    } else {
      reset();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [session?.user?.id, connect, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    gameState,
    isLoading,
    error,
    isConnected: gameState?.isConnected || false,

    // Actions
    placeBet,
    cashOut,

    // Computed values
    canPlaceBet: canPlaceBet(),
    canCashout: canCashout(),
    currentMultiplier: getCurrentMultiplier(),
    bettingTimeLeft: getBettingTimeLeft(),
    getPotentialPayout,

    // User bet
    userBet: gameState?.userBet,
    recentMultipliers: gameState?.recentMultipliers || [],
  };
}
