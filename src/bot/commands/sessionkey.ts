import type { Bot, Context } from "grammy";
import { getSessionKeyAddress } from "../../api/client.js";

export function registerSessionKey(bot: Bot) {
  bot.command("sessionkey", async (ctx: Context) => {
    await ctx.reply(
      [
        `<b>Session Key</b>`,
        "",
        `Address: <code>${getSessionKeyAddress()}</code>`,
        "",
        `This is the delegated key used to sign orders.`,
      ].join("\n"),
      { parse_mode: "HTML" }
    );
  });
}
