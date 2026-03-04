import type { Bot, Context } from "grammy";
import { getTickers } from "../../api/client.js";
import { formatTicker } from "../formatters.js";

export function registerTicker(bot: Bot) {
  bot.command("ticker", async (ctx: Context) => {
    const market = ctx.match?.toString().trim().toUpperCase();
    if (!market) {
      await ctx.reply("Usage: /ticker ETH-USD");
      return;
    }

    try {
      const tickers = await getTickers(market);
      if (!tickers.length) {
        await ctx.reply(`No ticker data for ${market}`);
        return;
      }
      await ctx.reply(formatTicker(tickers[0]), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
