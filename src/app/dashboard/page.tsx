'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button
            onClick={() => signOut({ callbackUrl: '/' })}
            variant="outline"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back!</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Name:</strong> {session.user?.name}
                </p>
                <p>
                  <strong>Email:</strong> {session.user?.email}
                </p>
                <p>
                  <strong>Username:</strong>{' '}
                  {session.user?.username || 'Not set'}
                </p>
                <p>
                  <strong>Balance:</strong> $
                  {session.user?.balance?.toFixed(2) || '0.00'}
                </p>
                <p>
                  <strong>Status:</strong> {session.user?.status || 'Active'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Stats</CardTitle>
              <CardDescription>Your gaming statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Total Bets:</strong> 0
                </p>
                <p>
                  <strong>Total Wagered:</strong> $0.00
                </p>
                <p>
                  <strong>Total Won:</strong> $0.00
                </p>
                <p>
                  <strong>Win Rate:</strong> 0%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>What would you like to do?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" disabled>
                Play Game (Coming Soon)
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                disabled
              >
                View History (Coming Soon)
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                disabled
              >
                Deposit Funds (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
