import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FarmStats } from "./types.js";
import { emptyStats } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "data");

function statsPath(market: string): string {
  return join(DATA_DIR, `farm-stats-${market.toLowerCase()}.json`);
}

export async function loadStats(market: string): Promise<FarmStats> {
  try {
    const raw = await readFile(statsPath(market), "utf-8");
    return { ...emptyStats(), ...JSON.parse(raw) };
  } catch {
    return emptyStats();
  }
}

export async function saveStats(market: string, stats: FarmStats): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = statsPath(market) + ".tmp";
  await writeFile(tmp, JSON.stringify(stats, null, 2));
  await writeFile(statsPath(market), JSON.stringify(stats, null, 2));
  // Clean up tmp — best effort
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(tmp);
  } catch {
    // ignore
  }
}
