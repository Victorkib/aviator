'use client';

import { useEffect, useState } from 'react';
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
}

interface ChatPersistenceProps {
  onMessagesLoaded: (messages: ChatMessage[]) => void;
  onNewMessage: (message: ChatMessage) => void;
  socketMessages: ChatMessage[];
}

export function ChatPersistence({
  onMessagesLoaded,
  onNewMessage,
  socketMessages,
}: ChatPersistenceProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<
    string | null
  >(null);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(
    new Set()
  );

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setIsLoading(true);
        console.log('Loading chat history...');

        const response = await fetch('/api/chat/history?limit=50');
        const result = await response.json();

        if (result.success && result.data) {
          console.log(
            `Loaded ${result.data.length} chat messages from database`
          );

          const messages: ChatMessage[] = result.data.map((msg: any) => ({
            id: msg.id,
            message: msg.message,
            user: {
              id: msg.user.id,
              name: msg.user.name,
              email: msg.user.email,
              avatarUrl: msg.user.avatarUrl,
            },
            timestamp: msg.timestamp,
          }));

          onMessagesLoaded(messages);

          // Track processed messages to avoid duplicates
          const messageIds = new Set(messages.map((msg) => msg.id));
          setProcessedMessageIds(messageIds);

          // Set the last message timestamp
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            setLastMessageTimestamp(lastMessage.timestamp);
          }
        } else {
          console.warn('Failed to load chat history:', result.error);
          onMessagesLoaded([]);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Load empty array on error so chat still works
        onMessagesLoaded([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, [onMessagesLoaded]);

  // Handle new messages from Socket.IO
  useEffect(() => {
    if (socketMessages.length === 0 || isLoading) return;

    // Find truly new messages that haven't been processed
    const newMessages = socketMessages.filter((msg) => {
      // Skip if already processed
      if (processedMessageIds.has(msg.id)) return false;

      // Skip if older than our last loaded message (avoid duplicates)
      if (lastMessageTimestamp && msg.timestamp <= lastMessageTimestamp)
        return false;

      return true;
    });

    if (newMessages.length === 0) return;

    console.log(`Processing ${newMessages.length} new Socket.IO messages`);

    // Process each new message
    newMessages.forEach((message) => {
      // Notify parent component of new message (for UI update)
      onNewMessage(message);

      // Mark as processed
      setProcessedMessageIds((prev) => new Set([...prev, message.id]));

      // Update last message timestamp
      if (!lastMessageTimestamp || message.timestamp > lastMessageTimestamp) {
        setLastMessageTimestamp(message.timestamp);
      }
    });
  }, [
    socketMessages,
    lastMessageTimestamp,
    isLoading,
    onNewMessage,
  ]); // Removed processedMessageIds from dependencies

  // Cleanup old processed message IDs to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      setProcessedMessageIds((prev) => {
        if (prev.size > 200) {
          // Keep only the last 100 IDs
          const array = Array.from(prev);
          return new Set(array.slice(-100));
        }
        return prev;
      });
    };

    const interval = setInterval(cleanup, 60000); // Cleanup every minute
    return () => clearInterval(interval);
  }, []);

  // This component handles logic only, no UI
  return null;
}
