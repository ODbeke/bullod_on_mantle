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

const EMPTY_GLOBAL: GlobalVaultData = {
  totalVaultBalance: 0,
  totalTradeCount: 0,
};

export function useVaultData() {
  const { address, isConnected } = useAccount();

  // Load initial global data from cache if present
  const [globalData, setGlobalData] = useState<GlobalVaultData>(() => {
    try {
      const cached = localStorage.getItem("od_global_data");
      return cached ? JSON.parse(cached) : EMPTY_GLOBAL;
    } catch {
      return EMPTY_GLOBAL;
    }
  });

  // Load initial user data from cache if address is already known
  const [userData, setUserData] = useState<UserVaultData>(() => {
    if (typeof window !== "undefined" && isConnected && address) {
      try {
        const cached = localStorage.getItem(`od_user_data_${address.toLowerCase()}`);
        return cached ? JSON.parse(cached) : EMPTY_USER;
      } catch {
        return EMPTY_USER;
      }
    }
    return EMPTY_USER;
  });

  const [loading, setLoading] = useState(false);

  // Sync state whenever connected address changes
  useEffect(() => {
    if (isConnected && address) {
      try {
        const cached = localStorage.getItem(`od_user_data_${address.toLowerCase()}`);
        if (cached) {
          setUserData(JSON.parse(cached));
          return;
        }
      } catch (err) {
        console.error("Failed to load cached user data:", err);
      }
      setUserData(EMPTY_USER);
    } else {
      setUserData(EMPTY_USER);
    }
  }, [address, isConnected]);

  const refresh = useCallback(async (isBackground = false) => {
    if (!contractsConfigured()) return;
    if (!isBackground) setLoading(true);

    try {
      const [global, user] = await Promise.all([
        fetchGlobalVaultData(),
        isConnected && address
          ? fetchUserVaultData(address as Address)
          : Promise.resolve(EMPTY_USER),
      ]);

      setGlobalData(global);
      localStorage.setItem("od_global_data", JSON.stringify(global));

      if (isConnected && address) {
        setUserData(user);
        localStorage.setItem(`od_user_data_${address.toLowerCase()}`, JSON.stringify(user));
      }
    } catch (err) {
      console.error("Failed to fetch vault data:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [address, isConnected]);

  // Fetch on mount, whenever wallet changes, and background poll every 10 seconds
  useEffect(() => {
    refresh(false);
    const interval = setInterval(() => refresh(true), 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { userData, globalData, loading, refresh };
}
