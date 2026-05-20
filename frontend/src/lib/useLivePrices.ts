import { useEffect, useState } from "react";

const COINGECKO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  MNT: "mantle",
};

// Maps on-chain symbols (e.g., "BTC/USDT", "BTCUSDT") to base symbols (e.g. "BTC")
function toBaseSymbol(symbol: string): string {
  return symbol.replace("/USDT", "").replace("USDT", "");
}

const POLL_INTERVAL = 5_000; // 5 seconds to be gentle on public endpoints

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const baseSymbols = [...new Set(symbols.map(toBaseSymbol))];
    
    // Construct CoinGecko ids parameter
    const geckoIds = baseSymbols
      .map(sym => COINGECKO_MAP[sym])
      .filter(Boolean)
      .join(",");

    // Fallback CryptoCompare parameters
    const ccFsyms = baseSymbols
      .map(sym => (sym === "MNT" ? "MANTLE" : sym))
      .join(",");

    async function fetchPrices() {
      try {
        // Try CoinGecko first (highly reliable free tier, generous rate limits)
        if (geckoIds) {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`
          );
          if (res.ok) {
            const data = await res.json();
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const base = toBaseSymbol(sym);
              const geckoId = COINGECKO_MAP[base];
              if (data[geckoId]?.usd) {
                newPrices[sym] = data[geckoId].usd;
              }
            }
            if (Object.keys(newPrices).length > 0) {
              setPrices(newPrices);
              return; // Success!
            }
          }
        }
      } catch (err) {
        // Silently fall back to CryptoCompare
      }

      // ─── FALLBACK: CryptoCompare ───
      try {
        const res = await fetch(
          `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${ccFsyms}&tsyms=USD`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.Response !== "Error") {
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const base = toBaseSymbol(sym);
              const ccBase = base === "MNT" ? "MANTLE" : base;
              if (data[ccBase]?.USD) {
                newPrices[sym] = data[ccBase].USD;
              }
            }
            if (Object.keys(newPrices).length > 0) {
              setPrices(newPrices);
            }
          }
        }
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
