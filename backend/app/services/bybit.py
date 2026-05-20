import asyncio
import logging
from collections import defaultdict, deque
from collections.abc import AsyncIterator

import aiohttp

from app.config import get_settings
from app.models import Candle


logger = logging.getLogger(__name__)

SYMBOLS = ("BTC", "ETH", "SOL", "MNT")
# Map our symbols to CryptoCompare format and back to USDT pairs for the contract
SYMBOL_MAP = {s: f"{s}USDT" for s in SYMBOLS}

POLL_INTERVAL = 10  # seconds between API polls


class CryptoCompareStream:
    """REST-based market data feed using CryptoCompare histominute API.
    
    Polls every POLL_INTERVAL seconds for fresh 1-minute candle data.
    Compatible with the same interface as the original BybitMarketStream.
    """

    def __init__(self, max_candles: int = 240) -> None:
        self.settings = get_settings()
        self.candles: dict[str, deque[Candle]] = defaultdict(lambda: deque(maxlen=max_candles))
        self._base_url = "https://min-api.cryptocompare.com/data/v2/histominute"

    async def _fetch_candles(self, session: aiohttp.ClientSession, symbol: str) -> list[Candle]:
        """Fetch the latest 60 one-minute candles for a symbol."""
        contract_symbol = SYMBOL_MAP[symbol]
        api_symbol = "MANTLE" if symbol == "MNT" else symbol
        params = {"fsym": api_symbol, "tsym": "USD", "limit": 60}
        try:
            async with session.get(self._base_url, params=params) as resp:
                if resp.status != 200:
                    logger.warning("CryptoCompare returned %d for %s", resp.status, symbol)
                    return []
                data = await resp.json()
                raw = data.get("Data", {}).get("Data", [])
                return [
                    Candle(
                        symbol=contract_symbol,
                        open=float(c["open"]),
                        high=float(c["high"]),
                        low=float(c["low"]),
                        close=float(c["close"]),
                        volume=float(c.get("volumefrom", 0)),
                        timestamp=int(c["time"]),
                    )
                    for c in raw
                    if c.get("close", 0) > 0
                ]
        except Exception as exc:
            logger.warning("Failed to fetch candles for %s: %s", symbol, exc)
            return []

    async def stream(self) -> AsyncIterator[tuple[str, list[Candle]]]:
        """Continuously poll CryptoCompare and yield candle updates."""
        logger.info("Starting CryptoCompare REST data feed (poll every %ds)...", POLL_INTERVAL)
        tick_count = 0

        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    while True:
                        for symbol in SYMBOLS:
                            contract_symbol = SYMBOL_MAP[symbol]
                            fresh_candles = await self._fetch_candles(session, symbol)

                            if not fresh_candles:
                                continue

                            # Merge new candles into the buffer
                            existing_timestamps = {c.timestamp for c in self.candles[contract_symbol]}
                            new_count = 0
                            for candle in fresh_candles:
                                if candle.timestamp in existing_timestamps:
                                    # Update the latest candle (it may still be forming)
                                    if self.candles[contract_symbol] and self.candles[contract_symbol][-1].timestamp == candle.timestamp:
                                        self.candles[contract_symbol][-1] = candle
                                else:
                                    self.candles[contract_symbol].append(candle)
                                    new_count += 1

                            tick_count += 1
                            if tick_count % 20 == 1:
                                logger.info(
                                    "Poll #%d | %s $%.2f | buffer: %d candles | +%d new",
                                    tick_count, contract_symbol,
                                    fresh_candles[-1].close if fresh_candles else 0,
                                    len(self.candles[contract_symbol]),
                                    new_count,
                                )

                            yield contract_symbol, list(self.candles[contract_symbol])

                        await asyncio.sleep(POLL_INTERVAL)

            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                logger.warning("Data feed error (%s), retrying in 5s...", exc)
                await asyncio.sleep(5)
            except Exception as exc:
                logger.exception("Unexpected data feed error: %s", exc)
                await asyncio.sleep(10)
