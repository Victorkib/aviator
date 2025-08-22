'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Trophy,
  Activity,
} from 'lucide-react';

interface GameStatsData {
  totalRounds?: number;
  totalPlayers?: number;
  totalWagered?: number;
  averageMultiplier?: number;
  highestMultiplier?: number;
  recentMultipliers?: number[];
}

interface GameStatsProps {
  data?: GameStatsData;
}

export function GameStats({ data }: GameStatsProps = {}) {
  const [stats, setStats] = useState<GameStatsData>({
    totalRounds: 0,
    totalPlayers: 0,
    totalWagered: 0,
    averageMultiplier: 0,
    highestMultiplier: 0,
    recentMultipliers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (data) {
          // Use provided data
          setStats(data);
          setLoading(false);
          return;
        }

        // Fetch from API
        const response = await fetch('/api/game/stats');
        if (response.ok) {
          const apiData = await response.json();
          setStats(apiData);
        } else {
          // Use demo data if API fails
          setStats({
            totalRounds: 15420,
            totalPlayers: 2847,
            totalWagered: 1250000,
            averageMultiplier: 2.34,
            highestMultiplier: 127.45,
            recentMultipliers: [2.45, 1.23, 5.67, 3.21, 1.89],
          });
        }
      } catch (error) {
        console.error('Failed to fetch game stats:', error);
        // Use demo data on error
        setStats({
          totalRounds: 15420,
          totalPlayers: 2847,
          totalWagered: 1250000,
          averageMultiplier: 2.34,
          highestMultiplier: 127.45,
          recentMultipliers: [2.45, 1.23, 5.67, 3.21, 1.89],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Rounds */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Rounds
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(stats.totalRounds || 0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* Total Players */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Total Players
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatNumber(stats.totalPlayers || 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Total Wagered */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Total Wagered
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(stats.totalWagered || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      {/* Average Multiplier */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                Avg Multiplier
              </p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {(stats.averageMultiplier || 0).toFixed(2)}x
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* Highest Multiplier */}
      <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Highest Multi
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {(stats.highestMultiplier || 0).toFixed(2)}x
              </p>
            </div>
            <Trophy className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Live Status */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Status
              </p>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="default"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                  Live
                </Badge>
              </div>
            </div>
            <Target className="h-8 w-8 text-emerald-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
