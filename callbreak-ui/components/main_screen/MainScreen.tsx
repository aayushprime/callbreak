"use client";
import Image from "next/image";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Profile } from "@/components/game_screen/Profile";
import { Button } from "@/components/ui/Button";
import { Popup } from "@/components/ui/Popup";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/contexts/ToastContext";
import { useRoom } from "@/contexts/RoomContext";
import { Room, RoomConnectionStatus } from "@/lib/room";
import { usePathname } from "next/navigation";
import { generateRandomCode } from "@/lib/utils";
import { usePlayerName } from "@/hooks/usePlayerName";

const MAX_RETRIES = 5;

export function MainScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerName, setPlayerName] = usePlayerName();

  const { scene, setScene } = useGame();
  const { room, setRoom } = useRoom();
  const { addToast } = useToast();

  const [isPlayerPopupOpen, setPlayerPopupOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<RoomConnectionStatus>("disconnected");
  const [retryCount, setRetryCount] = useState(0);

  const pathname = usePathname();

  const handleConnect = useCallback(
    (newRoom: Room) => {
      setRoom(newRoom);
      newRoom.connect();
      setStatus("connecting");
      setRetryCount(0);
    },
    [setRoom]
  );

  // Effect to handle joining from a URL or transitioning to the lobby
  useEffect(() => {
    const roomIdFromPath = pathname.substring(1);

    if (room && room.roomId === roomIdFromPath && status === "connected") {
      setScene("lobby");
    } else if (roomIdFromPath && !room && playerName) {
      const newRoom = new Room(playerName, playerName, roomIdFromPath, true);
      handleConnect(newRoom);
      setPlayerPopupOpen(true);
    }
  }, [pathname, room, status, playerName, handleConnect, setScene]);

  // Effect to subscribe to room events
  useEffect(() => {
    if (!room) return;

    const unsubscribe = room.subscribe((event, ack) => {
      console.log("Event received:", event);
      if (event.type === "status") {
        ack();
        setStatus(event.payload);
      } else if (event.type === "open") {
        ack();
        setPlayerPopupOpen(false);

        window.history.pushState({}, "", room.roomId);
        setScene("lobby");
      } else if (event.type === "error") {
        ack();
        addToast(event.payload.message);
        handleCancel();
      } else if (event.type === "close") {
        ack();
        if (!event.payload.wasClean && retryCount < MAX_RETRIES) {
          const timeout = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            room.retry();
          }, timeout);
        }
      } else {
        ack();
        console.log("[Main] Unhandled event:", event);
      }
    });

    return unsubscribe;
  }, [room, retryCount]);

  const handleCreateRoom = () => {
    const newRoom = new Room(
      playerName,
      playerName,
      "G-" + generateRandomCode()
    );
    handleConnect(newRoom);
  };

  const handleJoinRoom = () => {
    if (!roomCode) return;
    const newRoom = new Room(playerName, playerName, roomCode, true);
    handleConnect(newRoom);
    setPlayerPopupOpen(true);
  };

  const handleCancel = () => {
    if (room) {
      room.disconnect();
    }
    setRoom(undefined);
    setPlayerPopupOpen(false);
    setRetryCount(0);
  };

  return (
    <div
      className="main-scene flex flex-col items-center justify-center h-full bg-green-800 text-white"
      ref={containerRef}
    >
      <div className="flex flex-row absolute left-0 top-2">
        <div className="flex flex-row items-center">
          <Profile className="m-5 mr-2" />
          {<span className="font-worksans">{playerName}</span>} {/* Player name display */}
        </div>
      </div>
      <Image
        src="/logo.png"
        alt="Logo"
        width={300}
        draggable={false}
        height={300}
        className="m-5 mr-2"
      />
      <div className="flex flex-col gap-4">
        <Button
          onClick={handleCreateRoom}
          title={
            status === "connecting" && !isPlayerPopupOpen
              ? "Creating..."
              : "Create Room"
          }
          disabled={status === "connecting"}
        />
        <Button
          onClick={() => {
            setPlayerPopupOpen(true);
          }}
          title="Join Room"
          disabled={status === "connecting"}
        />
      </div>
      <Popup isOpen={isPlayerPopupOpen} title="Enter Code">
        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="G-123456"
            className="w-full px-4 py-3 border border-gray-500 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            disabled={status === "connecting"}
          />

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Button
                onClick={handleJoinRoom}
                title="Connect"
                disabled={status === "connecting"}
                className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-6 py-2 transition"
              />
              <Button
                onClick={handleCancel}
                title="Cancel"
                disabled={status === "connecting"}
                className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold px-6 py-2 transition"
              />
            </div>
          </div>
        </div>
      </Popup>
    </div>
  );
}
