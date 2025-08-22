'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';

// Define the props interface with the correct types
interface LeaderboardTableProps {
  period: 'today' | 'week' | 'month' | 'all_time';
  limit: number;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_bets: number;
  total_winnings: number;
  total_wagered: number;
  net_profit: number;
  win_rate: number;
  biggest_win: number;
  games_played: number;
}

const periodLabels = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all_time: 'All Time',
} as const;

const periodIcons = {
  today: Clock,
  week: Calendar,
  month: TrendingUp,
  all_time: Trophy,
} as const;

export function LeaderboardTable({ period, limit }: LeaderboardTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] =
    useState<LeaderboardTableProps['period']>(period);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedPeriod, limit]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leaderboard?period=${selectedPeriod}&limit=${limit}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load leaderboard',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              {Object.keys(periodLabels).map((_, i) => (
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = periodIcons[selectedPeriod];
                return <Icon className="h-5 w-5" />;
              })()}
              {periodLabels[selectedPeriod]} Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Top {limit} players ranked by total profit
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(
              Object.keys(periodLabels) as Array<keyof typeof periodLabels>
            ).map((periodKey) => (
              <Button
                key={periodKey}
                variant={selectedPeriod === periodKey ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(periodKey)}
              >
                {periodLabels[periodKey]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No players found for this period
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to play and claim the top spot!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry) => (
              <div
                key={`${entry.id}-${entry.rank}`}
                className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                  entry.rank <= 3 ? 'bg-muted/50' : 'hover:bg-muted/30'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar & User Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.avatar_url || ''} />
                    <AvatarFallback>
                      {(entry.display_name ||
                        entry.username ||
                        'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {entry.display_name || entry.username || 'Anonymous'}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span>{entry.games_played} games</span>
                      <span>{entry.win_rate?.toFixed(1)}% win rate</span>
                      <span>
                        Wagered: {formatCurrency(entry.total_wagered)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right space-y-1">
                  <div
                    className={`font-bold ${getProfitColor(
                      entry.net_profit
                    )}`}
                  >
                    {formatCurrency(entry.net_profit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Best: {formatCurrency(entry.biggest_win)}
                  </div>
                </div>

                {/* Badges for top 3 */}
                {entry.rank <= 3 && (
                  <div className="flex flex-col gap-1">
                    {entry.rank === 1 && (
                      <Badge variant="default" className="bg-yellow-500">
                        👑 Champion
                      </Badge>
                    )}
                    {entry.rank === 2 && (
                      <Badge variant="secondary">🥈 Runner-up</Badge>
                    )}
                    {entry.rank === 3 && (
                      <Badge variant="outline">🥉 Third Place</Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {data.length === limit && (
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Leaderboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
