import type { Bot, Context } from "grammy";
import { cancelOrder } from "../../api/client.js";
import { formatCancelResult } from "../formatters.js";
import type { CancelOrderParams } from "../../types.js";

export function registerCancel(bot: Bot) {
  bot.command("cancel", async (ctx: Context) => {
    const args = ctx.match?.toString().trim();
    if (!args) {
      await ctx.reply("Usage:\n/cancel &lt;orderId&gt; — Cancel specific order\n/cancel ETH-USD — Cancel all orders for market\n/cancel all — Cancel all orders", { parse_mode: "HTML" });
      return;
    }

    let params: CancelOrderParams;
    let desc: string;

    if (args.toLowerCase() === "all") {
      params = { mode: "byWallet" };
      desc = "all orders";
    } else if (args.includes("-")) {
      // Looks like a market symbol (e.g. ETH-USD) or could be an order ID with dashes
      // Heuristic: market symbols are short uppercase with one dash
      if (/^[A-Z]+-[A-Z]+$/i.test(args)) {
        params = { mode: "byMarket", market: args.toUpperCase() };
        desc = `all ${args.toUpperCase()} orders`;
      } else {
        // Treat as order ID(s)
        const ids = args.split(",").map((s) => s.trim());
        params = { mode: "byId", orderIds: ids };
        desc = `order(s) ${ids.join(", ")}`;
      }
    } else {
      // Single order ID without dashes
      params = { mode: "byId", orderIds: [args] };
      desc = `order ${args}`;
    }

    await ctx.reply(`Cancelling ${desc}...`);

    try {
      const result = await cancelOrder(params);
      await ctx.reply(formatCancelResult(result), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Cancel failed: ${(e as Error).message}`);
    }
  });
}
