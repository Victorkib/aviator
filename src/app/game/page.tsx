'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GameCanvas } from '@/components/game/game-canvas';
import { BettingPanel } from '@/components/game/betting-panel';
import { ChatPanel } from '@/components/game/chat-panel';
import { ActiveBets } from '@/components/game/active-bets';
import { RecentMultipliers } from '@/components/game/recent-multipliers';
import { GameStats } from '@/components/game/game-stats';
import { useGameSocket } from '@/hooks/useGameSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  TrendingUp,
  Zap,
  Trophy,
  DollarSign,
  Target,
  Plane,
  Crown,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function GamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  const {
    gameState,
    chatMessages,
    connectionStatus,
    error,
    userBet,
    placeBet,
    cashOut,
    sendChatMessage,
    isConnected,
    canPlaceBet,
    canCashOut,
    potentialPayout,
  } = useGameSocket();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/user/balance');
        const data = await response.json();

        if (data.success && data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        } else {
          console.error('Failed to fetch balance:', data.error || 'Unknown error');
          // Set a default balance to prevent UI issues
          setUserBalance(0);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        // Set a default balance to prevent UI issues
        setUserBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [session?.user?.id]);

  // Hide welcome message after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePlaceBet = async (amount: number, autoCashout?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await placeBet(amount, autoCashout);

      if (result.success) {
        setUserBalance((prev) => prev - amount);
        toast({
          title: '🎯 Bet Placed!',
          description: `$${amount.toFixed(2)} bet placed successfully!`,
        });
        return { success: true };
      } else {
        const errorMsg = result.error || 'Failed to place bet';
        toast({
          title: '❌ Bet Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  const handleCashout = async (betId: string): Promise<{ success: boolean; error?: string }> => {
    if (!userBet) {
      return { success: false, error: 'No active bet to cash out' };
    }

    try {
      const result = await cashOut(betId);

      if (result.success && result.payout && result.multiplier) {
        const payout = result.payout;
        const multiplier = result.multiplier;
        setUserBalance((prev) => prev + payout);
        toast({
          title: '💰 Cashout Successful!',
          description: `You won $${payout.toFixed(2)} at ${multiplier.toFixed(2)}x!`,
        });
        return { success: true };
      } else {
        const errorMsg = result.error || 'Failed to cash out';
        toast({
          title: '❌ Cashout Failed',
          description: errorMsg,
          variant: 'destructive',
        });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  const refreshConnection = () => {
    window.location.reload();
  };

  // Mock data for demonstration
  const mockBets = [
    { id: '1', username: 'Player1', amount: 50, autoCashout: 2.5, cashedOut: false },
    { id: '2', username: 'Player2', amount: 25, autoCashout: 1.8, cashedOut: false },
    { id: '3', username: 'Player3', amount: 100, autoCashout: 3.0, cashedOut: false },
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-purple-200">Preparing your gaming experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-2xl text-center text-white max-w-md mx-4"
            >
              <div className="flex items-center justify-center mb-4">
                <Plane className="h-12 w-12 mr-3 animate-pulse" />
                <Sparkles className="h-8 w-8 text-yellow-300" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Aviator!</h1>
              <p className="text-purple-100 mb-4">
                Get ready for the ultimate crash game experience
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  <span>Real-time</span>
                </div>
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-1" />
                  <span>Fair Play</span>
                </div>
                <div className="flex items-center">
                  <Crown className="h-4 w-4 mr-1" />
                  <span>Win Big</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header with Connection Status */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-slate-800/50 to-purple-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {gameState.roundNumber > 0 && (
                    <Badge variant="outline" className="bg-purple-500/20 border-purple-500/30 text-purple-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Round #{gameState.roundNumber}
                    </Badge>
                  )}
                  {gameState.activePlayers > 0 && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-200">
                      <Users className="h-3 w-3 mr-1" />
                      {gameState.activePlayers} online
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isConnected && (
                    <Button onClick={refreshConnection} size="sm" variant="outline" className="border-red-500/30 text-red-200 hover:bg-red-500/20">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconnect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Game Statistics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <GameStats />
        </motion.div>

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Game Canvas */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="h-[500px] relative"
            >
              <ErrorBoundary>
                <GameCanvas
                  multiplier={gameState.multiplier}
                  phase={gameState.phase}
                  timeLeft={gameState.bettingTimeLeft}
                />
              </ErrorBoundary>
              
              {/* Floating multiplier indicator */}
              {gameState.phase === 'flying' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg"
                >
                  {gameState.multiplier.toFixed(2)}x
                </motion.div>
              )}
            </motion.div>

            {/* Enhanced Game Info Cards */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="h-6 w-6 text-blue-400 mr-2" />
                    <p className="text-2xl font-bold text-blue-300">
                      {gameState.roundNumber}
                    </p>
                  </div>
                  <p className="text-sm text-blue-200">Round</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-green-400 mr-2" />
                    <p className="text-2xl font-bold text-green-300">
                      {gameState.totalBets}
                    </p>
                  </div>
                  <p className="text-sm text-green-200">Total Bets</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-6 w-6 text-purple-400 mr-2" />
                    <p className="text-2xl font-bold text-purple-300">
                      ${gameState.totalWagered.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-purple-200">Total Wagered</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/30 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-6 w-6 text-orange-400 mr-2" />
                    <p className="text-2xl font-bold text-orange-300">
                      {gameState.multiplier.toFixed(2)}x
                    </p>
                  </div>
                  <p className="text-sm text-orange-200">Current</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Bets and Recent Multipliers */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Active Bets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActiveBets
                    bets={mockBets}
                    currentMultiplier={gameState.multiplier}
                  />
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-slate-600/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Recent Multipliers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentMultipliers />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Enhanced Sidebar */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            {/* Betting Panel */}
            <Card className="bg-gradient-to-br from-slate-800/50 to-purple-800/50 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Place Your Bet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BettingPanel
                  gamePhase={gameState.phase}
                  currentMultiplier={gameState.multiplier}
                  bettingTimeLeft={gameState.bettingTimeLeft}
                  onPlaceBet={handlePlaceBet}
                  onCashout={handleCashout}
                  userBalance={userBalance}
                  userBet={userBet}
                  canPlaceBet={canPlaceBet}
                  canCashOut={canCashOut}
                  potentialPayout={potentialPayout}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>

            {/* Chat Panel */}
            <Card className="bg-gradient-to-br from-slate-800/50 to-blue-800/50 border-blue-500/30 backdrop-blur-sm h-[500px]">
              <CardHeader>
                <CardTitle className="text-blue-200 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <ChatPanel
                  messages={chatMessages}
                  onSendMessage={sendChatMessage}
                  isConnected={isConnected}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 max-w-sm z-50"
            >
              <Card className="bg-gradient-to-r from-red-500/90 to-red-600/90 border-red-400/50 backdrop-blur-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-200" />
                    <p className="text-sm text-red-100">
                      {error}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
