import type { Bot, Context } from "grammy";

export function registerHelp(bot: Bot) {
  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      [
        `<b>Commands</b>`,
        "",
        `/start — Welcome + connection status`,
        `/help — This message`,
        "",
        `<b>Market Data</b>`,
        `/markets — All markets with prices`,
        `/ticker &lt;market&gt; — 24h stats (e.g. /ticker ETH-USD)`,
        "",
        `<b>Account</b>`,
        `/account — Equity, collateral, margin`,
        `/positions — Open positions with PnL`,
        `/orders [market] — Open orders`,
        `/fills [market] — Recent fill history`,
        "",
        `<b>Trading</b>`,
        `/long &lt;market&gt; &lt;qty&gt; [price] — Open long`,
        `/short &lt;market&gt; &lt;qty&gt; [price] — Open short`,
        `/close &lt;market&gt; [qty] — Close position (auto-detects side)`,
        `/buy &lt;market&gt; &lt;qty&gt; [price] — Market or limit buy`,
        `/sell &lt;market&gt; &lt;qty&gt; [price] — Market or limit sell`,
        `/cancel &lt;id&gt; | &lt;market&gt; | all — Cancel orders`,
        "",
        `<b>Volume Farm</b>`,
        `/farm start &lt;market&gt; &lt;qty&gt; — Start farming`,
        `/farm stop — Stop farming loop`,
        `/farm status — Volume, fees, PnL, ETA`,
        `/farm config — Show current config`,
        `/farm set &lt;key&gt; &lt;value&gt; — Adjust config`,
        "",
        `<b>Session Key</b>`,
        `/sessionkey — Show session key to authorize`,
      ].join("\n"),
      { parse_mode: "HTML" }
    );
  });
}
