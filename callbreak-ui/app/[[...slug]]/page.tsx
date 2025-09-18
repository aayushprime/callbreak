"use client";

import { GameProvider } from "@/contexts/GameContext";
import { RoomProvider } from "@/contexts/RoomContext";
import { SceneSwitch } from "@/components/SceneSwitch";
import { ToastProvider } from "@/contexts/ToastContext";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

function App() {
  // const network = WalletAdapterNetwork.Devnet;
  // const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const endpoint = "http://localhost:8899";
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GameProvider>
            <RoomProvider>
              <ToastProvider>
                <div className="w-screen h-screen flex items-center justify-center rounded-lg">
                  <div className="relative w-[80%] h-[80%] bg-green-800 overflow-hidden rounded-4xl">
                    <SceneSwitch />
                  </div>
                </div>
              </ToastProvider>
            </RoomProvider>
          </GameProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default dynamic(() => Promise.resolve(App), { ssr: false });
