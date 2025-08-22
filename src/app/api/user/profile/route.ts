import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
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

    // Try cache first
    const cachedProfile = await CacheManager.getUserProfile(session.user.id);
    if (cachedProfile) {
      return NextResponse.json({
        success: true,
        data: cachedProfile,
      });
    }

    const supabase = getSupabaseAdmin();

    // Use the database function to get user profile
    const { data, error } = await supabase.rpc('get_user_profile', {
      p_user_id: session.user.id,
    });

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch user profile',
        },
        { status: 500 }
      );
    }

    const profile = Array.isArray(data) ? data[0] : data;

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Profile not found',
        },
        { status: 404 }
      );
    }

    // Cache the profile
    await CacheManager.setUserProfile(session.user.id, profile);

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Profile API error:', error);
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

export async function PUT(request: NextRequest) {
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
    const { username, display_name, bio, avatar_url } = body;

    // Basic validation
    if (username && (username.length < 3 || username.length > 20)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username must be between 3 and 20 characters',
        },
        { status: 400 }
      );
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username can only contain letters, numbers, and underscores',
        },
        { status: 400 }
      );
    }

    if (display_name && display_name.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Display name must be 50 characters or less',
        },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bio must be 500 characters or less',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Use the database function to update user profile
    const { data, error } = await supabase.rpc('update_user_profile', {
      p_user_id: session.user.id,
      p_username: username || null,
      p_display_name: display_name || null,
      p_bio: bio || null,
      p_avatar_url: avatar_url || null,
    });

    if (error) {
      console.error('Error updating user profile:', error);

      // Handle specific error cases
      if (error.message?.includes('username_unique')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Username is already taken',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update profile',
        },
        { status: 500 }
      );
    }

    const updatedProfile = Array.isArray(data) ? data[0] : data;

    // Invalidate cache
    await CacheManager.invalidateUserProfile(session.user.id);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Profile update API error:', error);
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
