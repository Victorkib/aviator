'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, TrendingUp, TrendingDown } from 'lucide-react';

interface RecentMultipliersProps {
  multipliers?: number[];
  isDemo?: boolean;
}

export function RecentMultipliers({
  multipliers: propMultipliers,
  isDemo = false,
}: RecentMultipliersProps) {
  const [multipliers, setMultipliers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (propMultipliers) {
      setMultipliers(propMultipliers);
      setIsLoading(false);
    } else if (isDemo) {
      // Demo data
      setMultipliers([
        2.34, 1.67, 8.92, 1.23, 4.56, 1.89, 12.45, 2.78, 1.45, 3.21,
      ]);
      setIsLoading(false);
    } else {
      // Fetch from API if no props provided
      const fetchMultipliers = async () => {
        try {
          const response = await fetch('/api/game/stats');
          const data = await response.json();
          if (data.success) {
            setMultipliers(data.data.recentMultipliers || []);
          }
        } catch (error) {
          console.error('Error fetching multipliers:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMultipliers();
    }
  }, [propMultipliers, isDemo]);

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 10)
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700';
    if (multiplier >= 5)
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
    if (multiplier >= 2)
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700';
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700';
  };

  const getMultiplierIcon = (multiplier: number) => {
    if (multiplier >= 2) {
      return <TrendingUp className="h-3 w-3" />;
    }
    return <TrendingDown className="h-3 w-3" />;
  };

  const calculateAverage = () => {
    if (multipliers.length === 0) return 0;
    return (
      multipliers.reduce((sum, mult) => sum + mult, 0) / multipliers.length
    );
  };

  const getHighest = () => {
    if (multipliers.length === 0) return 0;
    return Math.max(...multipliers);
  };

  const getLowest = () => {
    if (multipliers.length === 0) return 0;
    return Math.min(...multipliers);
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <History className="h-5 w-5" />
          Recent Results
          {isDemo && (
            <Badge
              variant="secondary"
              className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
            >
              Demo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Recent Multipliers Grid */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Last 10 Rounds
              </h4>
              <div className="flex flex-wrap gap-2">
                {multipliers.slice(0, 10).map((multiplier, index) => (
                  <Badge
                    key={index}
                    className={`${getMultiplierColor(
                      multiplier
                    )} font-mono text-sm px-3 py-1 flex items-center gap-1`}
                  >
                    {getMultiplierIcon(multiplier)}
                    {multiplier.toFixed(2)}x
                  </Badge>
                ))}
              </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Average
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {calculateAverage().toFixed(2)}x
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Highest
                </p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {getHighest().toFixed(2)}x
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Lowest
                </p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  {getLowest().toFixed(2)}x
                </p>
              </div>
            </div>

            {multipliers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No recent results</p>
                <p className="text-xs">
                  Results will appear after the first round
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
