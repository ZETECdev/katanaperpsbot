// Re-export SDK types used throughout the bot
export type {
  KatanaPerpsMarket as Market,
  KatanaPerpsTicker as Ticker,
  KatanaPerpsWallet as Wallet,
  KatanaPerpsPosition as Position,
  KatanaPerpsOrder as Order,
  KatanaPerpsFill as Fill,
} from "@katanaperps/katana-perps-sdk";

// ─── Order creation params ──────────────────────────────────────────────────
// Kept as a thin local type so commands don't need to know about nonce/wallet

export interface CreateOrderParams {
  market: string;
  type: "market" | "limit" | "stopLossMarket" | "stopLossLimit" | "takeProfitMarket" | "takeProfitLimit";
  side: "buy" | "sell";
  quantity: string;
  price?: string;
  triggerPrice?: string;
  triggerType?: "last" | "index";
  reduceOnly?: boolean;
  timeInForce?: "gtc" | "gtx" | "ioc" | "fok";
  selfTradePrevention?: "dc" | "co" | "cn" | "cb";
  clientOrderId?: string;
}

// ─── Cancel params ──────────────────────────────────────────────────────────

export type CancelOrderParams =
  | { mode: "byId"; orderIds: string[] }
  | { mode: "byMarket"; market: string }
  | { mode: "byWallet" };
