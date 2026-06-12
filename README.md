# BODBOT  🤖

<img width="2606" height="1336" alt="header" src="https://github.com/user-attachments/assets/725cabc6-4d94-4b1d-8dff-a75f39b9607f" />

<br/>

**BODBOT is a comprehensive decentralized application (dApp) that bridges the gap between AI-driven algorithmic trading and decentralized finance (DeFi) on the Mantle Network. BODBOT allows users to allocate capital (mUSDC) to autonomous trading bots (strategies) entirely onchain.**

<br/>

## The Vision

### The Problem
Retail traders are consistently outperformed in the cryptocurrency markets by institutional algorithmic trading firms. Why? Because retail traders rely on emotion, sleep, and manual execution, whereas institutions rely on autonomous, logic-driven systems executing thousands of trades per second. Current DeFi platforms still force users to manually stare at charts, execute trades, and manage their own risk.

### The Solution
BODBOT levels the playing field by decentralizing algorithmic trading. Instead of trading manually, users become **capital allocators**. You deposit funds into an onchain vault and allocate your capital across a fleet of specialized, autonomous AI trading agents (e.g., Momentum scouts, Reversal hunters). The agents execute high-frequency strategies 24/7 on the Mantle Network, while you track your yields from the command center and get notified on the Telegram bot.

<br/>

## Overview

The platform simulates a professional algorithmic trading desk. Users can connect their Web3 wallets, mint testnet collateral, and deploy capital across our AI trading fleet.

The application is composed of three main architectural pillars:
1. **Frontend:** A React/Vite application customized with a pixel-art design system and live Recharts data visualizations.
2. **Smart Contracts:** Solidity-based `TradingVault` contracts deployed on the **Mantle Sepolia Testnet**, handling user deposits, bot allocations, and mock USDC (mUSDC) minting safely.
3. **Backend / Notifications:** A Python backend service powering a Telegram bot (`@OD_track_bot`) that links to user wallet addresses and pushes real-time trading alerts.

<br/>

## Key Features & Use Cases

### 1. Onchain Trading Vaults
- **Faucet Integration:** Users can mint 10,000 mUSDC directly from the dashboard, guarded by a smart cooldown system to prevent abuse.
- **Capital Allocation:** Direct integration with Wagmi/Viem to securely deposit funds into the `TradingVault` and allocate specific amounts to individual trading bots.
- **Live PnL Tracking:** The dashboard aggregates open and closed positions directly from the blockchain to calculate and display real-time PnL.

### 2. Dynamic Charting
- Real-time, responsive sparkline charts tracking live crypto data (BTC, ETH, SOL, MNT).

### 3. Telegram Alert System
- Link your Web3 wallet to our Telegram service (`/link <address>`) to receive instant push notifications whenever a bot executes a trade or your PnL updates.

<br/>

## The AI Trading Fleet (Our Agents)
BODBOT doesn't just place random market orders; it deploys specialized algorithmic agents, each engineered with distinct risk profiles, time horizons, and execution parameters. Retail traders panic, but our code doesn't.

*   **Finn – The Intraday Momentum Scout**
    *   **Strategy:** Volume Breakouts & High-Frequency Momentum.
    *   **Execution:** Finn refuses to chase green candles. This agent patiently stalks structural volume anomalies and tight consolidation patterns. It trades exclusively during high volatility market overlaps (e.g., London/New York opens), holding positions for minutes to hours to capture explosive micro-trends before locking in yields.
*   **Puff – The Mean Reversion Sniper**
    *   **Strategy:** Deep Value & Statistical Arbitrage.
    *   **Execution:** This agent will sit entirely idle in cash for days, aggressively scanning for flash crashes, liquidation cascades, or extreme RSI divergences. When the market overreacts and retail panic sells, Puff executes clinical limit orders to catch the mathematical snap-back. 
*   **Cipher – The Macro Trend Rider**
    *   **Strategy:** Moving Average Convergence & Trailing Stops.
    *   **Execution:** Built for the patient capital allocator. Cipher ignores 15-minute chart movement and focuses purely on macro momentum shifts. Once an algorithmic trendline is confirmed, it deploys capital with aggressive algorithmic trailing stops—riding the wave to the absolute top while strictly protecting downside risk.

### Smart Capital Preservation
To protect user allocations, our agents don't just execute offensive strategies; they play defense. The bots operate with **Zero-Emotion Execution** and simulate hard-coded drawdown limits. If market volatility index (VIX) metrics exceed safety parameters, the agents are programmed to sit on their hands, refusing to execute sub-optimal entries until market structure normalizes.

<br/>

## Technology Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, Framer Motion, Recharts.
- **Web3:** Wagmi, Viem, injected MetaMask/Browser wallets.
- **Smart Contracts:** Solidity, Hardhat/Foundry, deployed on Mantle Sepolia.
- **Backend:** Python (FastAPI/Aiogram) deployed on Railway for persistent 24/7 execution.

<br/>

## Development Journey & Challenges

Building a decentralized trading dashboard presented severe technical challenges, pushing us far beyond standard Web3 integrations:

### 1. The RPC Rate-Limit Bottleneck (State Synchronization)
- **Challenge:** To display a user's comprehensive trading history, the frontend initially fired a `Promise.all` batch containing over 150 parallel `readContract` calls to the Mantle RPC on login. This aggressive fetching immediately triggered public RPC rate limits (HTTP 429), resulting in silent failures where the smart contract fetcher swallowed the errors.
- **Solution:** This caused a critical UI glitch where user stats would temporarily wipe to zero. We resolved this by re-architecting the data fetcher. We reduced the payload to the 50 most recent trades for instant UI hydration, implemented exponential backoff logic inside the `readContractWithRetry` wrapper, and explicitly threw critical errors to prevent the frontend from caching empty states during transient network failures.

### 2. Viem Error Handling & UX
- **Challenge:** When users interact with smart contracts, wallets like MetaMask often return massive, unreadable stack traces (e.g., `USER REJECTED THE REQUEST. REQUEST ARGUMENTS: FROM: 0x... DATA: 0x...`). Displaying these raw errors ruins the premium feel of the platform.
- **Solution:** We engineered a custom parsing layer (`formatError`) in the frontend that intercepts Viem execution errors. It parses the stack trace to detect signature denials or contract reverts, translating them into clean, human-readable notifications (e.g., *"Transaction rejected by user"*), maintaining the immersive retro experience.

### 3. Data Visualization Micro-Fluctuations
- **Challenge:** Creating the "Live Market Matrix" resulted in "flatline" charts. Recharts defaults to scaling line charts from `$0` to the absolute maximum price, meaning a `$50` micro-fluctuation on a `$63,000` Bitcoin chart is visually non-existent.
- **Solution:** We engineered a hidden dynamic `YAxis` bound specifically to the `['dataMin', 'dataMax']` of the rolling data window. This tightly cropped the chart bounds to the exact live data limits in real-time, instantly bringing the simulated market movements to life on the dashboard.

<br/>

## Deployed Contracts

If you need to interact with the contracts directly or add them to your environment, here are the deployed addresses on **Mantle Sepolia**:

- **Mock USDC (mUSDC):** `0x84bF6BA683178B3Fa97882bB00bC65d219aB38b7`
- **Trading Vault:** `0x35143Da0E758d1F1dc688c13Ef5471B1f26449c8`

<br/>

## Getting Started

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```
2. **Environment Variables:**
   Create a `.env` file in the frontend directory and insert the required contract addresses (see Deployed Contracts above):
   ```env
   VITE_MOCK_USDC_ADDRESS=<musdc_address>
   VITE_TRADING_VAULT_ADDRESS=<vault_address>
   ```
3. **Run Locally:**
   ```bash
   npm run dev
   ```
4. **Connect Wallet:**
   Switch your MetaMask network to Mantle Sepolia, mint mUSDC, and start allocating to the bots!
