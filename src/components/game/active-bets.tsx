'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, TrendingUp, DollarSign } from 'lucide-react';

interface Bet {
  id: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
}

interface ActiveBetsProps {
  bets: Bet[];
  currentMultiplier: number;
}

export function ActiveBets({ bets, currentMultiplier }: ActiveBetsProps) {
  const activeBets = bets.filter((bet) => !bet.cashedOut);
  const cashedOutBets = bets.filter((bet) => bet.cashedOut);
  const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <Card className="w-full h-[400px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Bets
          </span>
          <Badge
            variant="secondary"
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {bets.length}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Total: ${totalWagered.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {currentMultiplier.toFixed(2)}x
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[280px] px-4">
          <div className="space-y-2">
            {/* Active Bets */}
            {activeBets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`}
                    />
                    <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs">
                      {bet.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {bet.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ${bet.amount.toFixed(2)}
                      {bet.autoCashout && (
                        <span className="ml-1 text-blue-600 dark:text-blue-400">
                          @ {bet.autoCashout.toFixed(2)}x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    ${(bet.amount * currentMultiplier).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                </div>
              </div>
            ))}

            {/* Cashed Out Bets */}
            {cashedOutBets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`}
                    />
                    <AvatarFallback className="bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs">
                      {bet.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {bet.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ${bet.amount.toFixed(2)} → ${bet.payout?.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                  >
                    {bet.cashoutMultiplier?.toFixed(2)}x
                  </Badge>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Cashed Out
                  </div>
                </div>
              </div>
            ))}

            {bets.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No active bets yet</p>
                <p className="text-xs">Be the first to place a bet!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
