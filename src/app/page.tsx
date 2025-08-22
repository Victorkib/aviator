import { Suspense } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GameStats } from '@/components/game/game-stats';
import { RecentMultipliers } from '@/components/game/recent-multipliers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Plane,
  TrendingUp,
  Shield,
  MessageCircle,
  Zap,
  DollarSign,
  Users,
  Trophy,
  Target,
  Clock,
  Star,
  ArrowRight,
} from 'lucide-react';

interface GameStatsData {
  totalRounds: number;
  totalPlayers: number;
  totalWagered: number;
  averageMultiplier: number;
  highestMultiplier: number;
  recentMultipliers: number[];
}

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
            active_players: 0,
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
      (round) => round.crash_multiplier
    );

    return {
      totalRounds: Number(stats.total_rounds),
      totalPlayers: Number(stats.total_players || stats.active_players || 0),
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

function GameStatsSection() {
  return (
    <Suspense fallback={<GameStatsSkeleton />}>
      <GameStatsContent />
    </Suspense>
  );
}

function GameStatsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function GameStatsContent() {
  const data = await getGameStats();

  return (
    <div className="space-y-8">
      <GameStats data={data} />
      <RecentMultipliers />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm font-medium">
              <Plane className="w-4 h-4 mr-2" />
              Real-time Multiplayer Crash Game
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                Aviator
              </span>
              <br />
              <span className="text-foreground">Crash Game</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Experience the ultimate thrill of real-time betting. Watch the
              multiplier soar, time your cashout perfectly, and win big before
              the crash!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="text-lg px-8 py-6 h-auto group"
              >
                <Link href="/game">
                  <Plane className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  Play Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 h-auto bg-transparent"
              >
                <Link href="/auth/signin">
                  <Trophy className="w-5 h-5 mr-2" />
                  View Leaderboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Statistics Section */}
      <section className="py-16 lg:py-24 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Live Statistics
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Real-time Game Data
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track live game statistics, recent multipliers, and player
              activity in real-time
            </p>
          </div>
          <GameStatsSection />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Star className="w-4 h-4 mr-2" />
              Game Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Aviator?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the most advanced crash game with cutting-edge features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Real-Time Action</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Experience lightning-fast multiplier updates with smooth 60fps
                  animations and instant bet processing through WebSocket
                  connections.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-xl">Provably Fair</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Every round uses cryptographic algorithms with SHA-256 hashing
                  to ensure complete fairness and transparency. Verify any round
                  result.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Connect with players worldwide through our real-time chat
                  system. Share strategies, celebrate wins, and build community.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition-colors">
                  <Target className="w-6 h-6 text-yellow-500" />
                </div>
                <CardTitle className="text-xl">Auto Cashout</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Set your target multiplier and let the system automatically
                  cash out for you. Never miss your perfect exit point again.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle className="text-xl">Multiplayer</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Play alongside hundreds of other players in real-time. See
                  their bets, cashouts, and strategies as the action unfolds.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
                  <DollarSign className="w-6 h-6 text-red-500" />
                </div>
                <CardTitle className="text-xl">Instant Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Lightning-fast payouts processed instantly when you cash out.
                  Your winnings are credited to your balance immediately.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-16 lg:py-24 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Target className="w-4 h-4 mr-2" />
              Game Guide
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How to Play Aviator
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Master the art of timing with our simple 4-step process
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-border/50">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Place Your Bet</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Enter your bet amount during the 10-second betting phase.
                    Set an optional auto-cashout multiplier.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Watch It Soar</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The plane takes off and the multiplier starts at 1.00x,
                    increasing rapidly with realistic flight physics.
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Cash Out</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click cash out before the plane crashes to secure your
                    winnings. Timing is everything!
                  </p>
                </div>

                <div className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">Win Big</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your payout equals your bet amount multiplied by the cashout
                    multiplier. The higher you go, the bigger the risk and
                    reward!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              <Clock className="w-4 h-4 mr-2" />
              Ready to Play?
            </Badge>

            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join Thousands of Players
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Experience the thrill of Aviator crash game. Test your timing,
              strategy, and nerves in the ultimate multiplayer betting
              experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="text-lg px-8 py-6 h-auto group"
              >
                <Link href="/game">
                  <Plane className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                  Start Playing Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 h-auto bg-transparent"
              >
                <Link href="/auth/signin">
                  <Users className="w-5 h-5 mr-2" />
                  Create Account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
