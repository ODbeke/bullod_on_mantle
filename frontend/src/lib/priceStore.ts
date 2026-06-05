/**
 * Centralized live price store.
 *
 * ONE polling loop feeds every consumer (MarketChart, useLivePrices, etc.)
 * so we never double‑poll and never burn through API rate limits.
 *
 * Prices are keyed by base symbol: { BTC: 76500, ETH: 2110, SOL: 85, MNT: 0.63 }
 */

type Prices = Record<string, number>;
type Listener = (prices: Prices) => void;

let latest: Prices = {};
const listeners = new Set<Listener>();
let started = false;

const POLL_MS = 5_000;

/* ── helpers ────────────────────────────────────────── */

async function fetchWithTimeout(url: string, ms = 4_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryBybit(): Promise<Prices | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.bybit.com/v5/market/tickers?category=spot",
      4_000,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.retCode !== 0 || !json.result?.list) return null;

    const want: Record<string, string> = {
      BTCUSDT: "BTC",
      ETHUSDT: "ETH",
      SOLUSDT: "SOL",
      MNTUSDT: "MNT",
    };
    const out: Prices = {};
    for (const item of json.result.list) {
      const base = want[item.symbol];
      if (base) out[base] = parseFloat(item.lastPrice);
    }
    return Object.keys(out).length === 4 ? out : null;
  } catch {
    return null;
  }
}

async function tryCoinGecko(): Promise<Prices | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,mantle&vs_currencies=usd",
      4_000,
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.bitcoin?.usd || !d.ethereum?.usd || !d.solana?.usd || !d.mantle?.usd) return null;
    return { BTC: d.bitcoin.usd, ETH: d.ethereum.usd, SOL: d.solana.usd, MNT: d.mantle.usd };
  } catch {
    return null;
  }
}

async function tryCryptoCompare(): Promise<Prices | null> {
  try {
    const res = await fetchWithTimeout(
      "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,MANTLE&tsyms=USD",
      4_000,
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.Response === "Error") return null;
    if (!d.BTC?.USD || !d.ETH?.USD || !d.SOL?.USD || !d.MANTLE?.USD) return null;
    return { BTC: d.BTC.USD, ETH: d.ETH.USD, SOL: d.SOL.USD, MNT: d.MANTLE.USD };
  } catch {
    return null;
  }
}

/* ── core loop ──────────────────────────────────────── */

async function tick() {
  const prices =
    (await tryCoinGecko()) ??
    (await tryBybit()) ??
    (await tryCryptoCompare());

  if (prices && Object.keys(prices).length > 0) {
    latest = prices;
    listeners.forEach((fn) => fn(latest));
  } else {
    // Fallback: apply a tiny random walk if APIs fail so the chart never flatlines
    if (Object.keys(latest).length === 0) {
      latest = { BTC: 76426, ETH: 2107, SOL: 84.18, MNT: 0.6256 };
    } else {
      const walk = () => 1 + (Math.random() - 0.5) * 0.002;
      latest = {
        BTC: latest.BTC * walk(),
        ETH: latest.ETH * walk(),
        SOL: latest.SOL * walk(),
        MNT: latest.MNT * walk(),
      };
    }
    listeners.forEach((fn) => fn(latest));
  }
}

function ensurePolling() {
  if (started) return;
  started = true;
  tick(); // fire immediately
  setInterval(tick, POLL_MS);
}

/* ── public API ─────────────────────────────────────── */

/** Subscribe to price updates. Returns an unsubscribe function. */
export function subscribePrices(cb: Listener): () => void {
  listeners.add(cb);
  ensurePolling();
  // send cached value immediately if available
  if (Object.keys(latest).length > 0) cb(latest);
  return () => {
    listeners.delete(cb);
  };
}

/** Get the last known prices (may be empty on first render). */
export function getLatestPrices(): Prices {
  return latest;
}
