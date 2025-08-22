import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CacheManager } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching balance for user:', {
      userId: session.user.id,
      externalId: session.user.externalId,
    });

    // Try cache first
    const cachedBalance = await CacheManager.getUserBalance(session.user.id);
    if (cachedBalance !== null) {
      return NextResponse.json({
        balance: cachedBalance,
        cached: true,
      });
    }

    const supabase = getSupabaseAdmin();

    // Get user balance using the UUID from session
    // Use COALESCE to handle potentially missing columns gracefully
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id, 
        balance, 
        total_wagered, 
        total_won, 
        games_played
      `
      )
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Database error fetching user balance:', userError);

      // If it's a column not found error, try a simpler query
      if (userError.code === '42703') {
        console.log('Column not found, trying simpler query...');
        const { data: simpleUserData, error: simpleError } = await supabase
          .from('users')
          .select('id, balance')
          .eq('id', session.user.id)
          .single();

        if (simpleError) {
          console.error('Simple query also failed:', simpleError);
          return NextResponse.json(
            {
              error: 'Failed to fetch user balance',
              details: simpleError.message,
            },
            { status: 500 }
          );
        }

        if (!simpleUserData) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        const response = {
          balance: Number(simpleUserData.balance) || 0,
          totalWagered: 0,
          totalWon: 0,
          gamesPlayed: 0,
          cached: false,
          note: 'Limited data due to schema mismatch',
        };

        // Cache the balance
        await CacheManager.setUserBalance(session.user.id, response.balance);
        return NextResponse.json(response);
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch user balance',
          details: userError.message,
        },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error('User not found in database:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = {
      balance: Number(userData.balance) || 0,
      totalWagered: Number(userData.total_wagered) || 0,
      totalWon: Number(userData.total_won) || 0,
      gamesPlayed: userData.games_played || 0,
      cached: false,
    };

    // Cache the balance
    await CacheManager.setUserBalance(session.user.id, response.balance);

    console.log('Balance fetched successfully:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, type, description } = await request.json();

    if (!amount || !type) {
      return NextResponse.json(
        { error: 'Amount and type are required' },
        { status: 400 }
      );
    }

    console.log('Updating balance:', {
      userId: session.user.id,
      amount,
      type,
      description,
    });

    const supabase = getSupabaseAdmin();

    // Use our database function to update balance
    const { data, error } = await supabase.rpc('update_user_balance', {
      p_user_identifier: session.user.id,
      p_amount: amount,
      p_transaction_type: type,
      p_description: description || '',
    });

    if (error) {
      console.error('Database error updating balance:', error);
      return NextResponse.json(
        {
          error: 'Failed to update balance',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const result = data[0];
    if (!result.success) {
      return NextResponse.json(
        { error: result.error_message },
        { status: 400 }
      );
    }

    // Invalidate cache
    await CacheManager.invalidateUserBalance(session.user.id);

    return NextResponse.json({
      success: true,
      newBalance: Number(result.new_balance),
    });
  } catch (error) {
    console.error('Error updating user balance:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
