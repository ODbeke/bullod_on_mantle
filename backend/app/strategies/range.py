from collections.abc import Sequence

from app.indicators import pivot_points, rsi
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class RangeStrategy(Strategy):
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        if len(closes) < 30:
            return None
        recent = candles[-1]
        support, _, resistance = pivot_points(recent.high, recent.low, recent.close)
        latest_rsi = rsi(closes)
        if recent.close <= support * 1.005 and latest_rsi < 38:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.74, "Support bounce with RSI mean reversion", recent.close, recent.timestamp)
        if recent.close >= resistance * 0.995 and latest_rsi > 62:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.74, "Resistance rejection with RSI mean reversion", recent.close, recent.timestamp)
        return None
