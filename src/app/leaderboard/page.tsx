import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { Trophy, Users, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leaderboard - Aviator Crash Game',
  description:
    'View the top players and their achievements in Aviator Crash Game',
};

function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Compete with other players and see who comes out on top. Rankings are
          based on total profit over different time periods.
        </p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Players</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Wagered</p>
                <p className="text-2xl font-bold">$123,456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Top Prize</p>
                <p className="text-2xl font-bold">$5,678</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Leaderboard Component - Fixed the period prop type */}
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardTable period="all_time" limit={50} />
      </Suspense>

      {/* Information Section */}
      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-xl font-semibold">How Rankings Work</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ranking Criteria</h4>
            <p className="text-sm text-muted-foreground">
              Players are ranked by their total profit (winnings minus losses)
              over the selected time period. Only players with at least one bet
              are included in the rankings.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Time Periods</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Today:</strong> Rankings reset daily at midnight UTC
              </li>
              <li>
                • <strong>This Week:</strong> Rankings reset weekly on Monday at
                midnight UTC
              </li>
              <li>
                • <strong>This Month:</strong> Rankings reset monthly on the 1st
                at midnight UTC
              </li>
              <li>
                • <strong>All Time:</strong> Lifetime rankings since account
                creation
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Fair Play</h4>
            <p className="text-sm text-muted-foreground">
              All games use provably fair algorithms. Rankings are updated in
              real-time and reflect actual game results. Suspicious activity is
              monitored and may result in disqualification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
