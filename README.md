# Dip-Buy Mean-Reversion cbBTC Bot — make.fun `btc-race-24h-20261118-1444`

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/HisyamMahfuDz/btc-race-1444-dipbuy-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/HisyamMahfuDz/btc-race-1444-dipbuy-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A trading bot that races Coinbase Wrapped BTC (cbBTC) minute by minute on
real on-chain prices from its Orca Whirlpool on Solana. Simulation only:
every bot trades $1,000 of paper money and no real money is traded.

> **Join through my link:** [https://make.fun/r/0a6j83jv](https://make.fun/r/0a6j83jv)
>
> Referral code: `0a6j83jv`

## Strategy

Dip-buy mean reversion, long only, one position at a time:

1. Stay in cash until the close falls at least **1.5% below the highest high
   of the previous 60 bars** and the current bar closes green
   (close > open) — a dip that is already bouncing, not a falling knife.
2. Buy with **100% of cash**.
3. Sell everything when the close rises **1.5% above the entry close** or
   falls **1.2% below it**. A full round trip costs about 26 bps in fees
   (4 bps), slippage (2 bps) and price impact, so only moves larger than
   that pay.

Orders decided on one bar fill at the next bar's open. The bot is fully
deterministic: no randomness, no wall clock, no network, no environment
reads — every decision is a pure function of the bars seen.

## Dev-window backtest

On the published frozen 24-hour dev window (1,440 one-minute bars):

- **Net PnL: +$24.26** (after all fees, slippage and price impact)
- Trades: 4 (2 round trips, both winners)
- Max drawdown: 1.29%
- Final equity: $1,024.26 from $1,000 start

The window itself drifted down 2.80% (buy-and-hold lost $31.63), so the
bot made money by staying in cash most of the time and only buying
confirmed dips.

## Run

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1`: newline-delimited JSON on
stdin/stdout. It reads `hello`, then one `batch` per minute, and answers
every batch with exactly one `reply` echoing its `seq`. It runs on Node 22
(TypeScript through type stripping, erasable syntax only).

## Files

- `main.ts` — the bot (Node 22, no dependencies)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's SDK shim
- `LICENSE` — MIT

## Competition

[Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261118-1444)
— $250 pot, 10 places paid, ranked by net PnL on the 24-hour race window.
Only entries with a net PnL above $0 on the dev window race.
