'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, DollarSign, Target, Clock } from 'lucide-react';

interface BettingPanelProps {
  userBalance: number;
  gamePhase: 'betting' | 'flying' | 'crashed' | 'preparing';
  bettingTimeLeft: number;
  onPlaceBet: (amount: number, autoCashout?: number) => void;
  onCashout: () => void;
  currentBet: {
    amount: number;
    autoCashout?: number;
    canCashout: boolean;
    potentialPayout: number;
  } | null;
  isDemo?: boolean;
}

export function BettingPanel({
  userBalance,
  gamePhase,
  bettingTimeLeft,
  onPlaceBet,
  onCashout,
  currentBet,
  isDemo = false,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState<number | undefined>(undefined);
  const [useAutoCashout, setUseAutoCashout] = useState(false);

  const quickAmounts = [5, 10, 25, 50, 100];
  const canBet =
    gamePhase === 'betting' &&
    !currentBet &&
    betAmount <= userBalance &&
    betAmount > 0;
  const canCashout = gamePhase === 'flying' && currentBet?.canCashout;

  // Format time remaining
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const handleQuickAmount = (amount: number) => {
    setBetAmount(amount);
  };

  const handleBetAmountChange = (value: string) => {
    const num = Number.parseFloat(value) || 0;
    setBetAmount(Math.max(0, Math.min(num, userBalance)));
  };

  const handleAutoCashoutChange = (value: string) => {
    const num = Number.parseFloat(value) || 0;
    setAutoCashout(num > 1 ? num : undefined);
  };

  const handlePlaceBet = () => {
    if (canBet) {
      onPlaceBet(betAmount, useAutoCashout ? autoCashout : undefined);
    }
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Betting Panel
          </span>
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

      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Balance:
          </span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            ${userBalance.toFixed(2)}
          </span>
        </div>

        {/* Betting Time Countdown */}
        {gamePhase === 'betting' && (
          <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Clock className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Betting closes in: {formatTime(bettingTimeLeft)}
            </span>
          </div>
        )}

        {/* Current Bet Display */}
        {currentBet && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Active Bet:
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${currentBet.amount.toFixed(2)}
              </span>
            </div>
            {currentBet.autoCashout && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Auto cashout at {currentBet.autoCashout.toFixed(2)}x
              </div>
            )}
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Potential payout: ${currentBet.potentialPayout.toFixed(2)}
            </div>
          </div>
        )}

        {/* Bet Amount Input */}
        {!currentBet && (
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="bet-amount"
                className="text-gray-700 dark:text-gray-300"
              >
                Bet Amount
              </Label>
              <div className="flex items-center space-x-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                  disabled={betAmount <= 1}
                  className="border-gray-300 dark:border-gray-600"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="bet-amount"
                  type="number"
                  value={betAmount}
                  onChange={(e) => handleBetAmountChange(e.target.value)}
                  className="text-center bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  min="1"
                  max={userBalance}
                  step="0.01"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBetAmount(Math.min(userBalance, betAmount + 1))
                  }
                  disabled={betAmount >= userBalance}
                  className="border-gray-300 dark:border-gray-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={betAmount === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={amount > userBalance}
                  className="text-xs border-gray-300 dark:border-gray-600"
                >
                  ${amount}
                </Button>
              ))}
            </div>

            <Separator className="bg-gray-200 dark:bg-gray-700" />

            {/* Auto Cashout */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-cashout"
                  checked={useAutoCashout}
                  onChange={(e) => setUseAutoCashout(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <Label
                  htmlFor="auto-cashout"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Auto Cashout
                </Label>
              </div>

              {useAutoCashout && (
                <div>
                  <Label
                    htmlFor="auto-cashout-amount"
                    className="text-gray-700 dark:text-gray-300"
                  >
                    Cashout at multiplier
                  </Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Target className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      id="auto-cashout-amount"
                      type="number"
                      value={autoCashout || ''}
                      onChange={(e) => handleAutoCashoutChange(e.target.value)}
                      placeholder="2.00"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      min="1.01"
                      step="0.01"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      x
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!currentBet ? (
            <Button
              onClick={handlePlaceBet}
              disabled={!canBet}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
              size="lg"
            >
              {gamePhase === 'betting' ? 'Place Bet' : 'Betting Closed'}
            </Button>
          ) : (
            <Button
              onClick={onCashout}
              disabled={!canCashout}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
              size="lg"
            >
              {canCashout ? 'Cash Out' : 'Cannot Cash Out'}
            </Button>
          )}

          {gamePhase === 'crashed' && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Next round starting soon...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
