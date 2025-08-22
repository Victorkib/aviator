export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          balance: number;
          total_wagered: number;
          total_won: number;
          games_played: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          games_played?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          games_played?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_rounds: {
        Row: {
          id: string;
          round_number: number;
          phase: string;
          crash_multiplier: number;
          crash_time_ms: number;
          server_seed: string;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string | null;
          betting_ended_at: string | null;
          flight_started_at: string | null;
          crashed_at: string | null;
          total_bets: number;
          total_wagered: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_number: number;
          phase?: string;
          crash_multiplier: number;
          crash_time_ms: number;
          server_seed: string;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at?: string | null;
          betting_ended_at?: string | null;
          flight_started_at?: string | null;
          crashed_at?: string | null;
          total_bets?: number;
          total_wagered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_number?: number;
          phase?: string;
          crash_multiplier?: number;
          crash_time_ms?: number;
          server_seed?: string;
          server_seed_hash?: string;
          client_seed?: string;
          nonce?: number;
          betting_started_at?: string | null;
          betting_ended_at?: string | null;
          flight_started_at?: string | null;
          crashed_at?: string | null;
          total_bets?: number;
          total_wagered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          cashout_time_ms: number | null;
          payout: number;
          profit: number;
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
          cashout_time_ms?: number | null;
          payout?: number;
          profit?: number;
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
          cashout_time_ms?: number | null;
          payout?: number;
          profit?: number;
          created_at?: string;
          updated_at?: string;
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
          amount: number;
          transaction_type: string;
          description: string | null;
          round_id: string | null;
          bet_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type: string;
          description?: string | null;
          round_id?: string | null;
          bet_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          transaction_type?: string;
          description?: string | null;
          round_id?: string | null;
          bet_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_bet_id_fkey';
            columns: ['bet_id'];
            isOneToOne: false;
            referencedRelation: 'bets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_round_id_fkey';
            columns: ['round_id'];
            isOneToOne: false;
            referencedRelation: 'game_rounds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_user_id_fkey';
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
      update_user_balance: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_transaction_type: string;
          p_description: string;
          p_round_id?: string;
          p_bet_id?: string;
        };
        Returns: {
          success: boolean;
          new_balance: number;
        }[];
      };
      get_current_game_state: {
        Args: {};
        Returns: {
          round_id: string;
          round_number: number;
          phase: string;
          flight_started_at: string | null;
          betting_ended_at: string | null;
          crash_multiplier: number;
          total_bets: number;
          total_wagered: number;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          betting_started_at: string | null;
        }[];
      };
      get_game_statistics: {
        Args: {};
        Returns: {
          total_rounds: number;
          total_players: number;
          total_wagered: number;
          average_multiplier: number;
          highest_multiplier: number;
        }[];
      };
      process_cashout: {
        Args: {
          p_user_id: string;
          p_bet_id: string;
          p_multiplier: number;
        };
        Returns: {
          success: boolean;
          error_message: string;
          payout: number;
          profit: number;
        }[];
      };
      calculate_crash_point: {
        Args: {
          p_server_seed: string;
          p_client_seed: string;
          p_nonce: number;
        };
        Returns: number;
      };
      get_recent_multipliers: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          round_number: number;
          crash_multiplier: number;
          created_at: string;
        }[];
      };
      get_user_game_history: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          round_number: number;
          amount: number;
          auto_cashout: number | null;
          cashed_out: boolean;
          cashout_multiplier: number | null;
          payout: number;
          profit: number;
          crash_multiplier: number;
          created_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
