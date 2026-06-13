import asyncio
import logging
from time import time

from app.config import get_settings
from app.models import Position, Signal, Side
from app.services.bybit import CryptoCompareStream
from app.services.chain import ChainRecorder, BOT_IDS
from app.services.repository import TradeRepository
from app.services.telegram import TelegramNotifier
from app.strategies import STRATEGIES

logger = logging.getLogger(__name__)

# Minimum seconds between signals per (bot_id, symbol) — prevents overtrading.
# Intraday bots (1, 2) → 15 min cooldown, Daily bots (3, 4, 5) → 4 hour cooldown.
SIGNAL_COOLDOWNS: dict[int, int] = {
    1: 60,           # Finn (Momentum / Intraday) — 60s (Test Mode)
    2: 60,           # Tycoon (Trend / Intraday)  — 60s (Test Mode)
    3: 5 * 60,       # Puff (Breakout / Daily)    — 5 mins (Test Mode)
    4: 5 * 60,       # Gemma (Range / Daily)      — 5 mins (Test Mode)
    5: 5 * 60,       # Josh (Reversal / Daily)    — 5 mins (Test Mode)
}

# How often to re-scan the chain for new users (seconds)
USER_DISCOVERY_INTERVAL = 120


class BotEngine:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.market = CryptoCompareStream()
        self.chain = ChainRecorder()
        self.repository = TradeRepository()
        self.notifier = TelegramNotifier(self.settings.telegram_bot_token, repository=self.repository)
        # positions keyed by trade_id
        self.positions: dict[int, Position] = {}
        # tracks last signal time per (bot_id, symbol) for cooldown enforcement
        self._last_signal_time: dict[tuple[int, str], float] = {}
        self._last_user_discovery: float = 0.0
        self._active_users: set[str] = set()

    async def start(self) -> None:
        try:
            await self.notifier.start()
        except Exception as exc:
            logger.warning("Telegram bot unavailable, continuing without notifications: %s", exc)
        try:
            await self.repository.connect()
        except Exception as exc:
            logger.warning("Database unavailable, continuing without DB indexing: %s", exc)

        logger.info("Engine starting — discovering on-chain users...")
        try:
            self._active_users = await self.chain.discover_users()
            self._last_user_discovery = time()
            if self._active_users:
                logger.info("Found %d user(s) with allocations: %s", len(self._active_users), [u[:10] + "..." for u in self._active_users])
            else:
                logger.warning("No users with allocations found yet. Users will be discovered as they allocate.")
                
            self.positions = await self.chain.sync_open_positions()
        except Exception as exc:
            logger.warning("User discovery or sync failed: %s", exc)

        logger.info("Streaming live market data...")

        async for symbol, candles in self.market.stream():
            try:
                await self._tick(symbol, candles)
            except Exception as exc:
                logger.error("Tick error for %s (non-fatal, continuing): %s", symbol, exc)

    async def _tick(self, symbol: str, candles: list) -> None:
        price = candles[-1].close

        # Periodically re-discover users from on-chain events
        now = time()
        if now - self._last_user_discovery > USER_DISCOVERY_INTERVAL:
            try:
                self._active_users = await self.chain.discover_users()
                self._last_user_discovery = now
                if self._active_users:
                    logger.info("Active users with allocations: %s", [u[:10] + "..." for u in self._active_users])
                else:
                    logger.info("No users with allocations found on-chain yet")
            except Exception as exc:
                logger.warning("User discovery failed, using cached list (%d users): %s", len(self._active_users), exc)
                self._last_user_discovery = now  # Don't spam retries

        # Check open positions for TP/SL
        await self._check_positions(symbol, price)

        # Evaluate strategies and generate signals
        for strategy in STRATEGIES:
            signal = strategy.evaluate(symbol, candles)
            if signal:
                if self._cooldown_ok(signal):
                    logger.info(
                        "SIGNAL: %s (%s) → %s %s at $%.2f | reason: %s",
                        strategy.bot_name, strategy.__class__.__name__,
                        signal.side.upper(), symbol, signal.price, signal.reason,
                    )
                    await self._handle_signal_for_all_users(signal)
                else:
                    logger.debug("Signal from %s skipped (cooldown active)", strategy.bot_name)

    def _cooldown_ok(self, signal: Signal) -> bool:
        """Enforce timeframe-based cooldown per (bot_id, symbol)."""
        key = (signal.bot_id, signal.symbol)
        cooldown = SIGNAL_COOLDOWNS.get(signal.bot_id, 15 * 60)
        last = self._last_signal_time.get(key, 0)
        return (time() - last) >= cooldown

    async def _handle_signal_for_all_users(self, signal: Signal) -> None:
        """Execute a signal for every user who has allocation for this bot."""
        try:
            users_with_allocation = await self.chain.get_active_users_for_bot(signal.bot_id)
        except Exception as exc:
            logger.warning("Failed to fetch users for bot %d: %s", signal.bot_id, exc)
            return

        if not users_with_allocation:
            return

        for user in users_with_allocation:
            try:
                await self._handle_signal(user, signal)
            except Exception as exc:
                logger.error("Trade execution failed for %s on bot %d: %s", user[:10], signal.bot_id, exc)

        # Mark cooldown only after processing all users
        self._last_signal_time[(signal.bot_id, signal.symbol)] = time()

    async def _handle_signal(self, user: str, signal: Signal) -> None:
        user_lower = user.lower()
        # Enforce strict 1-position-per-pair rule PER BOT for this user
        if any(pos.user == user_lower and pos.bot_id == signal.bot_id and pos.symbol == signal.symbol for pos in self.positions.values()):
            return

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

        tp_multiplier = 1.035 if signal.side == Side.LONG else 0.965
        sl_multiplier = 0.985 if signal.side == Side.LONG else 1.015
        leverage = 10.0
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
            leverage=leverage,
            entry_reason=signal.reason,
        )
        self.positions[trade_id] = position
        try:
            await self.repository.save_open_trade(position)
        except Exception:
            pass
        try:
            side_emoji = "📈" if position.side == Side.LONG else "📉"
            message = (
                f"🤖 Bot {position.bot_id} ({position.bot_name}) | {position.symbol}\n\n"
                f"{side_emoji} Trade Opened: {position.side.upper()} at ${position.entry_price:,.2f}\n"
                f"📝 Reason: {signal.reason}"
            )
            await self.notifier.notify(position.user, message)
        except Exception:
            pass

    async def _check_positions(self, symbol: str, price: float) -> None:
        for key, position in list(self.positions.items()):
            if position.symbol != symbol or not position.should_close(price):
                continue
            pnl = position.pnl(price)

            logger.info(
                "Closing trade #%d for %s — %s PnL: %+.2f USDC",
                position.trade_id, position.user[:10], "TP" if pnl >= 0 else "SL", pnl,
            )

            try:
                await self.chain.close_trade(position.trade_id, price, pnl)
            except Exception as exc:
                err_str = str(exc)
                if "0xb9da156f" in err_str or "TradeAlreadyClosed" in err_str:
                    logger.info("Trade #%d was already closed on-chain. Cleaning up local state.", position.trade_id)
                else:
                    logger.error("On-chain close failed for trade #%d: %s", position.trade_id, exc)
                    continue # Skip deleting the position from memory so it can retry later
            try:
                await self.repository.close_trade(position.trade_id, price, pnl)
            except Exception:
                pass
            del self.positions[key]
            outcome = "Take Profit Hit" if pnl >= 0 else "Stop Loss Hit"
            emoji = "🟢" if pnl >= 0 else "🔴"
            hours = position.age_seconds // 3600
            minutes = (position.age_seconds % 3600) // 60
            duration_str = f"{hours}h{minutes}m"
            try:
                message = (
                    f"🤖 Bot {position.bot_id} ({position.bot_name}) | {position.symbol}\n\n"
                    f"{emoji} {outcome} at ${price:,.2f}\n"
                    f"💰 PnL: {pnl:+.2f} USDC\n"
                    f"⏱️ Duration: {duration_str}\n"
                    f"📝 Reason: {position.entry_reason}"
                )
                await self.notifier.notify(position.user, message)
            except Exception:
                pass


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("OD Bot Trading Engine v1.0")
    while True:
        try:
            await BotEngine().start()
        except Exception as exc:
            logger.critical("Engine crashed, restarting in 10s: %s", exc)
            await asyncio.sleep(10)


if __name__ == "__main__":
    asyncio.run(main())
