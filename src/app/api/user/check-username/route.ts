import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Username is required',
        },
        { status: 400 }
      );
    }

    // Basic username validation
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: 'Username must be between 3 and 20 characters',
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          available: false,
          error: 'Username can only contain letters, numbers, and underscores',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Use the database function to check availability
    const { data, error } = await supabase.rpc('check_username_availability', {
      p_username: username,
      p_current_user_id: session.user.id,
    });

    if (error) {
      console.error('Error checking username availability:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check username availability',
        },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.available) {
      return NextResponse.json({
        success: true,
        available: true,
        message: 'Username is available',
      });
    } else {
      // Generate suggestions
      const suggestions = [];
      for (let i = 1; i <= 3; i++) {
        suggestions.push(`${username}${Math.floor(Math.random() * 1000)}`);
      }

      return NextResponse.json({
        success: true,
        available: false,
        message: result?.message || 'Username is not available',
        suggestions,
      });
    }
  } catch (error) {
    console.error('Username check API error:', error);
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
