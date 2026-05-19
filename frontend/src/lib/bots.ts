export type Bot = {
  id: number;
  name: string;
  intro: string;
  style: string;
  timeframe: string;
  indicators: string;
  color: string;
};

export const bots: Bot[] = [
  {
    id: 1,
    name: "Finn",
    intro: "Fast momentum scout built for intraday bursts and volume-led continuations.",
    style: "Momentum",
    timeframe: "Intraday",
    indicators: "RSI, MACD, volume surge",
    color: "#38bdf8",
  },
  {
    id: 2,
    name: "Tycoon",
    intro: "Patient trend engine that waits for directional conviction before deploying capital.",
    style: "Trend follower",
    timeframe: "Intraday",
    indicators: "EMA crossovers, ADX",
    color: "#a78bfa",
  },
  {
    id: 3,
    name: "Puff",
    intro: "Breakout specialist watching compression, volatility expansion, and clean escapes.",
    style: "Breakout",
    timeframe: "Daily",
    indicators: "Bollinger Bands, ATR breakout",
    color: "#2dd4bf",
  },
  {
    id: 4,
    name: "Gemma",
    intro: "Range tactician designed for support/resistance reactions and mean reversion.",
    style: "Range",
    timeframe: "Daily",
    indicators: "Support/resistance, RSI",
    color: "#f59e0b",
  },
  {
    id: 5,
    name: "Josh",
    intro: "Reversal hunter looking for exhaustion, divergence, and pivot-confirmed turns.",
    style: "Trend reversal",
    timeframe: "Daily",
    indicators: "Divergence, MACD flip, pivot points",
    color: "#fb7185",
  },
];
