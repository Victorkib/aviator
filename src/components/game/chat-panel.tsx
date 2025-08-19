'use client';

import type React from 'react';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Trophy, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  type: 'chat' | 'system' | 'win_announcement' | 'bet_placed';
  avatar?: string;
  amount?: number;
  multiplier?: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUser: {
    username: string;
    avatar?: string;
  };
  isDemo?: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  currentUser,
  isDemo = false,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && newMessage.length <= 200) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'win_announcement':
        return <Trophy className="h-3 w-3 text-yellow-500" />;
      case 'system':
        return <AlertCircle className="h-3 w-3 text-blue-500" />;
      case 'bet_placed':
        return <MessageCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      case 'win_announcement':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'bet_placed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white';
    }
  };

  return (
    <Card className="w-full h-[400px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
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

      <CardContent className="p-0 flex flex-col h-[320px]">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-3 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg border ${getMessageStyle(
                  message.type
                )} transition-colors`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'chat' && (
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarImage
                        src={
                          message.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`
                        }
                      />
                      <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs">
                        {message.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getMessageIcon(message.type)}
                      <span className="font-medium text-sm truncate">
                        {message.type === 'system'
                          ? 'System'
                          : message.username}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <div className="text-sm break-words">
                      {message.type === 'win_announcement' &&
                      message.amount &&
                      message.multiplier ? (
                        <span>
                          Won{' '}
                          <span className="font-bold text-green-600 dark:text-green-400">
                            ${message.amount.toFixed(2)}
                          </span>{' '}
                          at{' '}
                          <span className="font-bold">
                            {message.multiplier.toFixed(2)}x
                          </span>
                          ! 🎉
                        </span>
                      ) : message.type === 'bet_placed' && message.amount ? (
                        <span>
                          Placed a{' '}
                          <span className="font-bold">
                            ${message.amount.toFixed(2)}
                          </span>{' '}
                          bet
                        </span>
                      ) : (
                        message.message
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isDemo ? 'Chat disabled in demo mode' : 'Type a message...'
                }
                disabled={isDemo}
                maxLength={200}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser.username}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {newMessage.length}/200
                </span>
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || newMessage.length > 200 || isDemo}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
