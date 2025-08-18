import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import { supabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
  // Remove the Supabase adapter temporarily
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
    async jwt({ token, user, account }) {
      // Save user info to token on first sign in
      if (user && account) {
        token.id = user.id;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string;

        // Get user data from our custom users table
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('username, balance, status')
          .eq('email', session.user.email)
          .single();

        if (userData) {
          session.user.username = userData.username;
          session.user.balance = userData.balance;
          session.user.status = userData.status;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Check if user exists in our custom table
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id, email')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // Create new user
          const username = user.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

          const { error: userError } = await supabaseAdmin
            .from('users')
            .insert({
              email: user.email,
              username: username,
              display_name: user.name || username,
              avatar_url: user.image,
              email_verified: true,
              balance: 100.0,
              status: 'active',
            });

          if (userError) {
            console.error('Error creating user:', userError);
            return false;
          }

          // Add welcome bonus transaction
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();

          if (newUser) {
            await supabaseAdmin.from('transactions').insert({
              user_id: newUser.id,
              type: 'bonus',
              amount: 100.0,
              balance_before: 0.0,
              balance_after: 100.0,
              description: 'Welcome bonus',
              status: 'completed',
            });
          }
        } else {
          // Update existing user
          await supabaseAdmin
            .from('users')
            .update({
              display_name: user.name,
              avatar_url: user.image,
              last_login_at: new Date().toISOString(),
            })
            .eq('email', user.email);
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt', // Use JWT instead of database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
