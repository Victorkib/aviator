import { Redis } from '@upstash/redis';

// Remove the env.mjs import and use process.env directly
if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  throw new Error('Missing Upstash Redis environment variables');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Cache keys for organized data storage
export const CACHE_KEYS = {
  USER_BALANCE: (userId: string) => `user:${userId}:balance`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  GAME_ROUND: (roundId: string) => `round:${roundId}`,
  ACTIVE_BETS: (roundId: string) => `round:${roundId}:bets`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  RATE_LIMIT: (ip: string, action: string) => `rate_limit:${ip}:${action}`,
  LEADERBOARD: (period: string) => `leaderboard:${period}`,
  GAME_STATS: 'game:stats',
} as const;

// Define proper types for cached data
interface UserProfile {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  balance: number;
  status: string;
}

interface GameRoundData {
  id: string;
  roundNumber: number;
  crashMultiplier: number;
  phase: string;
  totalBets: number;
  totalWagered: number;
}

interface GameStats {
  totalRounds: number;
  totalPlayers: number;
  totalWagered: number;
  averageMultiplier: number;
  lastUpdated: string;
}

interface SessionData {
  userId: string;
  email: string;
  username?: string;
  loginTime: string;
  lastActivity: string;
}

// Cache utilities for common operations
export class CacheManager {
  // User balance caching (important for game performance)
  static async getUserBalance(userId: string): Promise<number | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.USER_BALANCE(userId));
      return cached ? Number(cached) : null;
    } catch (error) {
      console.error('Redis getUserBalance error:', error);
      return null;
    }
  }

  static async setUserBalance(
    userId: string,
    balance: number,
    ttl = 300
  ): Promise<void> {
    try {
      await redis.setex(
        CACHE_KEYS.USER_BALANCE(userId),
        ttl,
        balance.toString()
      );
    } catch (error) {
      console.error('Redis setUserBalance error:', error);
    }
  }

  static async invalidateUserBalance(userId: string): Promise<void> {
    try {
      await redis.del(CACHE_KEYS.USER_BALANCE(userId));
    } catch (error) {
      console.error('Redis invalidateUserBalance error:', error);
    }
  }

  // User profile caching
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.USER_PROFILE(userId));
      return cached ? (JSON.parse(cached as string) as UserProfile) : null;
    } catch (error) {
      console.error('Redis getUserProfile error:', error);
      return null;
    }
  }

  static async setUserProfile(
    userId: string,
    profile: UserProfile,
    ttl = 600
  ): Promise<void> {
    try {
      await redis.setex(
        CACHE_KEYS.USER_PROFILE(userId),
        ttl,
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error('Redis setUserProfile error:', error);
    }
  }

  // Game round caching
  static async cacheGameRound(
    roundId: string,
    roundData: GameRoundData,
    ttl = 3600
  ): Promise<void> {
    try {
      await redis.setex(
        CACHE_KEYS.GAME_ROUND(roundId),
        ttl,
        JSON.stringify(roundData)
      );
    } catch (error) {
      console.error('Redis cacheGameRound error:', error);
    }
  }

  static async getGameRound(roundId: string): Promise<GameRoundData | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.GAME_ROUND(roundId));
      return cached ? (JSON.parse(cached as string) as GameRoundData) : null;
    } catch (error) {
      console.error('Redis getGameRound error:', error);
      return null;
    }
  }

  // Rate limiting for security
  static async checkRateLimit(
    ip: string,
    action: string,
    limit: number,
    window: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = CACHE_KEYS.RATE_LIMIT(ip, action);
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, window);
      }

      const ttl = await redis.ttl(key);
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      const resetTime = Date.now() + ttl * 1000;

      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('Redis checkRateLimit error:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + window * 1000,
      };
    }
  }

  // Session management
  static async setUserSession(
    sessionId: string,
    userData: SessionData,
    ttl = 86400
  ): Promise<void> {
    try {
      await redis.setex(
        CACHE_KEYS.USER_SESSION(sessionId),
        ttl,
        JSON.stringify(userData)
      );
    } catch (error) {
      console.error('Redis setUserSession error:', error);
    }
  }

  static async getUserSession(sessionId: string): Promise<SessionData | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.USER_SESSION(sessionId));
      return cached ? (JSON.parse(cached as string) as SessionData) : null;
    } catch (error) {
      console.error('Redis getUserSession error:', error);
      return null;
    }
  }

  static async deleteUserSession(sessionId: string): Promise<void> {
    try {
      await redis.del(CACHE_KEYS.USER_SESSION(sessionId));
    } catch (error) {
      console.error('Redis deleteUserSession error:', error);
    }
  }

  // Game statistics caching
  static async updateGameStats(stats: GameStats, ttl = 300): Promise<void> {
    try {
      await redis.setex(CACHE_KEYS.GAME_STATS, ttl, JSON.stringify(stats));
    } catch (error) {
      console.error('Redis updateGameStats error:', error);
    }
  }

  static async getGameStats(): Promise<GameStats | null> {
    try {
      const cached = await redis.get(CACHE_KEYS.GAME_STATS);
      return cached ? (JSON.parse(cached as string) as GameStats) : null;
    } catch (error) {
      console.error('Redis getGameStats error:', error);
      return null;
    }
  }

  // Store player bet data (fix for the hset issue)
  static async setPlayerBet(
    roundId: string,
    userId: string,
    betData: Record<string, unknown>
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.ACTIVE_BETS(roundId);
      // Use hset with field-value pairs for Upstash Redis
      await redis.hset(key, { [userId]: JSON.stringify(betData) });
    } catch (error) {
      console.error('Redis setPlayerBet error:', error);
    }
  }

  static async getPlayerBet(
    roundId: string,
    userId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const key = CACHE_KEYS.ACTIVE_BETS(roundId);
      const cached = await redis.hget(key, userId);
      return cached
        ? (JSON.parse(cached as string) as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error('Redis getPlayerBet error:', error);
      return null;
    }
  }

  static async getAllPlayerBets(
    roundId: string
  ): Promise<Record<string, Record<string, unknown>>> {
    try {
      const key = CACHE_KEYS.ACTIVE_BETS(roundId);
      const cached = await redis.hgetall(key);
      const result: Record<string, Record<string, unknown>> = {};

      if (cached) {
        for (const [userId, betDataStr] of Object.entries(cached)) {
          result[userId] = JSON.parse(betDataStr as string) as Record<
            string,
            unknown
          >;
        }
      }

      return result;
    } catch (error) {
      console.error('Redis getAllPlayerBets error:', error);
      return {};
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}
