import { useMemo } from "react";
import { Line, ResponsiveContainer, LineChart } from "recharts";
import type { DataPoint } from "./MarketChart";

interface SparklineCardProps {
  symbol: string;
  color: string;
  data: DataPoint[];
  latestRaw: number;
}

const formatPrice = (value: number): string => {
  if (!value && value !== 0) return "—";
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
};

export function SparklineCard({ symbol, color, data, latestRaw }: SparklineCardProps) {
  const sparkData = useMemo(() => {
    const rawKey = `raw${symbol}` as keyof DataPoint;
    return data.map((pt) => ({ v: pt[rawKey] as number }));
  }, [data, symbol]);

  const pctChange = useMemo(() => {
    if (sparkData.length < 2) return 0;
    const first = sparkData[0].v;
    const last = sparkData[sparkData.length - 1].v;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [sparkData]);

  const isPositive = pctChange >= 0;

  return (
    <div
      className="sparkline-card"
      style={{ "--spark-color": color } as React.CSSProperties}
    >
      <div className="sparkline-card-header">
        <div className="sparkline-card-identity">
          <span className="sparkline-card-dot" />
          <span className="sparkline-card-symbol">{symbol}</span>
        </div>
        <span className={`sparkline-card-change ${isPositive ? "positive" : "negative"}`}>
          {isPositive ? "+" : ""}{pctChange.toFixed(2)}%
        </span>
      </div>

      <div className="sparkline-card-price">${formatPrice(latestRaw)}</div>

      <div className="sparkline-card-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
