import "dotenv/config";

// ─── Env validation ─────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  telegramUserId: Number(requireEnv("TELEGRAM_USER_ID")),
  perpsApiKey: requireEnv("PERPS_API_KEY"),
  perpsApiSecret: requireEnv("PERPS_API_SECRET"),
  sessionKey: requireEnv("SESSION_KEY"),
  walletAddress: requireEnv("WALLET_ADDRESS") as `0x${string}`,
  network: (process.env.NETWORK || "mainnet") as "mainnet" | "testnet",
} as const;
