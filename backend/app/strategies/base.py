from abc import ABC, abstractmethod
from collections.abc import Sequence

from app.models import Candle, Signal


class Strategy(ABC):
    def __init__(self, bot_id: int, bot_name: str) -> None:
        self.bot_id = bot_id
        self.bot_name = bot_name

    @abstractmethod
    def evaluate(self, symbol: str, candles: Sequence[Candle]) -> Signal | None:
        raise NotImplementedError
