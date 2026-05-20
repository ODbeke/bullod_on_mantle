import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CircleDollarSign, Play, TrendingDown, TrendingUp, X, Inbox, Zap } from "lucide-react";
import type { Bot } from "../lib/bots";
import type { OnChainTrade } from "../lib/contracts";

type Props = {
  bot: Bot | null;
  active: boolean;
  botAllocation: number;
  userTrades: OnChainTrade[];
  onClose: () => void;
  onActivate: (botId: number, amount: number) => void;
};

export function BotModal({ bot, active, botAllocation, userTrades, onClose, onActivate }: Props) {
  const [amount, setAmount] = useState("500");
  const [tab, setTab] = useState<"trades" | "history">("trades");

  // Filter trades belonging to this bot
  const botTrades = useMemo(() => (bot ? userTrades.filter((t) => t.botId === bot.id) : []), [bot, userTrades]);
  const liveTrades = botTrades.filter((t) => t.status === "open");
  const history = botTrades.filter((t) => t.status === "closed");
  const wins = history.filter((t) => t.pnl >= 0).length;
  const winRate = history.length ? Math.round((wins / history.length) * 100) : 0;
  const liveLong = liveTrades.filter((t) => t.isLong);
  const liveShort = liveTrades.filter((t) => !t.isLong);
  const closedLong = history.filter((t) => t.isLong);
  const closedShort = history.filter((t) => !t.isLong);

  return (
    <AnimatePresence>
      {bot && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="bot-modal" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} style={{ "--bot-color": bot.color } as React.CSSProperties}>
            <button className="icon-button close-button" type="button" onClick={onClose} aria-label="Close bot panel">
              <X size={20} />
            </button>
            <div className="modal-head">
              <div className="bot-orb large">{bot.name.slice(0, 1)}</div>
              <div>
                <span className="eyebrow">{bot.style} / {bot.timeframe}</span>
                <h2>{bot.name}</h2>
                <p>{bot.intro}</p>
              </div>
            </div>

            <div className="allocation-band">
              <label>
                <span>Capital allocation</span>
                <div className="input-shell">
                  <CircleDollarSign size={18} />
                  <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
                  <strong>mUSDC</strong>
                </div>
              </label>
              <button className="primary-button" type="button" onClick={() => onActivate(bot.id, Number(amount) || 0)}>
                <Play size={18} />
                {active ? "Update bot" : "Start bot"}
              </button>
            </div>

            {active && (
              <div className="allocation-status">
                <Zap size={14} />
                <span>Active — <strong>${botAllocation.toLocaleString()} mUSDC</strong> allocated to {bot.name}</span>
              </div>
            )}

            <div className="tabs">
              <button className={tab === "trades" ? "selected" : ""} type="button" onClick={() => setTab("trades")}>Trades</button>
              <button className={tab === "history" ? "selected" : ""} type="button" onClick={() => setTab("history")}>History</button>
            </div>

            {tab === "trades" ? (
              botTrades.length === 0 ? (
                <EmptyState
                  botName={bot.name}
                  message={active
                    ? `${bot.name} is live with $${botAllocation.toLocaleString()} mUSDC. Waiting for market conditions to open the first trade.`
                    : "No trades yet — allocate capital and start this bot to begin trading."
                  }
                />
              ) : (
                <div className="trade-book">
                  <TradeGroup title="Live long trades" tone="long" trades={liveLong} emptyLabel={`${bot.name} has no live long trades.`} />
                  <TradeGroup title="Live short trades" tone="short" trades={liveShort} emptyLabel={`${bot.name} has no live short trades.`} />
                </div>
              )
            ) : (
              history.length === 0 ? (
                <EmptyState
                  botName={bot.name}
                  message={active
                    ? `${bot.name} is active but has not closed any trades yet. Completed trades will appear here.`
                    : "No trade history yet — your closed trades will appear here."
                  }
                />
              ) : (
                <div className="history-panel">
                  <div className="analytics-strip">
                    <span><BarChart3 size={16} /> Win rate <strong>{winRate}%</strong></span>
                    <span>Total PnL <strong className={history.reduce((t, tr) => t + tr.pnl, 0) >= 0 ? "positive" : "negative"}>{history.reduce((t, tr) => t + tr.pnl, 0) >= 0 ? "+" : ""}{history.reduce((t, tr) => t + tr.pnl, 0).toFixed(2)} USDC</strong></span>
                    <span>Closed trades <strong>{history.length}</strong></span>
                    <span>Long / Short <strong>{closedLong.length} / {closedShort.length}</strong></span>
                  </div>
                  <div className="trade-book">
                    <TradeGroup title="Closed long trades" tone="long" trades={closedLong} emptyLabel={`${bot.name} has no closed long trades.`} compact />
                    <TradeGroup title="Closed short trades" tone="short" trades={closedShort} emptyLabel={`${bot.name} has no closed short trades.`} compact />
                  </div>
                </div>
              )
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Empty state ──────────────────────────────────────── */

function EmptyState({ botName, message }: { botName: string; message: string }) {
  return (
    <div className="empty-state-panel">
      <Inbox size={40} strokeWidth={1.2} />
      <h3>No activity for {botName}</h3>
      <p>{message}</p>
    </div>
  );
}

/* ── Trade group ──────────────────────────────────────── */

type TradeGroupProps = {
  title: string;
  tone: "long" | "short";
  trades: OnChainTrade[];
  emptyLabel: string;
  compact?: boolean;
};

function TradeGroup({ title, tone, trades, emptyLabel, compact = false }: TradeGroupProps) {
  const Icon = tone === "long" ? TrendingUp : TrendingDown;

  return (
    <section className={`trade-group ${tone}`}>
      <div className="trade-group-head">
        <h3><Icon size={17} /> {title}</h3>
        <span>{trades.length}</span>
      </div>
      <div className="trade-grid">
        {trades.length === 0 ? (
          <div className="empty-trades">{emptyLabel}</div>
        ) : (
          trades.map((trade) => (
            <article className={`trade-row ${compact ? "compact" : ""}`} key={trade.id}>
              <div>
                <strong>{trade.symbol}</strong>
                <span>{trade.status === "open" ? "Live trade" : `Closed / ${trade.pnl >= 0 ? "Win" : "Loss"}`} / {trade.isLong ? "Long" : "Short"}</span>
              </div>
              <div>
                <span>{trade.status === "open" ? "Entry" : "Entry / Exit"}</span>
                <strong>
                  ${trade.entryPrice.toLocaleString()}
                  {trade.exitPrice > 0 ? ` / $${trade.exitPrice.toLocaleString()}` : ""}
                </strong>
              </div>
              <div>
                <span>{trade.status === "open" ? "Active PnL" : new Date(trade.openedAt * 1000).toLocaleDateString()}</span>
                <strong className={trade.pnl >= 0 ? "positive" : "negative"}>
                  {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)} USDC
                </strong>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
