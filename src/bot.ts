import TelegramBot from "node-telegram-bot-api";
import { PublicKey } from "@solana/web3.js";
import * as database from "./services/database";
import * as solana from "./services/solana";
import * as price from "./services/price";

export async function createBot() {

  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.error("TELEGRAM_TOKEN missing in env");
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    await database.getOrCreateUser(chatId);

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Wallet Tools", callback_data: "menu_wallet" }],
          [{ text: "Token Tools", callback_data: "menu_token" }],
          [{ text: "Tracking", callback_data: "menu_tracking" }],
          [{ text: "Alerts", callback_data: "menu_alerts" }],
          [{ text: "Settings", callback_data: "menu_settings" }]
        ]
      }
    };

    await bot.sendMessage(chatId, "Welcome to MetasolanaBot! Track wallets and tokens on Solana. Choose an option:", keyboard);
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const help = `/start - start\n/help - this menu\n\nWallet Tools: view balances, transactions\nToken Tools: lookup token, add to watchlist\nTracking & Alerts: create price or tx alerts`;
    await bot.sendMessage(chatId, help);
  });

  bot.on("callback_query", async (callbackQuery) => {
    if (!callbackQuery.data) return;
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return;

    const data = callbackQuery.data;
    if (data === "menu_wallet") {
      await bot.sendMessage(chatId, "Wallet Tools:\nSend your Solana wallet address to view placeholder balance.");
    } else if (data === "menu_token") {
      await bot.sendMessage(chatId, "Token Tools:\nUse /token <symbol_or_mint> to lookup token info.");
    } else if (data === "menu_tracking") {
      await bot.sendMessage(chatId, "Tracking:\nUse /track_wallet <address> or /track_token <symbol_or_mint>");
    } else if (data === "menu_alerts") {
      await bot.sendMessage(chatId, "Alerts:\nUse /alert_price <symbol> <price> to create price alerts.");
    } else if (data === "menu_settings") {
      await bot.sendMessage(chatId, "Settings:\nUse /toggle_notifications to toggle notifications.");
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    const isValidAddress = await solana.isValidSolanaAddress(text);
    if (isValidAddress) {
      await bot.sendMessage(chatId, `Fetching wallet data for: ${text}`);
      const balance = await solana.getWalletBalance(text);
      const transactions = await solana.getWalletTransactions(text, 5);
      await bot.sendMessage(chatId, `Balance (SOL): ${balance.toFixed(4)}\nRecent transactions: ${transactions.length}`);
      return;
    }
  });

  bot.onText(/\/token\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = (match && match[1]) || "";
    await bot.sendMessage(chatId, `Looking up token: ${query}`);

    const tokenPrice = await price.getTokenPrice(query);
    if (tokenPrice) {
      const changeEmoji = (tokenPrice.change24h || 0) >= 0 ? "📈" : "📉";
      const message = `Token: ${tokenPrice.symbol}\nPrice: $${tokenPrice.price.toFixed(4)}\n24h Change: ${changeEmoji} ${(tokenPrice.change24h || 0).toFixed(2)}%\nMarket Cap: $${(tokenPrice.marketCap || 0).toLocaleString()}`;
      await bot.sendMessage(chatId, message);
    } else {
      await bot.sendMessage(chatId, `Could not find token: ${query}`);
    }
  });

  bot.onText(/\/track_wallet\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const address = (match && match[1]) || "";

    const isValid = await solana.isValidSolanaAddress(address);
    if (!isValid) {
      await bot.sendMessage(chatId, "Invalid Solana address");
      return;
    }

    const result = await database.addToWatchlist(chatId, "wallet", address);
    if (result) {
      await bot.sendMessage(chatId, `Now tracking wallet: ${address}`);
    } else {
      await bot.sendMessage(chatId, "Failed to add wallet to watchlist");
    }
  });

  bot.onText(/\/track_token\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const token = (match && match[1]) || "";

    const result = await database.addToWatchlist(chatId, "token", token);
    if (result) {
      await bot.sendMessage(chatId, `Now tracking token: ${token}`);
    } else {
      await bot.sendMessage(chatId, "Failed to add token to watchlist");
    }
  });

  bot.onText(/\/alert_price\s+(\S+)\s+(above|below)\s+(\d+(?:\.\d+)?)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const symbol = match![1];
    const alertType = match![2] as "above" | "below";
    const targetPrice = Number(match![3]);

    const result = await database.createPriceAlert(chatId, symbol, targetPrice, alertType);
    if (result) {
      await bot.sendMessage(chatId, `Price alert set: ${symbol} ${alertType} $${targetPrice}`);
    } else {
      await bot.sendMessage(chatId, "Failed to create alert");
    }
  });

  bot.onText(/\/alerts/, async (msg) => {
    const chatId = msg.chat.id;
    const alerts = await database.getPriceAlerts(chatId);
    if (alerts.length === 0) {
      await bot.sendMessage(chatId, "No active price alerts");
      return;
    }
    const list = alerts.map(a => `• ${a.token_mint} ${a.alert_type} $${a.target_price}`).join("\n");
    await bot.sendMessage(chatId, `Active alerts:\n${list}`);
  });

  bot.onText(/\/toggle_notifications/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await database.getOrCreateUser(chatId);
    if (user) {
      await bot.sendMessage(chatId, `Notifications: ${user.notifications_enabled ? "ON" : "OFF"}`);
    }
  });

  setInterval(async () => {
    try {
      const accounts = await solana.connection.getProgramAccounts(new PublicKey("TokenkegQfeZyiNwAJsyFbPVwwQQfAZ55jTMVgTW4wp"));
      if (accounts && accounts.length > 0) {
        const uniqueUsers = new Set(accounts.map(a => a.pubkey.toBase58()).slice(0, 10));
        for (const userId of uniqueUsers) {
          await price.checkPriceAlerts(parseInt(userId.slice(0, 10)));
        }
      }
    } catch (err) {
      console.error("Error checking price alerts:", err);
    }
  }, 60000);

  console.log("Bot started (polling).");
  return bot;
}
