import type { Bot, Context } from "grammy";
import { FarmEngine } from "../../farm/engine.js";
import { formatFarmStatus, formatFarmConfig } from "../formatters.js";
import { config } from "../../config.js";
import { getWallet } from "../../api/client.js";
import type { Fill } from "../../types.js";

let engine: FarmEngine | null = null;

export function getFarmEngine(): FarmEngine | null {
  return engine;
}

export function registerFarm(bot: Bot) {
  // Create engine with Telegram notification callback
  engine = new FarmEngine((message: string) => {
    bot.api.sendMessage(config.telegramUserId, message, { parse_mode: "HTML" }).catch((err) => {
      console.error("[Farm] Failed to send notification:", err.message);
    });
  });

  bot.command("farm", async (ctx: Context) => {
    const args = ctx.match?.toString().trim() || "";
    const parts = args.split(/\s+/);
    const sub = parts[0]?.toLowerCase();

    if (!sub || sub === "help") {
      await ctx.reply(
        [
          `<b>Farm Commands</b>`,
          "",
          `/farm start &lt;market&gt; &lt;qty&gt; — Start farming`,
          `/farm stop — Stop farming`,
          `/farm status — Show stats`,
          `/farm config — Show config`,
          `/farm set &lt;key&gt; &lt;value&gt; — Change config`,
          "",
          `<b>Config keys:</b> interval, maxloss, maxfees, maxvolume, maxposition`,
        ].join("\n"),
        { parse_mode: "HTML" },
      );
      return;
    }

    switch (sub) {
      case "start": {
        const market = parts[1];
        const qty = parts[2];
        if (!market || !qty) {
          await ctx.reply("Usage: /farm start ETH-USD 0.05");
          return;
        }
        const result = await engine!.start(market, qty);
        await ctx.reply(result);
        break;
      }

      case "stop": {
        const result = engine!.stop();
        await ctx.reply(result);
        break;
      }

      case "status": {
        const state = engine!.getState();
        if (!state) {
          await ctx.reply("No farm has been started yet.");
          return;
        }
        let balance: string | undefined;
        try {
          const wallets = await getWallet();
          if (wallets[0]?.equity) {
            balance = parseFloat(wallets[0].equity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        } catch { /* skip */ }
        await ctx.reply(formatFarmStatus(state, balance), { parse_mode: "HTML" });
        break;
      }

      case "config": {
        const cfg = engine!.getConfig();
        if (!cfg) {
          await ctx.reply("No farm configured yet.");
          return;
        }
        await ctx.reply(formatFarmConfig(cfg), { parse_mode: "HTML" });
        break;
      }

      case "set": {
        const key = parts[1]?.toLowerCase();
        const value = parts[2];
        if (!key || !value) {
          await ctx.reply("Usage: /farm set interval 5000");
          return;
        }
        const result = engine!.setConfigValue(key, value);
        await ctx.reply(result);
        break;
      }

      default:
        await ctx.reply(`Unknown farm command: ${sub}. Use /farm help.`);
    }
  });
}
