'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { GameCanvas } from '@/components/game/game-canvas';
import { BettingPanel } from '@/components/game/betting-panel';
import { ActiveBets } from '@/components/game/active-bets';
import { ChatPanel } from '@/components/game/chat-panel';
import { GameStats } from '@/components/game/game-stats';
import { RecentMultipliers } from '@/components/game/recent-multipliers';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/hooks/use-toast';
import { LogOut, Settings, Menu, X } from 'lucide-react';

// Demo data for UI testing
const demoStats = {
  totalRounds: 15420,
  totalPlayers: 2847,
  totalWagered: 1250000,
  averageMultiplier: 2.34,
  highestMultiplier: 127.45,
  recentMultipliers: [
    2.45, 1.23, 5.67, 3.21, 1.89, 8.92, 2.11, 4.56, 1.45, 3.78,
  ],
};

const demoBets = [
  {
    id: '1',
    username: 'Player1',
    amount: 25,
    autoCashout: 2.5,
    cashedOut: false,
  },
  {
    id: '2',
    username: 'CryptoKing',
    amount: 100,
    cashedOut: true,
    cashoutMultiplier: 3.45,
    payout: 345,
  },
  {
    id: '3',
    username: 'LuckyBet',
    amount: 50,
    autoCashout: 5.0,
    cashedOut: false,
  },
];

const demoMessages = [
  {
    id: '1',
    username: 'System',
    message: 'Welcome to Aviator! Good luck!',
    timestamp: new Date().toISOString(),
    type: 'system' as const,
  },
  {
    id: '2',
    username: 'Player1',
    message: "Let's go! 🚀",
    timestamp: new Date().toISOString(),
    type: 'chat' as const,
  },
  {
    id: '3',
    username: 'CryptoKing',
    message: 'Cashed out at 3.45x! 💰',
    timestamp: new Date().toISOString(),
    type: 'win_announcement' as const,
  },
];

export default function GamePage() {
  const { data: session, status } = useSession();
  const [gameState, setGameState] = useState({
    phase: 'betting' as 'betting' | 'flying' | 'crashed' | 'preparing',
    multiplier: 1.0,
    timeElapsed: 0,
    bettingTimeLeft: 10000,
  });
  const [currentBet, setCurrentBet] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Demo game loop for UI testing
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase === 'betting') {
          if (prev.bettingTimeLeft <= 0) {
            return {
              ...prev,
              phase: 'flying',
              multiplier: 1.0,
              timeElapsed: 0,
            };
          }
          return { ...prev, bettingTimeLeft: prev.bettingTimeLeft - 100 };
        } else if (prev.phase === 'flying') {
          const newTimeElapsed = prev.timeElapsed + 100;
          const newMultiplier = Math.pow(1.0024, newTimeElapsed / 10);

          // Random crash between 1.5x and 10x for demo
          const crashPoint = 2.5 + Math.random() * 7.5;
          if (newMultiplier >= crashPoint) {
            return { ...prev, phase: 'crashed', multiplier: crashPoint };
          }
          return {
            ...prev,
            multiplier: newMultiplier,
            timeElapsed: newTimeElapsed,
          };
        } else if (prev.phase === 'crashed') {
          // Wait 3 seconds then start new round
          setTimeout(() => {
            setGameState({
              phase: 'betting',
              multiplier: 1.0,
              timeElapsed: 0,
              bettingTimeLeft: 10000,
            });
            setCurrentBet(null);
          }, 3000);
          return prev;
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handlePlaceBet = (amount: number, autoCashout?: number) => {
    setCurrentBet({
      amount,
      autoCashout,
      canCashout: gameState.phase === 'flying',
      potentialPayout: amount * gameState.multiplier,
    });
    toast({
      title: 'Bet Placed',
      description: `$${amount.toFixed(2)} bet placed successfully!`,
      variant: 'success',
    });
  };

  const handleCashout = () => {
    if (currentBet) {
      const payout = currentBet.amount * gameState.multiplier;
      toast({
        title: 'Cashed Out!',
        description: `You won $${payout.toFixed(
          2
        )} at ${gameState.multiplier.toFixed(2)}x!`,
        variant: 'success',
      });
      setCurrentBet(null);
    }
  };

  const handleSendMessage = (message: string) => {
    toast({
      title: message ? message : 'Message Sent',
      description: 'Your message has been sent to the chat.',
    });
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✈️</div>
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Preparing for takeoff...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Aviator
              </h1>
              <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                Real-time multiplayer crash game
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {session?.user?.name}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                  ${session?.user?.balance?.toFixed(2) || '0.00'}
                </div>
              </div>
              <Avatar>
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                  {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 bg-transparent"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-gray-300 dark:border-gray-600 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-900 dark:text-white"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar>
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    {session?.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {session?.user?.name}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    ${session?.user?.balance?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-gray-300 dark:border-gray-600 bg-transparent"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-start border-gray-300 dark:border-gray-600 bg-transparent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Game Stats */}
        <div className="mb-6">
          <GameStats stats={demoStats} />
        </div>

        {/* Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Canvas - Takes up most space */}
          <div className="lg:col-span-2">
            <div className="h-96 lg:h-[500px]">
              <GameCanvas
                multiplier={gameState.multiplier}
                phase={gameState.phase}
                timeElapsed={gameState.timeElapsed}
                isDemo={true}
              />
            </div>
            {/* Recent Multipliers below canvas */}
            <div className="mt-4">
              <RecentMultipliers multipliers={demoStats.recentMultipliers} />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Betting Panel */}
            <BettingPanel
              userBalance={session?.user?.balance || 100}
              gamePhase={gameState.phase}
              bettingTimeLeft={gameState.bettingTimeLeft}
              onPlaceBet={handlePlaceBet}
              onCashout={handleCashout}
              currentBet={currentBet}
              isDemo={true}
            />

            {/* Active Bets and Chat in a row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActiveBets
                bets={demoBets}
                currentMultiplier={gameState.multiplier}
              />
              <ChatPanel
                messages={demoMessages}
                onSendMessage={handleSendMessage}
                currentUser={{
                  username:
                    session?.user?.username || session?.user?.name || 'Player',
                  avatar: session?.user?.image || undefined,
                }}
                isDemo={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
