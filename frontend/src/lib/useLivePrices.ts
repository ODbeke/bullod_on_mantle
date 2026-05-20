import { useEffect, useState } from "react";

// Maps on-chain symbols (e.g., "BTC/USDT") to CryptoCompare symbols
function toCryptoCompareSymbol(symbol: string): string {
  return symbol.replace("/USDT", "").replace("USDT", "");
}

const POLL_INTERVAL = 4_000; // 4 seconds

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const uniqueBaseSymbols = [...new Set(symbols.map(toCryptoCompareSymbol))];
    const fsyms = uniqueBaseSymbols.join(",");

    async function fetchPrices() {
      try {
        const res = await fetch(
          `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=USD`,
        );
        const data = await res.json();
        const newPrices: Record<string, number> = {};
        for (const sym of symbols) {
          const base = toCryptoCompareSymbol(sym);
          if (data[base]?.USD) {
            newPrices[sym] = data[base].USD;
          }
        }
        setPrices(newPrices);
      } catch {
        // Silently retry on next interval
      }
    }

    fetchPrices();
    const id = setInterval(fetchPrices, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [symbols.join(",")]);

  return prices;
}

/**
 * Calculate unrealized PnL for an open trade given live price.
 */
export function calcUnrealizedPnl(
  entryPrice: number,
  currentPrice: number,
  collateral: number,
  isLong: boolean,
): number {
  if (entryPrice === 0) return 0;
  const move = (currentPrice - entryPrice) / entryPrice;
  return collateral * (isLong ? move : -move);
}
