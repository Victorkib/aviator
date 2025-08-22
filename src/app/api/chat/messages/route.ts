import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please sign in to send messages',
        },
        { status: 401 }
      );
    }

    // Rate limiting for chat messages - 10 messages per minute per user
    const rateLimitKey = `chat_message:${session.user.id}`;
    const isAllowed = await CacheManager.checkRateLimit(rateLimitKey, 10, 60);

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Rate limit exceeded. Please slow down (max 10 messages per minute).',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message, timestamp } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required and must be a string',
        },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message cannot be empty',
        },
        { status: 400 }
      );
    }

    if (cleanMessage.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message too long (max 500 characters)',
        },
        { status: 400 }
      );
    }

    // Basic content filtering (you can expand this)
    const forbiddenWords = ['spam', 'scam', 'hack'];
    const lowerMessage = cleanMessage.toLowerCase();
    const containsForbidden = forbiddenWords.some((word) =>
      lowerMessage.includes(word)
    );

    if (containsForbidden) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message contains inappropriate content',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Save message to database
    const { data: savedMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: session.user.id,
        message: cleanMessage,
        created_at: timestamp || new Date().toISOString(),
      })
      .select('id, message, created_at, user_id')
      .single();

    if (error) {
      console.error('Error saving chat message:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save message',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Get user data separately to avoid relationship issues
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('username, display_name, avatar_url, email')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Continue without user data rather than failing
    }

    // Format response
    const formattedMessage = {
      id: savedMessage.id,
      message: savedMessage.message,
      user: {
        id: savedMessage.user_id,
        name:
          userProfile?.display_name ||
          userProfile?.username ||
          `User${savedMessage.user_id.toString().slice(-4)}`,
        email: userProfile?.email,
        avatarUrl: userProfile?.avatar_url,
      },
      timestamp: savedMessage.created_at,
    };

    // Clear chat history cache since we added a new message
    await CacheManager.del('chat_history:50:0');

    return NextResponse.json({
      success: true,
      data: formattedMessage,
    });
  } catch (error) {
    console.error('Chat message API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
