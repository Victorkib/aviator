import * as Sentry from '@sentry/nextjs';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay (optional - can be resource intensive)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Error filtering
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors and common client-side issues
        if (
          error.message.includes('NetworkError') ||
          error.message.includes('fetch') ||
          error.message.includes('AbortError') ||
          error.message.includes('Non-Error promise rejection')
        ) {
          return null;
        }
      }
    }
    return event;
  },

  // Custom tags for better organization
  initialScope: {
    tags: {
      component: 'aviator-game',
      version: process.env.npm_package_version || 'unknown',
    },
  },
});

// Custom error reporting utilities for different types of errors
export class ErrorReporter {
  // Game-related errors
  static reportGameError(
    error: Error,
    context: {
      userId?: string;
      roundId?: string;
      action?: string;
      gamePhase?: string;
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'game_error');
      scope.setTag('game_phase', context.gamePhase || 'unknown');
      scope.setContext('game_context', context);

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Financial transaction errors (high priority)
  static reportFinancialError(
    error: Error,
    context: {
      userId: string;
      transactionType: string;
      amount: number;
      balanceBefore?: number;
      balanceAfter?: number;
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'financial_error');
      scope.setTag('transaction_type', context.transactionType);
      scope.setLevel('fatal'); // Highest priority
      scope.setContext('financial_context', {
        ...context,
        // Sanitize sensitive data
        amount: context.amount,
        transactionType: context.transactionType,
      });
      scope.setUser({ id: context.userId });
      Sentry.captureException(error);
    });
  }

  // Authentication errors
  static reportAuthError(
    error: Error,
    context: {
      provider?: string;
      userId?: string;
      email?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'auth_error');
      scope.setTag('auth_provider', context.provider || 'unknown');
      scope.setContext('auth_context', {
        provider: context.provider,
        action: context.action,
        // Don't log sensitive data
        hasEmail: !!context.email,
        hasUserId: !!context.userId,
      });
      scope.setLevel('warning');
      Sentry.captureException(error);
    });
  }

  // Security events (suspicious activity)
  static reportSecurityEvent(
    event: string,
    context: {
      ip?: string;
      userId?: string;
      userAgent?: string;
      action?: string;
      severity?: 'low' | 'medium' | 'high';
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('event_type', 'security_event');
      scope.setTag('security_severity', context.severity || 'medium');
      scope.setLevel(context.severity === 'high' ? 'error' : 'warning');
      scope.setContext('security_context', {
        ip: context.ip,
        action: context.action,
        userAgent: context.userAgent?.substring(0, 100), // Truncate long user agents
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      Sentry.captureMessage(`Security Event: ${event}`);
    });
  }

  // Database errors
  static reportDatabaseError(
    error: Error,
    context: {
      query?: string;
      table?: string;
      operation?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'database_error');
      scope.setTag('db_table', context.table || 'unknown');
      scope.setTag('db_operation', context.operation || 'unknown');
      scope.setContext('database_context', {
        table: context.table,
        operation: context.operation,
        // Don't log full queries for security
        hasQuery: !!context.query,
      });

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Performance issues
  static reportPerformanceIssue(
    message: string,
    context: {
      operation: string;
      duration: number;
      threshold: number;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('issue_type', 'performance');
      scope.setTag('operation', context.operation);
      scope.setContext('performance_context', context);

      if (context.userId) {
        scope.setUser({ id: context.userId });
      }

      scope.setLevel('warning');
      Sentry.captureMessage(`Performance Issue: ${message}`);
    });
  }
}

// Performance monitoring helper
export function measurePerformance<T>(
  operation: string,
  threshold = 1000 // ms
) {
  return (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) => {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          ErrorReporter.reportPerformanceIssue(`Slow ${operation}`, {
            operation,
            duration,
            threshold,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        ErrorReporter.reportPerformanceIssue(`Failed ${operation}`, {
          operation,
          duration,
          threshold,
        });
        throw error;
      }
    };

    return descriptor;
  };
}
