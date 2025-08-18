export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          email_verified: boolean;
          phone: string | null;
          phone_verified: boolean;
          balance: number;
          total_deposited: number;
          total_withdrawn: number;
          total_wagered: number;
          total_won: number;
          status: 'active' | 'suspended' | 'banned' | 'pending_verification';
          kyc_status: 'pending' | 'verified' | 'rejected';
          currency: string;
          timezone: string;
          language: string;
          last_login_at: string | null;
          last_login_ip: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          email_verified?: boolean;
          phone?: string | null;
          phone_verified?: boolean;
          balance?: number;
          total_deposited?: number;
          total_withdrawn?: number;
          total_wagered?: number;
          total_won?: number;
          status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
          kyc_status?: 'pending' | 'verified' | 'rejected';
          currency?: string;
          timezone?: string;
          language?: string;
          last_login_at?: string | null;
          last_login_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          email_verified?: boolean;
          phone?: string | null;
          phone_verified?: boolean;
          balance?: number;
          total_deposited?: number;
          total_withdrawn?: number;
          total_wagered?: number;
          total_won?: number;
          status?: 'active' | 'suspended' | 'banned' | 'pending_verification';
          kyc_status?: 'pending' | 'verified' | 'rejected';
          currency?: string;
          timezone?: string;
          language?: string;
          last_login_at?: string | null;
          last_login_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      game_rounds: {
        Row: {
          id: string;
          round_number: number;
          crash_multiplier: number;
          crash_time_ms: number;
          server_seed: string;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string;
          betting_ended_at: string;
          flight_started_at: string;
          crashed_at: string;
          total_bets: number;
          total_wagered: number;
          total_paid_out: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_number?: number;
          crash_multiplier: number;
          crash_time_ms: number;
          server_seed: string;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string;
          betting_ended_at: string;
          flight_started_at: string;
          crashed_at: string;
          total_bets?: number;
          total_wagered?: number;
          total_paid_out?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_number?: number;
          crash_multiplier?: number;
          crash_time_ms?: number;
          server_seed?: string;
          server_seed_hash?: string;
          client_seed?: string;
          nonce?: number;
          betting_started_at?: string;
          betting_ended_at?: string;
          flight_started_at?: string;
          crashed_at?: string;
          total_bets?: number;
          total_wagered?: number;
          total_paid_out?: number;
          created_at?: string;
        };
      };
      bets: {
        Row: {
          id: string;
          user_id: string;
          round_id: string;
          amount: number;
          auto_cashout_multiplier: number | null;
          cashed_out: boolean;
          cashout_multiplier: number | null;
          cashout_time_ms: number | null;
          payout: number;
          profit: number;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          round_id: string;
          amount: number;
          auto_cashout_multiplier?: number | null;
          cashed_out?: boolean;
          cashout_multiplier?: number | null;
          cashout_time_ms?: number | null;
          payout?: number;
          profit?: number;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          round_id?: string;
          amount?: number;
          auto_cashout_multiplier?: number | null;
          cashed_out?: boolean;
          cashout_multiplier?: number | null;
          cashout_time_ms?: number | null;
          payout?: number;
          profit?: number;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type:
            | 'deposit'
            | 'withdrawal'
            | 'bet'
            | 'win'
            | 'refund'
            | 'bonus'
            | 'fee';
          amount: number;
          balance_before: number;
          balance_after: number;
          bet_id: string | null;
          round_id: string | null;
          external_transaction_id: string | null;
          payment_method: string | null;
          status: 'pending' | 'completed' | 'failed' | 'cancelled';
          description: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | 'deposit'
            | 'withdrawal'
            | 'bet'
            | 'win'
            | 'refund'
            | 'bonus'
            | 'fee';
          amount: number;
          balance_before: number;
          balance_after: number;
          bet_id?: string | null;
          round_id?: string | null;
          external_transaction_id?: string | null;
          payment_method?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'cancelled';
          description?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | 'deposit'
            | 'withdrawal'
            | 'bet'
            | 'win'
            | 'refund'
            | 'bonus'
            | 'fee';
          amount?: number;
          balance_before?: number;
          balance_after?: number;
          bet_id?: string | null;
          round_id?: string | null;
          external_transaction_id?: string | null;
          payment_method?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'cancelled';
          description?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
  };
}
