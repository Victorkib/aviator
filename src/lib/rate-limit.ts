import type { NextRequest } from 'next/server';
import { CacheManager } from './redis';

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

export const RATE_LIMITS = {
  BET_PLACEMENT: { requests: 10, window: 60 }, // 10 bets per minute
  CASHOUT: { requests: 5, window: 10 }, // 5 cashouts per 10 seconds
  AUTH: { requests: 5, window: 300 }, // 5 auth attempts per 5 minutes
  API_GENERAL: { requests: 100, window: 60 }, // 100 API calls per minute
  REGISTRATION: { requests: 3, window: 3600 }, // 3 registrations per hour
  PASSWORD_RESET: { requests: 3, window: 3600 }, // 3 password resets per hour
} as const;

export async function rateLimit(
  request: NextRequest,
  action: keyof typeof RATE_LIMITS
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const ip = getClientIP(request);
  const config = RATE_LIMITS[action];

  const result = await CacheManager.checkRateLimit(
    ip,
    action,
    config.requests,
    config.window
  );

  return {
    success: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
  };
}

// Helper to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  // NextRequest doesn't have .ip property, use 'unknown' as fallback
  return 'unknown';
}

// Middleware helper for creating rate limit responses
export function createRateLimitResponse(remaining: number, resetTime: number) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      remaining,
      resetTime,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
      },
    }
  );
}

// Rate limit decorator for API routes
export function withRateLimit(action: keyof typeof RATE_LIMITS) {
  return (handler: (req: NextRequest) => Promise<Response>) =>
    async (req: NextRequest): Promise<Response> => {
      const rateLimitResult = await rateLimit(req, action);

      if (!rateLimitResult.success) {
        return createRateLimitResponse(
          rateLimitResult.remaining,
          rateLimitResult.resetTime
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(req);
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        'X-RateLimit-Reset',
        rateLimitResult.resetTime.toString()
      );

      return response;
    };
}
