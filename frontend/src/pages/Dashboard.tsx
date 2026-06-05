import { useState } from "react";
import { useAccount } from "wagmi";
import { BotCard } from "../components/BotCard";
import { BotModal } from "../components/BotModal";
import { MarketChart } from "../components/MarketChart";
import { WalletBar } from "../components/WalletBar";
import { contractsConfigured, depositAndAllocate, mintMockUsdc, deallocateBot } from "../lib/contracts";
import { bots, type Bot } from "../lib/bots";
import { useVaultData } from "../lib/useVaultData";

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const { userData, globalData, loading, refresh } = useVaultData();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [status, setStatus] = useState(
    contractsConfigured()
      ? "Vault contracts are configured for Mantle Sepolia. Connect a wallet to mint, deposit, and allocate on-chain."
      : "Demo mode active. Add contract addresses to .env after deployment for live vault transactions.",
  );

  async function activateBot(botId: number, amount: number) {
    if (amount <= 0) return;
    if (address && contractsConfigured()) {
      setStatus("Approving, depositing, and allocating mUSDC on Mantle Sepolia...");
      try {
        await depositAndAllocate(address, botId, amount);
        const botName = bots.find((b) => b.id === botId)?.name || `Bot ${botId}`;
        setStatus(`Allocated ${amount.toLocaleString()} mUSDC to ${botName} on-chain.`);
        await refresh(); // re-fetch live data after on-chain action
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "On-chain allocation failed.");
        return;
      }
    } else if (!address) {
      setStatus("Connect a wallet to allocate on-chain.");
    } else {
      setStatus("Contract addresses are not configured yet.");
    }
  }

  async function handleDeallocate(botId: number, amount: number) {
    if (amount <= 0) return;
    if (address && contractsConfigured()) {
      const botName = bots.find((b) => b.id === botId)?.name || `Bot ${botId}`;
      setStatus(`Withdrawing ${amount} mUSDC from ${botName}...`);
      try {
        await deallocateBot(address, botId, amount);
        setStatus(`Successfully withdrew ${amount.toLocaleString()} mUSDC from ${botName}.`);
        await refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "On-chain withdrawal failed.");
      }
    }
  }

  async function handleMint() {
    if (!address) {
      setStatus("Connect a wallet before minting mUSDC.");
      return;
    }

    const localStorageKey = `faucet_cooldown_${address.toLowerCase()}`;
    const lastClaim = localStorage.getItem(localStorageKey);
    const cooldownPeriod = 24 * 60 * 60 * 1000;

    if (lastClaim) {
      const timePassed = Date.now() - parseInt(lastClaim, 10);
      if (timePassed < cooldownPeriod) {
        const timeLeft = cooldownPeriod - timePassed;
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
        const countdownStr = `${hours}h ${minutes}m ${seconds}s`;
        setStatus(`Faucet cooldown active. Please try again in ${countdownStr}.`);
        alert(`⏳ Faucet Cooldown Active\n\nYou have already claimed tokens recently. Please wait ${countdownStr} before claiming again.`);
        return;
      }
    }

    if (!contractsConfigured()) {
      setStatus("Deploy contracts and add VITE_MOCK_USDC_ADDRESS / VITE_TRADING_VAULT_ADDRESS before minting.");
      return;
    }
    setStatus("Minting mock USDC from the faucet...");
    try {
      await mintMockUsdc(address);
      localStorage.setItem(localStorageKey, Date.now().toString());
      setStatus("Minted 10,000 mUSDC to your wallet.");
      await refresh(); // re-fetch balances after minting
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mint transaction failed.");
    }
  }

  /* ── Derived values from on-chain data ────────────── */
  const { activeBotCount, totalAllocated, totalPnl } = userData;
  const pnlPercent = totalAllocated > 0 ? ((totalPnl / totalAllocated) * 100).toFixed(2) : "0.00";
  const pnlIsPositive = totalPnl >= 0;

  return (
    <main>
      <div className="background-grid" />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
      }} />
      <WalletBar onMint={handleMint} balance={userData.walletBalance} />
      <section className="overview">
        <div className="operations-info">
          <span className="eyebrow">operations</span>
          {isConnected ? (
            <div className="stats-pill-container">
              <div className="stats-pill">
                {activeBotCount > 0 && <span className="pulse-dot" aria-hidden="true" />}
                <strong>{loading && activeBotCount === 0 ? "…" : `${activeBotCount} bots live`}</strong>
              </div>
              <div className="stats-pill">
                <strong>{loading && totalAllocated === 0 ? "…" : `$${totalAllocated.toLocaleString()} mUSDC allocated`}</strong>
              </div>
            </div>
          ) : (
            <div className="stats-fallback">
              Please connect your wallet to view active bots and allocation stats.
            </div>
          )}
          <p className="status-line">{status}</p>
        </div>
        <div className="metric-row">
          <div>
            <span>Vault equity</span>
            <strong>
              {loading && globalData.totalVaultBalance === 0 ? "…" : `$${globalData.totalVaultBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </strong>
          </div>
          <div>
            <span>Open PnL</span>
            <strong className={pnlIsPositive ? "positive" : "negative"}>
              {isConnected ? `${pnlIsPositive ? "+" : ""}${pnlPercent}%` : "—"}
            </strong>
          </div>
          <div>
            <span>Indexed trades</span>
            <strong>{loading && globalData.totalTradeCount === 0 ? "…" : globalData.totalTradeCount.toLocaleString()}</strong>
          </div>
        </div>
      </section>
      <MarketChart />
      <section className="bots-section">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Strategy fleet</span>
            <h2>Allocate collateral to autonomous bots</h2>
          </div>
        </div>
        <div className="bot-grid">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              active={userData.trades.some((t) => t.botId === bot.id && t.status === "open")}
              onOpen={setSelectedBot}
            />
          ))}
        </div>
      </section>
      <BotModal
        bot={selectedBot}
        active={Boolean(selectedBot && (userData.allocations[selectedBot.id] ?? 0) > 0)}
        botAllocation={selectedBot ? (userData.allocations[selectedBot.id] ?? 0) : 0}
        userTrades={userData.trades}
        onClose={() => setSelectedBot(null)}
        onActivate={activateBot}
        onDeallocate={handleDeallocate}
      />
    </main>
  );
}
