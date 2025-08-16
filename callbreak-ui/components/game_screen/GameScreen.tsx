import { useGame } from "@/contexts/GameContext";
import { Hand } from "./Hand";
import { Profile } from "./Profile";
import { TrickCard } from "./TrickCard";

export function GameScreen() {
  const { scene, setScene } = useGame();

  return (
    <div className="game-screen h-full">
      <Profile />
      {/* <Hand /> */}
      <TrickCard spot="bottom" card={{ rank: "A", suit: "H" }} collectTo={0} />
    </div>
  );
}
