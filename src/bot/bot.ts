import { Bot } from "grammy";
import startCustomStrategy from "../strategy.js";
import {
  type WebSocketClient,
  type KatanaPerpsOrderEvent,
  type KatanaPerpsPositionEvent,
  MessageEventType,
} from "@katanaperps/katana-perps-sdk";
import { config } from "../config.js";
import { authGuard } from "./middleware.js";
import { formatFillNotification, formatPositionNotification } from "./formatters.js";
import { createWebSocketClient } from "../api/client.js";

// Command registrations
import { registerStart } from "./commands/start.js";
import { registerHelp } from "./commands/help.js";
import { registerMarkets } from "./commands/markets.js";
import { registerTicker } from "./commands/ticker.js";
import { registerAccount } from "./commands/account.js";
import { registerPositions } from "./commands/positions.js";
import { registerOrders } from "./commands/orders.js";
import { registerFills } from "./commands/fills.js";
import { registerOrder } from "./commands/order.js";
import { registerCancel } from "./commands/cancel.js";
import { registerFarm, getFarmEngine } from "./commands/farm.js";
import { registerSessionKey } from "./commands/sessionkey.js";


// Chang to true if you want to run your custom strategy
const runCustomStrategy = false


export function createBot(): { bot: Bot; ws: WebSocketClient } {
  const bot = new Bot(config.telegramBotToken);

  // Auth guard — reject messages from non-authorized users
  bot.use(authGuard);

  // Register all commands
  registerStart(bot);
  registerHelp(bot);
  registerMarkets(bot);
  registerTicker(bot);
  registerAccount(bot);
  registerPositions(bot);
  registerOrders(bot);
  registerFills(bot);
  registerOrder(bot);
  registerCancel(bot);
  registerFarm(bot);
  registerSessionKey(bot);

  // WebSocket for real-time notifications (SDK handles auth, ping/pong, reconnection)
  const ws = createWebSocketClient();

  ws.onMessage((msg) => {
    const engine = getFarmEngine();
    const farmRunning = engine?.getState()?.running ?? false;

    if (msg.type === MessageEventType.orders && msg.data) {
      const orderEvent = msg as KatanaPerpsOrderEvent;
      const data = orderEvent.data;

      // Feed fill data into farm engine for fee tracking
      if (engine && data.fills) {
        for (const fill of data.fills) {
          engine.onFill({
            market: data.market,
            side: data.side,
            fillId: fill.fillId,
            price: fill.price,
            quantity: fill.quantity,
            fee: fill.fee,
          } as import("../types.js").Fill);
        }
      }

      // Suppress per-fill notifications while farming that market
      if (farmRunning && engine?.getState()?.config.market === data.market) {
        return;
      }

      const message = formatFillNotification(data);
      bot.api.sendMessage(config.telegramUserId, message, { parse_mode: "HTML" }).catch((err) => {
        console.error("[Bot] Failed to send WS notification:", err.message);
      });
    } else if (msg.type === MessageEventType.positions && msg.data) {
      const posEvent = msg as KatanaPerpsPositionEvent;

      // Suppress position updates while farming that market
      if (farmRunning && engine?.getState()?.config.market === posEvent.data.market) {
        return;
      }

      const message = formatPositionNotification(posEvent.data);
      bot.api.sendMessage(config.telegramUserId, message, { parse_mode: "HTML" }).catch((err) => {
        console.error("[Bot] Failed to send WS notification:", err.message);
      });
    }
  });

  return { bot, ws };
}


if (runCustomStrategy) {
  new startCustomStrategy();
}