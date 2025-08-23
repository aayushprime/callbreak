"use client";
import {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

import { MainScreen } from "@/components/main_screen/MainScreen";
import { LobbyScreen } from "@/components/lobby_screen/LobbyScreen";
import { GameScreen } from "@/components/game_screen/GameScreen";

export const sceneSwitch = {
  lobby: <LobbyScreen />,
  menu: <MainScreen />,
  game: <GameScreen />,
};

import { useRouter, usePathname } from "next/navigation";
type GameContextType = {
  scene: keyof typeof sceneSwitch;
  setScene: (scene: keyof typeof sceneSwitch) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [scene, setScene] = useState<keyof typeof sceneSwitch>("menu");

  const pathname = usePathname();

  return (
    <GameContext.Provider value={{ scene, setScene }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
