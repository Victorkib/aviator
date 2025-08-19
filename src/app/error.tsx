'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-6xl mb-4">🛬</div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Emergency Landing
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Something went wrong during your flight. Our technical crew is working
          to get you back in the air.
        </p>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
          If this problem persists, please{' '}
          <a href="/support" className="text-blue-600 hover:underline">
            contact our support team
          </a>
        </p>
      </div>
    </div>
  );
}
