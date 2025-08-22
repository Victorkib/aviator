import { Redis } from '@upstash/redis';

// Initialize Redis client with error handling
let redis: Redis | null = null;

try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    console.warn(
      'Redis environment variables not found. Caching will be disabled.'
    );
  }
} catch (error) {
  console.error('Failed to initialize Redis:', error);
}

// Cache manager with fallback when Redis is unavailable
export class CacheManager {
  private static readonly CACHE_TTL = {
    GAME_STATE: 30, // 30 seconds
    USER_BALANCE: 300, // 5 minutes
    GAME_STATS: 60, // 1 minute
    GAME_HISTORY: 300, // 5 minutes
    USER_PROFILE: 600, // 10 minutes
    LEADERBOARD: 120, // 2 minutes
    RECENT_MULTIPLIERS: 30, // 30 seconds
  };

  // ADDING ONLY THE 3 MISSING GENERIC METHODS THAT CHAT APIs NEED
  static async get(key: string): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get(key);
      if (!cached) return null;

      // Handle both string and object responses from Redis
      if (typeof cached === 'string') {
        try {
          return JSON.parse(cached);
        } catch {
          return cached;
        }
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!redis) return;

    try {
      const cacheValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, cacheValue);
      } else {
        await redis.set(key, cacheValue);
      }
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  static async del(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  // ALL YOUR EXISTING METHODS REMAIN EXACTLY THE SAME
  // Game state caching
  static async setGameState(state: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        'aviator:game_state',
        this.CACHE_TTL.GAME_STATE,
        JSON.stringify(state)
      );
    } catch (error) {
      console.error('Error setting game state cache:', error);
    }
  }

  static async getGameState(): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get('aviator:game_state');
      if (!cached) return null;

      // Handle both string and object responses from Redis
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting game state cache:', error);
      return null;
    }
  }

  // User balance caching
  static async setUserBalance(userId: string, balance: number): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        `aviator:user_balance:${userId}`,
        this.CACHE_TTL.USER_BALANCE,
        balance.toString()
      );
    } catch (error) {
      console.error('Error setting user balance cache:', error);
    }
  }

  static async getUserBalance(userId: string): Promise<number | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get(`aviator:user_balance:${userId}`);
      return cached ? Number.parseFloat(cached as string) : null;
    } catch (error) {
      console.error('Error getting user balance cache:', error);
      return null;
    }
  }

  static async invalidateUserBalance(userId: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(`aviator:user_balance:${userId}`);
    } catch (error) {
      console.error('Error invalidating user balance cache:', error);
    }
  }

  // Game statistics caching - Fixed JSON handling
  static async setGameStats(stats: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        'aviator:game_stats',
        this.CACHE_TTL.GAME_STATS,
        JSON.stringify(stats)
      );
    } catch (error) {
      console.error('Error setting game stats cache:', error);
    }
  }

  static async getGameStats(): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get('aviator:game_stats');
      if (!cached) return null;

      // Handle both string and object responses from Redis
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting game stats cache:', error);
      return null;
    }
  }

  // Game history caching
  static async setGameHistory(userId: string, history: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        `aviator:game_history:${userId}`,
        this.CACHE_TTL.GAME_HISTORY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error setting game history cache:', error);
    }
  }

  static async getGameHistory(userId: string): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get(`aviator:game_history:${userId}`);
      if (!cached) return null;

      // Handle both string and object responses from Redis
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting game history cache:', error);
      return null;
    }
  }

  // User profile caching
  static async setUserProfile(userId: string, profile: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        `aviator:user_profile:${userId}`,
        this.CACHE_TTL.USER_PROFILE,
        JSON.stringify(profile)
      );
    } catch (error) {
      console.error('Error setting user profile cache:', error);
    }
  }

  static async getUserProfile(userId: string): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get(`aviator:user_profile:${userId}`);
      if (!cached) return null;

      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile cache:', error);
      return null;
    }
  }

  static async invalidateUserProfile(userId: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(`aviator:user_profile:${userId}`);
    } catch (error) {
      console.error('Error invalidating user profile cache:', error);
    }
  }

  // Leaderboard caching
  static async setLeaderboard(period: string, data: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        `aviator:leaderboard:${period}`,
        this.CACHE_TTL.LEADERBOARD,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error setting leaderboard cache:', error);
    }
  }

  static async getLeaderboard(period: string): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get(`aviator:leaderboard:${period}`);
      if (!cached) return null;

      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting leaderboard cache:', error);
      return null;
    }
  }

  // Recent multipliers caching
  static async setRecentMultipliers(multipliers: any): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(
        'aviator:recent_multipliers',
        this.CACHE_TTL.RECENT_MULTIPLIERS,
        JSON.stringify(multipliers)
      );
    } catch (error) {
      console.error('Error setting recent multipliers cache:', error);
    }
  }

  static async getRecentMultipliers(): Promise<any | null> {
    if (!redis) return null;

    try {
      const cached = await redis.get('aviator:recent_multipliers');
      if (!cached) return null;

      if (typeof cached === 'string') {
        return JSON.parse(cached);
      } else if (typeof cached === 'object') {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error getting recent multipliers cache:', error);
      return null;
    }
  }

  // Rate limiting
  static async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    if (!redis) return true; // Allow if Redis unavailable

    try {
      const current = await redis.incr(`rate_limit:${key}`);
      if (current === 1) {
        await redis.expire(`rate_limit:${key}`, windowSeconds);
      }
      return current <= limit;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return true; // Allow on error
    }
  }

  // Health check
  static async ping(): Promise<boolean> {
    if (!redis) return false;

    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  // Clear all cache (for debugging)
  static async clearAll(): Promise<void> {
    if (!redis) return;

    try {
      await redis.del('aviator:game_state');
      await redis.del('aviator:game_stats');
      await redis.del('aviator:recent_multipliers');
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export { redis };
