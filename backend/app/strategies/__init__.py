from app.strategies.breakout import BreakoutStrategy
from app.strategies.momentum import MomentumStrategy
from app.strategies.range import RangeStrategy
from app.strategies.reversal import ReversalStrategy
from app.strategies.trend import TrendFollowerStrategy

STRATEGIES = [
    MomentumStrategy(1, "Finn"),
    TrendFollowerStrategy(2, "Tycoon"),
    BreakoutStrategy(3, "Puff"),
    RangeStrategy(4, "Gemma"),
    ReversalStrategy(5, "Josh"),
]
