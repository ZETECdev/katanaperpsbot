import type { Bot, Context } from "grammy";
import { createOrder, getPositions } from "../../api/client.js";
import { formatOrderResult } from "../formatters.js";
import type { CreateOrderParams } from "../../types.js";

function parseOrderArgs(text: string): { market: string; quantity: string; price?: string } | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const market = parts[0].toUpperCase();
  const quantity = parts[1];

  if (isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) return null;

  const price = parts[2] ?? undefined;
  if (price !== undefined && isNaN(parseFloat(price))) return null;

  return { market, quantity, price };
}

function registerSide(bot: Bot, command: string, side: "buy" | "sell") {
  bot.command(command, async (ctx: Context) => {
    const args = ctx.match?.toString();
    if (!args) {
      await ctx.reply(`Usage: /${command} ETH-USD 0.5 [price]\n\nOmit price for market order, include for limit.`);
      return;
    }

    const parsed = parseOrderArgs(args);
    if (!parsed) {
      await ctx.reply(`Invalid arguments. Usage: /${command} ETH-USD 0.5 [2500]`);
      return;
    }

    const orderType = parsed.price ? "limit" : "market";
    const params: CreateOrderParams = {
      market: parsed.market,
      type: orderType,
      side,
      quantity: parsed.quantity,
      price: parsed.price,
    };

    // Confirm before submitting
    const confirmMsg = [
      `<b>Confirm ${side.toUpperCase()} Order</b>`,
      "",
      `Market: ${parsed.market}`,
      `Type: ${orderType}`,
      `Qty: ${parsed.quantity}`,
      parsed.price ? `Price: $${parsed.price}` : `Price: MARKET`,
      "",
      `Submitting...`,
    ].join("\n");

    await ctx.reply(confirmMsg, { parse_mode: "HTML" });

    try {
      const result = await createOrder(params);
      await ctx.reply(formatOrderResult(result, side, parsed.market), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Order failed: ${(e as Error).message}`);
    }
  });
}

export function registerOrder(bot: Bot) {
  registerSide(bot, "buy", "buy");
  registerSide(bot, "sell", "sell");
  registerSide(bot, "long", "buy");
  registerSide(bot, "short", "sell");

  // /close <market> [qty] — auto-detect position side and close
  bot.command("close", async (ctx: Context) => {
    const args = ctx.match?.toString().trim();
    if (!args) {
      await ctx.reply("Usage: /close BTC-USD [qty]\n\nOmit qty to close entire position.");
      return;
    }

    const parts = args.split(/\s+/);
    const market = parts[0].toUpperCase();
    const explicitQty = parts[1];

    if (explicitQty !== undefined && (isNaN(parseFloat(explicitQty)) || parseFloat(explicitQty) <= 0)) {
      await ctx.reply("Invalid quantity.");
      return;
    }

    // Fetch current position to determine side and size
    let positions;
    try {
      positions = await getPositions(market);
    } catch (e) {
      await ctx.reply(`Failed to fetch positions: ${(e as Error).message}`);
      return;
    }

    const pos = positions[0];
    if (!pos) {
      await ctx.reply(`No open position for ${market}.`);
      return;
    }

    const posQty = parseFloat(pos.quantity) || 0;
    if (posQty === 0) {
      await ctx.reply(`No open position for ${market}.`);
      return;
    }

    // Close = opposite side of current position
    const side: "buy" | "sell" = posQty < 0 ? "buy" : "sell";
    const closeQty = explicitQty ?? Math.abs(posQty).toString();
    const direction = posQty < 0 ? "SHORT" : "LONG";

    const confirmMsg = [
      `<b>Closing ${direction} ${market}</b>`,
      "",
      `Side: ${side.toUpperCase()}`,
      `Qty: ${closeQty}`,
      `Price: MARKET`,
      "",
      `Submitting...`,
    ].join("\n");

    await ctx.reply(confirmMsg, { parse_mode: "HTML" });

    try {
      const params: CreateOrderParams = {
        market,
        type: "market",
        side,
        quantity: closeQty,
        reduceOnly: true,
      };
      const result = await createOrder(params);
      await ctx.reply(formatOrderResult(result, side, market), { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Close failed: ${(e as Error).message}`);
    }
  });
}
