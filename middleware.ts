import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, createRateLimitResponse } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    let rateLimitAction:
      | 'BET_PLACEMENT'
      | 'CASHOUT'
      | 'AUTH'
      | 'API_GENERAL'
      | 'REGISTRATION' = 'API_GENERAL';

    // Determine rate limit type based on endpoint
    if (pathname.includes('/bet') || pathname.includes('/place-bet')) {
      rateLimitAction = 'BET_PLACEMENT';
    } else if (pathname.includes('/cashout')) {
      rateLimitAction = 'CASHOUT';
    } else if (
      pathname.includes('/auth') ||
      pathname.includes('/signin') ||
      pathname.includes('/signup')
    ) {
      rateLimitAction = 'AUTH';
    } else if (pathname.includes('/register')) {
      rateLimitAction = 'REGISTRATION';
    }

    const rateLimitResult = await rateLimit(request, rateLimitAction);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );
    }

    // Add rate limit headers to successful responses
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString()
    );
    response.headers.set(
      'X-RateLimit-Reset',
      rateLimitResult.resetTime.toString()
    );
  }

  // Security headers for all routes
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Content Security Policy for production
  if (process.env.NODE_ENV === 'production') {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://vitals.vercel-insights.com https://vercel.live",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);
  }

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - EXCLUDED to prevent socket issues
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
