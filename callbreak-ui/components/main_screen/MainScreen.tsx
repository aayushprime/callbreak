"use client";
import Image from "next/image";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Profile } from "@/components/game_screen/Profile";
import { Button } from "@/components/ui/Button";
import { Popup } from "@/components/ui/Popup";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/contexts/ToastContext";
import { useRoom } from "@/contexts/RoomContext";
import { usePathname } from "next/navigation";
import { generateRandomCode } from "@/lib/utils";
import { usePlayerName } from "@/hooks/usePlayerName";

export function MainScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerName] = usePlayerName();
  const { roomState, dispatch, roomService } = useRoom();
  const { setScene } = useGame();
  const { addToast } = useToast();
  const { status } = roomState;

  const [isPlayerPopupOpen, setPlayerPopupOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length === 2 && playerName && !roomState.manualDisconnect) {
      const [roomType, roomId] = pathParts;
      const isLocal = roomType === "local";
      dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId, isLocal } });
    }
  }, [pathname, playerName, dispatch, roomState.manualDisconnect]);

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      roomService.disconnect();
    }
  }, [pathname, roomService]);

  useEffect(() => {
    const handleOpen = () => {
      const roomType = roomState.isLocal ? "local" : "multi";
      window.history.pushState({}, "", `/${roomType}/${roomState.roomId}`);
      if (roomState.isLocal) {
        setScene("game");
      } else {
        setScene("lobby");
      }
    };

    const handleError = ({ message }: { message: string }) => {
      addToast(message);
      roomService.disconnect();
      dispatch({ type: "RESET" });
    };

    roomService.on("open", handleOpen);
    roomService.on("error", handleError);

    return () => {
      roomService.off("open", handleOpen);
      roomService.off("error", handleError);
    };
  }, [roomState, setScene, addToast, dispatch, roomService]);

  const handleCreateRoom = () => {
    const newRoomId = "G-" + generateRandomCode();
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: newRoomId, isLocal: false } });
    roomService.connect(playerName, playerName, newRoomId);
  };

  const handleJoinRoom = () => {
    if (!roomCode) return;
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: roomCode, isLocal: false } });
    roomService.connect(playerName, playerName, roomCode, true);
    setPlayerPopupOpen(true);
  };

  const handleSinglePlayer = () => {
    const newRoomId = "L-" + generateRandomCode();
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: newRoomId, isLocal: true } });
  };

  const handleCancel = () => {
    roomService.disconnect();
    setPlayerPopupOpen(false);
  };

  return (
    <div
      className="main-scene flex flex-col items-center justify-center h-full bg-green-800 text-white"
      ref={containerRef}
    >
      <div className="flex flex-row absolute left-0 top-2">
        <div className="flex flex-row items-center">
          <Profile className="m-5 mr-2" />
          {<span className="font-worksans">{playerName}</span>}
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
            onClick={handleSinglePlayer}
            title="Single Player"
            disabled={status === "connecting"}
        />
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