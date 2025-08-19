'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, Target, Trophy } from 'lucide-react';

export interface GameStatsData {
  totalRounds: number;
  totalPlayers: number;
  totalWagered: number;
  averageMultiplier: number;
  highestMultiplier: number;
  recentMultipliers: number[];
}

interface GameStatsProps {
  data: GameStatsData;
}

export function GameStats({ data }: GameStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMultiplier = (multiplier: number) => {
    return `${multiplier.toFixed(2)}x`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Rounds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rounds</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalRounds.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Games completed</p>
        </CardContent>
      </Card>

      {/* Total Players */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalPlayers.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Unique participants</p>
        </CardContent>
      </Card>

      {/* Total Wagered */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(data.totalWagered)}
          </div>
          <p className="text-xs text-muted-foreground">All-time volume</p>
        </CardContent>
      </Card>

      {/* Average Multiplier */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Average Multiplier
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatMultiplier(data.averageMultiplier)}
          </div>
          <p className="text-xs text-muted-foreground">Mean crash point</p>
        </CardContent>
      </Card>

      {/* Highest Multiplier */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Highest Multiplier
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {formatMultiplier(data.highestMultiplier)}
          </div>
          <p className="text-xs text-muted-foreground">Record crash point</p>
        </CardContent>
      </Card>

      {/* Recent Multipliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Results</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {data.recentMultipliers.slice(0, 8).map((multiplier, index) => (
              <Badge
                key={index}
                variant={multiplier >= 2 ? 'default' : 'secondary'}
                className={`text-xs ${
                  multiplier >= 10
                    ? 'bg-yellow-500 text-yellow-50 hover:bg-yellow-600'
                    : multiplier >= 2
                    ? 'bg-green-500 text-green-50 hover:bg-green-600'
                    : 'bg-red-500 text-red-50 hover:bg-red-600'
                }`}
              >
                {formatMultiplier(multiplier)}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 8 rounds</p>
        </CardContent>
      </Card>
    </div>
  );
}
