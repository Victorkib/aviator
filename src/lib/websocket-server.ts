import { Server as SocketIOServer } from 'socket.io';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';
import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Game state management
interface GameState {
  roundId: string;
  roundNumber: number;
  phase: 'betting' | 'flying' | 'crashed' | 'preparing';
  multiplier: number;
  crashMultiplier?: number;
  startTime: number;
  bettingEndTime?: number;
  flightStartTime?: number;
  crashTime?: number;
  totalBets: number;
  totalWagered: number;
  activeBets: Map<string, any>;
}

// Database types - Fixed to match actual Supabase query structure
interface UserRecord {
  name: string | null;
  email: string | null;
}

interface ChatMessageRecord {
  id: string;
  message: string;
  created_at: string;
  users: UserRecord | null; // Changed from UserRecord[] to UserRecord | null
}

class GameEngine {
  private gameState: GameState;
  private io: SocketIOServer;
  private gameTimer: NodeJS.Timeout | null = null;
  private multiplierTimer: NodeJS.Timeout | null = null;
  private supabase = getSupabaseAdmin();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.gameState = this.initializeGameState();
    this.startGameLoop();
  }

  private initializeGameState(): GameState {
    return {
      roundId: this.generateRoundId(),
      roundNumber: 1,
      phase: 'preparing',
      multiplier: 1.0,
      startTime: Date.now(),
      totalBets: 0,
      totalWagered: 0,
      activeBets: new Map(),
    };
  }

  private generateRoundId(): string {
    return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async startGameLoop() {
    try {
      await this.startBettingPhase();
    } catch (error) {
      console.error('Game loop error:', error);
      // Restart game loop after error
      setTimeout(() => this.startGameLoop(), 5000);
    }
  }

  private async startBettingPhase() {
    console.log(
      `🎮 Starting betting phase for round ${this.gameState.roundNumber}`
    );

    this.gameState.phase = 'betting';
    this.gameState.startTime = Date.now();
    this.gameState.bettingEndTime = Date.now() + 10000; // 10 seconds betting
    this.gameState.activeBets.clear();
    this.gameState.totalBets = 0;
    this.gameState.totalWagered = 0;

    // Create new round in database
    try {
      const { data, error } = await this.supabase
        .from('game_rounds')
        .insert({
          round_number: this.gameState.roundNumber,
          phase: 'betting',
          betting_started_at: new Date().toISOString(),
          server_seed_hash: this.generateServerSeed(),
          client_seed: 'client_seed_' + Date.now(),
          nonce: this.gameState.roundNumber,
          total_bets: 0,
          total_wagered: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating game round:', error);
      } else if (data) {
        this.gameState.roundId = data.id;
        console.log(
          `✅ Created round ${data.round_number} with ID: ${data.id}`
        );
      }
    } catch (error) {
      console.error('Database error creating round:', error);
    }

    // Broadcast game state
    this.broadcastGameState();

    // Set timer for flight phase
    this.gameTimer = setTimeout(() => {
      this.startFlightPhase();
    }, 10000); // 10 seconds betting time
  }

  private async startFlightPhase() {
    console.log(
      `🚀 Starting flight phase for round ${this.gameState.roundNumber}`
    );

    this.gameState.phase = 'flying';
    this.gameState.flightStartTime = Date.now();
    this.gameState.multiplier = 1.0;

    // Generate crash point (between 1.01x and 50x with house edge)
    const crashMultiplier = this.generateCrashMultiplier();
    this.gameState.crashMultiplier = crashMultiplier;

    console.log(`💥 Crash point set at ${crashMultiplier.toFixed(2)}x`);

    // Update round in database
    try {
      await this.supabase
        .from('game_rounds')
        .update({
          phase: 'flying',
          betting_ended_at: new Date().toISOString(),
          flight_started_at: new Date().toISOString(),
          crash_multiplier: crashMultiplier,
          total_bets: this.gameState.totalBets,
          total_wagered: this.gameState.totalWagered,
        })
        .eq('id', this.gameState.roundId);
    } catch (error) {
      console.error('Database error updating round:', error);
    }

    // Broadcast flight start
    this.io.emit('flight_started', {
      roundId: this.gameState.roundId,
      roundNumber: this.gameState.roundNumber,
      crashMultiplier: crashMultiplier,
      timestamp: Date.now(),
    });

    // Start multiplier animation
    this.startMultiplierAnimation(crashMultiplier);
  }

  private startMultiplierAnimation(crashMultiplier: number) {
    const startTime = Date.now();

    const updateMultiplier = () => {
      const elapsed = Date.now() - startTime;

      // Calculate current multiplier based on elapsed time
      // Multiplier grows exponentially over time
      const currentMultiplier =
        1 + (elapsed / 1000) * 0.1 + Math.pow(elapsed / 10000, 2);
      this.gameState.multiplier = Math.round(currentMultiplier * 100) / 100;

      // Check if we've reached the crash point
      if (this.gameState.multiplier >= crashMultiplier) {
        this.crashGame();
        return;
      }

      // Broadcast current multiplier
      this.io.emit('multiplier_update', {
        multiplier: this.gameState.multiplier,
        timestamp: Date.now(),
      });

      // Process auto cashouts
      this.processAutoCashouts();

      // Schedule next update
      this.multiplierTimer = setTimeout(updateMultiplier, 50); // Update every 50ms for smooth animation
    };

    updateMultiplier();
  }

  private async crashGame() {
    console.log(
      `💥 Game crashed at ${this.gameState.crashMultiplier?.toFixed(2)}x`
    );

    this.gameState.phase = 'crashed';
    this.gameState.crashTime = Date.now();
    this.gameState.multiplier = this.gameState.crashMultiplier!;

    // Clear multiplier timer
    if (this.multiplierTimer) {
      clearTimeout(this.multiplierTimer);
      this.multiplierTimer = null;
    }

    // Update round in database
    try {
      await this.supabase
        .from('game_rounds')
        .update({
          phase: 'crashed',
          crashed_at: new Date().toISOString(),
          crash_time_ms: Date.now() - this.gameState.flightStartTime!,
        })
        .eq('id', this.gameState.roundId);

      // Process any remaining bets as losses
      await this.processRemainingBets();
    } catch (error) {
      console.error('Database error updating crashed round:', error);
    }

    // Broadcast crash
    this.io.emit('game_crashed', {
      crashMultiplier: this.gameState.crashMultiplier,
      roundId: this.gameState.roundId,
      timestamp: Date.now(),
    });

    // Wait 3 seconds then start new round
    setTimeout(() => {
      this.gameState.roundNumber++;
      this.gameState.roundId = this.generateRoundId();
      this.startGameLoop();
    }, 3000);
  }

  private async processAutoCashouts() {
    for (const [userId, bet] of this.gameState.activeBets) {
      if (
        bet.autoCashout &&
        this.gameState.multiplier >= bet.autoCashout &&
        !bet.cashedOut
      ) {
        try {
          await this.processCashout(userId, bet.id, bet.autoCashout);
          console.log(
            `🤖 Auto-cashout processed for user ${userId} at ${bet.autoCashout}x`
          );
        } catch (error) {
          console.error('Error processing auto-cashout:', error);
        }
      }
    }
  }

  private async processRemainingBets() {
    for (const [userId, bet] of this.gameState.activeBets) {
      if (!bet.cashedOut) {
        // Mark bet as lost
        try {
          await this.supabase
            .from('bets')
            .update({
              cashed_out: false,
              profit: -bet.amount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', bet.id);
        } catch (error) {
          console.error('Error updating lost bet:', error);
        }
      }
    }
  }

  private generateCrashMultiplier(): number {
    // Simple crash generation with house edge
    // This is a basic implementation - in production you'd want provably fair generation
    const random = Math.random();

    if (random < 0.01) return 1.01; // 1% chance of instant crash
    if (random < 0.05) return 1.01 + Math.random() * 0.5; // 4% chance of very low crash
    if (random < 0.2) return 1.5 + Math.random() * 1.5; // 15% chance of low crash
    if (random < 0.6) return 2.0 + Math.random() * 3.0; // 40% chance of medium crash
    if (random < 0.9) return 5.0 + Math.random() * 10.0; // 30% chance of high crash

    return 10.0 + Math.random() * 40.0; // 10% chance of very high crash
  }

  private generateServerSeed(): string {
    return (
      'seed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16)
    );
  }

  private broadcastGameState() {
    const state = {
      roundId: this.gameState.roundId,
      roundNumber: this.gameState.roundNumber,
      phase: this.gameState.phase,
      multiplier: this.gameState.multiplier,
      totalBets: this.gameState.totalBets,
      totalWagered: this.gameState.totalWagered,
      timeLeft: this.getTimeLeft(),
      timestamp: Date.now(),
    };

    this.io.emit('game_state', state);

    // Cache the state
    CacheManager.setGameState(state);
  }

  private getTimeLeft(): number {
    if (this.gameState.phase === 'betting' && this.gameState.bettingEndTime) {
      return Math.max(0, this.gameState.bettingEndTime - Date.now());
    }
    return 0;
  }

  // Public methods for handling socket events
  async placeBet(userId: string, amount: number, autoCashout?: number) {
    if (this.gameState.phase !== 'betting') {
      throw new Error('Betting is closed');
    }

    try {
      // Validate bet using database function
      const { data: validation, error: validationError } =
        await this.supabase.rpc('validate_bet_placement', {
          p_user_id: userId, // This will be a UUID now
          p_round_id: this.gameState.roundId,
          p_amount: amount,
          p_auto_cashout: autoCashout,
        });

      if (validationError || !validation?.[0]?.is_valid) {
        throw new Error(
          validation?.[0]?.error_message || 'Bet validation failed'
        );
      }

      // Update user balance first
      const { data: balanceResult, error: balanceError } =
        await this.supabase.rpc('update_user_balance', {
          p_user_id: userId, // This will be a UUID now
          p_amount: -amount,
          p_transaction_type: 'bet',
          p_description: `Bet for round #${this.gameState.roundNumber}`,
          p_round_id: this.gameState.roundId,
        });

      if (balanceError || !balanceResult?.[0]?.success) {
        throw new Error(
          balanceResult?.[0]?.error_message || 'Failed to deduct balance'
        );
      }

      // Create bet record
      const { data: bet, error: betError } = await this.supabase
        .from('bets')
        .insert({
          user_id: userId,
          round_id: this.gameState.roundId,
          amount: amount,
          auto_cashout: autoCashout,
          cashed_out: false,
          payout: 0,
          profit: -amount,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (betError) {
        // Rollback balance if bet creation failed
        await this.supabase.rpc('update_user_balance', {
          p_user_id: userId,
          p_amount: amount,
          p_transaction_type: 'refund',
          p_description: 'Bet creation failed - refund',
          p_round_id: this.gameState.roundId,
        });
        throw new Error('Failed to create bet');
      }

      // Add to active bets
      this.gameState.activeBets.set(userId, {
        id: bet.id,
        amount: amount,
        autoCashout: autoCashout,
        cashedOut: false,
      });

      this.gameState.totalBets++;
      this.gameState.totalWagered += amount;

      // Update round stats in database
      await this.supabase
        .from('game_rounds')
        .update({
          total_bets: this.gameState.totalBets,
          total_wagered: this.gameState.totalWagered,
        })
        .eq('id', this.gameState.roundId);

      // Broadcast updated state
      this.broadcastGameState();

      return { success: true, betId: bet.id };
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  async processCashout(userId: string, betId: string, multiplier: number) {
    try {
      const { data, error } = await this.supabase.rpc('process_cashout', {
        p_user_id: userId, // This will be a UUID now
        p_bet_id: betId,
        p_multiplier: multiplier,
      });

      if (error || !data?.[0]?.success) {
        throw new Error(data?.[0]?.error_message || 'Cashout failed');
      }

      // Update active bet
      const bet = this.gameState.activeBets.get(userId);
      if (bet) {
        bet.cashedOut = true;
        bet.cashoutMultiplier = multiplier;
        bet.payout = data[0].payout;
      }

      // Broadcast cashout
      this.io.emit('user_cashed_out', {
        userId,
        betId,
        multiplier,
        payout: data[0].payout,
        profit: data[0].profit,
      });

      return { success: true, payout: data[0].payout, profit: data[0].profit };
    } catch (error) {
      console.error('Error processing cashout:', error);
      throw error;
    }
  }

  getGameState() {
    return {
      roundId: this.gameState.roundId,
      roundNumber: this.gameState.roundNumber,
      phase: this.gameState.phase,
      multiplier: this.gameState.multiplier,
      totalBets: this.gameState.totalBets,
      totalWagered: this.gameState.totalWagered,
      timeLeft: this.getTimeLeft(),
    };
  }

  stop() {
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    if (this.multiplierTimer) {
      clearTimeout(this.multiplierTimer);
      this.multiplierTimer = null;
    }
    console.log('🛑 Game engine stopped');
  }
}

export function initializeSocketServer(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('🚀 Initializing Socket.IO server...');

    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
            : 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize game engine
    const gameEngine = new GameEngine(io);

    io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id);

      // Send current game state to new connection
      socket.emit('game_state', gameEngine.getGameState());

      // Handle bet placement
      socket.on('place_bet', async (data) => {
        try {
          const { userId, amount, autoCashout } = data;
          const result = await gameEngine.placeBet(userId, amount, autoCashout);
          socket.emit('bet_placed', result);
        } catch (error) {
          socket.emit('bet_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle cashout
      socket.on('cashout', async (data) => {
        try {
          const { userId, betId, multiplier } = data;
          const result = await gameEngine.processCashout(
            userId,
            betId,
            multiplier
          );
          socket.emit('cashout_success', result);
        } catch (error) {
          socket.emit('cashout_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle chat messages
      socket.on('chat_message', async (data) => {
        try {
          const { userId, message } = data;

          // Save to database
          const supabase = getSupabaseAdmin();
          const { data: chatMessage, error } = await supabase
            .from('chat_messages')
            .insert({
              user_id: userId, // This will be a UUID now
              message: message.trim().substring(0, 500), // Limit message length
            })
            .select(
              `
              id,
              message,
              created_at,
              users (
                name,
                email
              )
            `
            )
            .single();

          if (error) {
            socket.emit('chat_error', { error: 'Failed to send message' });
            return;
          }

          // Type assertion with proper structure
          const typedChatMessage = chatMessage as unknown as ChatMessageRecord;

          // Broadcast to all clients
          io.emit('chat_message', {
            id: typedChatMessage.id,
            message: typedChatMessage.message,
            user: {
              name:
                typedChatMessage.users?.name ||
                typedChatMessage.users?.email?.split('@')[0] ||
                'Anonymous',
              email: typedChatMessage.users?.email,
            },
            timestamp: typedChatMessage.created_at,
          });
        } catch (error) {
          socket.emit('chat_error', { error: 'Failed to send message' });
        }
      });

      socket.on('disconnect', () => {
        console.log('👤 User disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
    console.log('✅ Socket.IO server initialized');
  }

  res.end();
}
