'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Zap, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Trophy, 
  Flame,
  Plane,
  Users,
  Star
} from 'lucide-react';

interface ChatNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'system';
  title: string;
  message: string;
  timestamp: string;
  icon?: string;
  metadata?: {
    betAmount?: number;
    multiplier?: number;
    payout?: number;
    achievement?: string;
    onlineUsers?: number;
  };
}

interface ChatNotificationsProps {
  notifications: ChatNotification[];
  onDismiss: (id: string) => void;
}

export function ChatNotifications({ notifications, onDismiss }: ChatNotificationsProps) {
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30 text-green-200';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200';
      case 'error':
        return 'bg-red-500/20 border-red-500/30 text-red-200';
      case 'achievement':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-200';
      case 'system':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-200';
      default:
        return 'bg-slate-700/50 border-slate-600/30 text-slate-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Trophy className="h-4 w-4" />;
      case 'warning':
        return <TrendingUp className="h-4 w-4" />;
      case 'error':
        return <Flame className="h-4 w-4" />;
      case 'achievement':
        return <Star className="h-4 w-4" />;
      case 'system':
        return <Zap className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`p-3 rounded-lg border ${getNotificationStyle(notification.type)} backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold">{notification.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {formatTime(notification.timestamp)}
                    </span>
                    <button
                      onClick={() => onDismiss(notification.id)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <p className="text-sm leading-relaxed">{notification.message}</p>
                
                {/* Metadata Display */}
                {notification.metadata && (
                  <div className="flex items-center gap-2 mt-2">
                    {notification.metadata.betAmount && (
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400/30">
                        ${notification.metadata.betAmount.toFixed(2)}
                      </Badge>
                    )}
                    {notification.metadata.multiplier && (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                        {notification.metadata.multiplier.toFixed(2)}x
                      </Badge>
                    )}
                    {notification.metadata.payout && (
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                        ${notification.metadata.payout.toFixed(2)}
                      </Badge>
                    )}
                    {notification.metadata.achievement && (
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                        {notification.metadata.achievement}
                      </Badge>
                    )}
                    {notification.metadata.onlineUsers && (
                      <Badge variant="outline" className="bg-slate-500/20 text-slate-300 border-slate-400/30">
                        <Users className="h-3 w-3 mr-1" />
                        {notification.metadata.onlineUsers}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
