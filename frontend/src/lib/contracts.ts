import { createPublicClient, createWalletClient, custom, http, parseUnits, type Address } from "viem";
import { mantleSepolia } from "./wagmi";

export const MOCK_USDC_ADDRESS = import.meta.env.VITE_MOCK_USDC_ADDRESS as Address | undefined;
export const TRADING_VAULT_ADDRESS = import.meta.env.VITE_TRADING_VAULT_ADDRESS as Address | undefined;

const usdcAbi = [
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const vaultAbi = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  {
    type: "function",
    name: "allocate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "botId", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(import.meta.env.VITE_MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz"),
});

function walletClient(account: Address) {
  if (!window.ethereum) {
    throw new Error("Wallet provider unavailable");
  }
  return createWalletClient({
    account,
    chain: mantleSepolia,
    transport: custom(window.ethereum),
  });
}

export function contractsConfigured() {
  return Boolean(MOCK_USDC_ADDRESS && TRADING_VAULT_ADDRESS);
}

export async function mintMockUsdc(account: Address) {
  if (!MOCK_USDC_ADDRESS) throw new Error("VITE_MOCK_USDC_ADDRESS is not configured");
  const client = walletClient(account);
  await client.switchChain({ id: mantleSepolia.id });
  const hash = await client.writeContract({ address: MOCK_USDC_ADDRESS, abi: usdcAbi, functionName: "faucet" });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function depositAndAllocate(account: Address, botId: number, amount: number) {
  if (!MOCK_USDC_ADDRESS || !TRADING_VAULT_ADDRESS) {
    throw new Error("Contract addresses are not configured");
  }
  const units = parseUnits(String(amount), 6);
  const client = walletClient(account);
  await client.switchChain({ id: mantleSepolia.id });

  const approveHash = await client.writeContract({
    address: MOCK_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "approve",
    args: [TRADING_VAULT_ADDRESS, units],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const depositHash = await client.writeContract({
    address: TRADING_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "deposit",
    args: [units],
  });
  await publicClient.waitForTransactionReceipt({ hash: depositHash });

  const allocateHash = await client.writeContract({
    address: TRADING_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "allocate",
    args: [botId, units],
  });
  await publicClient.waitForTransactionReceipt({ hash: allocateHash });

  return allocateHash;
}
