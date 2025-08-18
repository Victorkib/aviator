'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { GameState, PlayerBet } from '@/lib/websocket-server';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

export function useGameSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeBets, setActiveBets] = useState<PlayerBet[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(
      process.env.NODE_ENV === 'production'
        ? 'https://your-domain.vercel.app'
        : 'http://localhost:3000',
      {
        path: '/api/socket',
      }
    );

    socketInstance.on('connect', () => {
      console.log('Connected to game server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from game server');
      setConnected(false);
    });

    // Game state updates
    socketInstance.on('game-state', (state: GameState) => {
      setGameState(state);
    });

    socketInstance.on('active-bets', (bets: PlayerBet[]) => {
      setActiveBets(bets);
    });

    socketInstance.on('new-round', (state: GameState) => {
      setGameState(state);
      setActiveBets([]); // Clear previous round bets
    });

    socketInstance.on('new-bet', (bet: PlayerBet) => {
      setActiveBets((prev) => [...prev, bet]);
    });

    socketInstance.on(
      'multiplier-update',
      (data: { multiplier: number; timeElapsed: number }) => {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                multiplier: data.multiplier,
                timeElapsed: data.timeElapsed,
              }
            : null
        );
      }
    );

    socketInstance.on('betting-update', (data: { timeLeft: number }) => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              bettingTimeLeft: data.timeLeft,
            }
          : null
      );
    });

    socketInstance.on(
      'game-crashed',
      (data: { crashMultiplier: number; roundId: string }) => {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                phase: 'crashed',
                multiplier: data.crashMultiplier,
              }
            : null
        );
      }
    );

    socketInstance.on(
      'player-cashout',
      (data: {
        userId: string;
        username: string;
        multiplier: number;
        payout: number;
      }) => {
        setActiveBets((prev) =>
          prev.map((bet) =>
            bet.userId === data.userId
              ? { ...bet, cashedOut: true, cashoutMultiplier: data.multiplier }
              : bet
          )
        );
      }
    );

    // Chat messages
    socketInstance.on('chat-message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-49), message]); // Keep last 50 messages
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Game actions
  const placeBet = useCallback(
    (userId: string, amount: number, autoCashout?: number) => {
      if (socket) {
        socket.emit('place-bet', { userId, amount, autoCashout });
      }
    },
    [socket]
  );

  const cashout = useCallback(
    (userId: string) => {
      if (socket) {
        socket.emit('cashout', { userId });
      }
    },
    [socket]
  );

  const sendChatMessage = useCallback(
    (userId: string, message: string) => {
      if (socket) {
        socket.emit('chat-message', { userId, message });
      }
    },
    [socket]
  );

  return {
    gameState,
    activeBets,
    chatMessages,
    connected,
    placeBet,
    cashout,
    sendChatMessage,
  };
}
