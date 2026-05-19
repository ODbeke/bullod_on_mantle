import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { decimals: 18, name: "MNT", symbol: "MNT" },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.sepolia.mantle.xyz" },
  },
  testnet: true,
});

const connectors = [injected()];

if (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  connectors.push(
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
      showQrModal: true,
    }),
  );
}

export const config = createConfig({
  chains: [mantleSepolia],
  connectors,
  transports: {
    [mantleSepolia.id]: http(),
  },
});
