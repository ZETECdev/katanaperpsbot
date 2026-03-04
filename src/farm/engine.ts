import { createOrder, getPositions, getTickers, getWallet } from "../api/client.js";
import type { CreateOrderParams, Fill } from "../types.js";
import type { FarmConfig, FarmState, FarmStats, FarmSessionStats } from "./types.js";
import { emptyStats, emptySessionStats, DEFAULT_FARM_CONFIG } from "./types.js";
import { loadStats, saveStats } from "./stats.js";

type NotifyFn = (message: string) => void;

export class FarmEngine {
  private running = false;
  private nextSide: "buy" | "sell" = "buy";
  private config: FarmConfig | null = null;
  private stats: FarmStats = emptyStats();
  private session: FarmSessionStats = emptySessionStats();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private notify: NotifyFn;

  constructor(notify: NotifyFn) {
    this.notify = notify;
  }

  async start(market: string, quantity: string, overrides?: Partial<FarmConfig>): Promise<string> {
    if (this.running) return "Farm is already running.";

    const qty = parseFloat(quantity);
    this.config = {
      market: market.toUpperCase(),
      quantity: qty.toString(),
      intervalMs: overrides?.intervalMs ?? DEFAULT_FARM_CONFIG.intervalMs,
      maxPositionQty: overrides?.maxPositionQty || (qty * 2).toString(),
      maxLossUsd: overrides?.maxLossUsd ?? DEFAULT_FARM_CONFIG.maxLossUsd,
      maxFeesUsd: overrides?.maxFeesUsd ?? DEFAULT_FARM_CONFIG.maxFeesUsd,
      maxVolumeUsd: overrides?.maxVolumeUsd ?? DEFAULT_FARM_CONFIG.maxVolumeUsd,
    };

    this.stats = await loadStats(this.config.market);
    if (!this.stats.startedAt) {
      this.stats.startedAt = new Date().toISOString();
    }

    this.running = true;
    this.consecutiveErrors = 0;
    this.nextSide = "buy";
    this.session = emptySessionStats();

    this.scheduleNext(0);
    return `Farm started: ${this.config.market} qty=${this.config.quantity} interval=${this.config.intervalMs}ms`;
  }

  stop(): string {
    if (!this.running) return "Farm is not running.";
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return "Farm stopped.";
  }

  getState(): FarmState | null {
    if (!this.config) return null;
    return {
      running: this.running,
      nextSide: this.nextSide,
      config: { ...this.config },
      stats: { ...this.stats },
      session: { ...this.session },
    };
  }

  getConfig(): FarmConfig | null {
    return this.config ? { ...this.config } : null;
  }

  setConfigValue(key: string, value: string): string {
    if (!this.config) return "No farm configured. Start a farm first.";

    switch (key) {
      case "interval":
        this.config.intervalMs = Math.max(1000, parseInt(value, 10));
        return `Interval set to ${this.config.intervalMs}ms`;
      case "maxloss":
        this.config.maxLossUsd = parseFloat(value);
        return `Max loss set to $${this.config.maxLossUsd}`;
      case "maxfees":
        this.config.maxFeesUsd = parseFloat(value);
        return `Max fees set to $${this.config.maxFeesUsd}`;
      case "maxvolume":
        this.config.maxVolumeUsd = parseFloat(value);
        return `Max volume set to $${this.config.maxVolumeUsd}`;
      case "maxposition":
        this.config.maxPositionQty = parseFloat(value).toString();
        return `Max position set to ${this.config.maxPositionQty}`;
      default:
        return `Unknown config key: ${key}. Valid keys: interval, maxloss, maxfees, maxvolume, maxposition`;
    }
  }

  onFill(fill: Fill): void {
    if (!this.running || !this.config) return;
    if (fill.market !== this.config.market) return;

    const fee = parseFloat(fill.fee ?? "0") || 0;
    this.stats.totalFeesUsd += fee;
    this.session.feesUsd += fee;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private scheduleNext(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.tick(), delayMs);
  }

  private async tick(): Promise<void> {
    if (!this.running || !this.config) return;

    try {
      // Safety checks
      const stopReason = this.checkLimits();
      if (stopReason) {
        this.running = false;
        this.notify(`Farm auto-stopped: ${stopReason}`);
        return;
      }

      // Position safety — check if we need reduce-only
      const side = await this.decideSide();

      // Get current price for volume estimation
      const tickers = await getTickers(this.config.market);
      const price = tickers[0]?.close ? parseFloat(tickers[0].close) : 0;

      // Place IOC market order
      const params: CreateOrderParams = {
        market: this.config.market,
        type: "market",
        side,
        quantity: this.config.quantity,
      };

      await createOrder(params);

      // Update stats (global + session)
      this.stats.orderCount++;
      this.session.orderCount++;
      this.stats.lastOrderAt = new Date().toISOString();
      this.consecutiveErrors = 0;

      // Estimate volume from order
      if (price > 0) {
        const qty = parseFloat(this.config.quantity);
        const vol = qty * price;
        this.stats.totalVolumeUsd += vol;
        this.session.volumeUsd += vol;
      }

      // Track round trips (every 2 orders = 1 round trip)
      if (this.session.orderCount % 2 === 0) {
        this.stats.roundTrips++;
        this.session.roundTrips++;

        // Periodic summary every 10 round trips
        if (this.session.roundTrips % 10 === 0) {
          await this.sendPeriodicUpdate();
        }
      }

      // Flip side
      this.nextSide = side === "buy" ? "sell" : "buy";

      // Persist stats
      await saveStats(this.config.market, this.stats);
    } catch (err) {
      this.consecutiveErrors++;
      this.stats.errors++;
      this.session.errors++;
      console.error("[Farm] Order error:", (err as Error).message);

      if (this.consecutiveErrors >= 3) {
        this.running = false;
        this.notify(`Farm paused after 3 consecutive errors: ${(err as Error).message}`);
        await saveStats(this.config.market, this.stats);
        return;
      }
    }

    this.scheduleNext(this.config.intervalMs);
  }

  private async sendPeriodicUpdate(): Promise<void> {
    if (!this.config) return;

    const fmtN = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Fetch balance
    let balanceLine = "";
    try {
      const wallets = await getWallet();
      if (wallets[0]?.equity) {
        balanceLine = `Balance: $${fmtN(parseFloat(wallets[0].equity))}\n`;
      }
    } catch {
      // Skip balance if fetch fails
    }

    this.notify(
      `<b>Farm Update</b>\n\n` +
      `${this.config.market}\n` +
      `${balanceLine}\n` +
      `<b>Session</b> (${this.session.roundTrips} RTs)\n` +
      `Volume: $${fmtN(this.session.volumeUsd)}\n` +
      `Fees: $${fmtN(this.session.feesUsd)}\n` +
      `Errors: ${this.session.errors}\n\n` +
      `<b>All-Time</b> (${this.stats.roundTrips} RTs)\n` +
      `Volume: $${fmtN(this.stats.totalVolumeUsd)}\n` +
      `Fees: $${fmtN(this.stats.totalFeesUsd)}`,
    );
  }

  private checkLimits(): string | null {
    if (!this.config) return "no config";

    if (this.stats.totalPnlUsd < 0 && Math.abs(this.stats.totalPnlUsd) >= this.config.maxLossUsd) {
      return `Max loss reached ($${Math.abs(this.stats.totalPnlUsd).toFixed(2)} >= $${this.config.maxLossUsd})`;
    }
    if (this.stats.totalFeesUsd >= this.config.maxFeesUsd) {
      return `Max fees reached ($${this.stats.totalFeesUsd.toFixed(2)} >= $${this.config.maxFeesUsd})`;
    }
    if (this.stats.totalVolumeUsd >= this.config.maxVolumeUsd) {
      return `Target volume reached ($${this.stats.totalVolumeUsd.toFixed(2)} >= $${this.config.maxVolumeUsd})`;
    }
    return null;
  }

  private async decideSide(): Promise<"buy" | "sell"> {
    if (!this.config) return this.nextSide;

    try {
      const positions = await getPositions(this.config.market);
      const pos = positions[0];

      if (pos) {
        const qty = parseFloat(pos.quantity) || 0;
        const absQty = Math.abs(qty);
        const maxQty = parseFloat(this.config.maxPositionQty) || Infinity;

        if (absQty > maxQty) {
          // Position too large — reduce only (negative qty = short)
          return qty < 0 ? "buy" : "sell";
        }
      }
    } catch {
      // If position check fails, continue with planned side
    }

    return this.nextSide;
  }
}
