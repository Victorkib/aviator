'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface RecentMultiplier {
  roundNumber: number;
  crashMultiplier: number;
  createdAt: string;
}

interface RecentMultipliersProps {
  limit?: number;
  autoRefresh?: boolean;
}

export function RecentMultipliers({
  limit = 10,
  autoRefresh = true,
}: RecentMultipliersProps) {
  const [multipliers, setMultipliers] = useState<RecentMultiplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMultipliers();

    if (autoRefresh) {
      const interval = setInterval(loadMultipliers, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh]);

  const loadMultipliers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      if (!multipliers.length) setLoading(true);

      const response = await fetch(
        `/api/game/recent-multipliers?limit=${limit}`
      );
      const result = await response.json();

      if (result.success) {
        setMultipliers(result.data || []);
        setError(null);
      } else {
        setError(result.error || 'Failed to load recent multipliers');
      }
    } catch (error) {
      console.error('Error loading recent multipliers:', error);
      setError('Failed to load recent multipliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMultipliers(true);
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 10)
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
    if (multiplier >= 5) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
    if (multiplier >= 2)
      return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Multipliers
              </CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Multipliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Multipliers
            </CardTitle>
            <CardDescription>
              Last {multipliers.length} crash multipliers
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {multipliers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No recent multipliers available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {multipliers.map((item) => (
              <div
                key={item.roundNumber}
                className={`p-3 rounded-lg border text-center ${getMultiplierColor(
                  item.crashMultiplier
                )}`}
              >
                <p className="text-lg font-bold font-mono">
                  {item?.crashMultiplier}x
                </p>
                <p className="text-xs opacity-75">#{item.roundNumber}</p>
                <p className="text-xs opacity-75">
                  {formatTime(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
