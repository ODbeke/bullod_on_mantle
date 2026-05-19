from collections.abc import Sequence

from app.indicators import macd, pivot_points
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class ReversalStrategy(Strategy):
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        if len(closes) < 40:
            return None
        macd_line, signal_line = macd(closes)
        recent = candles[-1]
        support, pivot, resistance = pivot_points(recent.high, recent.low, recent.close)
        lower_lows = candles[-1].low < candles[-6].low and closes[-1] > closes[-6]
        higher_highs = candles[-1].high > candles[-6].high and closes[-1] < closes[-6]
        if lower_lows and macd_line > signal_line and recent.close > support:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.77, "Bullish divergence with MACD flip near pivot", recent.close, recent.timestamp)
        if higher_highs and macd_line < signal_line and recent.close < resistance and recent.close < pivot:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.77, "Bearish divergence with MACD flip near pivot", recent.close, recent.timestamp)
        return None
