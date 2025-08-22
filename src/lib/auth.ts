import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email || !account) {
          console.error('Missing email or account information');
          return false;
        }

        // Create external ID from provider and provider account ID
        const externalId = `${account.provider}_${account.providerAccountId}`;

        console.log('SignIn attempt:', {
          email: user.email,
          externalId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        });

        // Call our database function to find or create user
        const { data: userId, error } = await supabase.rpc(
          'find_or_create_user_by_external_id',
          {
            p_external_id: externalId,
            p_email: user.email,
            p_display_name: user.name || null,
            p_avatar_url: user.image || null,
          }
        );

        if (error) {
          console.error('Database error during sign in:', error);
          return false;
        }

        if (!userId) {
          console.error('No user ID returned from database function');
          return false;
        }

        // Store the UUID for use in JWT and session
        user.id = userId;

        console.log('User signed in successfully:', {
          uuid: userId,
          email: user.email,
          externalId,
        });

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth account info and user UUID to the token
      if (account && user) {
        token.userId = user.id;
        token.externalId = `${account.provider}_${account.providerAccountId}`;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.externalId = token.externalId as string;
        session.user.provider = token.provider as string;

        // Optionally fetch fresh user data from database
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('username, balance, status, display_name')
            .eq('id', token.userId)
            .single();

          if (!error && userData) {
            session.user.username = userData.username;
            session.user.balance = Number(userData.balance);
            session.user.status = userData.status;
            session.user.displayName = userData.display_name;
          }
        } catch (error) {
          console.error('Error fetching user data for session:', error);
          // Continue without fresh data
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
