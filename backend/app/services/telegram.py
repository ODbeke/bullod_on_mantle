"""Telegram notifier — send-only, no polling.

Instead of running a polling loop (which causes 409 Conflict when multiple
instances exist), we use the raw Bot HTTP API for sending and a minimal
long-poll loop *only* for receiving /link commands.  The long-poll loop is
wrapped so that a conflict error from Telegram simply stops the listener
without crashing the engine.
"""
import asyncio
import logging

import aiohttp

logger = logging.getLogger(__name__)

_BASE = "https://api.telegram.org/bot{token}/{method}"


import json
from pathlib import Path

class TelegramNotifier:
    def __init__(self, token: str, storage_file: str = "telegram_links.json") -> None:
        self.token = token
        self.storage_file = Path(storage_file)
        self.wallet_to_chat: dict[str, int] = self._load_links()
        self._session: aiohttp.ClientSession | None = None
        self._poll_task: asyncio.Task | None = None

    def _load_links(self) -> dict[str, int]:
        if self.storage_file.exists():
            try:
                with open(self.storage_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Failed to load telegram links: %s", e)
        return {}

    def _save_links(self) -> None:
        try:
            with open(self.storage_file, "w") as f:
                json.dump(self.wallet_to_chat, f)
        except Exception as e:
            logger.error("Failed to save telegram links: %s", e)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        if not self.token:
            return
        self._session = aiohttp.ClientSession()
        # Start the lightweight /link command listener in the background.
        self._poll_task = asyncio.create_task(self._listen_for_commands())
        logger.info("Telegram notifier ready (send-only HTTP mode)")

    async def stop(self) -> None:
        if self._poll_task:
            self._poll_task.cancel()
        if self._session:
            await self._session.close()

    # ------------------------------------------------------------------
    # Sending
    # ------------------------------------------------------------------

    async def notify(self, wallet: str, message: str) -> None:
        """Send a message to the chat linked to *wallet*."""
        if not self._session:
            return
        chat_id = self.wallet_to_chat.get(wallet.lower())
        if not chat_id:
            return
        await self._post("sendMessage", {"chat_id": chat_id, "text": message})

    async def notify_chat(self, chat_id: int, message: str) -> None:
        """Send a message to an explicit chat_id (used internally)."""
        if not self._session:
            return
        await self._post("sendMessage", {"chat_id": chat_id, "text": message})

    # ------------------------------------------------------------------
    # Command listener — long-poll for /link without a full Application
    # ------------------------------------------------------------------

    async def _listen_for_commands(self) -> None:
        offset = 0
        logger.info("Telegram /link command listener started")
        while True:
            try:
                data = await self._post(
                    "getUpdates",
                    {"timeout": 30, "offset": offset, "allowed_updates": ["message"]},
                    timeout=40,
                )
                logger.info("Telegram getUpdates returned: %s", "None" if data is None else f"{len(data.get('result', []))} updates")
                if not data or not data.get("ok"):
                    await asyncio.sleep(5)
                    continue

                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    await self._handle_update(update)

            except asyncio.CancelledError:
                logger.info("Telegram command listener stopped")
                return
            except Exception as exc:
                err = str(exc)
                if "409" in err or "Conflict" in err:
                    # Another instance is polling — back off quietly
                    logger.warning(
                        "Telegram 409 Conflict — another bot instance is polling. "
                        "Command listener paused for 60s."
                    )
                    await asyncio.sleep(60)
                else:
                    logger.warning("Telegram poll error: %s — retrying in 10s", exc)
                    await asyncio.sleep(10)

    async def _handle_update(self, update: dict) -> None:
        msg = update.get("message") or {}
        text: str = msg.get("text", "")
        chat_id: int | None = msg.get("chat", {}).get("id")
        if not chat_id or not text:
            return

        if text.startswith("/start"):
            welcome = (
                "BODBOT tracker 🤖\n\n"
                "Link your wallet to receive real-time alerts for all your BODBOT agents execution.\n\n"
                "To activate type: /link 0xYourWallet"
            )
            await self.notify_chat(chat_id, welcome)
            return

        if not text.startswith("/link"):
            return

        parts = text.strip().split()
        if len(parts) < 2:
            await self.notify_chat(chat_id, "Usage: /link 0xYourWalletAddress")
            return

        wallet = parts[1].lower()
        if not wallet.startswith("0x") or len(wallet) != 42:
            await self.notify_chat(chat_id, "That wallet address does not look valid.")
            return

        self.wallet_to_chat[wallet] = chat_id
        self._save_links()
        await self.notify_chat(chat_id, f"✅ Linked {wallet}. Trade alerts are now active!")
        logger.info("Wallet linked: %s → chat %d", wallet[:10], chat_id)

    # ------------------------------------------------------------------
    # Internal HTTP helper
    # ------------------------------------------------------------------

    async def _post(self, method: str, payload: dict, timeout: int = 10) -> dict | None:
        if not self._session:
            return None
        url = _BASE.format(token=self.token, method=method)
        try:
            async with self._session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                return await resp.json()
        except Exception as exc:
            raise exc
