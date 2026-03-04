import {
  RestPublicClient,
  RestAuthenticatedClient,
  WebSocketClient,
  type KatanaPerpsMarket,
  type KatanaPerpsTicker,
  type KatanaPerpsWallet,
  type KatanaPerpsPosition,
  type KatanaPerpsOrder,
  type KatanaPerpsFill,
} from "@katanaperps/katana-perps-sdk";
import { v1 as uuidv1 } from "uuid";
import { computeAddress } from "ethers";
import { config } from "../config.js";
import type { CreateOrderParams, CancelOrderParams } from "../types.js";

/** Format quantity to 8 decimals: 4 significant + 4 trailing zeros */
function formatQty(val: string): string {
  const n = parseFloat(val);
  const stepped = Math.floor(n * 10000) / 10000;
  return stepped.toFixed(4) + "0000";
}

// ─── Session key ────────────────────────────────────────────────────────────

const sessionKeyAddress = computeAddress(config.sessionKey);
console.log(`[Auth] Session key address: ${sessionKeyAddress}`);

// ─── SDK clients ────────────────────────────────────────────────────────────

const sandbox = config.network === "testnet";

const publicClient = new RestPublicClient({ sandbox });

const authClient = new RestAuthenticatedClient({
  apiKey: config.perpsApiKey,
  apiSecret: config.perpsApiSecret,
  walletPrivateKey: config.sessionKey,
  sandbox,
});

// ─── Public endpoints ───────────────────────────────────────────────────────

export async function getMarkets(): Promise<KatanaPerpsMarket[]> {
  return publicClient.getMarkets();
}

export async function getTickers(market?: string): Promise<KatanaPerpsTicker[]> {
  return publicClient.getTickers(market ? { market } : undefined);
}

export async function getOrderbook(market: string) {
  return publicClient.getOrderBookLevel2({ market });
}

// ─── Authenticated read endpoints ───────────────────────────────────────────

export async function getWallet(): Promise<KatanaPerpsWallet[]> {
  return authClient.getWallets({
    nonce: uuidv1(),
    wallet: config.walletAddress,
  });
}

export async function getPositions(market?: string): Promise<KatanaPerpsPosition[]> {
  return authClient.getPositions({
    nonce: uuidv1(),
    wallet: config.walletAddress,
    ...(market && { market }),
  });
}

export async function getOrders(market?: string): Promise<KatanaPerpsOrder[]> {
  return authClient.getOrders({
    nonce: uuidv1(),
    wallet: config.walletAddress,
    ...(market && { market }),
  });
}

export async function getFills(market?: string): Promise<KatanaPerpsFill[]> {
  return authClient.getFills({
    nonce: uuidv1(),
    wallet: config.walletAddress,
    ...(market && { market }),
  });
}

// ─── Write endpoints (signed with session key) ─────────────────────────────

export async function createOrder(params: CreateOrderParams): Promise<unknown> {
  const req = {
    nonce: uuidv1(),
    wallet: config.walletAddress,
    market: params.market,
    type: params.type,
    side: params.side,
    quantity: formatQty(params.quantity),
    delegatedKey: sessionKeyAddress,
    ...(params.price && { price: formatQty(params.price) }),
    ...(params.triggerPrice && { triggerPrice: params.triggerPrice }),
    ...(params.triggerType && { triggerType: params.triggerType }),
    ...(params.reduceOnly !== undefined && { reduceOnly: params.reduceOnly }),
    ...(params.timeInForce && { timeInForce: params.timeInForce }),
    ...(params.selfTradePrevention && { selfTradePrevention: params.selfTradePrevention }),
    ...(params.clientOrderId && { clientOrderId: params.clientOrderId }),
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await authClient.createOrder(req as any);
  } catch (err: any) {
    const apiError = err?.response?.data;
    if (apiError) {
      const msg = typeof apiError === "string" ? apiError : JSON.stringify(apiError);
      throw new Error(msg);
    }
    throw err;
  }
}

export async function cancelOrder(params: CancelOrderParams): Promise<unknown> {
  const nonce = uuidv1();
  const wallet = config.walletAddress;

  switch (params.mode) {
    case "byId":
      return authClient.cancelOrders({ nonce, wallet, orderIds: params.orderIds, delegatedKey: sessionKeyAddress });
    case "byMarket":
      return authClient.cancelOrders({ nonce, wallet, market: params.market, delegatedKey: sessionKeyAddress });
    case "byWallet":
      return authClient.cancelOrders({ nonce, wallet, delegatedKey: sessionKeyAddress });
  }
}

// ─── WebSocket ──────────────────────────────────────────────────────────────

export function createWebSocketClient(): WebSocketClient {
  return new WebSocketClient({
    auth: {
      apiKey: config.perpsApiKey,
      apiSecret: config.perpsApiSecret,
      wallet: config.walletAddress,
    },
    sandbox,
  });
}

// ─── Session key info (for bot commands) ────────────────────────────────────

export function getSessionKeyAddress(): string {
  return sessionKeyAddress;
}
