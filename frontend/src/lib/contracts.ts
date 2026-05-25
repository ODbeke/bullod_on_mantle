import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, type Address } from "viem";
import { mantleSepolia } from "./wagmi";

export const MOCK_USDC_ADDRESS = import.meta.env.VITE_MOCK_USDC_ADDRESS as Address | undefined;
export const TRADING_VAULT_ADDRESS = import.meta.env.VITE_TRADING_VAULT_ADDRESS as Address | undefined;

/* ── ABIs ────────────────────────────────────────────── */

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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const vaultAbi = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
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
  {
    type: "function",
    name: "deallocate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "botId", type: "uint8" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "availableBalance",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "botAllocation",
    stateMutability: "view",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getUserTrades",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "trades",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "user", type: "address" },
      { name: "botId", type: "uint8" },
      { name: "symbol", type: "string" },
      { name: "isLong", type: "bool" },
      { name: "collateral", type: "uint256" },
      { name: "entryPrice", type: "uint256" },
      { name: "exitPrice", type: "uint256" },
      { name: "pnl", type: "int256" },
      { name: "openedAt", type: "uint64" },
      { name: "closedAt", type: "uint64" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "nextTradeId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/* ── Clients ──────────────────────────────────────────── */

const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http(import.meta.env.VITE_MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz", {
    batch: true,
  }),
});

async function readContractWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const errMsg = String(err.message || "").toLowerCase();
    const isTransient =
      err.status === 429 ||
      errMsg.includes("429") ||
      errMsg.includes("too many requests") ||
      errMsg.includes("rate limit") ||
      errMsg.includes("exceeded") ||
      errMsg.includes("fetch") ||
      errMsg.includes("failed to fetch") ||
      errMsg.includes("network") ||
      errMsg.includes("timeout") ||
      errMsg.includes("request");

    if (retries > 0 && isTransient) {
      console.warn(`Transient/Rate Limit RPC error. Retrying in ${delay}ms... (${retries} retries left). Error: ${errMsg}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return readContractWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

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

/* ── Write operations ─────────────────────────────────── */

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

  const [allowance, availableBalance] = await Promise.all([
    publicClient.readContract({
      address: MOCK_USDC_ADDRESS,
      abi: usdcAbi,
      functionName: "allowance",
      args: [account, TRADING_VAULT_ADDRESS],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: TRADING_VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "availableBalance",
      args: [account],
    }) as Promise<bigint>,
  ]);

  const depositNeeded = units > availableBalance ? units - availableBalance : 0n;

  if (depositNeeded > 0n) {
    if (allowance < depositNeeded) {
      const approveHash = await client.writeContract({
        address: MOCK_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "approve",
        // Max uint256 so we don't have to approve again
        args: [TRADING_VAULT_ADDRESS, 115792089237316195423570985008687907853269984665640564039457584007913129639935n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    const depositHash = await client.writeContract({
      address: TRADING_VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "deposit",
      args: [depositNeeded],
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
  }

  const allocateHash = await client.writeContract({
    address: TRADING_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "allocate",
    args: [botId, units],
  });
  await publicClient.waitForTransactionReceipt({ hash: allocateHash });

  return allocateHash;
}

export async function deallocateBot(account: Address, botId: number, amount: number) {
  if (!TRADING_VAULT_ADDRESS) {
    throw new Error("Contract addresses are not configured");
  }
  const units = parseUnits(String(amount), 6);
  const client = walletClient(account);
  await client.switchChain({ id: mantleSepolia.id });

  const deallocHash = await client.writeContract({
    address: TRADING_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "deallocate",
    args: [botId, units],
  });
  await publicClient.waitForTransactionReceipt({ hash: deallocHash });

  const withdrawHash = await client.writeContract({
    address: TRADING_VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "withdraw",
    args: [units],
  });
  await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
  
  return withdrawHash;
}

/* ── Read operations ──────────────────────────────────── */

export interface OnChainTrade {
  id: number;
  user: string;
  botId: number;
  symbol: string;
  isLong: boolean;
  collateral: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
  status: "open" | "closed";
}

export interface UserVaultData {
  walletBalance: number;
  availableBalance: number;
  allocations: Record<number, number>;
  activeBotCount: number;
  totalAllocated: number;
  trades: OnChainTrade[];
  totalPnl: number;
  openTradeCount: number;
  closedTradeCount: number;
}

export interface GlobalVaultData {
  totalVaultBalance: number;
  totalTradeCount: number;
}

const BOT_IDS = [1, 2, 3, 4, 5] as const;

export async function fetchUserVaultData(account: Address): Promise<UserVaultData> {
  const fallbackData: UserVaultData = {
    walletBalance: 0,
    availableBalance: 0,
    allocations: {},
    activeBotCount: 0,
    totalAllocated: 0,
    trades: [],
    totalPnl: 0,
    openTradeCount: 0,
    closedTradeCount: 0,
  };

  if (!TRADING_VAULT_ADDRESS || !MOCK_USDC_ADDRESS) {
    return fallbackData;
  }

  try {
    // Fetch wallet mUSDC balance + vault available balance + all 5 bot allocations in parallel
    const [walletRaw, balanceRaw, ...allocationResults] = await Promise.all([
      readContractWithRetry(() =>
        publicClient.readContract({
          address: MOCK_USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [account],
        })
      ),
      readContractWithRetry(() =>
        publicClient.readContract({
          address: TRADING_VAULT_ADDRESS,
          abi: vaultAbi,
          functionName: "availableBalance",
          args: [account],
        })
      ),
      ...BOT_IDS.map((botId) =>
        readContractWithRetry(() =>
          publicClient.readContract({
            address: TRADING_VAULT_ADDRESS,
            abi: vaultAbi,
            functionName: "botAllocation",
            args: [account, botId],
          })
        )
      ),
    ]);

    const walletBalance = Number(formatUnits(walletRaw, 6));
    const availableBalance = Number(formatUnits(balanceRaw, 6));
    const allocations: Record<number, number> = {};
    let totalAllocated = 0;
    let activeBotCount = 0;

    BOT_IDS.forEach((botId, idx) => {
      const val = Number(formatUnits(allocationResults[idx], 6));
      allocations[botId] = val;
      totalAllocated += val;
    });

    // Fetch user trade IDs
    let trades: OnChainTrade[] = [];
    let totalPnl = 0;
    let openTradeCount = 0;
    let closedTradeCount = 0;

    try {
      const tradeIds = await readContractWithRetry(() =>
        publicClient.readContract({
          address: TRADING_VAULT_ADDRESS,
          abi: vaultAbi,
          functionName: "getUserTrades",
          args: [account],
        })
      );

      if (tradeIds.length > 0) {
        const tradeResults = [];
        const CHUNK_SIZE = 5;
        for (let i = 0; i < tradeIds.length; i += CHUNK_SIZE) {
          const chunk = tradeIds.slice(i, i + CHUNK_SIZE);
          const results = await Promise.all(
            chunk.map(async (tid) => {
              try {
                return await readContractWithRetry(() =>
                  publicClient.readContract({
                    address: TRADING_VAULT_ADDRESS!,
                    abi: vaultAbi,
                    functionName: "trades",
                    args: [tid],
                  })
                );
              } catch (e) {
                console.error(`Failed to fetch trade detail for ID ${tid}:`, e);
                return null;
              }
            })
          );
          tradeResults.push(...results.filter((res): res is Exclude<typeof res, null> => res !== null));
        }

        trades = tradeResults.map((t) => {
          const status = Number(t[11]) === 0 ? "open" as const : "closed" as const;
          const pnlRaw = t[8];
          const pnl = Number(formatUnits(pnlRaw < 0n ? -(-pnlRaw) : pnlRaw, 6));
          if (status === "open") openTradeCount++;
          else closedTradeCount++;
          totalPnl += pnl;

          return {
            id: Number(t[0]),
            user: t[1],
            botId: Number(t[2]),
            symbol: t[3],
            isLong: t[4],
            collateral: Number(formatUnits(t[5], 6)),
            entryPrice: Number(formatUnits(t[6], 8)),
            exitPrice: Number(formatUnits(t[7], 8)),
            pnl,
            openedAt: Number(t[9]),
            closedAt: Number(t[10]),
            status,
          };
        });

        const botsWithOpenTrades = new Set<number>();
        trades.forEach((t) => {
          if (t.status === "open") botsWithOpenTrades.add(t.botId);
        });
        activeBotCount = botsWithOpenTrades.size;
      }
    } catch (err) {
      console.error("Failed to fetch user trades:", err);
      // getUserTrades may revert for new users — treat as empty
    }

    return { walletBalance, availableBalance, allocations, activeBotCount, totalAllocated, trades, totalPnl, openTradeCount, closedTradeCount };
  } catch (globalErr) {
    console.error("Critical error in fetchUserVaultData:", globalErr);
    return fallbackData;
  }
}

export async function fetchGlobalVaultData(): Promise<GlobalVaultData> {
  if (!TRADING_VAULT_ADDRESS || !MOCK_USDC_ADDRESS) {
    return { totalVaultBalance: 0, totalTradeCount: 0 };
  }

  try {
    const [vaultBalanceRaw, nextTradeIdRaw] = await Promise.all([
      readContractWithRetry(() =>
        publicClient.readClient ? (publicClient as any).readContract({ // safety check or standard readContract
          address: MOCK_USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [TRADING_VAULT_ADDRESS],
        }) : publicClient.readContract({
          address: MOCK_USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [TRADING_VAULT_ADDRESS],
        })
      ),
      readContractWithRetry(() =>
        publicClient.readContract({
          address: TRADING_VAULT_ADDRESS,
          abi: vaultAbi,
          functionName: "nextTradeId",
        })
      ),
    ]);

    return {
      totalVaultBalance: Number(formatUnits(vaultBalanceRaw, 6)),
      totalTradeCount: Math.max(0, Number(nextTradeIdRaw) - 1),
    };
  } catch (err) {
    console.error("Failed to fetch global vault data:", err);
    return { totalVaultBalance: 0, totalTradeCount: 0 };
  }
}
