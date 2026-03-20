# Katana Perps Bot

Telegram bot for trading perpetual futures on [Katana Perps](https://perps.katana.network/). Supports market/limit orders, position management, and automated volume farming — all from Telegram.

## Setup

### Prerequisites

- Node.js 18+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A Katana Perps API key and secret
- A session key from Katana Perps

### Get Your Session Key

1. Go to [perps.katana.network](https://perps.katana.network/)
2. Connect your wallet
3. Navigate to **Settings → Create Session Key**
4. Copy the **Session Key** (private key) — you won't be able to retrieve it again after closing the modal

### Install

```bash
git clone <repo-url>
cd katana-perps-bot
npm install
```

### Configure

Copy `.env.example` to `.env` and fill in your values:

```env
TELEGRAM_BOT_TOKEN=         # From @BotFather
TELEGRAM_USER_ID=           # Your numeric Telegram user ID
PERPS_API_KEY=              # From Katana Perps dashboard
PERPS_API_SECRET=           # HMAC secret from Katana Perps
SESSION_KEY=                # Session key private key (from Katana modal)
WALLET_ADDRESS=             # Your 0x wallet address (public)
NETWORK=mainnet             # "mainnet" or "testnet"
```

> **Finding your Telegram user ID:** Send a message to [@userinfobot](https://t.me/userinfobot) on Telegram.

### Run

```bash
# Production
npm run build
npm start

# Development (auto-reload)
npm run dev
```

## Commands

### Market Data

| Command | Description |
|---------|-------------|
| `/start` | Connection status, wallet info |
| `/markets` | All markets with current prices |
| `/ticker <market>` | 24h stats (e.g. `/ticker ETH-USD`) |

### Account

| Command | Description |
|---------|-------------|
| `/account` | Equity, collateral, buying power |
| `/positions` | Open positions with PnL |
| `/orders [market]` | Open orders (optionally filtered) |
| `/fills [market]` | Recent fill history |

### Trading

| Command | Description |
|---------|-------------|
| `/long <market> <qty> [price]` | Open long (market or limit) |
| `/short <market> <qty> [price]` | Open short (market or limit) |
| `/close <market> [qty]` | Close position (auto-detects side) |
| `/buy <market> <qty> [price]` | Place buy order |
| `/sell <market> <qty> [price]` | Place sell order |
| `/cancel <id> \| <market> \| all` | Cancel orders |

**Examples:**

```
/long BTC-USD 0.001            # Market buy 0.001 BTC
/short ETH-USD 0.1 2500        # Limit sell 0.1 ETH at $2500
/close BTC-USD                 # Close entire BTC position
/close ETH-USD 0.05            # Partially close ETH position
/cancel ETH-USD                # Cancel all ETH orders
/cancel all                    # Cancel everything
```

### Session Key

| Command | Description |
|---------|-------------|
| `/sessionkey` | Show the delegated signing key address |

## Volume Farming

The farm engine automates buy/sell round trips to generate volume on a market. It alternates between buy and sell orders at a configurable interval.

### Farm Commands

| Command | Description |
|---------|-------------|
| `/farm start <market> <qty>` | Start farming |
| `/farm stop` | Stop farming |
| `/farm status` | Session + all-time stats, balance, ETA |
| `/farm config` | Show current config |
| `/farm set <key> <value>` | Adjust config on the fly |

**Example:**

```
/farm start BTC-USD 0.0005     # Farm BTC with 0.0005 per order
/farm set interval 5000        # Speed up to 5s between orders
/farm set maxvolume 50000      # Set target volume to $50k
/farm stop                     # Stop when done
```

### Farm Config Keys

| Key | Default | Description |
|-----|---------|-------------|
| `interval` | `8000` | Milliseconds between orders (min 1000) |
| `maxloss` | `50` | Auto-stop at this USD loss |
| `maxfees` | `100` | Auto-stop at this USD in fees |
| `maxvolume` | `1000000` | Target volume in USD |
| `maxposition` | `qty × 2` | Max position size before reduce-only |

### Farm Stats

The farm tracks two levels of statistics:

- **Session stats** — reset each time you run `/farm start`. Shows volume, fees, errors, and round trips for the current session only.
- **All-time stats** — persisted to disk across sessions. Cumulative volume, fees, and round trips for the market.

Periodic updates are sent to Telegram every 10 round trips, showing both session and all-time stats along with your current account balance.

### Safety Features

- **Max loss** — auto-stops if PnL drops below the configured loss limit
- **Max fees** — auto-stops if total fees exceed the limit
- **Max volume** — auto-stops when target volume is reached
- **Max position** — switches to reduce-only orders if position grows too large
- **Error handling** — pauses after 3 consecutive errors
- **Notification suppression** — per-fill and position update notifications are suppressed during farming to avoid spam

## Real-Time Notifications

The bot connects via WebSocket to receive real-time updates:

- **Fill notifications** — when orders are filled (suppressed during farming)
- **Position updates** — when positions change (suppressed during farming)

## Custom Strategy

You can implement your own automated trading strategy by editing the `src/strategy.ts` file. 

To enable your custom strategy:
1. Open `src/bot/bot.ts`.
2. Find the variable `const runCustomStrategy = false` near the top of the file.
3. Change its value to `true`.

Your custom logic defined in the `startCustomStrategy` class will automatically execute when the bot starts in the background.

## Project Structure

```
src/
├── index.ts              # Entry point
├── config.ts             # Environment config
├── types.ts              # Type re-exports from SDK
├── strategy.ts           # Custom strategy logic
├── api/
│   └── client.ts         # SDK wrapper functions
├── bot/
│   ├── bot.ts            # Bot + WebSocket setup
│   ├── formatters.ts     # Telegram message formatting
│   ├── middleware.ts      # Auth guard
│   └── commands/         # All /command handlers
└── farm/
    ├── engine.ts         # Farm loop + stats tracking
    ├── types.ts          # Farm interfaces + defaults
    └── stats.ts          # Persistent stats (JSON files)
```

## Security

- Only messages from your `TELEGRAM_USER_ID` are processed (auth middleware)
- Orders are signed with your session key, not your wallet private key
- The session key has limited permissions — it can only trade, not withdraw
- Never commit your `.env` file
