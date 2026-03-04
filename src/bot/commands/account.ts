import type { Bot, Context } from "grammy";
import { getWallet } from "../../api/client.js";
import { formatWallet } from "../formatters.js";

export function registerAccount(bot: Bot) {
  bot.command("account", async (ctx: Context) => {
    try {
      const wallets = await getWallet();
      await ctx.reply(formatWallet(wallets), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Error: ${(e as Error).message}`);
    }
  });
}
