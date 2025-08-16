"use client";
import { useLocalStorage } from "./useLocalStorage"; // adjust path
import { generateRandomCode } from "@/lib/utils"; // adjust path

export function usePlayerName() {
  const [playerName, setPlayerName] = useLocalStorage("name", () => {
    return "P-" + generateRandomCode();
  });

  return [playerName, setPlayerName] as const;
}
