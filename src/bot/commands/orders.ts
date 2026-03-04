import type { Bot, Context } from "grammy";
import { getOrders } from "../../api/client.js";
import { formatOrders } from "../formatters.js";

export function registerOrders(bot: Bot) {
  bot.command("orders", async (ctx: Context) => {
    const market = ctx.match?.toString().trim().toUpperCase() || undefined;

    try {
      const orders = await getOrders(market);
      await ctx.reply(formatOrders(orders), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
