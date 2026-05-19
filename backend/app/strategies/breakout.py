from collections.abc import Sequence

from app.indicators import atr, bollinger
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class BreakoutStrategy(Strategy):
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        highs = [candle.high for candle in candles]
        lows = [candle.low for candle in candles]
        if len(closes) < 30:
            return None
        lower, _, upper = bollinger(closes)
        volatility = atr(highs, lows, closes)
        if closes[-1] > upper + volatility * 0.1:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.82, "Bollinger expansion with ATR breakout", closes[-1], candles[-1].timestamp)
        if closes[-1] < lower - volatility * 0.1:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.8, "Lower band breakdown with ATR expansion", closes[-1], candles[-1].timestamp)
        return None
