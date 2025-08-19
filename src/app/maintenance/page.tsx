'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Wrench, Clock, RefreshCw } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Under Maintenance</CardTitle>
          <CardDescription>
            We{`'`}re currently performing scheduled maintenance to improve your
            gaming experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-6xl">🔧</div>

          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Estimated completion: 2 hours</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We{`'`}re upgrading our systems to serve you better. Thank you for
              your patience!
            </p>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Follow us on social media for real-time updates
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
