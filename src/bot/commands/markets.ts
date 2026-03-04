import type { Bot, Context } from "grammy";
import { getMarkets } from "../../api/client.js";
import { formatMarkets } from "../formatters.js";

export function registerMarkets(bot: Bot) {
  bot.command("markets", async (ctx: Context) => {
    try {
      const markets = await getMarkets();
      await ctx.reply(formatMarkets(markets), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
