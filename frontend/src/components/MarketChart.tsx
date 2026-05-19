import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { ChartLegend } from "./ChartLegend";
import { SparklineCard } from "./SparklineCard";

const COLORS: Record<string, string> = {
  BTC: "#f59e0b",
  ETH: "#60a5fa",
  SOL: "#2dd4bf",
  MNT: "#f472b6",
};

const SYMBOLS = Object.keys(COLORS) as Array<keyof typeof COLORS>;

const FALLBACK_PRICES = { BTC: 76426, ETH: 2107, SOL: 84.18, MNT: 0.0473 };

export interface DataPoint {
  time: string;
  BTC: number;
  ETH: number;
  SOL: number;
  MNT: number;
  rawBTC: number;
  rawETH: number;
  rawSOL: number;
  rawMNT: number;
}

/* ── Data helpers ───────────────────────────────────────── */

const fetchPrices = async () => {
  try {
    const res = await fetch(
      "https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,MNT&tsyms=USD",
    );
    const json = await res.json();
    if (json?.BTC && json?.ETH && json?.SOL && json?.MNT) {
      return { BTC: json.BTC.USD, ETH: json.ETH.USD, SOL: json.SOL.USD, MNT: json.MNT.USD };
    }
  } catch (e) {
    console.error("Failed to fetch live prices", e);
  }
  return null;
};

const generateHistory = (prices: typeof FALLBACK_PRICES): DataPoint[] => {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, idx) => {
    const i = 19 - idx;
    const t = new Date(now - i * 5000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const f = 1 - i * 0.0005 + Math.sin(i * 0.6) * 0.001;
    return {
      time: t,
      BTC: 100 * f * (1 + Math.sin(i * 0.25) * 0.002),
      ETH: 100 * f * (1 + Math.cos(i * 0.3) * 0.0015),
      SOL: 100 * f * (1 + Math.sin(i * 0.45) * 0.003),
      MNT: 100 * f * (1 + Math.cos(i * 0.2) * 0.001),
      rawBTC: prices.BTC * f,
      rawETH: prices.ETH * f,
      rawSOL: prices.SOL * f,
      rawMNT: prices.MNT * f,
    };
  });
};

/* ── Custom tooltip ─────────────────────────────────────── */

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as DataPoint;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-time">{pt.time}</p>
      {SYMBOLS.map((sym) => {
        const raw = pt[`raw${sym}` as keyof DataPoint] as number;
        return (
          <div key={sym} className="chart-tooltip-row" style={{ color: COLORS[sym] }}>
            <span>{sym}:</span>
            <strong style={{ color: "#fff" }}>
              ${raw ? raw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "N/A"}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main chart ─────────────────────────────────────────── */

export function MarketChart() {
  const [data, setData] = useState<DataPoint[]>(() => generateHistory(FALLBACK_PRICES));

  useEffect(() => {
    let active = true;

    (async () => {
      const live = await fetchPrices();
      if (live && active) setData(generateHistory(live));
    })();

    const timer = window.setInterval(async () => {
      const live = await fetchPrices();
      if (!live || !active) return;

      setData((current) => {
        const base = current[0];
        const norm = (v: number, b: number) => (v / b) * 100;
        const next: DataPoint = {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          BTC: norm(live.BTC, base.rawBTC),
          ETH: norm(live.ETH, base.rawETH),
          SOL: norm(live.SOL, base.rawSOL),
          MNT: norm(live.MNT, base.rawMNT),
          rawBTC: live.BTC,
          rawETH: live.ETH,
          rawSOL: live.SOL,
          rawMNT: live.MNT,
        };
        return [...current.slice(1), next];
      });
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const latestPoint = useMemo(() => data[data.length - 1], [data]);

  const yDomain = useMemo(() => {
    const vals = data.flatMap((p) => [p.BTC, p.ETH, p.SOL, p.MNT]);
    return [Math.floor(Math.min(...vals) - 0.5), Math.ceil(Math.max(...vals) + 0.5)];
  }, [data]);

  return (
    <section className="chart-panel" aria-label="Live market performance chart">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <ChartNoAxesCombined size={14} /> Live market matrix
          </span>
        </div>
      </div>

      <div className="chart-dashboard">
        {/* Main chart — 3/4 width */}
        <div className="chart-main">
          <div className="chart-wrap">
            <ChartLegend assets={COLORS} latestPoint={latestPoint} />
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 40, right: 24, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={30} style={{ fontSize: "0.75rem" }} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={yDomain} style={{ fontSize: "0.75rem" }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="BTC" fill="url(#chartGlow)" stroke="transparent" isAnimationActive={false} />
                {SYMBOLS.map((sym) => (
                  <Line
                    key={sym}
                    type="monotone"
                    dataKey={sym}
                    stroke={COLORS[sym]}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar — 1/4 width — sparkline cards */}
        <aside className="chart-sidebar">
          {SYMBOLS.map((sym) => (
            <SparklineCard
              key={sym}
              symbol={sym}
              color={COLORS[sym]}
              data={data}
              latestRaw={latestPoint[`raw${sym}` as keyof DataPoint] as number}
            />
          ))}
        </aside>
      </div>
    </section>
  );
}
