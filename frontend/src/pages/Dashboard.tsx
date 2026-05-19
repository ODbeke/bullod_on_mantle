import { useState } from "react";
import { useAccount } from "wagmi";
import { BotCard } from "../components/BotCard";
import { BotModal } from "../components/BotModal";
import { MarketChart } from "../components/MarketChart";
import { WalletBar } from "../components/WalletBar";
import { contractsConfigured, depositAndAllocate, mintMockUsdc } from "../lib/contracts";
import { bots, type Bot } from "../lib/bots";

export function Dashboard() {
  const { address } = useAccount();
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [allocations, setAllocations] = useState<Record<number, number>>({ 1: 750, 3: 1200 });
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
        setStatus(`Allocated ${amount.toLocaleString()} mUSDC to Bot ${botId} on-chain.`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "On-chain allocation failed.");
        return;
      }
    } else if (!address) {
      setStatus("Connect a wallet to allocate on-chain. Demo allocation updated locally.");
    } else {
      setStatus("Contract addresses are not configured yet. Demo allocation updated locally.");
    }
    setAllocations((current) => ({ ...current, [botId]: amount }));
  }

  async function handleMint() {
    if (!address) {
      setStatus("Connect a wallet before minting mUSDC.");
      return;
    }
    if (!contractsConfigured()) {
      setStatus("Deploy contracts and add VITE_MOCK_USDC_ADDRESS / VITE_TRADING_VAULT_ADDRESS before minting.");
      return;
    }
    setStatus("Minting mock USDC from the faucet...");
    try {
      await mintMockUsdc(address);
      setStatus("Minted 10,000 mUSDC to your wallet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mint transaction failed.");
    }
  }

  const activeCount = Object.values(allocations).filter(Boolean).length;
  const totalAllocation = Object.values(allocations).reduce((total, value) => total + value, 0);

  return (
    <main>
      <div className="background-grid" />
      <WalletBar onMint={handleMint} />
      <section className="overview">
        <div>
          <span className="eyebrow">AI vault operations</span>
          <h2>{activeCount} bots live, ${totalAllocation.toLocaleString()} mUSDC allocated</h2>
          <p className="status-line">{status}</p>
        </div>
        <div className="metric-row">
          <div><span>Vault equity</span><strong>$14,286.40</strong></div>
          <div><span>Open PnL</span><strong className="positive">+3.42%</strong></div>
          <div><span>Indexed trades</span><strong>1,248</strong></div>
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
            <BotCard key={bot.id} bot={bot} active={Boolean(allocations[bot.id])} onOpen={setSelectedBot} />
          ))}
        </div>
      </section>
      <BotModal bot={selectedBot} active={Boolean(selectedBot && allocations[selectedBot.id])} onClose={() => setSelectedBot(null)} onActivate={activateBot} />
    </main>
  );
}
