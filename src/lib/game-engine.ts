import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';
import { createHash, randomBytes } from 'crypto';

export enum GamePhase {
  PREPARING = 'preparing',
  BETTING = 'betting',
  FLYING = 'flying',
  CRASHED = 'crashed',
}

export interface GameState {
  roundId: string;
  roundNumber: number;
  phase: GamePhase;
  multiplier: number;
  timeElapsed: number;
  bettingTimeLeft: number;
  crashMultiplier?: number;
  totalBets: number;
  totalWagered: number;
  activePlayers: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  startedAt: Date;
  bettingEndsAt?: Date;
}

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

export class GameEngine {
  private currentRound: GameState | null = null;
  private isRunning = false;
  private roundTimer: NodeJS.Timeout | null = null;
  private multiplierTimer: NodeJS.Timeout | null = null;
  private bettingTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeEngine();
  }

  private async initializeEngine() {
    console.log('🎮 Initializing Game Engine...');

    // Load current round from database
    await this.loadCurrentRound();

    // Start the game loop
    this.startGameLoop();
  }

  private async loadCurrentRound() {
    try {
      const supabase = getSupabaseAdmin();

      const { data: roundData, error } = await supabase.rpc(
        'get_current_game_state'
      );

      if (error) {
        console.error('Error loading current round:', error);
        return;
      }

      if (roundData && roundData.length > 0) {
        const round = roundData[0];
        this.currentRound = {
          roundId: round.round_id,
          roundNumber: round.round_number,
          phase: round.phase as GamePhase,
          multiplier: round.multiplier || 1.0,
          timeElapsed: 0,
          bettingTimeLeft: 0,
          crashMultiplier: round.crash_multiplier,
          totalBets: round.total_bets || 0,
          totalWagered: Number(round.total_wagered) || 0,
          activePlayers: 0,
          serverSeedHash: round.server_seed_hash,
          clientSeed: round.client_seed,
          nonce: round.nonce,
          startedAt: new Date(round.betting_started_at || Date.now()),
          bettingEndsAt: round.betting_ended_at
            ? new Date(round.betting_ended_at)
            : undefined,
        };

        console.log(
          `📊 Loaded current round: ${this.currentRound.roundNumber} (${this.currentRound.phase})`
        );
      }
    } catch (error) {
      console.error('Failed to load current round:', error);
    }
  }

  private startGameLoop() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Starting game loop...');

    this.processGameCycle();
  }

  private async processGameCycle() {
    try {
      if (!this.currentRound || this.currentRound.phase === GamePhase.CRASHED) {
        await this.startNewRound();
      } else {
        await this.continueCurrentRound();
      }
    } catch (error) {
      console.error('Error in game cycle:', error);
    }

    // Schedule next cycle
    this.roundTimer = setTimeout(() => {
      this.processGameCycle();
    }, 1000); // Run every second
  }

  private async startNewRound() {
    console.log('🆕 Starting new round...');

    try {
      // Clear any existing timers
      this.clearAllTimers();

      const supabase = getSupabaseAdmin();

      // Generate new round data with provably fair seeds
      const serverSeed = randomBytes(32).toString('hex');
      const serverSeedHash = createHash('sha256')
        .update(serverSeed)
        .digest('hex');
      const clientSeed = randomBytes(16).toString('hex');
      const nonce = Math.floor(Math.random() * 1000000);

      // Get next round number
      const { data: lastRound } = await supabase
        .from('game_rounds')
        .select('round_number')
        .order('round_number', { ascending: false })
        .limit(1)
        .single();

      const nextRoundNumber = (lastRound?.round_number || 0) + 1;

      // Create new round
      const { data: newRound, error } = await supabase
        .from('game_rounds')
        .insert({
          round_number: nextRoundNumber,
          phase: GamePhase.BETTING,
          server_seed: serverSeed,
          server_seed_hash: serverSeedHash,
          client_seed: clientSeed,
          nonce,
          betting_started_at: new Date().toISOString(),
          betting_ended_at: new Date(Date.now() + 10000).toISOString(), // 10 seconds betting
          total_bets: 0,
          total_wagered: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating new round:', error);
        return;
      }

      this.currentRound = {
        roundId: newRound.id,
        roundNumber: newRound.round_number,
        phase: GamePhase.BETTING,
        multiplier: 1.0,
        timeElapsed: 0,
        bettingTimeLeft: 10000,
        totalBets: 0,
        totalWagered: 0,
        activePlayers: 0,
        serverSeedHash,
        clientSeed,
        nonce,
        startedAt: new Date(newRound.betting_started_at),
        bettingEndsAt: new Date(newRound.betting_ended_at),
      };

      // Cache the new round
      await CacheManager.setGameState({
        roundId: this.currentRound.roundId,
        roundNumber: this.currentRound.roundNumber,
        phase: this.currentRound.phase,
        multiplier: this.currentRound.multiplier,
        timeElapsed: this.currentRound.timeElapsed,
        bettingTimeLeft: this.currentRound.bettingTimeLeft,
        totalBets: 0,
        totalWagered: 0,
        activePlayers: 0,
        serverSeedHash,
        clientSeed,
        nonce,
        startedAt: this.currentRound.startedAt.toISOString(),
        bettingEndsAt: this.currentRound.bettingEndsAt?.toISOString(),
      });

      console.log(`🎯 New round ${nextRoundNumber} started (betting phase)`);
    } catch (error) {
      console.error('Failed to start new round:', error);
    }
  }

  private async continueCurrentRound() {
    if (!this.currentRound) return;

    const now = new Date();

    switch (this.currentRound.phase) {
      case GamePhase.BETTING:
        if (
          this.currentRound.bettingEndsAt &&
          now >= this.currentRound.bettingEndsAt
        ) {
          await this.startFlight();
        } else if (this.currentRound.bettingEndsAt) {
          this.currentRound.bettingTimeLeft = Math.max(
            0,
            this.currentRound.bettingEndsAt.getTime() - now.getTime()
          );
        }
        break;

      case GamePhase.FLYING:
        await this.updateFlight();
        break;
    }
  }

  private async startFlight() {
    if (!this.currentRound) return;

    console.log(
      `🚀 Starting flight for round ${this.currentRound.roundNumber}`
    );

    try {
      const supabase = getSupabaseAdmin();

      // Generate crash multiplier using provably fair algorithm
      const crashMultiplier = this.generateCrashMultiplier(
        this.currentRound.serverSeedHash,
        this.currentRound.clientSeed,
        this.currentRound.nonce
      );

      const flightStartedAt = new Date();

      // Update round in database
      const { error } = await supabase
        .from('game_rounds')
        .update({
          phase: GamePhase.FLYING,
          flight_started_at: flightStartedAt.toISOString(),
          crash_multiplier: crashMultiplier,
        })
        .eq('id', this.currentRound.roundId);

      if (error) {
        console.error('Error starting flight:', error);
        return;
      }

      this.currentRound.phase = GamePhase.FLYING;
      this.currentRound.crashMultiplier = crashMultiplier;
      this.currentRound.timeElapsed = 0;
      this.currentRound.bettingTimeLeft = 0;

      console.log(
        `✈️ Flight started! Will crash at ${crashMultiplier.toFixed(2)}x`
      );
    } catch (error) {
      console.error('Failed to start flight:', error);
    }
  }

  private async updateFlight() {
    if (!this.currentRound || !this.currentRound.crashMultiplier) return;

    this.currentRound.timeElapsed += 1000; // Increment by 1 second

    // Improved multiplier calculation for realistic growth
    const timeInSeconds = this.currentRound.timeElapsed / 1000;
    this.currentRound.multiplier = Math.max(
      1.0,
      1 + timeInSeconds * 0.1 + Math.pow(timeInSeconds / 10, 1.8)
    );

    // Round to 2 decimal places
    this.currentRound.multiplier =
      Math.round(this.currentRound.multiplier * 100) / 100;

    // Check if we should crash
    if (this.currentRound.multiplier >= this.currentRound.crashMultiplier) {
      await this.crashFlight();
      return;
    }

    // Update cache with current multiplier
    await CacheManager.setGameState({
      roundId: this.currentRound.roundId,
      roundNumber: this.currentRound.roundNumber,
      phase: this.currentRound.phase,
      multiplier: this.currentRound.multiplier,
      timeElapsed: this.currentRound.timeElapsed,
      bettingTimeLeft: 0,
      crashMultiplier: this.currentRound.crashMultiplier,
      totalBets: this.currentRound.totalBets,
      totalWagered: this.currentRound.totalWagered,
      activePlayers: this.currentRound.activePlayers,
      serverSeedHash: this.currentRound.serverSeedHash,
      clientSeed: this.currentRound.clientSeed,
      nonce: this.currentRound.nonce,
      startedAt: this.currentRound.startedAt.toISOString(),
      bettingEndsAt: this.currentRound.bettingEndsAt?.toISOString(),
    });
  }

  private async crashFlight() {
    if (!this.currentRound) return;

    console.log(
      `💥 Flight crashed at ${this.currentRound.crashMultiplier?.toFixed(2)}x`
    );

    try {
      const supabase = getSupabaseAdmin();

      const crashedAt = new Date();

      // Update round in database
      const { error } = await supabase
        .from('game_rounds')
        .update({
          phase: GamePhase.CRASHED,
          crashed_at: crashedAt.toISOString(),
        })
        .eq('id', this.currentRound.roundId);

      if (error) {
        console.error('Error crashing flight:', error);
        return;
      }

      this.currentRound.phase = GamePhase.CRASHED;
      this.currentRound.multiplier = this.currentRound.crashMultiplier!;

      // Process any remaining auto-cashouts
      await this.processAutoCashouts();

      console.log(`🏁 Round ${this.currentRound.roundNumber} completed`);
    } catch (error) {
      console.error('Failed to crash flight:', error);
    }
  }

  private async processAutoCashouts() {
    if (!this.currentRound || !this.currentRound.crashMultiplier) return;

    try {
      const supabase = getSupabaseAdmin();

      // Get all uncashed bets with auto-cashout set for this round
      const { data: bets, error } = await supabase
        .from('bets')
        .select('*')
        .eq('round_id', this.currentRound.roundId)
        .eq('cashed_out', false)
        .not('auto_cashout', 'is', null)
        .lte('auto_cashout', this.currentRound.crashMultiplier);

      if (error) {
        console.error('Error fetching auto-cashout bets:', error);
        return;
      }

      // Process each auto-cashout
      for (const bet of bets || []) {
        if (
          bet.auto_cashout &&
          bet.auto_cashout <= this.currentRound.crashMultiplier
        ) {
          await supabase.rpc('process_cashout', {
            p_user_id: bet.user_id,
            p_bet_id: bet.id,
            p_multiplier: bet.auto_cashout,
          });

          console.log(
            `🤖 Auto-cashed out bet ${bet.id} at ${bet.auto_cashout}x`
          );
        }
      }
    } catch (error) {
      console.error('Failed to process auto-cashouts:', error);
    }
  }

  private generateCrashMultiplier(
    serverSeedHash: string,
    clientSeed: string,
    nonce: number
  ): number {
    // Provably fair crash multiplier generation
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
  }

  private clearAllTimers() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.multiplierTimer) {
      clearTimeout(this.multiplierTimer);
      this.multiplierTimer = null;
    }
    if (this.bettingTimer) {
      clearTimeout(this.bettingTimer);
      this.bettingTimer = null;
    }
  }

  public async getGameStatistics() {
    try {
      const supabase = getSupabaseAdmin();

      const { data: statsData, error } = await supabase.rpc(
        'get_game_statistics'
      );

      if (error) {
        console.error('Error fetching game statistics:', error);
        return null;
      }

      const stats = statsData && statsData.length > 0 ? statsData[0] : null;
      if (!stats) return null;

      return {
        totalRounds: Number(stats.total_rounds),
        totalPlayers: Number(stats.total_players),
        totalWagered: Number(stats.total_wagered),
        averageMultiplier: Number(stats.average_multiplier),
        highestMultiplier: Number(stats.highest_multiplier),
      };
    } catch (error) {
      console.error('Failed to get game statistics:', error);
      return null;
    }
  }

  public getCurrentRound(): GameState | null {
    return this.currentRound;
  }

  public stop() {
    this.isRunning = false;
    this.clearAllTimers();
    console.log('🛑 Game engine stopped');
  }
}

// Singleton instance
let gameEngineInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    gameEngineInstance = new GameEngine();
  }
  return gameEngineInstance;
}
