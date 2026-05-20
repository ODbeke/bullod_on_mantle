from collections.abc import Sequence

from app.indicators import pivot_points, rsi, cci, williams_r
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class RangeStrategy(Strategy):
    """Gemma — Range Strategy.
    
    Uses multiple mean reversion models (Pivot Points + RSI, CCI Reversions,
    and Williams %R Overbought/Oversold levels) to capture tops and bottoms in ranges.
    """

    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        highs = [candle.high for candle in candles]
        lows = [candle.low for candle in candles]
        
        if len(closes) < 30:
            return None
            
        recent = candles[-1]
        support, _, resistance = pivot_points(recent.high, recent.low, recent.close)
        latest_rsi = rsi(closes)
        
        # Model 2: CCI Extreme Reversion
        commodity_channel = cci(highs, lows, closes, 20)
        
        # Model 3: Williams %R Oversold/Overbought Rejection
        williams = williams_r(highs, lows, closes, 14)

        # ─── LONG SIGNAL CONDITIONS ───
        
        # Trigger A: Support pivot bounce with low RSI
        if recent.close <= support * 1.008 and latest_rsi < 38:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.74,
                "Support bounce with RSI mean reversion", recent.close, recent.timestamp
            )
            
        # Trigger B: CCI Extreme oversold rebound
        if commodity_channel < -140:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.73,
                "CCI extreme oversold range rebound", recent.close, recent.timestamp
            )
            
        # Trigger C: Williams %R oversold recovery
        if williams < -82 and latest_rsi < 36:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.72,
                "Williams %R oversold range rejection", recent.close, recent.timestamp
            )

        # ─── SHORT SIGNAL CONDITIONS ───
        
        # Trigger A: Resistance pivot rejection with high RSI
        if recent.close >= resistance * 0.992 and latest_rsi > 62:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.74,
                "Resistance rejection with RSI mean reversion", recent.close, recent.timestamp
            )
            
        # Trigger B: CCI Extreme overbought pullback
        if commodity_channel > 140:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.73,
                "CCI extreme overbought range pullback", recent.close, recent.timestamp
            )
            
        # Trigger C: Williams %R overbought rejection
        if williams > -18 and latest_rsi > 64:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.72,
                "Williams %R overbought range rejection", recent.close, recent.timestamp
            )

        return None
