/*
  # Initialize Telegram Bot Database Schema

  1. New Tables
    - `users`: Store user preferences and settings
      - `telegram_id` (bigint, primary key)
      - `language` (text, default 'en')
      - `notifications_enabled` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `watchlists`: Track user watchlist items
      - `id` (uuid, primary key)
      - `user_id` (bigint, foreign key to users)
      - `type` (text: 'wallet' or 'token')
      - `address` (text: wallet or token address)
      - `alias` (text: optional nickname)
      - `created_at` (timestamp)
    
    - `price_alerts`: Store user price alert configurations
      - `id` (uuid, primary key)
      - `user_id` (bigint, foreign key to users)
      - `token_mint` (text: token address)
      - `target_price` (numeric)
      - `alert_type` (text: 'above' or 'below')
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `triggered_at` (timestamp, nullable)
    
    - `user_wallets`: Cache user wallet data
      - `id` (uuid, primary key)
      - `user_id` (bigint, foreign key to users)
      - `wallet_address` (text)
      - `balance_sol` (numeric)
      - `token_count` (integer)
      - `last_refreshed` (timestamp)
    
    - `token_cache`: Cache token metadata
      - `id` (uuid, primary key)
      - `mint_address` (text, unique)
      - `symbol` (text)
      - `name` (text)
      - `decimals` (integer)
      - `logo_url` (text, nullable)
      - `last_updated` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Public read access to token_cache for caching
*/

CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('wallet', 'token')),
  address TEXT NOT NULL,
  alias TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  token_mint TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('above', 'below')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  triggered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  balance_sol NUMERIC,
  token_count INTEGER,
  last_refreshed TIMESTAMPTZ,
  UNIQUE(user_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS token_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address TEXT UNIQUE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  decimals INTEGER,
  logo_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = telegram_id::text);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = telegram_id::text)
  WITH CHECK (auth.uid()::text = telegram_id::text);

CREATE POLICY "Users can view own watchlists"
  ON watchlists FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own watchlists"
  ON watchlists FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own watchlists"
  ON watchlists FOR DELETE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can view own wallets"
  ON user_wallets FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own wallets"
  ON user_wallets FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Token cache is publicly readable"
  ON token_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_token_cache_symbol ON token_cache(symbol);
