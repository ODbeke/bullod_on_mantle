from collections.abc import Sequence

from app.indicators import adx, ema, cci
from app.models import Candle, Signal, Side
from app.strategies.base import Strategy


class TrendFollowerStrategy(Strategy):
    """Tycoon — Trend follower / Intraday.
    
    Uses multiple trend tracking models (EMA Crossover + ADX, CCI Trend Breakouts,
    and Multi-EMA Alignment) to identify long-term trending opportunities.
    """

    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        closes = [candle.close for candle in candles]
        highs = [candle.high for candle in candles]
        lows = [candle.low for candle in candles]
        
        if len(closes) < 55:
            return None

        # Model 1: EMA Crossover + ADX Confirmation
        fast_ema = ema(closes, 12)
        slow_ema = ema(closes, 48)
        trend_strength = adx(highs, lows, closes)
        
        # Model 2: CCI (Commodity Channel Index) Trend Breakout
        commodity_channel = cci(highs, lows, closes, 20)
        
        # Model 3: Multi-EMA Alignment (Fast, Medium, Slow)
        ema20 = ema(closes, 20)
        ema50 = ema(closes, 50)

        # ─── LONG SIGNAL CONDITIONS ───
        
        # Trigger A: Bullish EMA cross with trend strength confirmation
        if fast_ema > slow_ema and trend_strength > 16:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.8,
                "EMA cross with ADX trend confirmation", closes[-1], candles[-1].timestamp
            )
            
        # Trigger B: CCI Trend breakout above neutral channel
        if commodity_channel > 105:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.82,
                "CCI strong trend channel breakout", closes[-1], candles[-1].timestamp
            )
            
        # Trigger C: Triple EMA alignment (Price > EMA20 > EMA50)
        if closes[-1] > ema20 and ema20 > ema50:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.LONG, 0.78,
                "Triple EMA alignment bullish structure", closes[-1], candles[-1].timestamp
            )

        # ─── SHORT SIGNAL CONDITIONS ───
        
        # Trigger A: Bearish EMA cross with trend strength confirmation
        if fast_ema < slow_ema and trend_strength > 16:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.76,
                "Bearish EMA cross with ADX confirmation", closes[-1], candles[-1].timestamp
            )
            
        # Trigger B: CCI Trend breakdown below neutral channel
        if commodity_channel < -105:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.75,
                "CCI bearish trend channel breakdown", closes[-1], candles[-1].timestamp
            )
            
        # Trigger C: Triple EMA alignment bearish (Price < EMA20 < EMA50)
        if closes[-1] < ema20 and ema20 < ema50:
            return Signal(
                self.bot_id, self.bot_name, symbol, Side.SHORT, 0.74,
                "Triple EMA alignment bearish structure", closes[-1], candles[-1].timestamp
            )

        return None
