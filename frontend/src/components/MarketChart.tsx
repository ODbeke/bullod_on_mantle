import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
import { seededSeries } from "../lib/mockData";

const COLORS = {
  BTC: "#f59e0b",
  ETH: "#60a5fa",
  SOL: "#2dd4bf",
  MNT: "#f472b6",
};

export function MarketChart() {
  const [data, setData] = useState(seededSeries);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setData((current) => {
        const last = current[current.length - 1];
        const next = {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          BTC: Number((last.BTC + Math.sin(Date.now() / 14000) * 0.55 + 0.06).toFixed(2)),
          ETH: Number((last.ETH + Math.cos(Date.now() / 16000) * 0.42 + 0.04).toFixed(2)),
          SOL: Number((last.SOL + Math.sin(Date.now() / 9000) * 0.68 + 0.08).toFixed(2)),
          MNT: Number((last.MNT + Math.cos(Date.now() / 11000) * 0.34 + 0.03).toFixed(2)),
        };
        return [...current.slice(1), next];
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const latest = useMemo(() => data[data.length - 1], [data]);
  const yDomain = useMemo(() => {
    const values = data.flatMap((point) => [point.BTC, point.ETH, point.SOL, point.MNT]);
    return [Math.floor(Math.min(...values) - 3), Math.ceil(Math.max(...values) + 3)];
  }, [data]);

  return (
    <section className="chart-panel" aria-label="Live market performance chart">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><ChartNoAxesCombined size={14} /> Live market matrix</span>
          <h2>BTC, ETH, SOL, MNT relative performance</h2>
        </div>
        <div className="legend">
          {Object.entries(COLORS).map(([symbol, color]) => (
            <span key={symbol} style={{ "--token-color": color } as React.CSSProperties}>
              <i />
              {symbol} {latest[symbol as keyof typeof COLORS].toFixed(2)}
            </span>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 24, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
            <XAxis dataKey="time" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={26} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={yDomain} />
            <Tooltip contentStyle={{ background: "rgba(8, 13, 24, 0.92)", border: "1px solid rgba(148, 163, 184, 0.24)", borderRadius: 8, color: "#e2e8f0" }} />
            <Area type="monotone" dataKey="BTC" fill="url(#chartGlow)" stroke="transparent" isAnimationActive />
            {Object.entries(COLORS).map(([symbol, color]) => (
              <Line key={symbol} type="monotone" dataKey={symbol} stroke={color} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} isAnimationActive />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
