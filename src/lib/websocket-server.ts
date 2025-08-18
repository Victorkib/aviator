import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { redis } from './redis';
import { supabaseAdmin } from './supabase';

export interface GameState {
  roundId: string;
  phase: 'betting' | 'flying' | 'crashed' | 'preparing';
  multiplier: number;
  timeElapsed: number;
  bettingTimeLeft: number;
  totalBets: number;
  totalWagered: number;
  activePlayers: number;
}

export interface PlayerBet {
  userId: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
}

export class GameWebSocketServer {
  private io: SocketIOServer;
  private currentGameState: GameState;
  private activeBets: Map<string, PlayerBet> = new Map();
  private gameInterval: NodeJS.Timeout | null = null;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin:
          process.env.NODE_ENV === 'production'
            ? ['https://your-domain.vercel.app']
            : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });

    this.currentGameState = {
      roundId: '',
      phase: 'preparing',
      multiplier: 1.0,
      timeElapsed: 0,
      bettingTimeLeft: 0,
      totalBets: 0,
      totalWagered: 0,
      activePlayers: 0,
    };

    this.setupEventHandlers();
    this.startGameLoop();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      // Send current game state immediately
      socket.emit('game-state', this.currentGameState);
      socket.emit('active-bets', Array.from(this.activeBets.values()));

      // Handle player bet
      socket.on(
        'place-bet',
        async (data: {
          userId: string;
          amount: number;
          autoCashout?: number;
        }) => {
          try {
            await this.handlePlayerBet(socket, data);
          } catch (error) {
            socket.emit('bet-error', { message: 'Failed to place bet' });
          }
        }
      );

      // Handle cashout
      socket.on('cashout', async (data: { userId: string }) => {
        try {
          await this.handleCashout(socket, data);
        } catch (error) {
          socket.emit('cashout-error', { message: 'Failed to cashout' });
        }
      });

      // Handle chat messages
      socket.on(
        'chat-message',
        async (data: { userId: string; message: string }) => {
          try {
            await this.handleChatMessage(data);
          } catch (error) {
            socket.emit('chat-error', { message: 'Failed to send message' });
          }
        }
      );

      socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
      });
    });
  }

  private async handlePlayerBet(
    socket: any,
    data: { userId: string; amount: number; autoCashout?: number }
  ) {
    // Validate betting phase
    if (this.currentGameState.phase !== 'betting') {
      socket.emit('bet-error', { message: 'Betting is closed' });
      return;
    }

    // Check if user already has a bet
    if (this.activeBets.has(data.userId)) {
      socket.emit('bet-error', { message: 'You already have an active bet' });
      return;
    }

    // Validate bet amount and user balance
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, username')
      .eq('id', data.userId)
      .single();

    if (!user || user.balance < data.amount) {
      socket.emit('bet-error', { message: 'Insufficient balance' });
      return;
    }

    // Deduct balance and create bet record
    const { error } = await supabaseAdmin.rpc('update_user_balance', {
      p_user_id: data.userId,
      p_amount: -data.amount,
      p_transaction_type: 'bet',
      p_description: `Bet for round ${this.currentGameState.roundId}`,
      p_round_id: this.currentGameState.roundId,
    });

    if (error) {
      socket.emit('bet-error', { message: 'Failed to process bet' });
      return;
    }

    // Add to active bets
    const playerBet: PlayerBet = {
      userId: data.userId,
      username: user.username || 'Anonymous',
      amount: data.amount,
      autoCashout: data.autoCashout,
      cashedOut: false,
    };

    this.activeBets.set(data.userId, playerBet);

    // Update game state
    this.currentGameState.totalBets += 1;
    this.currentGameState.totalWagered += data.amount;
    this.currentGameState.activePlayers = this.activeBets.size;

    // Broadcast updates
    this.io.emit('game-state', this.currentGameState);
    this.io.emit('new-bet', playerBet);
    socket.emit('bet-confirmed', playerBet);

    // Cache in Redis
    await redis.hset(
      `round:${this.currentGameState.roundId}:bets`,
      data.userId,
      JSON.stringify(playerBet)
    );
  }

  private async handleCashout(socket: any, data: { userId: string }) {
    // Validate flying phase
    if (this.currentGameState.phase !== 'flying') {
      socket.emit('cashout-error', { message: 'Cannot cashout now' });
      return;
    }

    const playerBet = this.activeBets.get(data.userId);
    if (!playerBet || playerBet.cashedOut) {
      socket.emit('cashout-error', { message: 'No active bet found' });
      return;
    }

    // Calculate payout
    const payout = playerBet.amount * this.currentGameState.multiplier;
    const profit = payout - playerBet.amount;

    // Update bet record
    playerBet.cashedOut = true;
    playerBet.cashoutMultiplier = this.currentGameState.multiplier;

    // Credit user balance
    const { error } = await supabaseAdmin.rpc('update_user_balance', {
      p_user_id: data.userId,
      p_amount: payout,
      p_transaction_type: 'win',
      p_description: `Cashout at ${this.currentGameState.multiplier}x`,
      p_round_id: this.currentGameState.roundId,
    });

    if (error) {
      socket.emit('cashout-error', { message: 'Failed to process cashout' });
      return;
    }

    // Update bet in database
    await supabaseAdmin
      .from('bets')
      .update({
        cashed_out: true,
        cashout_multiplier: this.currentGameState.multiplier,
        cashout_time_ms: this.currentGameState.timeElapsed,
        payout: payout,
        profit: profit,
      })
      .eq('user_id', data.userId)
      .eq('round_id', this.currentGameState.roundId);

    // Broadcast cashout
    this.io.emit('player-cashout', {
      userId: data.userId,
      username: playerBet.username,
      multiplier: this.currentGameState.multiplier,
      payout: payout,
    });

    socket.emit('cashout-success', {
      multiplier: this.currentGameState.multiplier,
      payout: payout,
      profit: profit,
    });

    // Update Redis
    await redis.hset(
      `round:${this.currentGameState.roundId}:bets`,
      data.userId,
      JSON.stringify(playerBet)
    );
  }

  private async handleChatMessage(data: { userId: string; message: string }) {
    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('username, display_name')
      .eq('id', data.userId)
      .single();

    if (!user) return;

    // Save to database
    const { data: chatMessage } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: data.userId,
        message: data.message.substring(0, 500), // Limit message length
      })
      .select()
      .single();

    if (chatMessage) {
      // Broadcast to all clients
      this.io.emit('chat-message', {
        id: chatMessage.id,
        username: user.username || user.display_name || 'Anonymous',
        message: data.message,
        timestamp: chatMessage.created_at,
      });
    }
  }

  private startGameLoop() {
    this.scheduleNextRound();
  }

  private async scheduleNextRound() {
    // Generate new round
    const roundId = crypto.randomUUID();
    const serverSeed = crypto.randomUUID();
    const clientSeed = 'client_seed_' + Date.now();
    const nonce = Math.floor(Math.random() * 1000000);

    // Calculate crash point
    const { data: crashPoint } = await supabaseAdmin.rpc(
      'calculate_crash_point',
      {
        p_server_seed: serverSeed,
        p_client_seed: clientSeed,
        p_nonce: nonce,
      }
    );

    this.currentGameState = {
      roundId,
      phase: 'betting',
      multiplier: 1.0,
      timeElapsed: 0,
      bettingTimeLeft: 10000, // 10 seconds
      totalBets: 0,
      totalWagered: 0,
      activePlayers: 0,
    };

    this.activeBets.clear();

    // Create round in database
    const bettingStartTime = new Date();
    const bettingEndTime = new Date(bettingStartTime.getTime() + 10000);
    const flightStartTime = new Date(bettingEndTime.getTime());
    const crashTime = new Date(flightStartTime.getTime() + crashPoint * 1000);

    await supabaseAdmin.from('game_rounds').insert({
      id: roundId,
      crash_multiplier: crashPoint,
      crash_time_ms: crashPoint * 1000,
      server_seed: serverSeed,
      server_seed_hash: await this.hashSeed(serverSeed),
      client_seed: clientSeed,
      nonce: nonce,
      betting_started_at: bettingStartTime.toISOString(),
      betting_ended_at: bettingEndTime.toISOString(),
      flight_started_at: flightStartTime.toISOString(),
      crashed_at: crashTime.toISOString(),
    });

    // Broadcast new round
    this.io.emit('new-round', this.currentGameState);

    // Start betting countdown
    this.startBettingPhase(crashPoint);
  }

  private startBettingPhase(crashPoint: number) {
    const bettingDuration = 10000; // 10 seconds
    const startTime = Date.now();

    const bettingInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.currentGameState.bettingTimeLeft = Math.max(
        0,
        bettingDuration - elapsed
      );

      this.io.emit('betting-update', {
        timeLeft: this.currentGameState.bettingTimeLeft,
      });

      if (elapsed >= bettingDuration) {
        clearInterval(bettingInterval);
        this.startFlightPhase(crashPoint);
      }
    }, 100); // Update every 100ms
  }

  private startFlightPhase(crashPoint: number) {
    this.currentGameState.phase = 'flying';
    this.currentGameState.multiplier = 1.0;
    this.currentGameState.timeElapsed = 0;

    const flightStartTime = Date.now();

    const flightInterval = setInterval(() => {
      const elapsed = Date.now() - flightStartTime;
      this.currentGameState.timeElapsed = elapsed;

      // Calculate current multiplier (exponential growth)
      this.currentGameState.multiplier = Math.pow(1.0024, elapsed / 10); // Grows ~1% every 100ms

      // Check for auto-cashouts
      this.processAutoCashouts();

      // Broadcast multiplier update
      this.io.emit('multiplier-update', {
        multiplier: this.currentGameState.multiplier,
        timeElapsed: elapsed,
      });

      // Check if we should crash
      if (this.currentGameState.multiplier >= crashPoint) {
        clearInterval(flightInterval);
        this.crashRound(crashPoint);
      }
    }, 50); // Update every 50ms for smooth animation
  }

  private async processAutoCashouts() {
    for (const [userId, bet] of this.activeBets.entries()) {
      if (
        !bet.cashedOut &&
        bet.autoCashout &&
        this.currentGameState.multiplier >= bet.autoCashout
      ) {
        // Auto cashout this player
        await this.handleCashout({ emit: () => {} }, { userId });
      }
    }
  }

  private async crashRound(crashPoint: number) {
    this.currentGameState.phase = 'crashed';
    this.currentGameState.multiplier = crashPoint;

    // Broadcast crash
    this.io.emit('game-crashed', {
      crashMultiplier: crashPoint,
      roundId: this.currentGameState.roundId,
    });

    // Process losing bets (players who didn't cash out)
    for (const [userId, bet] of this.activeBets.entries()) {
      if (!bet.cashedOut) {
        // Update bet as lost
        await supabaseAdmin
          .from('bets')
          .update({
            cashed_out: false,
            payout: 0,
            profit: -bet.amount,
          })
          .eq('user_id', userId)
          .eq('round_id', this.currentGameState.roundId);
      }
    }

    // Wait 3 seconds then start next round
    setTimeout(() => {
      this.scheduleNextRound();
    }, 3000);
  }

  private async hashSeed(seed: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
