// ─── Farm module interfaces ─────────────────────────────────────────────────

export interface FarmConfig {
  market: string;
  quantity: string;
  intervalMs: number;
  maxPositionQty: string;
  maxLossUsd: number;
  maxFeesUsd: number;
  maxVolumeUsd: number;
}

export interface FarmStats {
  totalVolumeUsd: number;
  totalFeesUsd: number;
  totalPnlUsd: number;
  roundTrips: number;
  orderCount: number;
  startedAt: string;
  lastOrderAt: string;
  errors: number;
}

export interface FarmSessionStats {
  volumeUsd: number;
  feesUsd: number;
  roundTrips: number;
  orderCount: number;
  errors: number;
  startedAt: string;
}

export interface FarmState {
  running: boolean;
  nextSide: "buy" | "sell";
  config: FarmConfig;
  stats: FarmStats;
  session: FarmSessionStats;
}

export function emptySessionStats(): FarmSessionStats {
  return {
    volumeUsd: 0,
    feesUsd: 0,
    roundTrips: 0,
    orderCount: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
  };
}

export const DEFAULT_FARM_CONFIG: Omit<FarmConfig, "market" | "quantity"> = {
  intervalMs: 8000,
  maxPositionQty: "0",
  maxLossUsd: 50,
  maxFeesUsd: 100,
  maxVolumeUsd: 1_000_000,
};

export function emptyStats(): FarmStats {
  return {
    totalVolumeUsd: 0,
    totalFeesUsd: 0,
    totalPnlUsd: 0,
    roundTrips: 0,
    orderCount: 0,
    startedAt: "",
    lastOrderAt: "",
    errors: 0,
  };
}
