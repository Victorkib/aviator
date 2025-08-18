// Centralized configuration management with validation
export const config = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'development',

  // URLs
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Database
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },

  // Authentication
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL!,
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    sessionUpdateAge: 24 * 60 * 60, // 24 hours
  },

  // OAuth Providers
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },

  // Game settings
  game: {
    houseEdge: Number(process.env.GAME_HOUSE_EDGE) || 0.01,
    minBetAmount: Number(process.env.MIN_BET_AMOUNT) || 1.0,
    maxBetAmount: Number(process.env.MAX_BET_AMOUNT) || 1000.0,
    bettingDurationMs: Number(process.env.BETTING_DURATION_MS) || 10000,
    minFlightDurationMs: Number(process.env.MIN_FLIGHT_DURATION_MS) || 1000,
    welcomeBonus: 100.0,
    maxMultiplier: 1000.0,
    minMultiplier: 1.01,
  },

  // Redis
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  },

  // Monitoring
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  },

  // Cache TTL settings (in seconds)
  cache: {
    userProfile: 600, // 10 minutes
    userBalance: 300, // 5 minutes
    gameRound: 3600, // 1 hour
    gameStats: 300, // 5 minutes
    leaderboard: 900, // 15 minutes
  },

  // Rate limiting
  rateLimits: {
    betPlacement: { requests: 10, window: 60 },
    cashout: { requests: 5, window: 10 },
    auth: { requests: 5, window: 300 },
    apiGeneral: { requests: 100, window: 60 },
    registration: { requests: 3, window: 3600 },
  },
} as const;

// Environment variable validation
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
] as const;

const optionalEnvVars = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
] as const;

export function validateConfig() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  const warnings = optionalEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (warnings.length > 0 && config.isProduction) {
    console.warn(
      `Missing optional environment variables: ${warnings.join(', ')}`
    );
  }

  // Validate game settings
  if (config.game.minBetAmount >= config.game.maxBetAmount) {
    throw new Error('MIN_BET_AMOUNT must be less than MAX_BET_AMOUNT');
  }

  if (config.game.houseEdge < 0 || config.game.houseEdge > 0.1) {
    throw new Error('GAME_HOUSE_EDGE must be between 0 and 0.1 (0% to 10%)');
  }

  console.log('✅ Configuration validated successfully');
}

// Feature flags for gradual rollout
export const featureFlags = {
  enableChat: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',
  enableLeaderboard: process.env.NEXT_PUBLIC_ENABLE_LEADERBOARD === 'true',
  enableSocialFeatures: process.env.NEXT_PUBLIC_ENABLE_SOCIAL === 'true',
  enableAdvancedBetting:
    process.env.NEXT_PUBLIC_ENABLE_ADVANCED_BETTING === 'true',
  enableMobileApp: process.env.NEXT_PUBLIC_ENABLE_MOBILE_APP === 'true',
  maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
} as const;

// Database connection health check
export async function healthCheck() {
  const checks = {
    database: false,
    redis: false,
    config: false,
  };

  try {
    // Validate configuration
    validateConfig();
    checks.config = true;
  } catch (error) {
    console.error('Config validation failed:', error);
  }

  try {
    // Check database connection
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    checks.database = !error;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Check Redis connection
    const { CacheManager } = await import('./redis');
    checks.redis = await CacheManager.healthCheck();
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return checks;
}
