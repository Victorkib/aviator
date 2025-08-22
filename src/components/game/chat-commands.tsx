'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Trophy, 
  Settings,
  Keyboard,
  Sparkles
} from 'lucide-react';

interface ChatCommandsProps {
  onCommand: (command: string) => void;
  onClose: () => void;
}

const CHAT_COMMANDS = [
  {
    category: 'Game Commands',
    commands: [
      { command: '/balance', description: 'Show your current balance', icon: DollarSign },
      { command: '/stats', description: 'Show your betting statistics', icon: TrendingUp },
      { command: '/history', description: 'Show recent game history', icon: Trophy },
      { command: '/help', description: 'Show this help menu', icon: Settings },
    ]
  },
  {
    category: 'Quick Actions',
    commands: [
      { command: '/bet 10', description: 'Place a $10 bet', icon: Target },
      { command: '/auto 2x', description: 'Set auto-cashout to 2x', icon: Zap },
      { command: '/cashout', description: 'Cash out current bet', icon: DollarSign },
    ]
  },
  {
    category: 'Fun Commands',
    commands: [
      { command: '/dance', description: 'Show a dance animation', icon: Sparkles },
      { command: '/wave', description: 'Wave to other players', icon: Sparkles },
      { command: '/gg', description: 'Good game!', icon: Trophy },
    ]
  }
];

const QUICK_SHORTCUTS = [
  { key: 'Ctrl + B', action: 'Place bet' },
  { key: 'Ctrl + C', action: 'Cash out' },
  { key: 'Ctrl + H', action: 'Show help' },
  { key: 'Ctrl + R', action: 'Refresh game' },
];

export function ChatCommands({ onCommand, onClose }: ChatCommandsProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);

  const handleCommandClick = (command: string) => {
    onCommand(command);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute bottom-full right-0 mb-2 w-80 bg-slate-800/95 border border-slate-600/50 rounded-lg shadow-xl backdrop-blur-sm z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-600/30">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">Chat Commands</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
        >
          ×
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-600/30">
        {CHAT_COMMANDS.map((category, index) => (
          <button
            key={category.category}
            onClick={() => setSelectedCategory(index)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              selectedCategory === index
                ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/10'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {category.category}
          </button>
        ))}
      </div>

      {/* Commands List */}
      <div className="max-h-64 overflow-y-auto">
        <div className="p-3">
          {CHAT_COMMANDS[selectedCategory].commands.map((cmd) => {
            const IconComponent = cmd.icon;
            return (
              <button
                key={cmd.command}
                onClick={() => handleCommandClick(cmd.command)}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 transition-colors text-left group"
              >
                <div className="flex-shrink-0">
                  <IconComponent className="h-4 w-4 text-slate-400 group-hover:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-blue-400 group-hover:text-blue-300">
                    {cmd.command}
                  </div>
                  <div className="text-xs text-slate-400 group-hover:text-slate-300">
                    {cmd.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="p-3 border-t border-slate-600/30 bg-slate-700/30">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Keyboard Shortcuts</h4>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{shortcut.action}</span>
              <Badge variant="outline" className="text-xs px-1 py-0 h-4 font-mono">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
