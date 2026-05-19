import asyncpg

from app.config import get_settings
from app.models import Position


class TradeRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        database_url = self.settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        self.pool = await asyncpg.create_pool(database_url)

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    async def save_open_trade(self, position: Position) -> None:
        if not self.pool:
            return
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                insert into trades (trade_id, wallet_address, bot_id, bot_name, symbol, side, status, entry_price, collateral)
                values ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
                on conflict (trade_id) do nothing
                """,
                position.trade_id,
                position.user.lower(),
                position.bot_id,
                position.bot_name,
                position.symbol,
                position.side.value,
                position.entry_price,
                position.collateral,
            )

    async def close_trade(self, trade_id: int, exit_price: float, pnl: float) -> None:
        if not self.pool:
            return
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                update trades
                set status = 'closed', exit_price = $2, pnl = $3, closed_at = now()
                where trade_id = $1
                """,
                trade_id,
                exit_price,
                pnl,
            )
