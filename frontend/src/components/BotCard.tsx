import { motion } from "framer-motion";
import { ArrowUpRight, RadioTower } from "lucide-react";
import type { Bot } from "../lib/bots";

type Props = {
  bot: Bot;
  active: boolean;
  onOpen: (bot: Bot) => void;
};

export function BotCard({ bot, active, onOpen }: Props) {
  return (
    <motion.button
      className="bot-card"
      type="button"
      onClick={() => onOpen(bot)}
      style={{ "--bot-color": bot.color } as React.CSSProperties}
      whileHover={{ y: -7, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="bot-card-top">
        <div className="bot-orb">{bot.name.slice(0, 1)}</div>
        {active && (
          <span className="live-badge">
            <RadioTower size={14} />
            Live
          </span>
        )}
      </div>
      <h3>{bot.name}</h3>
      <p>{bot.intro}</p>
      <div className="bot-meta">
        <span>{bot.style}</span>
        <span>{bot.timeframe}</span>
      </div>
      <div className="bot-footer">
        <small>{bot.indicators}</small>
        <ArrowUpRight size={18} />
      </div>
    </motion.button>
  );
}
