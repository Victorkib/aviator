'use client';

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  Wifi, 
  WifiOff, 
  Users, 
  Crown, 
  Shield, 
  Star, 
  Zap, 
  Plane,
  Target,
  DollarSign,
  TrendingUp,
  Smile,
  Lock,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatPersistence } from './chat-persistence';
import { ChatMessage } from './chat-message';
import { ChatCommands } from './chat-commands';
import { useSession } from 'next-auth/react';

interface ChatMessage {
  id: string;
  message: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  timestamp: string;
  type?: 'message' | 'system' | 'bet' | 'cashout' | 'crash';
  userRole?: 'user' | 'vip' | 'moderator' | 'admin';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  onlineUsers?: number;
}

const QUICK_REACTIONS = [
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💥', label: 'Crash' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👑', label: 'Crown' },
];

export function ChatPanel({
  messages,
  onSendMessage,
  isConnected,
  onlineUsers = 0,
}: ChatPanelProps) {
  const { data: session } = useSession();
  const [newMessage, setNewMessage] = useState('');
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle messages loaded from database
  const handleMessagesLoaded = useCallback((loadedMessages: ChatMessage[]) => {
    console.log(`Chat history loaded: ${loadedMessages.length} messages`);
    setAllMessages(loadedMessages);
    setIsLoadingHistory(false);
  }, []);

  // Handle new messages from Socket.IO
  const handleNewMessage = useCallback((message: ChatMessage) => {
    console.log('New message received:', message.id);
    setAllMessages((prev) => {
      // Avoid duplicates
      if (prev.some((msg) => msg.id === message.id)) {
        return prev;
      }
      // Add new message and keep last 100 messages
      return [...prev, message].slice(-100);
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !isConnected || !session) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Send via Socket.IO for real-time delivery and database persistence
      onSendMessage(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if there was an error
      setNewMessage(messageText);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    if (!session) return;
    onSendMessage(emoji);
    setShowReactions(false);
  };

  const handleCommand = (command: string) => {
    setNewMessage(command);
    setShowCommands(false);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (user: { name: string; email?: string }) => {
    return user.name || user.email?.split('@')[0] || 'Anonymous';
  };

  const isOwnMessage = (message: ChatMessage) => {
    return (
      session?.user?.id === message.user.id ||
      session?.user?.email === message.user.email
    );
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
      default:
        return null;
    }
  };

  return (
    <>
      {/* Chat Persistence Component - handles database integration */}
      <ChatPersistence
        onMessagesLoaded={handleMessagesLoaded}
        onNewMessage={handleNewMessage}
        socketMessages={messages}
      />

      <div className="h-full flex flex-col">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-blue-200 font-semibold text-sm">Live Chat</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                <span>{onlineUsers} online</span>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommands(!showCommands)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
              title="Chat commands"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
          <div className="space-y-3">
            {isLoadingHistory ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-slate-400 text-sm py-8"
              >
                <div className="relative">
                  <Plane className="h-8 w-8 mx-auto mb-2 opacity-50 animate-bounce" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse"></div>
                </div>
                <p>Loading chat history...</p>
              </motion.div>
            ) : allMessages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-slate-400 text-sm py-8"
              >
                <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-xs mt-1">Be the first to say something!</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {allMessages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage(message)}
                    onReaction={handleQuickReaction}
                  />
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Enhanced Input Area */}
        <div className="p-3 bg-slate-800/30 border-t border-slate-600/30 relative">
          {!session ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-400">Authentication Required</span>
              </div>
              <p className="text-xs text-slate-400">Please sign in to participate in chat</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSendMessage} className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      !isConnected
                        ? 'Connecting to chat...'
                        : 'Type your message... (Press / for commands)'
                    }
                    disabled={!isConnected}
                    maxLength={500}
                    className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 text-sm pr-20"
                  />
                  
                  {/* Quick Reactions Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReactions(!showReactions)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
                  >
                    <Smile className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isConnected || !newMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {/* Chat Commands */}
              <AnimatePresence>
                {showCommands && (
                  <ChatCommands
                    onCommand={handleCommand}
                    onClose={() => setShowCommands(false)}
                  />
                )}
              </AnimatePresence>

              {/* Quick Reactions Panel */}
              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-700/50 rounded-lg p-2 mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Quick reactions:</span>
                      {QUICK_REACTIONS.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          onClick={() => handleQuickReaction(reaction.emoji)}
                          className="text-lg hover:scale-125 transition-transform"
                          title={reaction.label}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Character Counter and Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  {newMessage.length}/500 characters
                </div>
                <div className="flex items-center gap-2">
                  {!isConnected && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <WifiOff className="h-3 w-3" />
                      <span>Disconnected</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
