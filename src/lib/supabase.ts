import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations
export const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Type-safe database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          external_id: string | null;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          balance: number;
          total_wagered: number | null;
          total_won: number | null;
          games_played: number | null;
          email_verified: boolean;
          status: string;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number | null;
          total_won?: number | null;
          games_played?: number | null;
          email_verified?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number | null;
          total_won?: number | null;
          games_played?: number | null;
          email_verified?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      game_rounds: {
        Row: {
          id: string;
          round_number: number;
          phase: string;
          crash_multiplier: number | null;
          server_seed: string | null;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string | null;
          betting_ended_at: string | null;
          flight_started_at: string | null;
          crashed_at: string | null;
          total_bets: number | null;
          total_wagered: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_number: number;
          phase?: string;
          crash_multiplier?: number | null;
          server_seed?: string | null;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at?: string | null;
          betting_ended_at?: string | null;
          flight_started_at?: string | null;
          crashed_at?: string | null;
          total_bets?: number | null;
          total_wagered?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_number?: number;
          phase?: string;
          crash_multiplier?: number | null;
          server_seed?: string | null;
          server_seed_hash?: string;
          client_seed?: string;
          nonce?: number;
          betting_started_at?: string | null;
          betting_ended_at?: string | null;
          flight_started_at?: string | null;
          crashed_at?: string | null;
          total_bets?: number | null;
          total_wagered?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          round_id: string;
          amount: number;
          auto_cashout: number | null;
          cashed_out: boolean;
          cashout_multiplier: number | null;
          payout: number | null;
          profit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          round_id: string;
          amount: number;
          auto_cashout?: number | null;
          cashed_out?: boolean;
          cashout_multiplier?: number | null;
          payout?: number | null;
          profit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          round_id?: string;
          amount?: number;
          auto_cashout?: number | null;
          cashed_out?: boolean;
          cashout_multiplier?: number | null;
          payout?: number | null;
          profit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          amount: number;
          balance_before: number;
          balance_after: number;
          description: string | null;
          status: string;
          round_id: string | null;
          bet_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          balance_before: number;
          balance_after: number;
          description?: string | null;
          status?: string;
          round_id?: string | null;
          bet_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          amount?: number;
          balance_before?: number;
          balance_after?: number;
          description?: string | null;
          status?: string;
          round_id?: string | null;
          bet_id?: string | null;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          created_at?: string;
        };
      };
    };
  };
};
