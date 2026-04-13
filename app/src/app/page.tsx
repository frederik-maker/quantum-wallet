"use client";

import { useWalletStore } from "@/lib/wallet-store";
import { CreateWallet } from "@/components/CreateWallet";
import { WalletDashboard } from "@/components/WalletDashboard";

export default function Home() {
  const initialized = useWalletStore((s) => s.initialized);

  return initialized ? <WalletDashboard /> : <CreateWallet />;
}
