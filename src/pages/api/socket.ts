import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

// Extend NextApiResponse to include socket server
interface NextApiResponseServerIO extends NextApiResponse {
  socket: any & {
    server: any & {
      io?: SocketIOServer;
    };
  };
}

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
  crashMultiplier?: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  bets: Array<{
    userId: string;
    amount: number;
    autoCashout?: number;
    cashedOut: boolean;
  }>;
}

// Global game state
let gameState: GameState = {
  roundId: '',
  roundNumber: 1,
  phase: 'preparing',
  multiplier: 1.0,
  timeElapsed: 0,
  bettingTimeLeft: 0,
  totalBets: 0,
  totalWagered: 0,
  activePlayers: 0,
  serverSeedHash: '',
  clientSeed: '',
  nonce: 0,
  bets: [],
};

let gameLoopRunning = false;
let bettingInterval: NodeJS.Timeout | null = null;
let multiplierInterval: NodeJS.Timeout | null = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  console.log(`📡 Socket API called: ${req.method} ${req.url}`);
  console.log('🔍 Request details:', {
    method: req.method,
    url: req.url,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    },
  });

  if (req.method !== 'GET') {
    console.log('❌ Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Initialize Socket.IO server if not already done
    if (!res.socket.server.io) {
      console.log('🚀 Initializing Socket.IO server...');

      const io = new SocketIOServer(res.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? [
                process.env.NEXTAUTH_URL!,
                'https://*.vercel.app',
                'https://*.vercel.com',
                ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
              ]
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['polling', 'websocket'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        allowEIO3: true,
      });

      console.log('🔧 Socket.IO server configuration:', {
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        cors: {
          origin:
            process.env.NODE_ENV === 'production'
              ? [process.env.NEXTAUTH_URL!, 'https://*.vercel.app']
              : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        },
      });

      // Authentication middleware
      io.use(async (socket, next) => {
        try {
          console.log('🔐 Authenticating socket connection...');

          // For development, allow connection without strict auth
          if (process.env.NODE_ENV === 'development') {
            socket.data.userId =
              'dev-user-' + Math.random().toString(36).substr(2, 9);
            socket.data.userEmail = 'dev@example.com';
            socket.data.userName = 'Dev User';
            console.log(`✅ Dev user authenticated: ${socket.data.userId}`);
            next();
            return;
          }

          // Production authentication
          const session = await getServerSession(authOptions);
          if (session?.user?.id) {
            socket.data.userId = session.user.id;
            socket.data.userEmail = session.user.email;
            socket.data.userName =
              session.user.name || session.user.email?.split('@')[0];
            console.log(`✅ User authenticated: ${socket.data.userId}`);
            next();
          } else {
            console.log('❌ Authentication failed');
            next(new Error('Authentication required'));
          }
        } catch (error) {
          console.error('❌ Socket auth error:', error);
          next(new Error('Authentication failed'));
        }
      });

      // Handle socket connections
      io.on('connection', (socket) => {
        console.log(`👤 User connected: ${socket.data.userId}`);
        console.log(`🔗 Connection details:`, {
          id: socket.id,
          transport: socket.conn.transport.name,
          remoteAddress: socket.conn.remoteAddress,
        });

        gameState.activePlayers = io.sockets.sockets.size;

        // Send current game state immediately
        socket.emit('game_state', gameState);
        console.log('📤 Sent game state to new connection');

        // Handle bet placement
        socket.on('place_bet', async (data) => {
          try {
            const { amount, autoCashout } = data;
            const userId = socket.data.userId;

            console.log('🎰 Bet placement:', {
              userId,
              amount,
              autoCashout,
              phase: gameState.phase,
            });

            if (gameState.phase !== 'betting') {
              socket.emit('bet_error', { message: 'Betting is closed' });
              return;
            }

            // Validate bet amount
            if (!amount || amount < 1 || amount > 1000) {
              socket.emit('bet_error', {
                message: 'Invalid bet amount (1-1000)',
              });
              return;
            }

            // Check for existing bet
            const existingBet = gameState.bets.find(
              (bet) => bet.userId === userId
            );
            if (existingBet) {
              socket.emit('bet_error', {
                message: 'You already have a bet in this round',
              });
              return;
            }

            // For development, simulate successful bet
            if (process.env.NODE_ENV === 'development') {
              const betId = `bet_${Date.now()}_${userId}`;

              // Add bet to game state
              gameState.bets.push({
                userId,
                amount,
                autoCashout,
                cashedOut: false,
              });

              gameState.totalBets++;
              gameState.totalWagered += amount;

              // Broadcast updated state
              io.emit('game_state', gameState);

              // Confirm bet placement
              socket.emit('bet_placed', {
                success: true,
                betId,
                amount,
                autoCashout,
                newBalance: 1000 - amount, // Mock balance
              });

              console.log('✅ Dev bet placed:', { userId, betId, amount });
              return;
            }

            // Production logic would go here
            socket.emit('bet_error', {
              message: 'Production betting not implemented yet',
            });
          } catch (error) {
            console.error('❌ Bet placement error:', error);
            socket.emit('bet_error', { message: 'Internal server error' });
          }
        });

        // Handle cashout
        socket.on('cashout', async (data) => {
          try {
            const { betId } = data;
            const userId = socket.data.userId;

            console.log('💰 Cashout attempt:', {
              userId,
              betId,
              phase: gameState.phase,
            });

            if (gameState.phase !== 'flying') {
              socket.emit('cashout_error', { message: 'Cannot cash out now' });
              return;
            }

            // For development, simulate successful cashout
            if (process.env.NODE_ENV === 'development') {
              const bet = gameState.bets.find((b) => b.userId === userId);
              if (bet && !bet.cashedOut) {
                bet.cashedOut = true;
                const payout = bet.amount * gameState.multiplier;
                const profit = payout - bet.amount;

                io.emit('game_state', gameState);
                socket.emit('cashout_success', {
                  success: true,
                  betId,
                  multiplier: gameState.multiplier,
                  payout,
                  profit,
                });

                console.log('✅ Dev cashout successful:', { userId, payout });
              } else {
                socket.emit('cashout_error', {
                  message: 'No active bet found',
                });
              }
              return;
            }

            // Production logic would go here
            socket.emit('cashout_error', {
              message: 'Production cashout not implemented yet',
            });
          } catch (error) {
            console.error('❌ Cashout error:', error);
            socket.emit('cashout_error', { message: 'Internal server error' });
          }
        });

        // Handle chat messages - COMPLETE IMPLEMENTATION
        socket.on('chat_message', async (data) => {
          try {
            const { message } = data;
            const userId = socket.data.userId;
            const userName = socket.data.userName;
            const userEmail = socket.data.userEmail;

            if (
              !message ||
              typeof message !== 'string' ||
              message.trim().length === 0
            ) {
              socket.emit('chat_error', { message: 'Message cannot be empty' });
              return;
            }

            if (message.length > 500) {
              socket.emit('chat_error', {
                message: 'Message too long (max 500 characters)',
              });
              return;
            }

            const cleanMessage = message.trim();
            console.log('💬 Chat message:', {
              userId,
              message: cleanMessage.substring(0, 50),
            });

            // Save to database first to get the real ID
            let chatMessage;
            try {
              const supabase = getSupabaseAdmin();
              const { data: savedMessage, error: dbError } = await supabase
                .from('chat_messages')
                .insert({
                  user_id: userId,
                  message: cleanMessage,
                })
                .select('id, created_at')
                .single();

              if (dbError) {
                console.error('Failed to save chat message to database:', dbError);
                // Create temporary message object if database save fails
                chatMessage = {
                  id: `temp_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`,
                  message: cleanMessage,
                  user: {
                    id: userId,
                    name: userName || userEmail?.split('@')[0] || 'Anonymous',
                    email: userEmail,
                  },
                  timestamp: new Date().toISOString(),
                };
              } else {
                // Create message object with real database ID
                chatMessage = {
                  id: savedMessage.id,
                  message: cleanMessage,
                  user: {
                    id: userId,
                    name: userName || userEmail?.split('@')[0] || 'Anonymous',
                    email: userEmail,
                  },
                  timestamp: savedMessage.created_at,
                };
              }
            } catch (dbError) {
              console.error('Failed to save chat message to database:', dbError);
              // Create temporary message object if database save fails
              chatMessage = {
                id: `temp_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`,
                message: cleanMessage,
                user: {
                  id: userId,
                  name: userName || userEmail?.split('@')[0] || 'Anonymous',
                  email: userEmail,
                },
                timestamp: new Date().toISOString(),
              };
            }

            // Broadcast to all users with the final message object
            io.emit('chat_message', chatMessage);

            console.log('✅ Chat message sent successfully');
          } catch (error) {
            console.error('❌ Chat error:', error);
            socket.emit('chat_error', { message: 'Failed to send message' });
          }
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
          console.log(
            `👤 User disconnected: ${socket.data.userId}, reason: ${reason}`
          );
          gameState.activePlayers = Math.max(0, io.sockets.sockets.size - 1);
          io.emit('game_state', gameState);
        });
      });

      // Start game loop
      if (!gameLoopRunning) {
        console.log('🎮 Starting game loop...');
        startGameLoop(io);
        gameLoopRunning = true;
      }

      res.socket.server.io = io;
      console.log('✅ Socket.IO server initialized successfully');
    } else {
      console.log('✅ Socket.IO server already running');
    }

    // Send a simple response to confirm the endpoint is working
    res.status(200).json({
      message: 'Socket.IO server is running',
      timestamp: new Date().toISOString(),
      gameState: {
        phase: gameState.phase,
        roundNumber: gameState.roundNumber,
        activePlayers: gameState.activePlayers,
      },
    });
  } catch (error) {
    console.error('❌ Socket API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function startGameLoop(io: SocketIOServer) {
  console.log('🎮 Game loop starting...');

  const startNewRound = async () => {
    try {
      // Clear any existing intervals
      if (bettingInterval) {
        clearInterval(bettingInterval);
        bettingInterval = null;
      }
      if (multiplierInterval) {
        clearInterval(multiplierInterval);
        multiplierInterval = null;
      }

      const roundNumber = gameState.roundNumber + 1;
      const roundId = `round_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Generate provably fair seeds
      const serverSeed = Math.random().toString(36).substr(2, 32);
      const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex');
      const clientSeed = Math.random().toString(36).substr(2, 16);
      const nonce = Math.floor(Math.random() * 1000000);

      gameState = {
        roundId,
        roundNumber,
        phase: 'betting',
        multiplier: 1.0,
        timeElapsed: 0,
        bettingTimeLeft: 10000, // 10 seconds
        totalBets: 0,
        totalWagered: 0,
        activePlayers: io.sockets.sockets.size,
        serverSeedHash,
        clientSeed,
        nonce,
        bets: [],
      };

      console.log(`🆕 Round ${roundNumber} started (${roundId})`);
      io.emit('game_state', gameState);

      // Betting countdown
      bettingInterval = setInterval(() => {
        gameState.bettingTimeLeft -= 1000;
        io.emit('game_state', gameState);

        if (gameState.bettingTimeLeft <= 0) {
          if (bettingInterval) {
            clearInterval(bettingInterval);
            bettingInterval = null;
          }
          startFlightPhase(io, roundId);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error starting round:', error);
      setTimeout(() => startNewRound(), 5000);
    }
  };

  const startFlightPhase = async (io: SocketIOServer, roundId: string) => {
    try {
      const crashPoint = generateCrashMultiplier(
        gameState.serverSeedHash || '',
        gameState.clientSeed || '',
        gameState.nonce || 0
      );

      gameState.phase = 'flying';
      gameState.multiplier = 1.0;
      gameState.timeElapsed = 0;
      gameState.crashMultiplier = crashPoint;

      console.log(`🚀 Flight started - crash at ${crashPoint.toFixed(2)}x`);
      io.emit('game_state', gameState);

      // Flight animation
      multiplierInterval = setInterval(async () => {
        gameState.timeElapsed += 100;

        // Improved multiplier calculation for smoother growth
        const timeInSeconds = gameState.timeElapsed / 1000;
        gameState.multiplier =
          1 + timeInSeconds * 0.1 + Math.pow(timeInSeconds / 10, 1.8);

        // Round to 2 decimal places
        gameState.multiplier = Math.round(gameState.multiplier * 100) / 100;

        // Check auto cashouts BEFORE crash check
        for (const bet of gameState.bets) {
          if (
            !bet.cashedOut &&
            bet.autoCashout &&
            gameState.multiplier >= bet.autoCashout
          ) {
            bet.cashedOut = true;
            const payout = bet.amount * bet.autoCashout;
            const profit = payout - bet.amount;

            io.emit('auto_cashout', {
              userId: bet.userId,
              multiplier: bet.autoCashout,
              payout,
              profit,
            });

            console.log(
              `🤖 Auto-cashout: ${bet.userId} at ${bet.autoCashout}x`
            );
          }
        }

        io.emit('game_state', gameState);

        // Check for crash
        if (gameState.multiplier >= crashPoint) {
          console.log(
            `💥 Crash triggered! Current: ${gameState.multiplier.toFixed(
              2
            )}x, Target: ${crashPoint.toFixed(2)}x`
          );

          if (multiplierInterval) {
            clearInterval(multiplierInterval);
            multiplierInterval = null;
          }

          crashGame(io, roundId, crashPoint);
          return;
        }
      }, 100); // Update every 100ms for smooth animation
    } catch (error) {
      console.error('❌ Flight phase error:', error);
      setTimeout(() => startNewRound(), 3000);
    }
  };

  const crashGame = async (
    io: SocketIOServer,
    roundId: string,
    crashPoint: number
  ) => {
    try {
      // Ensure intervals are cleared
      if (multiplierInterval) {
        clearInterval(multiplierInterval);
        multiplierInterval = null;
      }

      gameState.phase = 'crashed';
      gameState.multiplier = crashPoint;

      console.log(`💥 Crashed at ${crashPoint.toFixed(2)}x`);
      io.emit('game_state', gameState);
      io.emit('game_crashed', {
        roundId,
        crashMultiplier: crashPoint,
        timestamp: new Date().toISOString(),
      });

      // Start new round after 3 seconds
      setTimeout(() => {
        console.log('🔄 Starting next round...');
        startNewRound();
      }, 3000);
    } catch (error) {
      console.error('❌ Crash error:', error);
      setTimeout(() => startNewRound(), 5000);
    }
  };

  const generateCrashMultiplier = (
    serverSeedHash: string,
    clientSeed: string,
    nonce: number
  ): number => {
    // Provably fair crash multiplier generation (same as game engine)
    const combined = `${serverSeedHash}:${clientSeed}:${nonce}`;
    const hash = createHash('sha256').update(combined).digest('hex');

    // Convert first 8 characters to number
    const seed = Number.parseInt(hash.substring(0, 8), 16);
    const normalized = seed / 0xffffffff;

    // Generate crash multiplier with house edge (~1%)
    const houseEdge = 0.01;
    let crashPoint = (1 - houseEdge) / (1 - normalized);

    // Ensure minimum crash point and cap at reasonable maximum
    crashPoint = Math.max(1.0, Math.min(crashPoint, 1000));

    // Round to 2 decimal places
    return Math.round(crashPoint * 100) / 100;
  };

  // Start first round
  startNewRound();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
