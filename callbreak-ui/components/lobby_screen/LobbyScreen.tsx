"use client";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/contexts/GameContext";
import { Popup } from "../ui/Popup";
import { LobbyProfile } from "./LobbyProfile";
import { RoomCodeBadge } from "./RoomCodeBadge";
import { useRoom } from "@/contexts/RoomContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { usePlayerName } from "@/hooks/usePlayerName";

export function LobbyScreen() {
  const { roomState, dispatch, roomService } = useRoom();
  const { setScene } = useGame();
  const { addToast } = useToast();
  const [playerName] = usePlayerName();
  const router = useRouter();

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("Room not found.");

  useEffect(() => {
    const handleGameStarted = () => {
      setScene("game");
    };

    const handleError = (error: { message: string }) => {
      if (error.message === "Room not found") {
        setPopupTitle("Room not found.");
        setPopupOpen(true);
      } else if (error.message === "A game is already in progress.") {
        setPopupTitle("The game has already started.");
        setPopupOpen(true);
      } else if (error.message === "4 players required.") {
        addToast("4 players required.");
      } else {
        console.log("Error message from server: [unhandled]", error);
      }
    };

    roomService.on("gameStarted", handleGameStarted);
    roomService.on("error", handleError);

    return () => {
      roomService.off("gameStarted", handleGameStarted);
      roomService.off("error", handleError);
    };
  }, [setScene, addToast, roomService]);

  const handleLeave = () => {
    roomService.disconnect();
    dispatch({ type: "MANUAL_DISCONNECT" });
    router.push("/");
    setScene("menu");
  };

  const handleBegin = () => {
    roomService.send({ type: "startGame", scope: "room", payload: {} });
  };

  return (
    <div className="relative h-full flex flex-col items-center justify-between bg-green-800 px-6 py-4">
      <Button
        title="Leave"
        onClick={handleLeave}
        className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full shadow hover:bg-red-600 active:bg-red-600 transition"
      />

      {/* Header */}
      <div className="flex flex-col items-center">
        <div className="mt-5 text-5xl font-extrabold mb-6 drop-shadow-sm">
          Lobby
        </div>
        {roomState.roomId && <RoomCodeBadge code={roomState.roomId} />}
        <div
          className={`flex flex-row mt-16 justify-center gap-6 w-full max-w-4xl
        `}
        >
          {roomState.players.map((player) => (
            <div
              key={player.id}
              className={`flex flex-col items-center p-4 rounded-xl shadow-md transition-transform transform hover:scale-105 ${
                player.id === roomState.hostId
                  ? "bg-yellow-200/30 border-2 border-yellow-400"
                  : "bg-white/10"
              }`}
            >
              <LobbyProfile
                size={80}
                name={player.name}
                picture={player.picture}
              />
              <div className="mt-6 flex flex-row gap-2">
                {playerName === player.id && (
                  <span className="text-xs bg-blue-500/50 text-white px-2 py-0.5 rounded-full font-bold">
                    YOU
                  </span>
                )}
                {player.id === roomState.hostId && (
                  <span className="text-xs bg-yellow-500/50 text-white px-2 py-0.5 rounded-full font-bold">
                    HOST
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {roomState.hostId && roomState.hostId === playerName && (
        <Button className="margin-auto" title="Begin" onClick={handleBegin} />
      )}
      {roomState.hostId && roomState.hostId !== playerName && (
        <div>Waiting for host to start the game...</div>
      )}

      <Popup isOpen={popupOpen} title={popupTitle}>
        <div className="flex flex-col gap-4">
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  router.push("/");
                }}
                title="Back to Menu"
                className="bg-green-500 hover:bg-green-600 active:bg-red-700 text-white font-semibold px-6 py-2 transition"
              />
            </div>
          </div>
        </div>
      </Popup>
    </div>
  );
}