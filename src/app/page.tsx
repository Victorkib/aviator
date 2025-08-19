import { Suspense } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GameStats, type GameStatsData } from '@/components/game/game-stats';
import { RecentMultipliers } from '@/components/game/recent-multipliers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Play, TrendingUp, Users, Shield, Zap } from 'lucide-react';

async function getGameStats(): Promise<GameStatsData> {
  try {
    const supabase = getSupabaseAdmin();

    // Get game statistics
    const { data: statsData, error: statsError } = await supabase.rpc(
      'get_game_statistics'
    );

    if (statsError) {
      console.error('Error fetching game statistics:', statsError);
      throw new Error('Failed to fetch statistics');
    }

    const stats =
      statsData && statsData.length > 0
        ? statsData[0]
        : {
            total_rounds: 0,
            total_players: 0,
            total_wagered: 0,
            average_multiplier: 0,
            highest_multiplier: 0,
          };

    // Get recent multipliers
    const { data: recentRounds, error: recentError } = await supabase
      .from('game_rounds')
      .select('crash_multiplier')
      .eq('phase', 'crashed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent rounds:', recentError);
    }

    const recentMultipliers = (recentRounds || []).map(
      (round) => round.crash_multiplier || 1.0
    );

    return {
      totalRounds: Number(stats.total_rounds),
      totalPlayers: Number(stats.total_players),
      totalWagered: Number(stats.total_wagered),
      averageMultiplier: Number(stats.average_multiplier),
      highestMultiplier: Number(stats.highest_multiplier),
      recentMultipliers,
    };
  } catch (error) {
    console.error('Failed to get game stats:', error);
    return {
      totalRounds: 0,
      totalPlayers: 0,
      totalWagered: 0,
      averageMultiplier: 0,
      highestMultiplier: 0,
      recentMultipliers: [],
    };
  }
}

function GameStatsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function GameStatsSection() {
  const stats = await getGameStats();
  return <GameStats data={stats} />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Aviator
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {' '}
                Crash Game
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              Experience the thrill of the ultimate crash game. Watch the
              multiplier soar and cash out before it crashes!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4"
              >
                <Link href="/game">
                  <Play className="mr-2 h-5 w-5" />
                  Play Now
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Choose Aviator?
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Experience the most advanced crash game with provably fair
              mechanics and real-time multiplayer action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-400 mb-2" />
                <CardTitle className="text-white">Provably Fair</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Every round is cryptographically verifiable. Check the
                  fairness of each game yourself.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Zap className="h-8 w-8 text-yellow-400 mb-2" />
                <CardTitle className="text-white">Instant Cashout</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Lightning-fast cashouts with real-time multiplier tracking.
                  Never miss your moment.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Users className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">Multiplayer</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Play alongside other players in real-time. See their bets and
                  cashouts live.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-green-400 mb-2" />
                <CardTitle className="text-white">Auto Cashout</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  Set your target multiplier and let the system cash out
                  automatically for you.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Statistics */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Game Statistics
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Live statistics from our gaming platform. Join thousands of
              players worldwide.
            </p>
          </div>

          <Suspense fallback={<GameStatsLoading />}>
            <GameStatsSection />
          </Suspense>
        </div>
      </section>

      {/* Recent Results */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Recent Results
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              See the latest crash multipliers from recent games.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <RecentMultipliers />
            </Suspense>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Take Flight?
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Join the excitement and test your timing skills. Will you cash out
              in time?
            </p>
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-lg"
            >
              <Link href="/game">
                <Play className="mr-2 h-6 w-6" />
                Start Playing Now
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
