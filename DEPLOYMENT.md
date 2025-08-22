# Production Deployment Guide

## Environment Variables Required

Make sure to set these environment variables in your production environment (Vercel, etc.):

```bash
# Required for NextAuth.js
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=your-database-url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

## Socket.IO Configuration

The socket server is configured to work with both development and production environments:

- **Development**: Uses localhost:3000
- **Production**: Uses NEXTAUTH_URL and Vercel domains

## Common Issues and Solutions

### 1. 400 Bad Request on Socket Connection

**Cause**: Middleware interfering with socket API routes
**Solution**: Middleware now excludes `/api/*` routes

### 2. CORS Errors

**Cause**: Incorrect CORS configuration
**Solution**: Updated CORS to include Vercel domains and VERCEL_URL

### 3. Authentication Failures

**Cause**: Missing or incorrect NEXTAUTH_URL
**Solution**: Ensure NEXTAUTH_URL matches your production domain exactly

## Testing Socket Connection

1. Deploy to production
2. Open browser developer tools
3. Navigate to the game page
4. Check console for socket connection logs
5. Test the socket API endpoint: `https://v0-aviator-crash-game.vercel.app/api/socket`

## Debugging

The socket server now includes enhanced logging. Check your production logs for:

- `📡 Socket API called`
- `🔍 Request details`
- `🚀 Initializing Socket.IO server`
- `✅ Socket.IO server initialized successfully`

## Vercel-Specific Notes

- Ensure `NEXTAUTH_URL` is set to your Vercel deployment URL
- The `VERCEL_URL` environment variable is automatically available
- Socket.IO works well with Vercel's serverless functions
