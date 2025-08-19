import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GamePhase, type GameState, type PlayerBet } from './game-engine';

// Client-side game state interface
interface ClientGameState extends Omit<GameState, 'serverSeed'> {
  // Hide server seed from client
  isConnected: boolean;
  connectionError?: string;
  userBet?: PlayerBet;
  recentMultipliers: number[];
}

// Game state store interface
interface GameStateStore {
  // State
  gameState: ClientGameState | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setGameState: (state: Partial<ClientGameState>) => void;
  setUserBet: (bet: PlayerBet | undefined) => void;
  setConnectionStatus: (connected: boolean, error?: string) => void;
  addRecentMultiplier: (multiplier: number) => void;
  reset: () => void;

  // Computed values
  canPlaceBet: () => boolean;
  canCashout: () => boolean;
  getCurrentMultiplier: () => number;
  getBettingTimeLeft: () => number;
  getPotentialPayout: (betAmount: number) => number;
}

// Create the game state store
export const useGameState = create<GameStateStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: null,
    isLoading: true,
    error: null,

    // Actions
    setGameState: (newState) =>
      set((state) => ({
        gameState: state.gameState
          ? { ...state.gameState, ...newState }
          : {
              roundId: '',
              roundNumber: 0,
              phase: GamePhase.PREPARING,
              multiplier: 1.0,
              timeElapsed: 0,
              bettingTimeLeft: 0,
              crashMultiplier: 0,
              totalBets: 0,
              totalWagered: 0,
              activePlayers: 0,
              serverSeedHash: '',
              clientSeed: '',
              nonce: 0,
              startedAt: new Date(),
              bettingEndsAt: new Date(),
              isConnected: false,
              recentMultipliers: [],
              ...newState,
            },
        isLoading: false,
        error: null,
      })),

    setUserBet: (bet) =>
      set((state) => ({
        gameState: state.gameState
          ? { ...state.gameState, userBet: bet }
          : null,
      })),

    setConnectionStatus: (connected, error) =>
      set((state) => ({
        gameState: state.gameState
          ? {
              ...state.gameState,
              isConnected: connected,
              connectionError: error,
            }
          : null,
        error: error || null,
      })),

    addRecentMultiplier: (multiplier) =>
      set((state) => ({
        gameState: state.gameState
          ? {
              ...state.gameState,
              recentMultipliers: [
                multiplier,
                ...state.gameState.recentMultipliers.slice(0, 9),
              ],
            }
          : null,
      })),

    reset: () =>
      set({
        gameState: null,
        isLoading: true,
        error: null,
      }),

    // Computed values
    canPlaceBet: () => {
      const { gameState } = get();
      return Boolean(
        gameState?.isConnected &&
          gameState?.phase === GamePhase.BETTING &&
          gameState?.bettingTimeLeft > 0 &&
          !gameState?.userBet
      );
    },

    canCashout: () => {
      const { gameState } = get();
      return Boolean(
        gameState?.isConnected &&
          gameState?.phase === GamePhase.FLYING &&
          gameState?.userBet &&
          !gameState?.userBet.cashedOut
      );
    },

    getCurrentMultiplier: () => {
      const { gameState } = get();
      return gameState?.multiplier || 1.0;
    },

    getBettingTimeLeft: () => {
      const { gameState } = get();
      return gameState?.bettingTimeLeft || 0;
    },

    getPotentialPayout: (betAmount: number) => {
      const { gameState } = get();
      const multiplier = gameState?.multiplier || 1.0;
      return betAmount * multiplier;
    },
  }))
);

// Selectors for specific state slices
export const useGamePhase = () =>
  useGameState((state) => state.gameState?.phase || GamePhase.PREPARING);
export const useMultiplier = () =>
  useGameState((state) => state.gameState?.multiplier || 1.0);
export const useUserBet = () =>
  useGameState((state) => state.gameState?.userBet);
export const useConnectionStatus = () =>
  useGameState((state) => state.gameState?.isConnected || false);
export const useBettingTimeLeft = () =>
  useGameState((state) => state.gameState?.bettingTimeLeft || 0);
export const useRecentMultipliers = () =>
  useGameState((state) => state.gameState?.recentMultipliers || []);

// Game state persistence
export const persistGameState = () => {
  const state = useGameState.getState();
  if (state.gameState) {
    localStorage.setItem(
      'aviator-game-state',
      JSON.stringify({
        recentMultipliers: state.gameState.recentMultipliers,
        lastRoundId: state.gameState.roundId,
      })
    );
  }
};

export const restoreGameState = () => {
  try {
    const saved = localStorage.getItem('aviator-game-state');
    if (saved) {
      const { recentMultipliers } = JSON.parse(saved);
      useGameState.getState().setGameState({ recentMultipliers });
    }
  } catch (error) {
    console.error('Failed to restore game state:', error);
  }
};

// Subscribe to game state changes for persistence
useGameState.subscribe(
  (state) => state.gameState?.phase,
  (phase) => {
    if (phase === GamePhase.CRASHED) {
      persistGameState();
    }
  }
);
