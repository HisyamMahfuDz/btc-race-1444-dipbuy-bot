// Dip-buy mean-reversion bot for make.fun btc-race-24h-20261118-1444.
//
// Protocol: agent-fun/bars-replay/v1, via the kit's TypeScript shim
// (vendor/makefun-bars.ts, a byte-identical copy of the kit SDK).
// The bot reads one 1-minute cbBTC/USDC bar per batch and answers with
// buy/sell orders. Simulation only: $1,000 of paper money, nothing real.
//
// Strategy (validated on the published 24h dev window, grade-local
// +$24.26 net, 4 trades / 2 round trips, max drawdown 1.29% after all
// fees, slippage and price impact):
//   * Stay in cash until the close falls at least 1.5% below the highest
//     high of the previous 60 bars AND the current bar closes green
//     (close > open) -- a dip that is already bouncing, not a falling knife.
//   * Buy with 100% of cash.
//   * Sell everything when the close rises 1.5% above the entry close
//     (the close of the bar on which the buy was decided) or falls 1.2%
//     below it. A full round trip costs about 26 bps in fees (4 bps),
//     slippage (2 bps) and price impact, so only moves larger than that pay.
//   * Long only, at most one position, at most one order per reply.
//   * Fully deterministic: all comparisons are exact BigInt arithmetic on
//     the bars themselves; no randomness, no wall clock, no network, no
//     environment reads.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 60; // bars of trailing-high window
const DROP_BPS = 150n; // buy when close <= trailing high * (1 - 1.5%)
const TAKE_PROFIT_BPS = 150n; // sell when close >= entry * (1 + 1.5%)
const STOP_LOSS_BPS = 120n; // sell when close <= entry * (1 - 1.2%)
const MAX_SLIPPAGE_BPS = 200; // 2% from latest close; 1-minute moves rarely exceed it
const BPS = 10000n;

const closes: bigint[] = [];
const opens: bigint[] = [];
const highs: bigint[] = [];
let entryClose: bigint | null = null; // close of the bar the buy was decided on
let pendingEntryClose: bigint | null = null;

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) {
      closes.push(BigInt(bar.c));
      opens.push(BigInt(bar.o));
      highs.push(BigInt(bar.h));
    }

    const held = state.positions.get(SYMBOL);
    // A buy decided on the previous batch has now filled (or not):
    // adopt its decision close as the entry reference once we hold.
    if (held !== undefined && entryClose === null && pendingEntryClose !== null) {
      entryClose = pendingEntryClose;
    }
    if (held === undefined) {
      entryClose = null;
      pendingEntryClose = null;
    }

    if (bar === undefined || state.warmingUp || closes.length < LOOKBACK + 1) return [];

    const close = closes[closes.length - 1];
    if (held === undefined) {
      let trailingHigh = 0n;
      for (let i = highs.length - LOOKBACK - 1; i < highs.length - 1; i++) {
        if (highs[i] > trailingHigh) trailingHigh = highs[i];
      }
      // Buy when close <= high * (1 - 1.5%) and the bar closed green.
      if (close * BPS <= trailingHigh * (BPS - DROP_BPS) && close > opens[opens.length - 1]) {
        const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
        if (state.cash >= minNotional) {
          pendingEntryClose = close;
          const buy: BuyInput = {
            side: 'buy',
            symbol: SYMBOL,
            notional_quote_units: state.cash,
            max_slippage_bps: MAX_SLIPPAGE_BPS,
          };
          return [buy];
        }
      }
      return [];
    }

    if (entryClose !== null) {
      if (
        close * BPS >= entryClose * (BPS + TAKE_PROFIT_BPS) ||
        close * BPS <= entryClose * (BPS - STOP_LOSS_BPS)
      ) {
        const sell: SellInput = {
          side: 'sell',
          symbol: SYMBOL,
          qty: held.qty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [sell];
      }
    }
    return [];
  },
});
