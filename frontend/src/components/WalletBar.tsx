import { Activity, LogOut, Wallet, Bell, Fuel } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

type Props = {
  onMint: () => void;
};

export function WalletBar({ onMint }: Props) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleActivateTelegram = () => {
    if (address) {
      navigator.clipboard.writeText(`/link ${address}`);
      alert("Link command copied! Paste it to the Telegram bot to receive alerts.");
    }
    window.open("https://t.me/OD_track_bot", "_blank");
  };

  return (
    <div className="wallet-bar">
      <div>
        <span className="eyebrow"><Activity size={14} /> Mantle Sepolia</span>
        <h1>OD Bot Hedge Dashboard</h1>
      </div>
      <div className="wallet-actions">
        {isConnected && (
          <button className="ghost-button" type="button" onClick={handleActivateTelegram}>
            <Bell size={18} />
            Telegram Alerts
          </button>
        )}
        <button className="ghost-button" type="button" onClick={onMint} disabled={!isConnected}>
          <Fuel size={18} />
          Faucet
        </button>
        {isConnected ? (
          <button className="primary-button" type="button" onClick={() => disconnect()}>
            <LogOut size={18} />
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </button>
        ) : (
          <button className="primary-button" type="button" onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>
            <Wallet size={18} />
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}
