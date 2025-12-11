import axios from "axios";
import { supabase } from "../supabase";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface TokenPrice {
  symbol: string;
  price: number;
  marketCap?: number;
  change24h?: number;
}

export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: symbol.toLowerCase(),
        vs_currencies: "usd",
        include_market_cap: true,
        include_24hr_change: true
      }
    });

    const data = response.data[symbol.toLowerCase()];
    if (!data) return null;

    return {
      symbol: symbol.toUpperCase(),
      price: data.usd,
      marketCap: data.usd_market_cap,
      change24h: data.usd_24h_change
    };
  } catch {
    return null;
  }
}

export async function getSolanaPrice(): Promise<number> {
  const result = await getTokenPrice("solana");
  return result?.price || 0;
}

export async function getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    const price = await getTokenPrice(symbol);
    if (price) {
      prices[symbol] = price.price;
    }
  }

  return prices;
}

export async function checkPriceAlerts(userId: number): Promise<void> {
  try {
    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!alerts) return;

    for (const alert of alerts) {
      const price = await getTokenPrice(alert.token_mint);
      if (!price) continue;

      const shouldTrigger =
        (alert.alert_type === "above" && price.price >= alert.target_price) ||
        (alert.alert_type === "below" && price.price <= alert.target_price);

      if (shouldTrigger) {
        await supabase
          .from("price_alerts")
          .update({ is_active: false, triggered_at: new Date().toISOString() })
          .eq("id", alert.id);
      }
    }
  } catch (error) {
    console.error("Error checking price alerts:", error);
  }
}
