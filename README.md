# OD Bot

AI trading bot dashboard with Mantle Sepolia vault contracts, mock USDC collateral, Bybit-driven Python strategies, PostgreSQL indexing, and Telegram notifications.

## Deployed Contracts

- MockUSDC: `0x84bF6BA683178B3Fa97882bB00bC65d219aB38b7`
- TradingVault: `0x35143Da0E758d1F1dc688c13Ef5471B1f26449c8`
- Network: Mantle Sepolia, chain ID `5003`

## Run Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Contracts

```bash
npm run contracts:compile
npm run contracts:test
DEPLOYER_PRIVATE_KEY=0x... npm run contracts:deploy
```

Do not commit private keys. The mock USDC contract has a public `faucet()` that mints `10,000 mUSDC` per call.

## Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=backend python -m app.engine
```

Required env for live recording:

- `TRADING_VAULT_ADDRESS`
- `MOCK_USDC_ADDRESS`
- `TRADE_RECORDER_PRIVATE_KEY`
- `BOT_USER_ADDRESS`
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`

Create the database tables with `backend/app/db/schema.sql`.
