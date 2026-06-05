# BODBOT  🤖

<img width="2606" height="1336" alt="header" src="https://github.com/user-attachments/assets/725cabc6-4d94-4b1d-8dff-a75f39b9607f" />

BODBOT is a comprehensive decentralized application (dApp) that bridges the gap between AI-driven algorithmic trading and decentralized finance (DeFi) on the Mantle Network. BODBOT allows users to allocate capital (mUSDC) to autonomous trading bots (strategies) entirely onchain.

## Overview

The platform simulates a professional algorithmic trading desk wrapped in a gamified, retro UI. Users can connect their Web3 wallets, mint testnet collateral, and deploy capital across a fleet of specialized AI trading agents (e.g., "Finn" for Intraday Momentum, or other agents for Reversal/Breakout strategies).

The application is composed of three main architectural pillars:
1. **Frontend:** A React/Vite application heavily customized with a pixel-art design system, dynamic HTML5 canvas particle effects, and live Recharts data visualizations.
2. **Smart Contracts:** Solidity-based `TradingVault` contracts deployed on the **Mantle Sepolia Testnet**, handling user deposits, bot allocations, and mock USDC (mUSDC) minting.
3. **Backend / Notifications:** A Python backend service powering a Telegram bot (`@OD_track_bot`) that links to user wallet addresses and pushes real-time trading alerts.

## 🚀 Key Features & Use Cases

### 1. Retro Cyberpunk Interface
- **Immersive Design:** Replaced standard modern "glassmorphism" with a cohesive 16-bit pixel aesthetic. Features include custom `image-rendering: pixelated` assets, CRT scanlines, and a relaxing, scattered background particle matrix.
- **Dynamic Charting:** Real-time, responsive sparkline charts and matrix grids that track live crypto data (BTC, ETH, SOL, MNT), dynamically scaling to reveal micro-fluctuations in asset prices.

### 2. On-Chain Trading Vaults
- **Faucet Integration:** Users can mint 10,000 mUSDC directly from the dashboard, guarded by a 24-hour smart cooldown system.
- **Capital Allocation:** Direct integration with Wagmi/Viem to deposit funds into the `TradingVault` and allocate specific amounts to individual trading bots.
- **Live PnL Tracking:** The dashboard calculates and displays open PnL based on simulated algorithmic trades indexed against the user's allocated collateral.

### 3. Telegram Alert System
- Users can bind their Web3 wallet address to the BODBOT Telegram service using a simple `/link <address>` command, enabling instant push notifications for trade executions, PnL updates, and liquidations.

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS (for utility layout), Framer Motion, Recharts.
- **Web3:** Wagmi, Viem, injected MetaMask/Browser wallets.
- **Smart Contracts:** Solidity, Hardhat/Foundry, deployed on Mantle Sepolia.
- **Backend:** Python (FastAPI/Aiogram for Telegram services).

## 🧠 Development Journey & Challenges

Building BODBOT presented several unique technical and design challenges:

### 1. Perfecting the Retro Aesthetic
Transitioning the UI from a modern, blurred "glassmorphism" look to a strict 16-bit style required overhauling the entire CSS foundation. 
- **Challenge:** Ensuring data-heavy tables and charts remained highly legible while using the blocky `'Press Start 2P'` font.
- **Solution:** Implementing aggressive, clamped typography scaling, abandoning `border-radius`, and utilizing complex, hard-edged `box-shadow` layering to simulate 3D pixel buttons (like the `danger-button` for withdrawals).

### 2. Charting Micro-Fluctuations
- **Challenge:** Creating the "Live Market Matrix" sparklines resulted in "flatline" charts because Recharts defaults to scaling line charts from `$0` to the absolute maximum price. A `$20` fluctuation on a `$63,000` Bitcoin chart is invisible on that scale.
- **Solution:** Engineered a hidden `YAxis` bound dynamically to `['dataMin', 'dataMax']`, tightly cropping the chart bounds to the exact live data limits, instantly bringing the simulated market movements to life.

### 3. React State & Animation Loops
- **Challenge:** Implementing the "POWERED BY AI." typewriter effect originally caused stale closures and infinite re-render loops due to recursive `setTimeout` calls trapping outdated state variables inside `useEffect`.
- **Solution:** Refactored the typing animation to use a strict, dependency-driven state machine that cleanly mounts/unmounts timers based on string length and deletion status.

### 4. Canvas Particle Physics
- **Challenge:** The initial background canvas effect used a heavy, mouse-tracking swirling algorithm that was visually distracting and computationally expensive.
- **Solution:** Rewrote the physics engine to a lightweight, scattered drift model where pixels move linearly and smoothly wrap around screen edges, fitting the chill, atmospheric space vibe perfectly.

### 5. Git / Environment Management
- **Challenge:** During intense backend development, a `dev.log` file silently ballooned to over 117MB, breaking GitHub's push limits and failing Vercel deployments.
- **Solution:** Executed an emergency cache purge (`git rm --cached`) and strict `.gitignore` enforcement to salvage the repository state and restore deployment pipelines.

## 🔗 Deployed Contracts

If you need to interact with the contracts directly or add them to your environment, here are the deployed addresses on **Mantle Sepolia**:

- **Mock USDC (mUSDC):** `0x84bF6BA683178B3Fa97882bB00bC65d219aB38b7`
- **Trading Vault:** `0x35143Da0E758d1F1dc688c13Ef5471B1f26449c8`

## 📜 Getting Started

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
