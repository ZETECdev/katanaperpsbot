import type { Context, NextFunction } from "grammy";
import { config } from "../config.js";

export async function authGuard(ctx: Context, next: NextFunction): Promise<void> {
  if (ctx.from?.id !== config.telegramUserId) {
    return; // Silently ignore unauthorized users
  }
  await next();
}
