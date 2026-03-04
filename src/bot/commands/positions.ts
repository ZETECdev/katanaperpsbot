import type { Bot, Context } from "grammy";
import { getPositions } from "../../api/client.js";
import { formatPositions } from "../formatters.js";

export function registerPositions(bot: Bot) {
  bot.command("positions", async (ctx: Context) => {
    try {
      const positions = await getPositions();
      await ctx.reply(formatPositions(positions), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
