import asyncio
import json
from collections import defaultdict, deque
from collections.abc import AsyncIterator

import aiohttp

from app.config import get_settings
from app.models import Candle


SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT", "MNTUSDT")


class BybitMarketStream:
    def __init__(self, max_candles: int = 240) -> None:
        self.settings = get_settings()
        self.candles: dict[str, deque[Candle]] = defaultdict(lambda: deque(maxlen=max_candles))

    async def stream(self) -> AsyncIterator[tuple[str, list[Candle]]]:
        subscriptions = [f"kline.1.{symbol}" for symbol in SYMBOLS]
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(self.settings.bybit_ws_url, heartbeat=20) as ws:
                        await ws.send_json({"op": "subscribe", "args": subscriptions})
                        async for message in ws:
                            if message.type != aiohttp.WSMsgType.TEXT:
                                continue
                            payload = json.loads(message.data)
                            topic = payload.get("topic", "")
                            if not topic.startswith("kline.1."):
                                continue
                            symbol = topic.split(".")[-1]
                            for item in payload.get("data", []):
                                candle = Candle(
                                    symbol=symbol,
                                    open=float(item["open"]),
                                    high=float(item["high"]),
                                    low=float(item["low"]),
                                    close=float(item["close"]),
                                    volume=float(item["volume"]),
                                    timestamp=int(item["start"]) // 1000,
                                )
                                if self.candles[symbol] and self.candles[symbol][-1].timestamp == candle.timestamp:
                                    self.candles[symbol][-1] = candle
                                else:
                                    self.candles[symbol].append(candle)
                                yield symbol, list(self.candles[symbol])
            except (aiohttp.ClientError, asyncio.TimeoutError, json.JSONDecodeError):
                await asyncio.sleep(3)
