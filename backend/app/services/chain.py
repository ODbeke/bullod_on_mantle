import logging
from pathlib import Path

from eth_account import Account
from web3 import AsyncWeb3
from web3.providers.rpc import AsyncHTTPProvider

from app.config import get_settings
from app.models import Signal, Position, Side

logger = logging.getLogger(__name__)

VAULT_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}, {"internalType": "uint8", "name": "botId", "type": "uint8"}, {"internalType": "string", "name": "symbol", "type": "string"}, {"internalType": "bool", "name": "isLong", "type": "bool"}, {"internalType": "uint256", "name": "collateral", "type": "uint256"}, {"internalType": "uint256", "name": "entryPrice", "type": "uint256"}],
        "name": "openTrade",
        "outputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tradeId", "type": "uint256"}, {"internalType": "uint256", "name": "exitPrice", "type": "uint256"}, {"internalType": "int256", "name": "pnl", "type": "int256"}],
        "name": "closeTrade",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}, {"internalType": "uint8", "name": "", "type": "uint8"}],
        "name": "botAllocation",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    # BotAllocated event — used to auto-discover users
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": True, "internalType": "uint8", "name": "botId", "type": "uint8"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "BotAllocated",
        "type": "event",
    },
    # TradeOpened event — used to get trade ID from receipt
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": True, "internalType": "uint8", "name": "botId", "type": "uint8"},
            {"indexed": False, "internalType": "string", "name": "symbol", "type": "string"},
            {"indexed": False, "internalType": "bool", "name": "isLong", "type": "bool"},
            {"indexed": False, "internalType": "uint256", "name": "collateral", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "entryPrice", "type": "uint256"},
        ],
        "name": "TradeOpened",
        "type": "event",
    },
    # TradeClosed event — used to confirm close
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tradeId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "user", "type": "address"},
            {"indexed": True, "internalType": "uint8", "name": "botId", "type": "uint8"},
            {"indexed": False, "internalType": "uint256", "name": "exitPrice", "type": "uint256"},
            {"indexed": False, "internalType": "int256", "name": "pnl", "type": "int256"},
            {"indexed": False, "internalType": "uint64", "name": "closedAt", "type": "uint64"},
        ],
        "name": "TradeClosed",
        "type": "event",
    },
]

BOT_IDS = (1, 2, 3, 4, 5)


class ChainRecorder:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.web3 = AsyncWeb3(AsyncHTTPProvider(self.settings.mantle_sepolia_rpc_url))
        import json
        self.contract = None
        self.account = Account.from_key(self.settings.trade_recorder_private_key) if self.settings.trade_recorder_private_key else None
        if self.settings.trading_vault_address:
            try:
                with open(abi_path()) as f:
                    abi = json.load(f)["abi"]
                self.contract = self.web3.eth.contract(
                    address=AsyncWeb3.to_checksum_address(self.settings.trading_vault_address),
                    abi=abi
                )
            except Exception as e:
                logger.error("Failed to load full vault ABI: %s", e)
                # Fallback to hardcoded if json missing
                self.contract = self.web3.eth.contract(
                    address=AsyncWeb3.to_checksum_address(self.settings.trading_vault_address),
                    abi=VAULT_ABI
                )
        self._known_users: set[str] = set()
        self._last_scanned_block: int = 0
        import asyncio
        self._tx_lock = asyncio.Lock()

    @staticmethod
    def price_to_chain(price: float) -> int:
        return int(price * 10**8)

    @staticmethod
    def usdc_to_chain(amount: float) -> int:
        return int(amount * 10**6)

    # ── User discovery ────────────────────────────────────

    async def discover_users(self) -> set[str]:
        """Scan BotAllocated events to find all wallets that have ever allocated to a bot."""
        if not self.contract:
            return self._known_users

        try:
            current_block = await self.web3.eth.block_number

            if self._last_scanned_block:
                from_block = self._last_scanned_block + 1
            else:
                # On first scan, only look at recent blocks (last ~200K ≈ a few days)
                from_block = max(0, current_block - 200_000)

            if from_block > current_block:
                return self._known_users

            # Scan in chunks to avoid RPC limits
            chunk_size = 10_000
            scan_from = from_block
            while scan_from <= current_block:
                scan_to = min(scan_from + chunk_size, current_block)
                try:
                    logs = await self.contract.events.BotAllocated().get_logs(
                        from_block=scan_from,
                        to_block=scan_to,
                    )
                    for log in logs:
                        user_address = log["args"]["user"]
                        self._known_users.add(user_address.lower())
                except Exception as chunk_err:
                    logger.debug("Chunk %d-%d scan error: %s", scan_from, scan_to, chunk_err)
                scan_from = scan_to + 1

            self._last_scanned_block = current_block
            logger.info("Discovered %d users with allocations (scanned blocks %d → %d)", len(self._known_users), from_block, current_block)
        except Exception as exc:
            logger.warning("Event scan failed, using cached user list: %s", exc)

        return self._known_users

    async def get_active_users_for_bot(self, bot_id: int) -> list[str]:
        """Return all users who currently have a non-zero allocation for a specific bot."""
        users = await self.discover_users()
        active = []
        for user in users:
            allocation = await self.bot_allocation(user, bot_id)
            if allocation > 0:
                active.append(user)
        return active

    async def sync_open_positions(self) -> dict[int, Position]:
        """Fetch all currently open positions from the smart contract."""
        positions = {}
        if not self.contract:
            return positions

        users = await self.discover_users()
        logger.info("Syncing open positions for %d users...", len(users))
        import asyncio
        for user in users:
            try:
                tids = await self.contract.functions.getUserTrades(AsyncWeb3.to_checksum_address(user)).call()
                # Fetch trades concurrently in chunks to avoid rate limits
                chunk_size = 5
                for i in range(0, len(tids), chunk_size):
                    chunk = tids[i:i + chunk_size]
                    tasks = [self.contract.functions.trades(tid).call() for tid in chunk]
                    try:
                        results = await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True), timeout=10)
                    except asyncio.TimeoutError:
                        logger.warning("Timeout syncing trades for chunk %s", chunk)
                        continue
                    
                    for tid, t in zip(chunk, results):
                        if isinstance(t, Exception):
                            continue
                        if t[11] == 0:  # TradeStatus.Open
                            symbol = t[3].replace("/", "")
                            is_long = t[4]
                            entry_price = t[6] / 10**8
                            collateral = t[5] / 10**6
                            side = Side.LONG if is_long else Side.SHORT
                            
                            tp_multiplier = 1.035 if side == Side.LONG else 0.965
                            sl_multiplier = 0.985 if side == Side.LONG else 1.015

                            pos = Position(
                                trade_id=tid,
                                user=user.lower(),
                                bot_id=t[2],
                                bot_name=f"Bot {t[2]}",
                                symbol=symbol,
                                side=side,
                                collateral=collateral,
                                entry_price=entry_price,
                                opened_at=t[9],
                                take_profit=entry_price * tp_multiplier,
                                stop_loss=entry_price * sl_multiplier,
                            )
                            positions[tid] = pos
            except Exception as e:
                logger.warning("Failed to sync positions for %s: %s", user, e)
                
        logger.info("Synced %d open positions from chain.", len(positions))
        return positions

    # ── Read operations ───────────────────────────────────

    async def bot_allocation(self, user: str, bot_id: int) -> int:
        if not self.contract:
            return 0
        return await self.contract.functions.botAllocation(AsyncWeb3.to_checksum_address(user), bot_id).call()

    # ── Write operations ──────────────────────────────────

    async def open_trade(self, user: str, signal: Signal, collateral_usdc: float) -> int | None:
        if not self.contract or not self.account:
            return None
        async with self._tx_lock:
            nonce = await self.web3.eth.get_transaction_count(self.account.address)
            tx = await self.contract.functions.openTrade(
                AsyncWeb3.to_checksum_address(user),
                signal.bot_id,
                signal.symbol.replace("USDT", "/USDT"),
                signal.side == "long",
                self.usdc_to_chain(collateral_usdc),
                self.price_to_chain(signal.price),
            ).build_transaction({"from": self.account.address, "nonce": nonce, "chainId": 5003})
            signed = self.account.sign_transaction(tx)
            tx_hash = await self.web3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = await self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logs = self.contract.events.TradeOpened().process_receipt(receipt)
            return int(logs[0]["args"]["tradeId"]) if logs else None

    async def close_trade(self, trade_id: int, exit_price: float, pnl_usdc: float) -> str | None:
        if not self.contract or not self.account:
            return None
        async with self._tx_lock:
            nonce = await self.web3.eth.get_transaction_count(self.account.address)
            tx = await self.contract.functions.closeTrade(
                trade_id,
                self.price_to_chain(exit_price),
                self.usdc_to_chain(pnl_usdc),
            ).build_transaction({"from": self.account.address, "nonce": nonce, "chainId": 5003})
            signed = self.account.sign_transaction(tx)
            tx_hash = await self.web3.eth.send_raw_transaction(signed.raw_transaction)
            return tx_hash.hex()


def abi_path() -> Path:
    return Path(__file__).resolve().parent.parent / "TradingVault.json"
