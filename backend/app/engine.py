import asyncio
import logging
from time import time

from app.config import get_settings
from app.models import Position, Signal, Side
from app.services.bybit import BybitMarketStream
from app.services.chain import ChainRecorder
from app.services.repository import TradeRepository
from app.services.telegram import TelegramNotifier
from app.strategies import STRATEGIES

logger = logging.getLogger(__name__)


class BotEngine:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.market = BybitMarketStream()
        self.chain = ChainRecorder()
        self.notifier = TelegramNotifier(self.settings.telegram_bot_token)
        self.repository = TradeRepository()
        self.positions: dict[tuple[int, str], Position] = {}

    async def start(self) -> None:
        await self.notifier.start()
        try:
            await self.repository.connect()
        except Exception as exc:
            logger.warning("Database unavailable, continuing without DB indexing: %s", exc)

        async for symbol, candles in self.market.stream():
            price = candles[-1].close
            await self._check_positions(symbol, price)
            for strategy in STRATEGIES:
                signal = strategy.evaluate(symbol, candles)
                if signal:
                    await self._handle_signal(signal)

    async def _handle_signal(self, signal: Signal) -> None:
        if not self.settings.bot_user_address:
            return
        key = (signal.bot_id, signal.symbol)
        if key in self.positions:
            return

        allocation = await self.chain.bot_allocation(self.settings.bot_user_address, signal.bot_id)
        collateral = max(25.0, allocation / 10**6 * signal.collateral_fraction)
        if allocation and collateral * 10**6 > allocation:
            return

        trade_id = await self.chain.open_trade(self.settings.bot_user_address, signal, collateral)
        if trade_id is None:
            trade_id = int(time() * 1000)

        tp_multiplier = 1.018 if signal.side == Side.LONG else 0.982
        sl_multiplier = 0.991 if signal.side == Side.LONG else 1.009
        position = Position(
            trade_id=trade_id,
            user=self.settings.bot_user_address,
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
            await self.chain.close_trade(position.trade_id, price, pnl)
            await self.repository.close_trade(position.trade_id, price, pnl)
            del self.positions[key]
            outcome = "Take Profit Hit" if pnl >= 0 else "Stop Loss Hit"
            await self.notifier.notify(
                position.user,
                f"Bot {position.bot_id} ({position.bot_name}) | {position.symbol}\n{outcome} at ${price:,.2f}\nPnL: {pnl:+.2f} USDC | Duration: {position.age_seconds // 60}m",
            )


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    await BotEngine().start()


if __name__ == "__main__":
    asyncio.run(main())
