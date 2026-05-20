from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for .env in both backend/ and project root
_project_root = Path(__file__).resolve().parents[2]
_env_file = _project_root / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_env_file), env_file_encoding="utf-8", extra="ignore")

    mantle_sepolia_rpc_url: str = "https://rpc.sepolia.mantle.xyz"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/odbot"
    trading_vault_address: str = ""
    mock_usdc_address: str = ""
    trade_recorder_private_key: str = Field(default="", repr=False)
    telegram_bot_token: str = Field(default="", repr=False)
    bybit_ws_url: str = "wss://stream.bybit.com/v5/public/spot"


@lru_cache
def get_settings() -> Settings:
    return Settings()
