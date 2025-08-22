'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Shield, 
  Star, 
  Zap, 
  Target,
  DollarSign,
  TrendingUp,
  Plane,
  Trophy,
  Flame
} from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    message: string;
    user: {
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string;
    };
    timestamp: string;
    type?: 'message' | 'system' | 'bet' | 'cashout' | 'crash' | 'win' | 'achievement';
    userRole?: 'user' | 'vip' | 'moderator' | 'admin';
    metadata?: {
      betAmount?: number;
      multiplier?: number;
      payout?: number;
      achievement?: string;
    };
  };
  isOwnMessage: boolean;
  onReaction?: (emoji: string) => void;
}

const QUICK_REACTIONS = [
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💥', label: 'Crash' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👑', label: 'Crown' },
];

export function ChatMessage({ message, isOwnMessage, onReaction }: ChatMessageProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (user: { name: string; email?: string }) => {
    return user.name || user.email?.split('@')[0] || 'Anonymous';
  };

  const getUserRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-red-400" />;
      case 'moderator':
        return <Shield className="h-3 w-3 text-blue-400" />;
      case 'vip':
        return <Star className="h-3 w-3 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getMessageTypeStyle = (type?: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-200';
      case 'bet':
        return 'bg-green-500/20 border-green-500/30 text-green-200';
      case 'cashout':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200';
      case 'crash':
        return 'bg-red-500/20 border-red-500/30 text-red-200';
      case 'win':
        return 'bg-purple-500/20 border-purple-500/30 text-purple-200';
      case 'achievement':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-200';
      default:
        return 'bg-slate-700/50 border-slate-600/30 text-slate-200';
    }
  };

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'system':
        return <Zap className="h-3 w-3" />;
      case 'bet':
        return <Target className="h-3 w-3" />;
      case 'cashout':
        return <DollarSign className="h-3 w-3" />;
      case 'crash':
        return <TrendingUp className="h-3 w-3" />;
      case 'win':
        return <Trophy className="h-3 w-3" />;
      case 'achievement':
        return <Flame className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getAvatarGradient = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'from-red-500 to-pink-500';
      case 'moderator':
        return 'from-blue-500 to-cyan-500';
      case 'vip':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  const renderMessageContent = () => {
    if (message.type === 'bet' && message.metadata?.betAmount) {
      return (
        <div className="flex items-center gap-2">
          <span>Placed a bet of</span>
          <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400/30">
            ${message.metadata.betAmount.toFixed(2)}
          </Badge>
          {message.metadata.autoCashout && (
            <>
              <span>with auto-cashout at</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                {message.metadata.autoCashout}x
              </Badge>
            </>
          )}
        </div>
      );
    }

    if (message.type === 'cashout' && message.metadata?.payout && message.metadata?.multiplier) {
      return (
        <div className="flex items-center gap-2">
          <span>Cashed out at</span>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
            {message.metadata.multiplier.toFixed(2)}x
          </Badge>
          <span>for</span>
          <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400/30">
            ${message.metadata.payout.toFixed(2)}
          </Badge>
        </div>
      );
    }

    if (message.type === 'win' && message.metadata?.payout) {
      return (
        <div className="flex items-center gap-2">
          <span>🎉 Won</span>
          <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-400/30">
            ${message.metadata.payout.toFixed(2)}
          </Badge>
          <span>! Amazing flight!</span>
        </div>
      );
    }

    if (message.type === 'achievement' && message.metadata?.achievement) {
      return (
        <div className="flex items-center gap-2">
          <span>🏆 Achievement unlocked:</span>
          <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
            {message.metadata.achievement}
          </Badge>
        </div>
      );
    }

    return <span>{message.message}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group p-3 rounded-lg border ${getMessageTypeStyle(message.type)} transition-all duration-200 hover:bg-opacity-70`}
    >
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.user.avatarUrl} />
          <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(message.userRole)} text-white text-xs`}>
            {getDisplayName(message.user).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* User Info Row */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1">
              {getUserRoleIcon(message.userRole)}
              <span
                className={`text-sm font-medium truncate ${
                  isOwnMessage
                    ? 'text-green-400'
                    : 'text-blue-400'
                }`}
              >
                {getDisplayName(message.user)}
              </span>
              {isOwnMessage && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  You
                </Badge>
              )}
            </div>
            
            {getMessageTypeIcon(message.type)}
            
            <span className="text-xs text-slate-500 flex-shrink-0">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Message Content */}
          <div className="flex items-start gap-2">
            <div className="text-sm break-words leading-relaxed flex-1">
              {renderMessageContent()}
            </div>
            
            {/* Quick Reactions */}
            {onReaction && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {QUICK_REACTIONS.slice(0, 3).map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => onReaction(reaction.emoji)}
                    className="text-xs hover:scale-125 transition-transform"
                    title={reaction.label}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
