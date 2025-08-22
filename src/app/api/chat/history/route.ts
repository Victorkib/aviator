import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '50'),
      100
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get('offset') || '0'),
      0
    );

    // Try to get from cache first
    const cacheKey = `chat_history:${limit}:${offset}`;
    const cached = await CacheManager.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        pagination: {
          limit,
          offset,
          hasMore: cached.length === limit,
        },
      });
    }

    const supabase = getSupabaseAdmin();

    // Get chat messages first
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, message, created_at, user_id')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching chat messages:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch chat messages',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Get unique user IDs from messages
    const userIds = [...new Set((messages || []).map(msg => msg.user_id))];
    
    // Fetch user data for all users in one query
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user data:', usersError);
      // Continue without user data rather than failing
    }

    // Create a map for quick user lookup
    const userMap = new Map();
    (users || []).forEach(user => {
      userMap.set(user.id, user);
    });

    // Format messages for frontend
    const formattedMessages = (messages || []).reverse().map((msg: any) => {
      const user = userMap.get(msg.user_id);
      return {
        id: msg.id,
        message: msg.message,
        user: {
          id: msg.user_id,
          name:
            user?.display_name ||
            user?.username ||
            `User${msg.user_id.toString().slice(-4)}`,
          email: user?.email,
          avatarUrl: user?.avatar_url,
        },
        timestamp: msg.created_at,
      };
    });

    // Cache for 30 seconds
    await CacheManager.set(cacheKey, formattedMessages, 30);

    return NextResponse.json({
      success: true,
      data: formattedMessages,
      cached: false,
      pagination: {
        limit,
        offset,
        hasMore: messages?.length === limit,
      },
    });
  } catch (error) {
    console.error('Chat history API error:', error);
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
