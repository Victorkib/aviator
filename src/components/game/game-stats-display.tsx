'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface GameStats {
  totalRounds: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  averageMultiplier: number;
  highestMultiplier: number;
  activePlayers: number;
  recentMultipliers: number[];
}

export function GameStatsDisplay() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/game/stats');
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load statistics');
      }
    } catch (error) {
      console.error('Error loading game stats:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No statistics available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rounds</p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.totalRounds)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Players</p>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.activePlayers)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Wagered</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalWagered)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Highest Multiplier
                </p>
                <p className="text-2xl font-bold">
                  {stats.highestMultiplier.toFixed(2)}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Multipliers</CardTitle>
          <CardDescription>Last 10 crash multipliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.recentMultipliers.map((multiplier, index) => (
              <Badge
                key={index}
                variant={multiplier >= 2 ? 'default' : 'secondary'}
                className="text-sm font-mono"
              >
                {multiplier.toFixed(2)}x
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-green-600">
              {formatNumber(stats.totalBets)}
            </p>
            <p className="text-sm text-muted-foreground">Total Bets Placed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(stats.totalWon)}
            </p>
            <p className="text-sm text-muted-foreground">Total Won</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {stats.averageMultiplier.toFixed(2)}x
            </p>
            <p className="text-sm text-muted-foreground">Average Multiplier</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
