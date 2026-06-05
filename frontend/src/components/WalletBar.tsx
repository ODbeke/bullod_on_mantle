import { useState } from "react";
import { LogOut, Wallet, Bell, Fuel } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import logo from "../assets/logo.png";

type Props = {
  onMint: () => void;
  balance?: number;
};

export function WalletBar({ onMint, balance = 0 }: Props) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleActivateTelegram = () => {
    if (address) {
      navigator.clipboard.writeText(`/link ${address}`);
      alert("Link command copied! Paste it to the Telegram bot to receive alerts.");
    }
    window.open("https://t.me/OD_track_bot", "_blank");
  };

  return (
    <div className="wallet-bar">
      <div className="logo-container">
        <img src={logo} alt="OD Bot" className="logo-img" />
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
          Mint mUSDC
        </button>
        {isConnected ? (
          <div className="wallet-dropdown-container">
            <button className="primary-button" type="button" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <Wallet size={18} />
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
            {dropdownOpen && (
              <div className="wallet-dropdown">
                <div className="wallet-balance">
                  <span>Available Balance</span>
                  <strong>{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDC</strong>
                </div>
                <button className="disconnect-button" type="button" onClick={() => disconnect()}>
                  <LogOut size={16} />
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
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
