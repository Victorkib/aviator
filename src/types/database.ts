export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          balance: number;
          total_wagered: number;
          total_won: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          crashed_at: string | null;
          total_bets: number | null;
          total_wagered: number | null;
          total_paid_out: number | null;
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
          crashed_at?: string | null;
          total_bets?: number | null;
          total_wagered?: number | null;
          total_paid_out?: number | null;
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
          crashed_at?: string | null;
          total_bets?: number | null;
          total_wagered?: number | null;
          total_paid_out?: number | null;
          created_at?: string;
        };
        Relationships: [];
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
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bets_round_id_fkey';
            columns: ['round_id'];
            isOneToOne: false;
            referencedRelation: 'game_rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
          amount: number;
          balance_before: number;
          balance_after: number;
          bet_id: string | null;
          round_id: string | null;
          description: string | null;
          status: 'pending' | 'completed' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
          amount: number;
          balance_before: number;
          balance_after: number;
          bet_id?: string | null;
          round_id?: string | null;
          description?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
          amount?: number;
          balance_before?: number;
          balance_after?: number;
          bet_id?: string | null;
          round_id?: string | null;
          description?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_user_balance: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_transaction_type: string;
          p_description?: string;
          p_round_id?: string;
          p_bet_id?: string;
        };
        Returns: boolean;
      };
      get_game_statistics: {
        Args: Record<string, never>;
        Returns: {
          total_rounds: number;
          total_players: number;
          total_wagered: number;
          average_multiplier: number;
          highest_multiplier: number;
        }[];
      };
      get_user_game_history: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          round_id: string;
          round_number: number;
          bet_amount: number;
          auto_cashout_multiplier: number | null;
          cashed_out: boolean;
          cashout_multiplier: number | null;
          payout: number;
          profit: number;
          crash_multiplier: number;
          created_at: string;
        }[];
      };
      get_recent_multipliers: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          crash_multiplier: number;
          crashed_at: string;
        }[];
      };
      validate_bet_placement: {
        Args: {
          p_user_id: string;
          p_round_id: string;
          p_amount: number;
          p_auto_cashout?: number;
        };
        Returns: {
          is_valid: boolean;
          error_message: string;
        }[];
      };
      get_active_round: {
        Args: Record<string, never>;
        Returns: {
          round_id: string;
          round_number: number;
          phase: string;
          crash_multiplier: number;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string;
          betting_ended_at: string;
          flight_started_at: string;
          crashed_at: string | null;
          total_bets: number;
          total_wagered: number;
        }[];
      };
    };
    Enums: {
      transaction_type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
