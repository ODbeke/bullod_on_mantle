import asyncio
import logging
import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator

import aiohttp

from app.config import get_settings
from app.models import Candle

logger = logging.getLogger(__name__)

SYMBOLS = ("BTC", "ETH", "SOL", "MNT")
SYMBOL_MAP = {s: f"{s}USDT" for s in SYMBOLS}
CG_IDS = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "MNT": "mantle"}

POLL_INTERVAL = 15  # seconds

class CryptoCompareStream:
    """CoinGecko-based market data feed.
    Renamed internally to avoid breaking imports in engine.py.
    Fetches history once, then polls live price.
    """

    def __init__(self, max_candles: int = 240) -> None:
        self.settings = get_settings()
        self.candles: dict[str, deque[Candle]] = defaultdict(lambda: deque(maxlen=max_candles))
        self._current_minute_data: dict[str, list[float]] = defaultdict(list)
        self._current_minute: int = 0

    async def _fetch_history(self, session: aiohttp.ClientSession, symbol: str) -> None:
        cg_id = CG_IDS[symbol]
        contract_symbol = SYMBOL_MAP[symbol]
        url = f"https://api.coingecko.com/api/v3/coins/{cg_id}/market_chart?vs_currency=usd&days=1"
        try:
            async with session.get(url) as resp:
                data = await resp.json()
                prices = data.get("prices", [])
                # Take last 60 points
                for p in prices[-60:]:
                    ts = int(p[0] / 1000)
                    price = float(p[1])
                    self.candles[contract_symbol].append(
                        Candle(
                            symbol=contract_symbol,
                            open=price,
                            high=price * 1.0005,
                            low=price * 0.9995,
                            close=price,
                            volume=100.0,
                            timestamp=ts,
                        )
                    )
        except Exception as exc:
            logger.warning("Failed to fetch CoinGecko history for %s: %s", symbol, exc)

    async def stream(self) -> AsyncIterator[tuple[str, list[Candle]]]:
        logger.info("Starting CoinGecko live data feed...")
        
        async with aiohttp.ClientSession() as session:
            # Seed history
            for symbol in SYMBOLS:
                await self._fetch_history(session, symbol)
                await asyncio.sleep(1) # rate limit protection

            tick_count = 0
            while True:
                try:
                    url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,mantle&vs_currencies=usd"
                    async with session.get(url) as resp:
                        if resp.status != 200:
                            await asyncio.sleep(POLL_INTERVAL)
                            continue
                        data = await resp.json()

                    now_sec = int(time.time())
                    current_min = now_sec // 60

                    if current_min > self._current_minute:
                        # Minute rolled over, finalize previous candle if exists
                        for symbol in SYMBOLS:
                            contract_symbol = SYMBOL_MAP[symbol]
                            prices = self._current_minute_data[symbol]
                            if prices:
                                self.candles[contract_symbol].append(Candle(
                                    symbol=contract_symbol,
                                    open=prices[0],
                                    high=max(prices),
                                    low=min(prices),
                                    close=prices[-1],
                                    volume=100.0,
                                    timestamp=self._current_minute * 60
                                ))
                                self._current_minute_data[symbol].clear()
                        self._current_minute = current_min

                    # Add live tick
                    for symbol in SYMBOLS:
                        cg_id = CG_IDS[symbol]
                        if cg_id in data and "usd" in data[cg_id]:
                            price = float(data[cg_id]["usd"])
                            self._current_minute_data[symbol].append(price)

                            # Yield the updated buffer (including the forming candle)
                            contract_symbol = SYMBOL_MAP[symbol]
                            forming = list(self.candles[contract_symbol])
                            if self._current_minute_data[symbol]:
                                forming.append(Candle(
                                    symbol=contract_symbol,
                                    open=self._current_minute_data[symbol][0],
                                    high=max(self._current_minute_data[symbol]),
                                    low=min(self._current_minute_data[symbol]),
                                    close=price,
                                    volume=100.0,
                                    timestamp=current_min * 60
                                ))
                            yield contract_symbol, forming

                    tick_count += 1
                    if tick_count % 10 == 1:
                        logger.info("Live Poll #%d | BTCUSDT $%.2f", tick_count, data["bitcoin"]["usd"])

                    await asyncio.sleep(POLL_INTERVAL)

                except Exception as exc:
                    logger.warning("CoinGecko poll error: %s", exc)
                    await asyncio.sleep(POLL_INTERVAL)
