import type { DataPoint } from "./MarketChart";

type AssetConfig = Record<string, string>;

interface ChartLegendProps {
  assets: AssetConfig;
  latestPoint: DataPoint;
}

const formatValue = (symbol: string, value: number): string => {
  if (!value && value !== 0) return "—";

  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};

export function ChartLegend({ assets, latestPoint }: ChartLegendProps) {
  return (
    <div className="chart-legend" role="list" aria-label="Asset prices">
      {Object.entries(assets).map(([symbol, color]) => {
        const rawKey = `raw${symbol}` as keyof DataPoint;
        const rawValue = latestPoint[rawKey] as number;

        return (
          <div
            key={symbol}
            className="chart-legend-item"
            role="listitem"
            style={{ "--legend-color": color } as React.CSSProperties}
          >
            <span className="chart-legend-dot" />
            <span className="chart-legend-symbol">{symbol}</span>
            <span className="chart-legend-value">
              ${formatValue(symbol, rawValue)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
