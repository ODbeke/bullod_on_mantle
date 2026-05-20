import { useEffect, useState } from "react";
import { subscribePrices } from "./priceStore";

/**
 * Maps on-chain trade symbols ("BTC/USDT", "ETHUSDT", etc.) to base tickers ("BTC").
 */
function toBaseSymbol(symbol: string): string {
  if (!symbol) return "";
  return symbol.toUpperCase().replace("/USDT", "").replace("USDT", "").trim();
}

/**
 * React hook that returns live USD prices keyed by the exact on-chain symbol
 * string (e.g. "BTC/USDT" → 76500).
 *
 * Internally subscribes to the singleton priceStore so there is only ever
 * ONE network polling loop for the entire app.
 */
export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const unsubscribe = subscribePrices((allPrices) => {
      const mapped: Record<string, number> = {};
      for (const sym of symbols) {
        const base = toBaseSymbol(sym);
        if (allPrices[base] !== undefined) {
          mapped[sym] = allPrices[base];
        }
      }
      if (Object.keys(mapped).length > 0) {
        setPrices(mapped);
      }
    });

    return unsubscribe;
  }, [symbols.join(",")]);

  return prices;
}

/**
 * Calculate unrealized PnL for an open trade given live price.
 * Leverage defaults to 10× to match the backend engine.
 */
export function calcUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  collateral: number,
  isLong: boolean,
  leverage = 10,
): number {
  if (entryPrice === 0) return 0;
  const move = (currentPrice - entryPrice) / entryPrice;
  return collateral * (isLong ? move : -move) * leverage;
}
