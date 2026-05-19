from collections.abc import Sequence

from app.indicators import adx, ema
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class TrendFollowerStrategy(Strategy):
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        highs = [candle.high for candle in candles]
        lows = [candle.low for candle in candles]
        if len(closes) < 55:
            return None
        fast = ema(closes, 12)
        slow = ema(closes, 48)
        trend_strength = adx(highs, lows, closes)
        if fast > slow and trend_strength > 22:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.8, "EMA trend with ADX confirmation", closes[-1], candles[-1].timestamp)
        if fast < slow and trend_strength > 22:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.76, "Bearish EMA trend with ADX confirmation", closes[-1], candles[-1].timestamp)
        return None
