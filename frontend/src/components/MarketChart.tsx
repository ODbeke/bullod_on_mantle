import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartNoAxesCombined } from "lucide-react";

const COLORS = {
  BTC: "#f59e0b",
  ETH: "#60a5fa",
  SOL: "#2dd4bf",
  MNT: "#f472b6",
};

const FALLBACK_PRICES = { BTC: 76426, ETH: 2107, SOL: 84.18, MNT: 0.0473 };

interface DataPoint {
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

const fetchPrices = async () => {
  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,MNT&tsyms=USD");
    const json = await res.json();
    if (json && json.BTC && json.ETH && json.SOL && json.MNT) {
      return {
        BTC: json.BTC.USD,
        ETH: json.ETH.USD,
        SOL: json.SOL.USD,
        MNT: json.MNT.USD,
      };
    }
  } catch (e) {
    console.error("Failed to fetch live prices", e);
  }
  return null;
};

const generateHistory = (currentPrices: typeof FALLBACK_PRICES): DataPoint[] => {
  const points: DataPoint[] = [];
  const now = Date.now();
  
  for (let i = 19; i >= 0; i--) {
    const time = new Date(now - i * 5000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const factor = 1 - (i * 0.0005) + (Math.sin(i * 0.6) * 0.001);
    
    points.push({
      time,
      BTC: 100 * factor * (1 + Math.sin(i * 0.25) * 0.002),
      ETH: 100 * factor * (1 + Math.cos(i * 0.3) * 0.0015),
      SOL: 100 * factor * (1 + Math.sin(i * 0.45) * 0.003),
      MNT: 100 * factor * (1 + Math.cos(i * 0.2) * 0.001),
      rawBTC: currentPrices.BTC * factor,
      rawETH: currentPrices.ETH * factor,
      rawSOL: currentPrices.SOL * factor,
      rawMNT: currentPrices.MNT * factor,
    });
  }
  return points;
};

export function MarketChart() {
  const [data, setData] = useState<DataPoint[]>(() => generateHistory(FALLBACK_PRICES));

  useEffect(() => {
    let active = true;

    const init = async () => {
      const live = await fetchPrices();
      if (live && active) {
        setData(generateHistory(live));
      }
    };
    init();

    const timer = window.setInterval(async () => {
      const live = await fetchPrices();
      if (!live || !active) return;

      setData((current) => {
        const firstPoint = current[0];
        const normalize = (curr: number, base: number) => (curr / base) * 100;
        
        const next: DataPoint = {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          BTC: normalize(live.BTC, firstPoint.rawBTC),
          ETH: normalize(live.ETH, firstPoint.rawETH),
          SOL: normalize(live.SOL, firstPoint.rawSOL),
          MNT: normalize(live.MNT, firstPoint.rawMNT),
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

  const latest = useMemo(() => data[data.length - 1], [data]);

  const yDomain = useMemo(() => {
    const values = data.flatMap((point) => [point.BTC, point.ETH, point.SOL, point.MNT]);
    return [Math.floor(Math.min(...values) - 0.5), Math.ceil(Math.max(...values) + 0.5)];
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pointData = payload[0].payload as DataPoint;
      return (
        <div style={{ background: "rgba(8, 13, 24, 0.95)", border: "1px solid rgba(148, 163, 184, 0.24)", padding: "12px", borderRadius: 8, color: "#e2e8f0", fontSize: "0.85rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}>
          <p style={{ margin: 0, fontWeight: "bold", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px", marginBottom: "6px" }}>{pointData.time}</p>
          {Object.entries(COLORS).map(([symbol, color]) => {
            const rawVal = pointData[`raw${symbol}` as keyof DataPoint] as number;
            return (
              <div key={symbol} style={{ display: "flex", justifyContent: "space-between", gap: "16px", color }}>
                <span>{symbol}:</span>
                <strong style={{ color: "#fff" }}>
                  ${rawVal ? rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "N/A"}
                </strong>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="chart-panel" aria-label="Live market performance chart">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><ChartNoAxesCombined size={14} /> Live market matrix</span>
          <h2>BTC, ETH, SOL, MNT relative performance</h2>
        </div>
        <div className="legend">
          {Object.entries(COLORS).map(([symbol, color]) => {
            const rawVal = latest[`raw${symbol}` as keyof DataPoint] as number;
            return (
              <span key={symbol} style={{ "--token-color": color } as React.CSSProperties}>
                <i />
                {symbol} ${rawVal ? rawVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "Loading..."}
              </span>
            );
          })}
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 24, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
            <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={30} style={{ fontSize: "0.75rem" }} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={yDomain} style={{ fontSize: "0.75rem" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="BTC" fill="url(#chartGlow)" stroke="transparent" isAnimationActive={false} />
            {Object.entries(COLORS).map(([symbol, color]) => (
              <Line key={symbol} type="monotone" dataKey={symbol} stroke={color} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
