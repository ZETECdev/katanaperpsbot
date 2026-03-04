import { createBot } from "./bot/bot.js";
import { config } from "./config.js";
import { SubscriptionNameAuthenticated } from "@katanaperps/katana-perps-sdk";

async function main() {
  console.log(`Starting Katana Perps Bot (${config.network})`);
  console.log(`Wallet: ${config.walletAddress}`);
  console.log(`Authorized user: ${config.telegramUserId}`);

  const { bot, ws } = createBot();

  // Set bot commands for Telegram menu
  await bot.api.setMyCommands([
    { command: "start", description: "Welcome + connection status" },
    { command: "help", description: "List all commands" },
    { command: "markets", description: "All markets with prices" },
    { command: "ticker", description: "24h stats for a market" },
    { command: "account", description: "Equity, collateral, margin" },
    { command: "positions", description: "Open positions with PnL" },
    { command: "orders", description: "Open orders" },
    { command: "fills", description: "Recent fill history" },
    { command: "long", description: "Open a long position" },
    { command: "short", description: "Open a short position" },
    { command: "close", description: "Close a position" },
    { command: "buy", description: "Place a buy order" },
    { command: "sell", description: "Place a sell order" },
    { command: "cancel", description: "Cancel orders" },
    { command: "farm", description: "Volume farming (start/stop/status)" },
    { command: "sessionkey", description: "Show session key to authorize" },
  ]);

  // Start WebSocket (SDK handles auth + subscriptions)
  await ws.connect();
  ws.subscribeAuthenticated([
    { name: SubscriptionNameAuthenticated.orders },
    { name: SubscriptionNameAuthenticated.positions },
  ]);

  // Start bot
  bot.start({
    onStart: () => console.log("Bot is running!"),
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down...");
    ws.disconnect();
    bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
