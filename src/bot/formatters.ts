import type { Market, Ticker, Wallet, Position, Order, Fill } from "../types.js";
import type { KatanaPerpsOrderEventData, KatanaPerpsPositionEventData } from "@katanaperps/katana-perps-sdk";
import type { FarmState, FarmConfig } from "../farm/types.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtNum(val: string | undefined | null, decimals = 2): string {
  if (val == null) return "—";
  const n = parseFloat(val);
  return isNaN(n) ? val : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPnl(val: string | undefined | null): string {
  if (val == null) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}${fmtNum(val)}`;
}

// ─── Markets ────────────────────────────────────────────────────────────────

export function formatMarkets(markets: Market[]): string {
  if (!markets.length) return "No markets available.";

  const lines = markets.map((m) => {
    const price = m.indexPrice ? `$${fmtNum(m.indexPrice)}` : "—";
    return `<b>${esc(m.market)}</b>  ${price}  [${esc(m.status)}]`;
  });

  return `<b>Markets</b>\n\n${lines.join("\n")}`;
}

// ─── Ticker ─────────────────────────────────────────────────────────────────

export function formatTicker(t: Ticker): string {
  const pct = t.percentChange ? `${parseFloat(t.percentChange) >= 0 ? "+" : ""}${fmtNum(t.percentChange)}%` : "—";

  return [
    `<b>${esc(t.market)} — 24h Stats</b>`,
    "",
    `Open: $${fmtNum(t.open)}`,
    `High: $${fmtNum(t.high)}`,
    `Low: $${fmtNum(t.low)}`,
    `Close: $${fmtNum(t.close)}`,
    `Change: ${pct}`,
    `Volume: ${fmtNum(t.baseVolume, 4)} / $${fmtNum(t.quoteVolume)}`,
    t.bid ? `Bid: $${fmtNum(t.bid)}` : null,
    t.ask ? `Ask: $${fmtNum(t.ask)}` : null,
    t.lastFundingRate ? `Funding: ${fmtNum(t.lastFundingRate, 6)}` : null,
    t.openInterest ? `OI: ${fmtNum(t.openInterest, 4)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Account / Wallet ───────────────────────────────────────────────────────

export function formatWallet(wallets: Wallet[]): string {
  if (!wallets.length) return "No wallet data found.";
  const w = wallets[0];

  return [
    `<b>Account Overview</b>`,
    "",
    `Equity: $${fmtNum(w.equity)}`,
    `Free Collateral: $${fmtNum(w.freeCollateral)}`,
    w.heldCollateral ? `Held Collateral: $${fmtNum(w.heldCollateral)}` : null,
    w.availableCollateral ? `Available Collateral: $${fmtNum(w.availableCollateral)}` : null,
    w.buyingPower ? `Buying Power: $${fmtNum(w.buyingPower)}` : null,
    w.unrealizedPnL ? `Unrealized PnL: ${fmtPnl(w.unrealizedPnL)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Positions ──────────────────────────────────────────────────────────────

export function formatPositions(positions: Position[]): string {
  if (!positions.length) return "No open positions.";

  const lines = positions.map((p) => {
    const qty = parseFloat(p.quantity) || 0;
    const side = qty < 0 ? "SHORT" : "LONG";
    const absQty = Math.abs(qty).toString();
    const pnl = fmtPnl(p.unrealizedPnL);
    return [
      `<b>${esc(p.market)}</b> ${side}`,
      `  Size: ${fmtNum(absQty, 4)} @ $${fmtNum(p.entryPrice)}`,
      p.markPrice ? `  Mark: $${fmtNum(p.markPrice)}` : null,
      p.liquidationPrice ? `  Liq: $${fmtNum(p.liquidationPrice)}` : null,
      `  uPnL: ${pnl}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `<b>Open Positions</b>\n\n${lines.join("\n\n")}`;
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export function formatOrders(orders: Order[]): string {
  if (!orders.length) return "No open orders.";

  const lines = orders.map((o) => {
    const price = o.price ? `@ $${fmtNum(o.price)}` : "MARKET";
    return [
      `<b>${esc(o.market)}</b> ${o.side.toUpperCase()} ${o.type}`,
      `  Qty: ${fmtNum(o.originalQuantity, 4)} ${price}`,
      o.executedQuantity ? `  Filled: ${fmtNum(o.executedQuantity, 4)}` : null,
      `  Status: ${esc(o.status)}`,
      `  ID: <code>${esc(o.orderId)}</code>`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `<b>Open Orders</b>\n\n${lines.join("\n\n")}`;
}

// ─── Fills ──────────────────────────────────────────────────────────────────

export function formatFills(fills: Fill[]): string {
  if (!fills.length) return "No recent fills.";

  const lines = fills.slice(0, 20).map((f) => {
    const timeStr = typeof f.time === "number" ? new Date(f.time).toISOString() : String(f.time);
    return `${esc(f.market)} ${f.side.toUpperCase()} ${fmtNum(f.quantity, 4)} @ $${fmtNum(f.price)} | Fee: ${fmtNum(f.fee ?? "0", 4)} | ${esc(timeStr)}`;
  });

  return `<b>Recent Fills</b>\n\n${lines.join("\n")}`;
}

// ─── Order result ───────────────────────────────────────────────────────────

export function formatOrderResult(result: unknown, side: string, market: string): string {
  const r = result as Record<string, unknown>;
  if (r.orderId) {
    return `Order placed: ${side.toUpperCase()} ${esc(market)}\nID: <code>${r.orderId}</code>`;
  }
  return `Order submitted:\n<pre>${esc(JSON.stringify(result, null, 2))}</pre>`;
}

// ─── Cancel result ──────────────────────────────────────────────────────────

export function formatCancelResult(result: unknown): string {
  return `Cancel submitted:\n<pre>${esc(JSON.stringify(result, null, 2))}</pre>`;
}

// ─── WebSocket notifications ────────────────────────────────────────────────

export function formatFillNotification(data: KatanaPerpsOrderEventData): string {
  const fill = data.fills?.[0];
  return [
    `<b>Fill Notification</b>`,
    "",
    `Market: ${esc(data.market)}`,
    `Side: ${data.side.toUpperCase()}`,
    fill ? `Qty: ${fmtNum(fill.quantity, 4)}` : null,
    fill ? `Price: $${fmtNum(fill.price)}` : null,
    fill?.fee ? `Fee: ${fmtNum(fill.fee, 4)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatPositionNotification(data: KatanaPerpsPositionEventData): string {
  const qty = parseFloat(data.quantity) || 0;
  const side = qty < 0 ? "SHORT" : qty > 0 ? "LONG" : "FLAT";
  const absQty = Math.abs(qty).toString();
  return [
    `<b>Position Update</b>`,
    "",
    `Market: ${esc(data.market)}`,
    `Side: ${side}`,
    `Size: ${fmtNum(absQty, 4)}`,
    data.realizedPnL ? `rPnL: ${fmtPnl(data.realizedPnL)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Farm formatters ───────────────────────────────────────────────────────

export function formatFarmStatus(state: FarmState, balance?: string): string {
  const s = state.stats;
  const ss = state.session;
  const status = state.running ? "RUNNING" : "STOPPED";
  const sessionElapsed = ss.startedAt ? timeSince(ss.startedAt) : "—";
  const eta = state.running && s.totalVolumeUsd > 0 && ss.startedAt
    ? estimateEta(s.totalVolumeUsd, state.config.maxVolumeUsd, ss.startedAt)
    : "—";

  return [
    `<b>Farm Status: ${status}</b>`,
    "",
    `Market: ${esc(state.config.market)}`,
    `Next Side: ${state.nextSide.toUpperCase()}`,
    `Qty/Order: ${state.config.quantity}`,
    balance ? `Balance: $${balance}` : null,
    "",
    `<b>Session</b> (${sessionElapsed})`,
    `Volume: $${fmtN(ss.volumeUsd)}`,
    `Fees: $${fmtN(ss.feesUsd)}`,
    `Round Trips: ${ss.roundTrips}`,
    `Orders: ${ss.orderCount}`,
    `Errors: ${ss.errors}`,
    "",
    `<b>All-Time</b>`,
    `Volume: $${fmtN(s.totalVolumeUsd)}`,
    `Fees: $${fmtN(s.totalFeesUsd)}`,
    `PnL: ${s.totalPnlUsd >= 0 ? "+" : ""}$${fmtN(s.totalPnlUsd)}`,
    `Round Trips: ${s.roundTrips}`,
    `Orders: ${s.orderCount}`,
    "",
    `ETA to $${fmtN(state.config.maxVolumeUsd)} vol: ${eta}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function formatFarmConfig(config: FarmConfig): string {
  return [
    `<b>Farm Config</b>`,
    "",
    `Market: ${esc(config.market)}`,
    `Quantity: ${config.quantity}`,
    `Interval: ${config.intervalMs}ms`,
    `Max Position: ${config.maxPositionQty}`,
    `Max Loss: $${config.maxLossUsd}`,
    `Max Fees: $${config.maxFeesUsd}`,
    `Max Volume: $${fmtN(config.maxVolumeUsd)}`,
  ].join("\n");
}

function fmtN(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function estimateEta(currentVol: number, targetVol: number, startedAt: string): string {
  const elapsed = Date.now() - new Date(startedAt).getTime();
  if (elapsed <= 0 || currentVol <= 0) return "—";
  const rate = currentVol / elapsed; // $/ms
  const remaining = targetVol - currentVol;
  if (remaining <= 0) return "done";
  const msLeft = remaining / rate;
  const h = Math.floor(msLeft / 3_600_000);
  const m = Math.floor((msLeft % 3_600_000) / 60_000);
  if (h > 24) return `~${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `~${h}h ${m}m`;
  return `~${m}m`;
}
