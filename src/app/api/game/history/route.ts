import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '50'),
      100
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get('offset') || '0'),
      0
    );

    const supabase = getSupabaseAdmin();

    // Get user game history
    const { data: history, error } = await supabase.rpc(
      'get_user_game_history',
      {
        p_user_id: session.user.id,
        p_limit: limit,
        p_offset: offset,
      }
    );

    if (error) {
      console.error('Error fetching game history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch game history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        history: history || [],
        pagination: {
          limit,
          offset,
          hasMore: (history?.length || 0) === limit,
        },
      },
    });
  } catch (error) {
    console.error('Game history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
