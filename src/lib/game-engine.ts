import { createClient } from '@supabase/supabase-js';
import { CacheManager } from './redis';
import type { Database } from '@/types/database';

// Game configuration constants
export const GAME_CONFIG = {
  BETTING_DURATION_MS: 10000, // 10 seconds
  MIN_FLIGHT_DURATION_MS: 1000, // 1 second minimum
  MAX_FLIGHT_DURATION_MS: 60000, // 60 seconds maximum
  MIN_BET_AMOUNT: 1.0,
  MAX_BET_AMOUNT: 1000.0,
  MIN_MULTIPLIER: 1.01,
  MAX_MULTIPLIER: 1000.0,
  HOUSE_EDGE: 0.01, // 1%
  AUTO_CASHOUT_PRECISION: 0.01,
} as const;

// Game phase enum
export enum GamePhase {
  PREPARING = 'preparing',
  BETTING = 'betting',
  FLYING = 'flying',
  CRASHED = 'crashed',
}

// Game state interface
export interface GameState {
  roundId: string;
  roundNumber: number;
  phase: GamePhase;
  multiplier: number;
  timeElapsed: number;
  bettingTimeLeft: number;
  crashMultiplier: number;
  totalBets: number;
  totalWagered: number;
  activePlayers: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  startedAt: Date;
  bettingEndsAt: Date;
  crashedAt?: Date;
}

// Player bet interface
export interface PlayerBet {
  id: string;
  userId: string;
  roundId: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  cashoutTime?: number;
  payout: number;
  profit: number;
  createdAt: Date;
}

// Game round result interface
export interface GameRoundResult {
  roundId: string;
  crashMultiplier: number;
  totalBets: number;
  totalWagered: number;
  totalPaidOut: number;
  winners: Array<{
    userId: string;
    username: string;
    betAmount: number;
    cashoutMultiplier: number;
    payout: number;
    profit: number;
  }>;
  losers: Array<{
    userId: string;
    username: string;
    betAmount: number;
    loss: number;
  }>;
}

export class GameEngine {
  private supabase: ReturnType<typeof createClient<Database>>;
  private currentState: GameState | null = null;
  private activeBets: Map<string, PlayerBet> = new Map();
  private gameTimer: NodeJS.Timeout | null = null;
  private subscribers: Set<(state: GameState) => void> = new Set();

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }

  // Subscribe to game state changes
  public subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.add(callback);

    // Send current state immediately if available
    if (this.currentState) {
      callback(this.currentState);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Broadcast state to all subscribers
  private broadcastState(): void {
    if (this.currentState) {
      this.subscribers.forEach((callback) => callback(this.currentState!));
    }
  }

  // Generate cryptographically secure seeds
  private async generateSeeds(): Promise<{
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }> {
    const serverSeed = crypto.randomUUID() + crypto.randomUUID();
    const clientSeed = `client_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;
    const nonce = Math.floor(Math.random() * 1000000);

    try {
      // Create hash of server seed for transparency
      const encoder = new TextEncoder();
      const data = encoder.encode(serverSeed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const serverSeedHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return {
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
      };
    } catch {
      // Fallback for environments without crypto.subtle
      const serverSeedHash = btoa(serverSeed).substring(0, 64);
      return {
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
      };
    }
  }

  // Calculate crash point using provably fair algorithm
  public static calculateCrashPoint(
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): number {
    // Create combined seed
    const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;

    // Simple hash function for demo (in production, use proper crypto)
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      const char = combinedSeed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive number and normalize
    const normalized = Math.abs(hash) / Math.pow(2, 31);

    // 1% chance of instant crash (house edge)
    if (normalized < GAME_CONFIG.HOUSE_EDGE) {
      return 1.0;
    }

    // Calculate crash point with exponential distribution
    const crashPoint = 1 / (1 - normalized * (1 - GAME_CONFIG.HOUSE_EDGE));

    // Clamp to reasonable bounds
    return Math.max(
      GAME_CONFIG.MIN_MULTIPLIER,
      Math.min(GAME_CONFIG.MAX_MULTIPLIER, Math.floor(crashPoint * 100) / 100)
    );
  }

  // Get game statistics
  public async getGameStats(): Promise<{
    totalRounds: number;
    totalPlayers: number;
    totalWagered: number;
    averageMultiplier: number;
    highestMultiplier: number;
  }> {
    try {
      const { data: statsData } = await this.supabase.rpc(
        'get_game_statistics'
      );
      const stats = statsData && statsData.length > 0 ? statsData[0] : null;

      return {
        totalRounds: stats?.total_rounds || 0,
        totalPlayers: stats?.total_players || 0,
        totalWagered: stats?.total_wagered || 0,
        averageMultiplier: stats?.average_multiplier || 0,
        highestMultiplier: stats?.highest_multiplier || 0,
      };
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return {
        totalRounds: 0,
        totalPlayers: 0,
        totalWagered: 0,
        averageMultiplier: 0,
        highestMultiplier: 0,
      };
    }
  }

  // Start a new game round
  public async startNewRound(): Promise<void> {
    try {
      // Generate seeds for this round
      const seeds = await this.generateSeeds();

      // Calculate crash point
      const crashMultiplier = GameEngine.calculateCrashPoint(
        seeds.serverSeed,
        seeds.clientSeed,
        seeds.nonce
      );

      // Create new round in database
      const { data: round, error } = await this.supabase
        .from('game_rounds')
        .insert({
          crash_multiplier: crashMultiplier,
          crash_time_ms: this.calculateCrashTime(crashMultiplier),
          server_seed: seeds.serverSeed,
          server_seed_hash: seeds.serverSeedHash,
          client_seed: seeds.clientSeed,
          nonce: seeds.nonce,
          betting_started_at: new Date().toISOString(),
          betting_ended_at: new Date(
            Date.now() + GAME_CONFIG.BETTING_DURATION_MS
          ).toISOString(),
          flight_started_at: new Date(
            Date.now() + GAME_CONFIG.BETTING_DURATION_MS
          ).toISOString(),
          crashed_at: new Date(
            Date.now() +
              GAME_CONFIG.BETTING_DURATION_MS +
              this.calculateCrashTime(crashMultiplier)
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize game state
      this.currentState = {
        roundId: round.id,
        roundNumber: round.round_number,
        phase: GamePhase.BETTING,
        multiplier: 1.0,
        timeElapsed: 0,
        bettingTimeLeft: GAME_CONFIG.BETTING_DURATION_MS,
        crashMultiplier,
        totalBets: 0,
        totalWagered: 0,
        activePlayers: 0,
        serverSeed: seeds.serverSeed,
        serverSeedHash: seeds.serverSeedHash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
        startedAt: new Date(),
        bettingEndsAt: new Date(Date.now() + GAME_CONFIG.BETTING_DURATION_MS),
      };

      // Clear previous bets
      this.activeBets.clear();

      // Cache initial state
      await CacheManager.cacheGameRound(round.id, {
        id: round.id,
        roundNumber: round.round_number,
        crashMultiplier,
        phase: GamePhase.BETTING,
        totalBets: 0,
        totalWagered: 0,
      });

      // Start betting phase
      this.startBettingPhase();

      console.log(
        `🎮 New round started: ${round.id} (crash at ${crashMultiplier}x)`
      );
    } catch (error) {
      console.error('Failed to start new round:', error);
      throw error;
    }
  }

  // Calculate crash time based on multiplier
  private calculateCrashTime(crashMultiplier: number): number {
    // Exponential growth: multiplier = 1.0024^(time/10)
    // Solving for time: time = log(multiplier) / log(1.0024) * 10
    const timeMs = (Math.log(crashMultiplier) / Math.log(1.0024)) * 10;

    return Math.max(
      GAME_CONFIG.MIN_FLIGHT_DURATION_MS,
      Math.min(GAME_CONFIG.MAX_FLIGHT_DURATION_MS, Math.floor(timeMs))
    );
  }

  // Start betting phase
  private startBettingPhase(): void {
    if (!this.currentState) return;

    this.currentState.phase = GamePhase.BETTING;
    this.broadcastState();

    // Countdown timer for betting phase
    const bettingInterval = setInterval(() => {
      if (!this.currentState) {
        clearInterval(bettingInterval);
        return;
      }

      this.currentState.bettingTimeLeft = Math.max(
        0,
        this.currentState.bettingEndsAt.getTime() - Date.now()
      );

      this.broadcastState();

      // End betting phase when time runs out
      if (this.currentState.bettingTimeLeft <= 0) {
        clearInterval(bettingInterval);
        this.startFlightPhase();
      }
    }, 100); // Update every 100ms for smooth countdown
  }

  // Start flight phase
  private startFlightPhase(): void {
    if (!this.currentState) return;

    this.currentState.phase = GamePhase.FLYING;
    this.currentState.multiplier = 1.0;
    this.currentState.timeElapsed = 0;

    const flightStartTime = Date.now();
    const crashTime = this.calculateCrashTime(
      this.currentState.crashMultiplier
    );

    this.broadcastState();

    // Flight animation loop
    const flightInterval = setInterval(() => {
      if (!this.currentState) {
        clearInterval(flightInterval);
        return;
      }

      this.currentState.timeElapsed = Date.now() - flightStartTime;

      // Calculate current multiplier using exponential growth
      this.currentState.multiplier = Math.pow(
        1.0024,
        this.currentState.timeElapsed / 10
      );

      // Process auto-cashouts
      this.processAutoCashouts();

      this.broadcastState();

      // Check if we should crash
      if (this.currentState.timeElapsed >= crashTime) {
        clearInterval(flightInterval);
        this.crashRound();
      }
    }, 50); // Update every 50ms for smooth animation
  }

  // Process auto-cashouts during flight
  private async processAutoCashouts(): Promise<void> {
    if (!this.currentState) return;

    const currentMultiplier = this.currentState.multiplier;

    for (const [userId, bet] of this.activeBets.entries()) {
      if (
        !bet.cashedOut &&
        bet.autoCashout &&
        currentMultiplier >= bet.autoCashout
      ) {
        await this.cashoutPlayer(userId, bet.autoCashout);
      }
    }
  }

  // Crash the round and process results
  private async crashRound(): Promise<void> {
    if (!this.currentState) return;

    this.currentState.phase = GamePhase.CRASHED;
    this.currentState.multiplier = this.currentState.crashMultiplier;
    this.currentState.crashedAt = new Date();

    this.broadcastState();

    try {
      // Process all remaining bets as losses
      const losers: GameRoundResult['losers'] = [];
      const winners: GameRoundResult['winners'] = [];

      for (const bet of this.activeBets.values()) {
        if (bet.cashedOut) {
          // Already processed as winner
          const { data: user } = await this.supabase
            .from('users')
            .select('username')
            .eq('id', bet.userId)
            .single();

          winners.push({
            userId: bet.userId,
            username: user?.username || 'Anonymous',
            betAmount: bet.amount,
            cashoutMultiplier: bet.cashoutMultiplier!,
            payout: bet.payout,
            profit: bet.profit,
          });
        } else {
          // Process as loser
          const { data: user } = await this.supabase
            .from('users')
            .select('username')
            .eq('id', bet.userId)
            .single();

          losers.push({
            userId: bet.userId,
            username: user?.username || 'Anonymous',
            betAmount: bet.amount,
            loss: bet.amount,
          });

          // Update bet record as lost
          await this.supabase
            .from('bets')
            .update({
              cashed_out: false,
              payout: 0,
              profit: -bet.amount,
            })
            .eq('id', bet.id);
        }
      }

      // Update round statistics
      const totalPaidOut = winners.reduce(
        (sum, winner) => sum + winner.payout,
        0
      );

      await this.supabase
        .from('game_rounds')
        .update({
          total_bets: this.currentState.totalBets,
          total_wagered: this.currentState.totalWagered,
          total_paid_out: totalPaidOut,
        })
        .eq('id', this.currentState.roundId);

      const result: GameRoundResult = {
        roundId: this.currentState.roundId,
        crashMultiplier: this.currentState.crashMultiplier,
        totalBets: this.currentState.totalBets,
        totalWagered: this.currentState.totalWagered,
        totalPaidOut,
        winners,
        losers,
      };

      console.log(
        `💥 Round crashed at ${this.currentState.crashMultiplier}x`,
        result
      );

      // Wait 3 seconds then start new round
      setTimeout(() => {
        this.startNewRound();
      }, 3000);
    } catch (error) {
      console.error('Error processing crash:', error);
    }
  }

  // Place a bet for a player
  public async placeBet(
    userId: string,
    amount: number,
    autoCashout?: number
  ): Promise<{ success: boolean; message: string; bet?: PlayerBet }> {
    if (!this.currentState || this.currentState.phase !== GamePhase.BETTING) {
      return { success: false, message: 'Betting is not currently open' };
    }

    // Validate bet amount
    if (
      amount < GAME_CONFIG.MIN_BET_AMOUNT ||
      amount > GAME_CONFIG.MAX_BET_AMOUNT
    ) {
      return {
        success: false,
        message: `Bet amount must be between $${GAME_CONFIG.MIN_BET_AMOUNT} and $${GAME_CONFIG.MAX_BET_AMOUNT}`,
      };
    }

    // Check if user already has a bet this round
    if (this.activeBets.has(userId)) {
      return {
        success: false,
        message: 'You already have a bet in this round',
      };
    }

    // Validate auto-cashout
    if (autoCashout && autoCashout < GAME_CONFIG.MIN_MULTIPLIER) {
      return {
        success: false,
        message: `Auto-cashout must be at least ${GAME_CONFIG.MIN_MULTIPLIER}x`,
      };
    }

    try {
      // Check user balance and deduct bet amount
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      if (user.balance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Deduct balance using the stored procedure
      const { error: balanceError } = await this.supabase.rpc(
        'update_user_balance',
        {
          p_user_id: userId,
          p_amount: -amount,
          p_transaction_type: 'bet',
          p_description: `Bet for round ${this.currentState.roundId}`,
          p_round_id: this.currentState.roundId,
        }
      );

      if (balanceError) {
        return { success: false, message: 'Failed to process bet' };
      }

      // Create bet record
      const { data: bet, error: betError } = await this.supabase
        .from('bets')
        .insert({
          user_id: userId,
          round_id: this.currentState.roundId,
          amount,
          auto_cashout_multiplier: autoCashout,
          cashed_out: false,
          payout: 0,
          profit: -amount, // Initially negative (the bet amount)
        })
        .select()
        .single();

      if (betError || !bet) {
        return { success: false, message: 'Failed to create bet record' };
      }

      // Add to active bets
      const playerBet: PlayerBet = {
        id: bet.id,
        userId,
        roundId: this.currentState.roundId,
        amount,
        autoCashout,
        cashedOut: false,
        payout: 0,
        profit: -amount,
        createdAt: new Date(bet.created_at),
      };

      this.activeBets.set(userId, playerBet);

      // Update game state
      this.currentState.totalBets += 1;
      this.currentState.totalWagered += amount;
      this.currentState.activePlayers = this.activeBets.size;

      // Cache bet data
      await CacheManager.setPlayerBet(this.currentState.roundId, userId, {
        amount,
        autoCashout,
        cashedOut: false,
        timestamp: Date.now(),
      });

      this.broadcastState();

      return {
        success: true,
        message: 'Bet placed successfully',
        bet: playerBet,
      };
    } catch (error) {
      console.error('Error placing bet:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Cash out a player
  public async cashoutPlayer(
    userId: string,
    multiplier?: number
  ): Promise<{ success: boolean; message: string; payout?: number }> {
    if (!this.currentState || this.currentState.phase !== GamePhase.FLYING) {
      return { success: false, message: 'Cannot cash out at this time' };
    }

    const bet = this.activeBets.get(userId);
    if (!bet || bet.cashedOut) {
      return { success: false, message: 'No active bet found' };
    }

    const cashoutMultiplier = multiplier || this.currentState.multiplier;
    const payout = bet.amount * cashoutMultiplier;
    const profit = payout - bet.amount;

    try {
      // Credit user balance
      const { error: balanceError } = await this.supabase.rpc(
        'update_user_balance',
        {
          p_user_id: userId,
          p_amount: payout,
          p_transaction_type: 'win',
          p_description: `Cashout at ${cashoutMultiplier.toFixed(2)}x`,
          p_round_id: this.currentState.roundId,
        }
      );

      if (balanceError) {
        return { success: false, message: 'Failed to process cashout' };
      }

      // Update bet record
      await this.supabase
        .from('bets')
        .update({
          cashed_out: true,
          cashout_multiplier: cashoutMultiplier,
          cashout_time_ms: this.currentState.timeElapsed,
          payout,
          profit,
        })
        .eq('id', bet.id);

      // Update local bet state
      bet.cashedOut = true;
      bet.cashoutMultiplier = cashoutMultiplier;
      bet.cashoutTime = this.currentState.timeElapsed;
      bet.payout = payout;
      bet.profit = profit;

      // Update cache
      await CacheManager.setPlayerBet(this.currentState.roundId, userId, {
        ...bet,
        cashedOut: true,
        cashoutMultiplier,
        payout,
        profit,
      });

      console.log(
        `💰 Player ${userId} cashed out at ${cashoutMultiplier.toFixed(
          2
        )}x for $${payout.toFixed(2)}`
      );

      return { success: true, message: 'Cashed out successfully', payout };
    } catch (error) {
      console.error('Error processing cashout:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Get current game state
  public getCurrentState(): GameState | null {
    return this.currentState;
  }

  // Get active bets for current round
  public getActiveBets(): PlayerBet[] {
    return Array.from(this.activeBets.values());
  }

  // Stop the game engine
  public stop(): void {
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    this.subscribers.clear();
    this.activeBets.clear();
    this.currentState = null;
  }
}
