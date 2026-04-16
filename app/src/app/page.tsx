"use client";

import { useState } from "react";
import { useWalletStore } from "@/lib/wallet-store";
import { CreateWallet } from "@/components/CreateWallet";
import { WalletDashboard } from "@/components/WalletDashboard";

export default function Home() {
  const initialized = useWalletStore((s) => s.initialized);
  const [viewingHome, setViewingHome] = useState(false);

  if (!initialized || viewingHome) {
    return <CreateWallet hasWallet={initialized} onBackToWallet={() => setViewingHome(false)} />;
  }

  return <WalletDashboard onViewHome={() => setViewingHome(true)} />;
}
