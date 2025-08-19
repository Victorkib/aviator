'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Search,
  TrendingUp,
  TrendingDown,
  Download,
} from 'lucide-react';

// Demo data for game history
const demoHistory = [
  {
    id: '1',
    roundId: 'round_123',
    date: '2024-01-15T10:30:00Z',
    betAmount: 25.0,
    multiplier: 2.45,
    payout: 61.25,
    profit: 36.25,
    status: 'won',
  },
  {
    id: '2',
    roundId: 'round_124',
    date: '2024-01-15T10:25:00Z',
    betAmount: 50.0,
    multiplier: 1.23,
    payout: 0,
    profit: -50.0,
    status: 'lost',
  },
  {
    id: '3',
    roundId: 'round_125',
    date: '2024-01-15T10:20:00Z',
    betAmount: 10.0,
    multiplier: 5.67,
    payout: 56.7,
    profit: 46.7,
    status: 'won',
  },
  {
    id: '4',
    roundId: 'round_126',
    date: '2024-01-15T10:15:00Z',
    betAmount: 75.0,
    multiplier: 1.89,
    payout: 141.75,
    profit: 66.75,
    status: 'won',
  },
  {
    id: '5',
    roundId: 'round_127',
    date: '2024-01-15T10:10:00Z',
    betAmount: 30.0,
    multiplier: 1.05,
    payout: 0,
    profit: -30.0,
    status: 'lost',
  },
];

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  const filteredHistory = demoHistory.filter((bet) => {
    const matchesSearch = bet.roundId
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || bet.status === filter;
    return matchesSearch && matchesFilter;
  });

  const totalBets = demoHistory.length;
  const totalWagered = demoHistory.reduce((sum, bet) => sum + bet.betAmount, 0);
  const totalProfit = demoHistory.reduce((sum, bet) => sum + bet.profit, 0);
  const winRate =
    totalBets > 0
      ? (demoHistory.filter((bet) => bet.status === 'won').length / totalBets) *
        100
      : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Won
          </Badge>
        );
      case 'lost':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Lost
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Game History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your betting history and performance
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Bets
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalBets}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Wagered
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${totalWagered.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Profit
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      totalProfit >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    ${totalProfit.toFixed(2)}
                  </p>
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    totalProfit >= 0
                      ? 'bg-green-100 dark:bg-green-900'
                      : 'bg-red-100 dark:bg-red-900'
                  }`}
                >
                  {totalProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Win Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {winRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Betting History</CardTitle>
            <CardDescription>View and filter your past bets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by round ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'won' ? 'default' : 'outline'}
                  onClick={() => setFilter('won')}
                  size="sm"
                >
                  Won
                </Button>
                <Button
                  variant={filter === 'lost' ? 'default' : 'outline'}
                  onClick={() => setFilter('lost')}
                  size="sm"
                >
                  Lost
                </Button>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Round ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Bet Amount
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Multiplier
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Payout
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Profit
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((bet) => (
                    <tr
                      key={bet.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-3 px-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {bet.roundId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(bet.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ${bet.betAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {bet.multiplier.toFixed(2)}x
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {bet.payout > 0 ? `$${bet.payout.toFixed(2)}` : '-'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${
                          bet.profit >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(bet.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchTerm || filter !== 'all'
                    ? 'No bets match your filters'
                    : 'No betting history yet'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
