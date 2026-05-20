from dataclasses import dataclass
from enum import StrEnum
from time import time


class Side(StrEnum):
    LONG = "long"
    SHORT = "short"


@dataclass(frozen=True)
class Candle:
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    timestamp: int


@dataclass(frozen=True)
class Signal:
    bot_id: int
    bot_name: str
    symbol: str
    side: Side
    confidence: float
    reason: str
    price: float
    timestamp: int
    collateral_fraction: float = 0.1


@dataclass
class Position:
    trade_id: int
    user: str
    bot_id: int
    bot_name: str
    symbol: str
    side: Side
    collateral: float
    entry_price: float
    opened_at: int
    take_profit: float
    stop_loss: float
    leverage: float = 10.0

    def pnl(self, price: float) -> float:
        move = (price - self.entry_price) / self.entry_price
        if self.side == Side.SHORT:
            move *= -1
        return self.collateral * move * self.leverage

    def should_close(self, price: float) -> bool:
        if self.side == Side.LONG:
            return price >= self.take_profit or price <= self.stop_loss
        return price <= self.take_profit or price >= self.stop_loss

    @property
    def age_seconds(self) -> int:
        return int(time()) - self.opened_at
