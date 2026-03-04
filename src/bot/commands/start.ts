import type { Bot, Context } from "grammy";
import { config } from "../../config.js";
import { getMarkets, getSessionKeyAddress } from "../../api/client.js";

export function registerStart(bot: Bot) {
  bot.command("start", async (ctx: Context) => {
    let status = "Checking connection...";
    try {
      const markets = await getMarkets();
      status = `Connected to Katana Perps (${config.network})\n${markets.length} markets available`;
    } catch (e) {
      status = `Connection error: ${(e as Error).message}`;
    }

    await ctx.reply(
      [
        `<b>Katana Perps Bot</b>`,
        "",
        status,
        "",
        `Wallet: <code>${config.walletAddress}</code>`,
        `Session Key: <code>${getSessionKeyAddress()}</code>`,
        "",
        `Use /help to see available commands.`,
      ].join("\n"),
      { parse_mode: "HTML" }
    );
  });
}
