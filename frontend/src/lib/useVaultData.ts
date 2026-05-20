import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  contractsConfigured,
  fetchUserVaultData,
  fetchGlobalVaultData,
  type UserVaultData,
  type GlobalVaultData,
} from "./contracts";
import type { Address } from "viem";

const EMPTY_USER: UserVaultData = {
  availableBalance: 0,
  allocations: {},
  activeBotCount: 0,
  totalAllocated: 0,
  trades: [],
  totalPnl: 0,
  openTradeCount: 0,
  closedTradeCount: 0,
};

const EMPTY_GLOBAL: GlobalVaultData = {
  totalVaultBalance: 0,
  totalTradeCount: 0,
};

export function useVaultData() {
  const { address, isConnected } = useAccount();

  const [userData, setUserData] = useState<UserVaultData>(EMPTY_USER);
  const [globalData, setGlobalData] = useState<GlobalVaultData>(EMPTY_GLOBAL);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!contractsConfigured()) return;
    setLoading(true);

    try {
      const [global, user] = await Promise.all([
        fetchGlobalVaultData(),
        isConnected && address
          ? fetchUserVaultData(address as Address)
          : Promise.resolve(EMPTY_USER),
      ]);
      setGlobalData(global);
      setUserData(user);
    } catch (err) {
      console.error("Failed to fetch vault data:", err);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Fetch on mount and whenever wallet changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset user data when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setUserData(EMPTY_USER);
    }
  }, [isConnected]);

  return { userData, globalData, loading, refresh };
}
