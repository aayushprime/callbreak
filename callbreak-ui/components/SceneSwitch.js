"use client";
import { useGame, sceneSwitch } from "@/contexts/GameContext";
export function SceneSwitch() {
    const { scene } = useGame();
    return sceneSwitch[scene];
}
