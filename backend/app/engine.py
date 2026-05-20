import asyncio
import logging
from time import time

from app.config import get_settings
from app.models import Position, Signal, Side
from app.services.bybit import BybitMarketStream
from app.services.chain import ChainRecorder, BOT_IDS
from app.services.repository import TradeRepository
from app.services.telegram import TelegramNotifier
from app.strategies import STRATEGIES

logger = logging.getLogger(__name__)

# Minimum seconds between signals per (bot_id, symbol) — prevents overtrading.
# Intraday bots (1, 2) → 15 min cooldown, Daily bots (3, 4, 5) → 4 hour cooldown.
SIGNAL_COOLDOWNS: dict[int, int] = {
    1: 15 * 60,      # Finn (Momentum / Intraday) — 15 min
    2: 15 * 60,      # Tycoon (Trend / Intraday)  — 15 min
    3: 4 * 60 * 60,  # Puff (Breakout / Daily)    — 4 hours
    4: 4 * 60 * 60,  # Gemma (Range / Daily)      — 4 hours
    5: 4 * 60 * 60,  # Josh (Reversal / Daily)    — 4 hours
}

# How often to re-scan the chain for new users (seconds)
USER_DISCOVERY_INTERVAL = 120


class BotEngine:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.market = BybitMarketStream()
        self.chain = ChainRecorder()
        self.notifier = TelegramNotifier(self.settings.telegram_bot_token)
        self.repository = TradeRepository()
        # positions keyed by (user, bot_id, symbol) for multi-user support
        self.positions: dict[tuple[str, int, str], Position] = {}
        # tracks last signal time per (bot_id, symbol) for cooldown enforcement
        self._last_signal_time: dict[tuple[int, str], float] = {}
        self._last_user_discovery: float = 0.0
        self._active_users: set[str] = set()

    async def start(self) -> None:
        await self.notifier.start()
        try:
            await self.repository.connect()
        except Exception as exc:
            logger.warning("Database unavailable, continuing without DB indexing: %s", exc)

        logger.info("Engine starting — streaming live market data...")

        async for symbol, candles in self.market.stream():
            price = candles[-1].close

            # Periodically re-discover users from on-chain events
            now = time()
            if now - self._last_user_discovery > USER_DISCOVERY_INTERVAL:
                self._active_users = await self.chain.discover_users()
                self._last_user_discovery = now

            # Check open positions for TP/SL
            await self._check_positions(symbol, price)

            # Evaluate strategies and generate signals
            for strategy in STRATEGIES:
                signal = strategy.evaluate(symbol, candles)
                if signal and self._cooldown_ok(signal):
                    await self._handle_signal_for_all_users(signal)

    def _cooldown_ok(self, signal: Signal) -> bool:
        """Enforce timeframe-based cooldown per (bot_id, symbol)."""
        key = (signal.bot_id, signal.symbol)
        cooldown = SIGNAL_COOLDOWNS.get(signal.bot_id, 15 * 60)
        last = self._last_signal_time.get(key, 0)
        return (time() - last) >= cooldown

    async def _handle_signal_for_all_users(self, signal: Signal) -> None:
        """Execute a signal for every user who has allocation for this bot."""
        users_with_allocation = await self.chain.get_active_users_for_bot(signal.bot_id)

        if not users_with_allocation:
            return

        for user in users_with_allocation:
            await self._handle_signal(user, signal)

        # Mark cooldown only after processing all users
        self._last_signal_time[(signal.bot_id, signal.symbol)] = time()

    async def _handle_signal(self, user: str, signal: Signal) -> None:
        key = (user.lower(), signal.bot_id, signal.symbol)
        if key in self.positions:
            return  # already has an open position for this bot+symbol

        allocation = await self.chain.bot_allocation(user, signal.bot_id)
        collateral = max(25.0, allocation / 10**6 * signal.collateral_fraction)
        if allocation == 0 or collateral * 10**6 > allocation:
            return

        logger.info(
            "Opening trade for %s — Bot %d (%s) %s %s at $%s",
            user[:10], signal.bot_id, signal.bot_name, signal.side.upper(), signal.symbol, f"{signal.price:,.2f}",
        )

        trade_id = await self.chain.open_trade(user, signal, collateral)
        if trade_id is None:
            trade_id = int(time() * 1000)

        tp_multiplier = 1.018 if signal.side == Side.LONG else 0.982
        sl_multiplier = 0.991 if signal.side == Side.LONG else 1.009
        position = Position(
            trade_id=trade_id,
            user=user,
            bot_id=signal.bot_id,
            bot_name=signal.bot_name,
            symbol=signal.symbol,
            side=signal.side,
            collateral=collateral,
            entry_price=signal.price,
            opened_at=int(time()),
            take_profit=signal.price * tp_multiplier,
            stop_loss=signal.price * sl_multiplier,
        )
        self.positions[key] = position
        await self.repository.save_open_trade(position)
        await self.notifier.notify(
            position.user,
            f"Bot {position.bot_id} ({position.bot_name}) | {position.symbol}\nTrade opened {position.side.upper()} at ${position.entry_price:,.2f}\nReason: {signal.reason}",
        )

    async def _check_positions(self, symbol: str, price: float) -> None:
        for key, position in list(self.positions.items()):
            if position.symbol != symbol or not position.should_close(price):
                continue
            pnl = position.pnl(price)

            logger.info(
                "Closing trade #%d for %s — %s PnL: %+.2f USDC",
                position.trade_id, position.user[:10], "TP" if pnl >= 0 else "SL", pnl,
            )

            await self.chain.close_trade(position.trade_id, price, pnl)
            await self.repository.close_trade(position.trade_id, price, pnl)
            del self.positions[key]
            outcome = "Take Profit Hit" if pnl >= 0 else "Stop Loss Hit"
            await self.notifier.notify(
                position.user,
                f"Bot {position.bot_id} ({position.bot_name}) | {position.symbol}\n{outcome} at ${price:,.2f}\nPnL: {pnl:+.2f} USDC | Duration: {position.age_seconds // 60}m",
            )


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("OD Bot Trading Engine v1.0")
    await BotEngine().start()


if __name__ == "__main__":
    asyncio.run(main())
