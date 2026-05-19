from collections.abc import Sequence

from app.indicators import macd, rsi
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class MomentumStrategy(Strategy):
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        volumes = [candle.volume for candle in candles]
        if len(closes) < 30:
            return None
        latest_rsi = rsi(closes)
        macd_line, signal_line = macd(closes)
        volume_ratio = volumes[-1] / max(sum(volumes[-10:]) / 10, 1)
        if latest_rsi > 60 and macd_line > signal_line and volume_ratio > 1.15:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.84, "RSI + MACD + volume surge", closes[-1], candles[-1].timestamp)
        if latest_rsi < 40 and macd_line < signal_line and volume_ratio > 1.15:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.78, "RSI fade + MACD turn", closes[-1], candles[-1].timestamp)
        return None
