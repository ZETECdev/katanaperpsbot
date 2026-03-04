import type { Bot, Context } from "grammy";
import { getFills } from "../../api/client.js";
import { formatFills } from "../formatters.js";

export function registerFills(bot: Bot) {
  bot.command("fills", async (ctx: Context) => {
    const market = ctx.match?.toString().trim().toUpperCase() || undefined;

    try {
      const fills = await getFills(market);
      await ctx.reply(formatFills(fills), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
