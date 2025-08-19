"use client";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/contexts/GameContext";
import { Popup } from "../ui/Popup";
import { LobbyProfile } from "./LobbyProfile";
import { RoomCodeBadge } from "./RoomCodeBadge";
import { Room } from "@/lib/room";
import { useRoom } from "@/contexts/RoomContext";
import { RoomConnectionStatus } from "@/lib/room";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { usePlayerName } from "@/hooks/usePlayerName";

export function LobbyScreen() {
  const { room, setRoom } = useRoom();
  const { setScene } = useGame();

  const { addToast } = useToast();

  const [players, setPlayers] = useState<
    { id: string; picture: string; name: string; country: string }[]
  >([]);
  const [host, setHost] = useState("");

  const [popupOpen, setPopupOpen] = useState(false);
  const [status, setStatus] = useState<RoomConnectionStatus>("connected");
  const [playerName] = usePlayerName();
  const router = useRouter();
  const pathname = usePathname();
  const [popupTitle, setPopupTitle] = useState("Room not found.");

  useEffect(() => {
    if (room) return;
    const pathSegments = pathname.split("/").filter(Boolean);
    const roomId = pathSegments.length === 1 ? pathSegments[0] : undefined;

    if (!roomId) {
      setScene("menu"); // If no roomId, go back to menu
      return;
    }
    const newRoom = new Room(playerName, playerName, roomId, true);
    setRoom(newRoom);
    newRoom.connect();
  }, [pathname, playerName, setRoom, setScene]);

  useEffect(() => {
    if (!room) return;
    const unsubscribe = room.subscribe((event, ack) => {
      if (event.type === "welcome") {
        ack();
        console.log(event.payload);
        setPlayers(event.payload.players);
        setHost(event.payload.hostId);
      } else if (event.type === "close") {
        addToast("Connection broken.");
        ack();
      } else if (event.type === "error") {
        if (event.payload?.message === "Room not found") {
          ack();
          setPopupOpen(true);
        } else if (event.payload.message === "A game is already in progress.") {
          ack();
          setPopupTitle("The game has already started.");
          setPopupOpen(true);
        } else if (event.payload.message === "4 players required.") {
          ack();
          addToast("4 players required.");
        } else {
          console.log("Error message from server: [unhandled]", event);
        }
      } else if (event.type === "playerLeft") {
        ack();
        setPlayers((prev) =>
          prev.filter((player) => player.id !== event.payload.playerId)
        );
      } else if (event.type === "hostChanged") {
        ack();
        setHost(event.payload.newHostId);
      } else if (event.type === "playerJoined") {
        ack();
        setPlayers((prev) => [
          ...prev,
          {
            id: event.payload.id,
            picture: event.payload.picture,
            name: event.payload.name,
            country: event.payload.country,
          },
        ]);
      } else if (event.type === "gameStarted") {
        ack();
        setScene("game");
      } else if (event.type === "status") {
        ack();
        setStatus(event.payload);
      } else {
        // ack();
        console.log("[Lobby] Unhandled event:", event);
      }
    });
    return unsubscribe;
  }, [room]);

  const handleLeave = () => {
    room?.disconnect();
    router.push("/");
  };

  const handleBegin = () => {
    room?.send("startGame");
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
        {room?.roomId && <RoomCodeBadge code={room.roomId} />}
        <div
          className={`flex flex-row mt-16 justify-center gap-6 w-full max-w-4xl
        `}
        >
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex flex-col items-center p-4 rounded-xl shadow-md transition-transform transform hover:scale-105 ${
                player.id === host
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
                {player.id === host && (
                  <span className="text-xs bg-yellow-500/50 text-white px-2 py-0.5 rounded-full font-bold">
                    HOST
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {host && host === playerName && (
        <Button className="margin-auto" title="Begin" onClick={handleBegin} />
      )}
      {host && host !== playerName && (
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
