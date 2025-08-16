import { GameProvider } from "@/contexts/GameContext";
import { RoomProvider } from "@/contexts/RoomContext";
import { SceneSwitch } from "@/components/SceneSwitch";
import { ToastProvider } from "@/contexts/ToastContext";

export default function App() {
  return (
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
  );
}
