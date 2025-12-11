import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          telegram_id: number;
          language: string;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          telegram_id: number;
          language?: string;
          notifications_enabled?: boolean;
        };
        Update: {
          language?: string;
          notifications_enabled?: boolean;
        };
      };
      watchlists: {
        Row: {
          id: string;
          user_id: number;
          type: "wallet" | "token";
          address: string;
          alias: string | null;
          created_at: string;
        };
        Insert: {
          user_id: number;
          type: "wallet" | "token";
          address: string;
          alias?: string | null;
        };
      };
      price_alerts: {
        Row: {
          id: string;
          user_id: number;
          token_mint: string;
          target_price: number;
          alert_type: "above" | "below";
          is_active: boolean;
          created_at: string;
          triggered_at: string | null;
        };
        Insert: {
          user_id: number;
          token_mint: string;
          target_price: number;
          alert_type: "above" | "below";
        };
        Update: {
          is_active?: boolean;
          triggered_at?: string;
        };
      };
      token_cache: {
        Row: {
          id: string;
          mint_address: string;
          symbol: string;
          name: string;
          decimals: number;
          logo_url: string | null;
          last_updated: string;
        };
      };
      user_wallets: {
        Row: {
          id: string;
          user_id: number;
          wallet_address: string;
          balance_sol: number | null;
          token_count: number | null;
          last_refreshed: string | null;
        };
      };
    };
  };
};
