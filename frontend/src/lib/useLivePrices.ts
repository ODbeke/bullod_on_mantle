import { useEffect, useState } from "react";

const COINGECKO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  MNT: "mantle",
};

// Maps on-chain symbols (e.g., "BTC/USDT", "BTCUSDT", "mnt/usdt") to base symbols (e.g. "BTC") case-insensitively
function toBaseSymbol(symbol: string): string {
  if (!symbol) return "";
  return symbol.toUpperCase().replace("/USDT", "").replace("USDT", "").trim();
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
      console.log("[useLivePrices] Fetching live prices for symbols:", symbols, "base:", baseSymbols);

      try {
        // Try CoinGecko first (highly reliable free tier, generous rate limits)
        if (geckoIds) {
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            console.log("[useLivePrices] CoinGecko response data:", data);
            
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const base = toBaseSymbol(sym);
              const geckoId = COINGECKO_MAP[base];
              if (data[geckoId]?.usd !== undefined) {
                newPrices[sym] = data[geckoId].usd;
              }
            }
            if (Object.keys(newPrices).length > 0) {
              console.log("[useLivePrices] Mapped new prices from CoinGecko:", newPrices);
              setPrices(newPrices);
              return; // Success!
            }
          }
        }
      } catch (err) {
        console.warn("[useLivePrices] CoinGecko fetch error, falling back:", err);
      }

      // ─── FALLBACK: CryptoCompare ───
      try {
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${ccFsyms}&tsyms=USD`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          console.log("[useLivePrices] CryptoCompare response data:", data);
          
          if (data.Response !== "Error") {
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const base = toBaseSymbol(sym);
              const ccBase = base === "MNT" ? "MANTLE" : base;
              if (data[ccBase]?.USD !== undefined) {
                newPrices[sym] = data[ccBase].USD;
              }
            }
            if (Object.keys(newPrices).length > 0) {
              console.log("[useLivePrices] Mapped new prices from CryptoCompare:", newPrices);
              setPrices(newPrices);
            }
          } else {
            console.warn("[useLivePrices] CryptoCompare returned error response:", data);
          }
        }
      } catch (err) {
        console.error("[useLivePrices] CryptoCompare fetch error:", err);
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
