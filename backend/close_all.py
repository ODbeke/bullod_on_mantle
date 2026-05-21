"""Close every open trade on-chain so the user can verify Telegram notifications."""
import asyncio, json
from web3 import AsyncWeb3, AsyncHTTPProvider, Account

RPC   = "https://rpc.sepolia.mantle.xyz"
VAULT = "0x35143Da0E758d1F1dc688c13Ef5471B1f26449c8"
KEY   = "[REDACTED_PRIVATE_KEY]"
ABI_PATH = "/Users/okoyes/Documents/OD bot/contracts/artifacts/contracts/contracts/TradingVault.sol/TradingVault.json"

# Live prices (approx — used for PnL calc)
PRICES = {
    "BTC/USDT": 76800,
    "ETH/USDT": 2120,
    "SOL/USDT": 84.5,
    "MNT/USDT": 0.625,
}

async def main():
    w3 = AsyncWeb3(AsyncHTTPProvider(RPC))
    acct = Account.from_key(KEY)
    with open(ABI_PATH) as f:
        abi = json.load(f)["abi"]
    contract = w3.eth.contract(address=AsyncWeb3.to_checksum_address(VAULT), abi=abi)

    # Discover all users
    users_raw = set()
    current = await w3.eth.block_number
    start = max(0, current - 200_000)
    chunk = 10_000
    s = start
    while s <= current:
        e = min(s + chunk, current)
        try:
            logs = await contract.events.BotAllocated().get_logs(from_block=s, to_block=e)
            for log in logs:
                users_raw.add(log["args"]["user"])
        except:
            pass
        s = e + 1

    print(f"Found {len(users_raw)} users")

    # Collect all open trade IDs
    open_trades = []
    for u in users_raw:
        tids = await contract.functions.getUserTrades(u).call()
        for tid in tids:
            t = await contract.functions.trades(tid).call()
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
            receipt = await w3.eth.wait_for_transaction_receipt(tx_hash)
            status = "OK" if receipt["status"] == 1 else "FAILED"
            print(f"  Closed #{tid} ({sym}) — tx {status}: {tx_hash.hex()[:16]}...")
            nonce += 1
        except Exception as exc:
            print(f"  ERROR closing #{tid}: {exc}")
            # If it fails, refresh the nonce
            nonce = await w3.eth.get_transaction_count(acct.address, "pending")
        await asyncio.sleep(0.5)  # avoid nonce races

    print("\nAll trades closed!")

asyncio.run(main())
