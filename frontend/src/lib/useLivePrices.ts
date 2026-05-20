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

// Maps standard symbols to Bybit Spot tickers (e.g. "BTC/USDT" -> "BTCUSDT")
function toBybitSymbol(symbol: string): string {
  const base = toBaseSymbol(symbol);
  return `${base}USDT`;
}

const POLL_INTERVAL = 5_000; // 5 seconds

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
      // ─── PRIMARY: Bybit Spot Tickers (Zero rate-limit blocks, matches active trading) ───
      try {
        const res = await fetch("https://api.bybit.com/v5/market/tickers?category=spot");
        if (res.ok) {
          const json = await res.json();
          if (json.retCode === 0 && json.result?.list) {
            const list = json.result.list;
            const bybitPrices: Record<string, number> = {};
            for (const item of list) {
              bybitPrices[item.symbol] = parseFloat(item.lastPrice);
            }
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const bybitSym = toBybitSymbol(sym);
              if (bybitPrices[bybitSym] !== undefined && !isNaN(bybitPrices[bybitSym])) {
                newPrices[sym] = bybitPrices[bybitSym];
              }
            }
            if (Object.keys(newPrices).length > 0) {
              setPrices(newPrices);
              return; // Success!
            }
          }
        }
      } catch (err) {
        // Silently move to next fallback
      }

      // ─── SECONDARY: CoinGecko (Highly reliable free tier) ───
      try {
        if (geckoIds) {
          const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const newPrices: Record<string, number> = {};
            for (const sym of symbols) {
              const base = toBaseSymbol(sym);
              const geckoId = COINGECKO_MAP[base];
              if (data[geckoId]?.usd !== undefined) {
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
        // Silently move to next fallback
      }

      // ─── TERTIARY: CryptoCompare ───
      try {
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${ccFsyms}&tsyms=USD`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
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
              setPrices(newPrices);
            }
          }
        }
      } catch (err) {
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
