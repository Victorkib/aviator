'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plane, DollarSign, TrendingUp, X, Clock, Wallet } from 'lucide-react';

interface BettingPanelProps {
  gamePhase: 'betting' | 'flying' | 'crashed' | 'preparing';
  currentMultiplier: number;
  bettingTimeLeft: number;
  onPlaceBet: (
    amount: number,
    autoCashout?: number
  ) => Promise<{ success: boolean; error?: string }>;
  onCashout: (betId: string) => Promise<{ success: boolean; error?: string }>;
  userBalance: number;
  userBet: {
    id: string;
    amount: number;
    autoCashout?: number;
    cashedOut: boolean;
  } | null;
  canPlaceBet: boolean;
  canCashOut: boolean;
  potentialPayout: number;
  isConnected: boolean;
}

export function BettingPanel({
  gamePhase,
  currentMultiplier,
  bettingTimeLeft,
  onPlaceBet,
  onCashout,
  userBalance,
  userBet,
  canPlaceBet,
  canCashOut,
  potentialPayout,
  isConnected,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState('10.00');
  const [autoCashout, setAutoCashout] = useState('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  const betAmountNum = Number.parseFloat(betAmount) || 0;
  const autoCashoutNum = autoCashout
    ? Number.parseFloat(autoCashout)
    : undefined;
  const potentialProfit = potentialPayout - (userBet?.amount || 0);

  const handlePlaceBet = async () => {
    if (!canPlaceBet || betAmountNum < 1 || betAmountNum > userBalance) return;

    setIsPlacingBet(true);
    try {
      await onPlaceBet(betAmountNum, autoCashoutNum);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleCashout = async () => {
    if (!canCashOut || !userBet) return;

    setIsCashingOut(true);
    try {
      await onCashout(userBet.id);
    } finally {
      setIsCashingOut(false);
    }
  };

  const quickBetAmounts = [5, 10, 25, 50, 100];
  const timeLeftSeconds = Math.ceil(bettingTimeLeft / 1000);

  const getPhaseColor = () => {
    switch (gamePhase) {
      case 'betting':
        return 'bg-green-600';
      case 'flying':
        return 'bg-blue-600';
      case 'crashed':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getPhaseText = () => {
    switch (gamePhase) {
      case 'betting':
        return `Betting (${timeLeftSeconds}s)`;
      case 'flying':
        return 'Flying...';
      case 'crashed':
        return 'Crashed!';
      default:
        return 'Preparing...';
    }
  };

  return (
    <Card className="w-full bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Betting Panel
          </div>
          <Badge className={`${getPhaseColor()} text-white`}>
            {getPhaseText()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        {!isConnected && (
          <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-red-300 text-sm text-center">
              ⚠️ Connection lost - reconnecting...
            </p>
          </div>
        )}

        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-300" />
            <span className="text-sm text-slate-300">Balance:</span>
          </div>
          <span className="font-bold text-green-400">
            ${userBalance.toFixed(2)}
          </span>
        </div>

        {/* Active Bet Display */}
        {userBet && (
          <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-300">Active Bet</span>
              <Badge
                variant="outline"
                className="border-blue-600 text-blue-300"
              >
                ${userBet.amount.toFixed(2)}
              </Badge>
            </div>

            {gamePhase === 'flying' && !userBet.cashedOut && (
              <>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Potential Payout:</span>
                    <span className="text-green-400 font-bold">
                      ${potentialPayout.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Potential Profit:</span>
                    <span
                      className={`font-bold ${
                        potentialProfit > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      ${potentialProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {userBet.autoCashout && (
                  <div className="mt-2 text-xs text-amber-400">
                    Auto-cashout at {userBet.autoCashout}x
                  </div>
                )}
              </>
            )}

            {userBet.cashedOut && (
              <div className="text-center">
                <Badge className="bg-green-600 text-white">Cashed Out</Badge>
              </div>
            )}
          </div>
        )}

        <Separator className="bg-slate-600" />

        {/* Betting Form */}
        {!userBet && gamePhase === 'betting' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bet-amount" className="text-slate-300">
                Bet Amount
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="bet-amount"
                  type="number"
                  min="1"
                  max={userBalance}
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter bet amount"
                  disabled={!isConnected}
                />
              </div>
            </div>

            {/* Quick Bet Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {quickBetAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(amount.toString())}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  disabled={amount > userBalance || !isConnected}
                >
                  ${amount}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto-cashout" className="text-slate-300">
                Auto Cashout (Optional)
              </Label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="auto-cashout"
                  type="number"
                  min="1.01"
                  step="0.01"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  placeholder="e.g., 2.00"
                  disabled={!isConnected}
                />
                {autoCashout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoCashout('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={handlePlaceBet}
              disabled={
                !canPlaceBet ||
                isPlacingBet ||
                betAmountNum < 1 ||
                betAmountNum > userBalance
              }
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
            >
              {isPlacingBet ? (
                'Placing Bet...'
              ) : (
                <>
                  {gamePhase === 'betting' && timeLeftSeconds > 0 && (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Place Bet ${betAmountNum.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Cashout Button */}
        {userBet && gamePhase === 'flying' && !userBet.cashedOut && (
          <Button
            onClick={handleCashout}
            disabled={!canCashOut || isCashingOut}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 text-lg"
          >
            {isCashingOut
              ? 'Cashing Out...'
              : `Cash Out $${potentialPayout.toFixed(2)}`}
          </Button>
        )}

        {/* Phase Messages */}
        {gamePhase === 'crashed' && (
          <div className="text-center p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
            <p className="text-red-300 font-medium">Round Ended</p>
            <p className="text-sm text-slate-400 mt-1">
              {userBet && !userBet.cashedOut
                ? 'Better luck next time!'
                : 'Next round starting soon...'}
            </p>
          </div>
        )}

        {gamePhase === 'preparing' && (
          <div className="text-center p-4 bg-slate-700/50 rounded-lg">
            <p className="text-slate-300 font-medium">Preparing Next Round</p>
            <p className="text-sm text-slate-400 mt-1">
              Get ready to place your bets!
            </p>
          </div>
        )}

        {gamePhase === 'flying' && !userBet && (
          <div className="text-center p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <p className="text-blue-300 font-medium">Round in Progress</p>
            <p className="text-sm text-slate-400 mt-1">
              Wait for the next round to place a bet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
