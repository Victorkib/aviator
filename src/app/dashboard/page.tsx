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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Play, TrendingUp, DollarSign, Target, Users } from 'lucide-react';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✈️</div>
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {session.user?.name}!
            </p>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: '/' })}
            variant="outline"
            className="border-gray-300 dark:border-gray-600"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">
                Welcome Back!
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Name:</strong> {session.user?.name}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> {session.user?.email}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Username:</strong>{' '}
                  {session.user?.username || 'Not set'}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Balance:</strong>
                  <span className="text-green-600 dark:text-green-400 font-semibold ml-1">
                    ${session.user?.balance?.toFixed(2) || '0.00'}
                  </span>
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Status:</strong>
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    {session.user?.status || 'Active'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5" />
                Game Stats
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your gaming statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Bets:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    0
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Wagered:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    $0.00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Won:
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    $0.00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Win Rate:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    0%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Play className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                What would you like to do?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <Link href="/game">
                  <Play className="h-4 w-4 mr-2" />
                  Play Game
                </Link>
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                asChild
              >
                <Link href="/history">
                  <Target className="h-4 w-4 mr-2" />
                  View History
                </Link>
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                asChild
              >
                <Link href="/profile">
                  <Users className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${session.user?.balance?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current Balance
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              0
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Games Played
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              0.00x
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Best Multiplier
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <Users className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              0%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Win Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
