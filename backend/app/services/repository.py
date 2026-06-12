import logging
import asyncpg

from app.config import get_settings
from app.models import Position

logger = logging.getLogger(__name__)


class TradeRepository:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        database_url = self.settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        self.pool = await asyncpg.create_pool(database_url)
        await self.init_db()

    async def init_db(self) -> None:
        if not self.pool:
            return
        import os
        schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "schema.sql")
        if os.path.exists(schema_path):
            try:
                with open(schema_path, "r") as f:
                    schema_sql = f.read()
                async with self.pool.acquire() as conn:
                    await conn.execute(schema_sql)
                logger.info("Database schema initialized successfully")
            except Exception as e:
                logger.error("Failed to initialize database schema: %s", e)

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    async def get_wallet_links(self) -> dict[str, int]:
        if not self.pool:
            return {}
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch("select wallet_address, telegram_chat_id from wallet_links")
                return {r["wallet_address"].lower(): r["telegram_chat_id"] for r in rows}
        except Exception as e:
            logger.error("Failed to fetch wallet links from DB: %s", e)
            return {}

    async def save_wallet_link(self, wallet: str, chat_id: int) -> None:
        if not self.pool:
            return
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    insert into wallet_links (wallet_address, telegram_chat_id)
                    values ($1, $2)
                    on conflict (wallet_address) do update set telegram_chat_id = excluded.telegram_chat_id
                    """,
                    wallet.lower(),
                    chat_id,
                )
        except Exception as e:
            logger.error("Failed to save wallet link to DB: %s", e)

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
