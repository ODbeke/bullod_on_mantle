from collections.abc import Sequence

from app.indicators import macd, rsi, stochastic, roc
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class MomentumStrategy(Strategy):
    """Finn — Momentum / Intraday.
    
    Uses multiple momentum models (RSI + MACD Crossover, Stochastic Crossover,
    and ROC Acceleration) to identify high-probability entry points dynamically.
    """

    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        highs = [candle.high for candle in candles]
        lows = [candle.low for candle in candles]
        
        if len(closes) < 35:
            return None

        # Model 1: Classic RSI + MACD crossover
        latest_rsi = rsi(closes)
        macd_line, signal_line = macd(closes)
        
        # Model 2: Stochastic Oscillator crossover
        k, d = stochastic(highs, lows, closes, 14, 3)
        
        # Model 3: ROC (Rate of Change) acceleration
        rate_of_change = roc(closes, 12)

        # ─── LONG SIGNAL CONDITIONS ───
        
        # Trigger A: Bullish RSI/MACD setup
        if latest_rsi > 52 and macd_line > signal_line:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.84,
                "RSI + MACD bullish momentum crossover", closes[-1], candles[-1].timestamp
            )
            
        # Trigger B: Stochastic Oversold bounce
        if k < 28 and k > d:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.82,
                "Stochastic bullish oversold gold cross", closes[-1], candles[-1].timestamp
            )
            
        # Trigger C: Rate of change momentum acceleration
        if rate_of_change > 0.4 and latest_rsi > 50:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.80,
                "ROC positive momentum acceleration", closes[-1], candles[-1].timestamp
            )

        # ─── SHORT SIGNAL CONDITIONS ───
        
        # Trigger A: Bearish RSI/MACD setup
        if latest_rsi < 48 and macd_line < signal_line:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.78,
                "RSI fade + MACD bearish momentum cross", closes[-1], candles[-1].timestamp
            )
            
        # Trigger B: Stochastic Overbought correction
        if k > 72 and k < d:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.76,
                "Stochastic bearish overbought dead cross", closes[-1], candles[-1].timestamp
            )
            
        # Trigger C: Rate of change momentum deceleration
        if rate_of_change < -0.4 and latest_rsi < 50:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.75,
                "ROC negative momentum deceleration", closes[-1], candles[-1].timestamp
            )

        return None
