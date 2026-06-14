"""Close every open trade on-chain so the user can verify Telegram notifications."""
import asyncio
import json
import sys
from pathlib import Path
from web3 import AsyncWeb3, AsyncHTTPProvider, Account

# Add backend directory to sys.path so we can import from app
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from app.config import get_settings

RPC   = "https://rpc.sepolia.mantle.xyz"
VAULT = "0x35143Da0E758d1F1dc688c13Ef5471B1f26449c8"
ABI_PATH = "/Users/okoyes/Documents/OD bot/contracts/artifacts/contracts/contracts/TradingVault.sol/TradingVault.json"


# Live prices (approx — used for PnL calc)
PRICES = {
    "BTC/USDT": 76800,
    "ETH/USDT": 2120,
    "SOL/USDT": 84.5,
    "MNT/USDT": 0.625,
}

async def call_rpc_with_retry(func_call_builder, *args, max_retries=5, initial_delay=2.0):
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            return await func_call_builder(*args).call()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Too Many Requests" in err_str:
                print(f"    RPC Rate Limit (429) hit. Retrying in {delay:.1f}s... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
                delay *= 2.0
            else:
                raise e
    raise RuntimeError("Max retries exceeded for RPC call")

async def get_logs_with_retry(event_builder, from_block, to_block, max_retries=5, initial_delay=2.0):
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            return await event_builder().get_logs(from_block=from_block, to_block=to_block)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "Too Many Requests" in err_str:
                print(f"    RPC Rate Limit (429) hit on logs. Retrying in {delay:.1f}s... (Attempt {attempt+1}/{max_retries})")
                await asyncio.sleep(delay)
                delay *= 2.0
            else:
                raise e
    raise RuntimeError("Max retries exceeded for RPC log scan")

async def main():
    settings = get_settings()
    if not settings.trade_recorder_private_key:
        print("ERROR: TRADE_RECORDER_PRIVATE_KEY not set in environment or .env file.")
        return
    w3 = AsyncWeb3(AsyncHTTPProvider(RPC))
    acct = Account.from_key(settings.trade_recorder_private_key)
    with open(ABI_PATH) as f:
        abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=AsyncWeb3.to_checksum_address(VAULT), abi=abi)

    # Discover all users
    users_raw = set()
    
    # Get current block with retry
    current = 0
    for attempt in range(5):
        try:
            current = await w3.eth.block_number
            break
        except Exception as e:
            print(f"Failed to get block number, retrying... {e}")
            await asyncio.sleep(2)
            
    if not current:
        print("Could not retrieve current block number. Exiting.")
        return

    start = max(0, current - 200_000)
    chunk = 10_000
    s = start
    while s <= current:
        e = min(s + chunk, current)
        try:
            logs = await get_logs_with_retry(contract.events.BotAllocated, s, e)
            for log in logs:
                users_raw.add(log["args"]["user"])
        except Exception as exc:
            print(f"  Warning scanning blocks {s}-{e}: {exc}")
        s = e + 1
        await asyncio.sleep(0.5)

    print(f"Found {len(users_raw)} users")

    # Collect all open trade IDs
    open_trades = []
    for u in users_raw:
        try:
            tids = await call_rpc_with_retry(contract.functions.getUserTrades, u)
            for tid in tids:
                t = await call_rpc_with_retry(contract.functions.trades, tid)
                if t[11] == 0:  # TradeStatus.Open
                    sym = t[3]
                    is_long = t[4]
                    entry_raw = t[6]  # 8 decimals
                    collateral_raw = t[5]  # 6 decimals
                    entry_price = entry_raw / 10**8
                    collateral = collateral_raw / 10**6
                    current_price = PRICES.get(sym, entry_price)
                    move = (current_price - entry_price) / entry_price if entry_price else 0
                    if not is_long:
                        move *= -1
                    pnl = collateral * move * 10  # 10x leverage
                    open_trades.append((tid, sym, is_long, current_price, pnl))
                    print(f"  Will close trade #{tid}: {sym} {'LONG' if is_long else 'SHORT'} pnl={pnl:+.2f}")
                await asyncio.sleep(0.2)
        except Exception as e:
            print(f"  Error fetching trades for user {u}: {e}")
        await asyncio.sleep(0.5)

    print(f"\nClosing {len(open_trades)} open trades...")

    nonce = await w3.eth.get_transaction_count(acct.address, "pending")
    for tid, sym, is_long, price, pnl in open_trades:
        exit_price_chain = int(price * 10**8)
        pnl_chain = int(pnl * 10**6)
        try:
            tx = await contract.functions.closeTrade(
                tid, exit_price_chain, pnl_chain
            ).build_transaction({
                "from": acct.address,
                "nonce": nonce,
                "chainId": 5003,
            })
            signed = acct.sign_transaction(tx)
            tx_hash = await w3.eth.send_raw_transaction(signed.raw_transaction)
            
            # Wait for receipt with retry
            receipt = None
            for attempt in range(5):
                try:
                    receipt = await w3.eth.wait_for_transaction_receipt(tx_hash, timeout=15)
                    break
                except Exception as receipt_err:
                    print(f"      Receipt wait attempt {attempt+1} failed: {receipt_err}")
                    await asyncio.sleep(2)
            
            if receipt:
                status = "OK" if receipt["status"] == 1 else "FAILED"
                print(f"  Closed #{tid} ({sym}) — tx {status}: {tx_hash.hex()[:16]}...")
            else:
                print(f"  Closed #{tid} ({sym}) — tx sent: {tx_hash.hex()[:16]}... (receipt timeout)")
            
            nonce += 1
        except Exception as exc:
            print(f"  ERROR closing #{tid}: {exc}")
            # If it fails, refresh the nonce
            nonce = await w3.eth.get_transaction_count(acct.address, "pending")
        await asyncio.sleep(1.0)  # avoid rate limits and nonce races

    print("\nAll trades closed!")

if __name__ == "__main__":
    asyncio.run(main())
