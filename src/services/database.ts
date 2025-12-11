import { supabase } from "../supabase";

export async function getOrCreateUser(telegramId: number) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  if (user) {
    return user;
  }

  const { data: newUser, error: createError } = await supabase
    .from("users")
    .insert({
      telegram_id: telegramId,
      language: "en",
      notifications_enabled: true
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating user:", createError);
    return null;
  }

  return newUser;
}

export async function getUserWatchlist(telegramId: number) {
  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("user_id", telegramId);

  if (error) {
    console.error("Error fetching watchlist:", error);
    return [];
  }

  return data || [];
}

export async function addToWatchlist(telegramId: number, type: "wallet" | "token", address: string, alias?: string) {
  const { data, error } = await supabase
    .from("watchlists")
    .insert({
      user_id: telegramId,
      type,
      address,
      alias
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding to watchlist:", error);
    return null;
  }

  return data;
}

export async function removeFromWatchlist(watchlistId: string) {
  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("id", watchlistId);

  if (error) {
    console.error("Error removing from watchlist:", error);
    return false;
  }

  return true;
}

export async function createPriceAlert(telegramId: number, tokenMint: string, targetPrice: number, alertType: "above" | "below") {
  const { data, error } = await supabase
    .from("price_alerts")
    .insert({
      user_id: telegramId,
      token_mint: tokenMint,
      target_price: targetPrice,
      alert_type: alertType
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating alert:", error);
    return null;
  }

  return data;
}

export async function getPriceAlerts(telegramId: number) {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", telegramId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return data || [];
}

export async function updateUserWallet(telegramId: number, walletAddress: string, balanceSol: number, tokenCount: number) {
  const { error } = await supabase
    .from("user_wallets")
    .upsert({
      user_id: telegramId,
      wallet_address: walletAddress,
      balance_sol: balanceSol,
      token_count: tokenCount,
      last_refreshed: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating wallet:", error);
    return null;
  }

  return true;
}

export async function cacheTokenMetadata(mintAddress: string, symbol: string, name: string, decimals: number, logoUrl?: string) {
  const { error } = await supabase
    .from("token_cache")
    .upsert({
      mint_address: mintAddress,
      symbol,
      name,
      decimals,
      logo_url: logoUrl,
      last_updated: new Date().toISOString()
    }, {
      onConflict: "mint_address"
    });

  if (error) {
    console.error("Error caching token metadata:", error);
  }
}
