import type { Bot } from "./bots";

export type Trade = {
  id: number;
  botId: number;
  symbol: string;
  status: "open" | "closed";
  side: "Long" | "Short";
  entry: number;
  exit?: number;
  pnl: number;
  openedAt: string;
  result?: "Win" | "Loss";
};

const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "MNT/USDT"];

export function mockTrades(bot: Bot): Trade[] {
  return Array.from({ length: 8 }, (_, index) => {
    const open = index < 2;
    const pnl = Number(((Math.sin(index + bot.id) * 3.8 + 0.7) * 100).toFixed(2));
    const entry = [72400, 3650, 178, 1.08][index % 4];
    return {
      id: bot.id * 100 + index,
      botId: bot.id,
      symbol: symbols[index % symbols.length],
      status: open ? "open" : "closed",
      side: index % 2 === 0 ? "Long" : "Short",
      entry,
      exit: open ? undefined : Number((entry * (1 + pnl / 10000)).toFixed(2)),
      pnl,
      openedAt: new Date(Date.now() - index * 7_200_000).toLocaleString(),
      result: open ? undefined : pnl >= 0 ? "Win" : "Loss",
    };
  });
}

export function seededSeries() {
  const now = Date.now();
  return Array.from({ length: 72 }, (_, index) => {
    const wave = Math.sin(index / 6);
    const drift = index * 0.18;
    return {
      time: new Date(now - (71 - index) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      BTC: 100 + wave * 3 + drift,
      ETH: 100 + Math.cos(index / 8) * 2.6 + drift * 0.7,
      SOL: 100 + Math.sin(index / 4 + 1) * 4.2 + drift * 1.2,
      MNT: 100 + Math.cos(index / 5 + 2) * 3.4 + drift * 0.45,
    };
  });
}
