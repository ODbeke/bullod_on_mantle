from collections.abc import Sequence

from app.indicators import macd, rsi
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class MomentumStrategy(Strategy):
    """Finn — Momentum / Intraday.
    
    Uses RSI + MACD crossover. Volume check is optional since some
    data feeds (CryptoCompare free tier) don't provide granular volume.
    """

    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        volumes = [candle.volume for candle in candles]
        if len(closes) < 30:
            return None

        latest_rsi = rsi(closes)
        macd_line, signal_line = macd(closes)

        # Volume check is optional — skip if feed doesn't provide volume
        avg_volume = sum(volumes[-10:]) / 10 if volumes else 0
        volume_ok = avg_volume == 0 or (volumes[-1] / max(avg_volume, 1)) > 1.1

        if latest_rsi > 55 and macd_line > signal_line and volume_ok:
            return Signal(self.bot_id, self.bot_name, symbol, Side.LONG, 0.84, "RSI + MACD bullish crossover", closes[-1], candles[-1].timestamp)
        if latest_rsi < 45 and macd_line < signal_line and volume_ok:
            return Signal(self.bot_id, self.bot_name, symbol, Side.SHORT, 0.78, "RSI fade + MACD bearish", closes[-1], candles[-1].timestamp)
        return None
