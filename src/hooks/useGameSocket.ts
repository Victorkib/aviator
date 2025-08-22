'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io, type Socket } from 'socket.io-client';

interface GameState {
  roundId: string;
  roundNumber: number;
  phase: 'betting' | 'flying' | 'crashed' | 'preparing';
  multiplier: number;
  timeElapsed: number;
  bettingTimeLeft: number;
  totalBets: number;
  totalWagered: number;
  activePlayers: number;
  bets: Array<{
    userId: string;
    amount: number;
    autoCashout?: number;
    cashedOut: boolean;
  }>;
}

interface ChatMessage {
  id: string;
  message: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  timestamp: string;
}

interface BetResult {
  success: boolean;
  betId?: string;
  amount?: number;
  autoCashout?: number;
  newBalance?: number;
  error?: string;
}

interface CashoutResult {
  success: boolean;
  betId?: string;
  multiplier?: number;
  payout?: number;
  profit?: number;
  error?: string;
}

export function useGameSocket() {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    roundId: '',
    roundNumber: 0,
    phase: 'preparing',
    multiplier: 1.0,
    timeElapsed: 0,
    bettingTimeLeft: 0,
    totalBets: 0,
    totalWagered: 0,
    activePlayers: 0,
    bets: [],
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [userBet, setUserBet] = useState<{
    id: string;
    amount: number;
    autoCashout?: number;
    cashedOut: boolean;
  } | null>(null);

  // Ensure we're mounted (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced debug logging
  useEffect(() => {
    if (mounted) {
      console.log('🔍 useGameSocket Debug:', {
        mounted,
        status,
        hasSession: !!session,
        userId: session?.user?.id,
        connectionStatus,
        socketConnected: socketRef.current?.connected,
        socketExists: !!socketRef.current,
      });
    }
  }, [mounted, status, session, connectionStatus]);

  // Test API accessibility
  const testSocketAPI = useCallback(async () => {
    try {
      console.log('🧪 Testing socket API accessibility...');
      const response = await fetch('/api/socket', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(
        '🧪 Socket API test response:',
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const text = await response.text();
        console.log('🧪 Socket API error response:', text);
      }
    } catch (error) {
      console.error('🧪 Socket API test failed:', error);
    }
  }, []);

  const connect = useCallback(() => {
    // Only run on client side
    if (!mounted) {
      console.log('⏳ Not mounted yet, skipping connection');
      return;
    }

    // Prevent multiple connection attempts
    if (connectionAttemptRef.current) {
      console.log('🔄 Connection attempt already in progress');
      return;
    }

    // Check authentication
    if (status === 'loading') {
      console.log('⏳ Session still loading, waiting...');
      return;
    }

    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('❌ Cannot connect - not authenticated:', {
        status,
        hasSession: !!session,
        hasUserId: !!session?.user?.id,
      });
      setConnectionStatus('error');
      setError('Authentication required');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected');
      setConnectionStatus('connected');
      return;
    }

    console.log('🔌 Starting socket connection...');
    connectionAttemptRef.current = true;
    setConnectionStatus('connecting');
    setError(null);

    // Test API accessibility first
    testSocketAPI();

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      // Ensure we're using the correct URL
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000';
      const socketPath = '/api/socket';

      console.log('🌐 Socket connection details:', {
        baseUrl,
        socketPath,
        fullUrl: baseUrl + socketPath,
        userAgent:
          typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      });

      const newSocket = io(baseUrl, {
        path: socketPath,
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false,
      });

      // Add more detailed event listeners
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        console.log('🔗 Socket details:', {
          id: newSocket.id,
          connected: newSocket.connected,
          transport: newSocket.io.engine?.transport?.name,
        });
        connectionAttemptRef.current = false;
        setConnectionStatus('connected');
        setError(null);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        connectionAttemptRef.current = false;
        setConnectionStatus('disconnected');

        // Auto-reconnect after 3 seconds if not intentional disconnect
        if (reason !== 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        console.error('❌ Error details:', {
          message: error.message,
        });
        connectionAttemptRef.current = false;
        setConnectionStatus('error');
        setError(`Connection failed: ${error.message}`);

        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Retrying connection...');
          connect();
        }, 5000);
      });

      // Add engine event listeners for more debugging
      newSocket.on('connect', () => {
        if (newSocket.io.engine) {
          newSocket.io.engine.on('upgrade', () => {
            console.log('⬆️ Upgraded to', newSocket.io.engine.transport.name);
          });

          newSocket.io.engine.on('upgradeError', (error) => {
            console.error('⬆️ Upgrade error:', error);
          });
        }
      });

      newSocket.on('game_state', (state: GameState) => {
        console.log('🎮 Game state updated:', state.phase, state.multiplier);
        setGameState(state);

        // Update user bet status based on game state
        if (state.phase === 'crashed' || state.phase === 'preparing') {
          setUserBet(null);
        }
      });

      newSocket.on('chat_message', (message: ChatMessage) => {
        setChatMessages((prev) => [...prev.slice(-49), message]); // Keep last 50 messages
      });

      newSocket.on('bet_placed', (data: BetResult) => {
        console.log('✅ Bet placed successfully:', data);
        if (data.success && data.betId) {
          setUserBet({
            id: data.betId,
            amount: data.amount!,
            autoCashout: data.autoCashout,
            cashedOut: false,
          });
        }
      });

      newSocket.on('bet_error', (data: { message: string }) => {
        console.error('❌ Bet error:', data.message);
        setError(data.message);
      });

      newSocket.on('cashout_success', (data: CashoutResult) => {
        console.log('✅ Cashout successful:', data);
        if (userBet) {
          setUserBet({
            ...userBet,
            cashedOut: true,
          });
        }
      });

      newSocket.on('cashout_error', (data: { message: string }) => {
        console.error('❌ Cashout error:', data.message);
        setError(data.message);
      });

      newSocket.on('auto_cashout', (data: any) => {
        console.log('🤖 Auto-cashout triggered:', data);
        if (data.userId === session.user.id && userBet) {
          setUserBet({
            ...userBet,
            cashedOut: true,
          });
        }
      });

      newSocket.on('game_crashed', (data: any) => {
        console.log('💥 Game crashed:', data);
        setUserBet(null);
      });

      newSocket.on('chat_error', (data: { message: string }) => {
        console.error('💬 Chat error:', data.message);
        setError(data.message);
      });

      socketRef.current = newSocket;
    } catch (error) {
      console.error('❌ Error creating socket:', error);
      connectionAttemptRef.current = false;
      setConnectionStatus('error');
      setError('Failed to create socket connection');
    }
  }, [mounted, status, testSocketAPI]);

  const disconnect = useCallback(() => {
    connectionAttemptRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      console.log('🔌 Disconnecting socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, []);

  const placeBet = useCallback(
    (amount: number, autoCashout?: number): Promise<BetResult> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({ success: false, error: 'Not connected to game server' });
          return;
        }

        if (gameState.phase !== 'betting') {
          resolve({ success: false, error: 'Betting is closed' });
          return;
        }

        console.log('🎰 Placing bet:', { amount, autoCashout });

        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Request timeout' });
        }, 10000);

        const handleBetResult = (result: BetResult) => {
          clearTimeout(timeout);
          socketRef.current?.off('bet_placed', handleBetResult);
          socketRef.current?.off('bet_error', handleBetError);
          resolve(result);
        };

        const handleBetError = (data: { message: string }) => {
          clearTimeout(timeout);
          socketRef.current?.off('bet_placed', handleBetResult);
          socketRef.current?.off('bet_error', handleBetError);
          resolve({ success: false, error: data.message });
        };

        socketRef.current.emit('place_bet', { amount, autoCashout });
        socketRef.current.once('bet_placed', handleBetResult);
        socketRef.current.once('bet_error', handleBetError);
      });
    },
    [gameState.phase]
  );

  const cashOut = useCallback(
    (betId: string): Promise<CashoutResult> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({ success: false, error: 'Not connected to game server' });
          return;
        }

        if (gameState.phase !== 'flying') {
          resolve({ success: false, error: 'Cannot cash out now' });
          return;
        }

        console.log('💰 Cashing out bet:', betId);

        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Request timeout' });
        }, 10000);

        const handleCashoutResult = (result: CashoutResult) => {
          clearTimeout(timeout);
          socketRef.current?.off('cashout_success', handleCashoutResult);
          socketRef.current?.off('cashout_error', handleCashoutError);
          resolve(result);
        };

        const handleCashoutError = (data: { message: string }) => {
          clearTimeout(timeout);
          socketRef.current?.off('cashout_success', handleCashoutResult);
          socketRef.current?.off('cashout_error', handleCashoutError);
          resolve({ success: false, error: data.message });
        };

        socketRef.current.emit('cashout', { betId });
        socketRef.current.once('cashout_success', handleCashoutResult);
        socketRef.current.once('cashout_error', handleCashoutError);
      });
    },
    [gameState.phase]
  );

  const sendChatMessage = useCallback((message: string) => {
    if (!socketRef.current?.connected) {
      setError('Not connected to game server');
      return;
    }

    if (message.trim().length === 0) {
      return;
    }

    console.log('💬 Sending chat message:', message.substring(0, 50));
    socketRef.current.emit('chat_message', { message: message.trim() });
  }, []);

  // Main connection effect
  useEffect(() => {
    if (!mounted) return;

    console.log('🔄 Connection effect triggered:', {
      mounted,
      status,
      hasUserId: !!session?.user?.id,
      sessionData: session
        ? { id: session.user?.id, email: session.user?.email }
        : null,
    });

    if (status === 'authenticated' && session?.user?.id) {
      // Small delay to ensure everything is ready
      const connectTimeout = setTimeout(() => {
        console.log('⏰ Attempting connection after delay...');
        connect();
      }, 2000); // Increased delay to 2 seconds

      return () => {
        console.log('🧹 Cleaning up connection timeout');
        clearTimeout(connectTimeout);
      };
    } else if (status === 'unauthenticated') {
      console.log('🚫 User unauthenticated, disconnecting');
      disconnect();
    } else {
      console.log('⏳ Waiting for authentication:', { status });
    }
  }, [mounted, status, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up');
      disconnect();
    };
  }, [disconnect]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Computed values
  const canPlaceBet = Boolean(
    connectionStatus === 'connected' &&
      gameState.phase === 'betting' &&
      gameState.bettingTimeLeft > 0 &&
      !userBet
  );

  const canCashOut = Boolean(
    connectionStatus === 'connected' &&
      gameState.phase === 'flying' &&
      userBet &&
      !userBet.cashedOut
  );

  const potentialPayout = userBet ? userBet.amount * gameState.multiplier : 0;

  return {
    gameState,
    chatMessages,
    connectionStatus,
    connectionError: error,
    error,
    userBet,
    placeBet,
    cashOut,
    sendChatMessage,
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected',
    canPlaceBet,
    canCashOut,
    potentialPayout,
  };
}
