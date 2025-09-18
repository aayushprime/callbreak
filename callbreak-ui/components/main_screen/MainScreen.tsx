"use client";
import Image from "next/image";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/contexts/ToastContext";
import { useRoom } from "@/contexts/RoomContext";
import { usePathname } from "next/navigation";
import { generateRandomCode } from "@/lib/utils";
import { usePlayerName } from "@/hooks/usePlayerName";
import { MultiplayerPopup } from "@/components/ui/MultiplayerPopup";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const UserProfile = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { addToast } = useToast();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey, connection]);

  const handleCopy = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      addToast("Address copied to clipboard", { color: "blue" });
    }
  };

  if (!publicKey) return null;

  const pubKeyStr = publicKey.toBase58();
  const shortPubKey = `${pubKeyStr.slice(0, 4)}...${pubKeyStr.slice(-4)}`;

  return (
    <div className="flex flex-row items-center">
      <img
        src={`https://www.gravatar.com/avatar/${pubKeyStr}?d=identicon`}
        alt="Avatar"
        width={40}
        height={40}
        className="rounded-full mr-2"
      />
      <div
        className="flex flex-col text-xs cursor-pointer"
        onClick={handleCopy}
        title={pubKeyStr}
      >
        <span>{shortPubKey}</span>
        <span className="font-bold">{balance.toFixed(2)} SOL</span>
      </div>
    </div>
  );
};

const Login = () => {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <div className="flex flex-row items-center gap-4">
        <UserProfile />
        <Button onClick={disconnect} title="Logout" />
      </div>
    );
  } else {
    return <Button onClick={() => setVisible(true)} title="Login" />;
  }
};

export function MainScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerName] = usePlayerName();
  const { roomState, dispatch, roomService } = useRoom();
  const { setScene } = useGame();
  const { addToast } = useToast();
  const { status } = roomState;
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [isMultiplayerPopupOpen, setMultiplayerPopupOpen] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);

  const pathname = usePathname();

  useEffect(() => {
    if (isMultiplayerPopupOpen && connected) {
      if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
        addToast("Backend URL is not configured.");
        return;
      }
      fetch(`http://${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch rooms");
          }
          return res.json();
        })
        .then((data) => {
          setAvailableRooms(data);
        })
        .catch((err) => {
          addToast(err.message);
        });
    }
  }, [isMultiplayerPopupOpen, connected, addToast]);

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

  const handleCreateRoom = (roomFee: number) => {
    const newRoomId = "G-" + generateRandomCode();
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: newRoomId, isLocal: false } });
    roomService.connect(playerName, playerName, newRoomId, false, roomFee);
    setMultiplayerPopupOpen(false);
  };

  const handleJoinRoom = (roomCode: string) => {
    if (!roomCode) return;
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: roomCode, isLocal: false } });
    roomService.connect(playerName, playerName, roomCode, true);
    setMultiplayerPopupOpen(false);
  };

  const handleSinglePlayer = () => {
    const newRoomId = "L-" + generateRandomCode();
    dispatch({ type: "SET_ROOM", payload: { id: playerName, name: playerName, roomId: newRoomId, isLocal: true } });
  };

  const handleMultiplayer = () => {
    if (connected) {
      setMultiplayerPopupOpen(true);
    } else {
      setVisible(true);
    }
  };

  const handleCancel = () => {
    roomService.disconnect();
    setMultiplayerPopupOpen(false);
  };

  return (
    <div
      className="main-scene flex flex-col items-center justify-center h-full bg-green-800 text-white"
      ref={containerRef}
    >
      <div className="absolute left-5 top-5">
        <Login />
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
          onClick={handleMultiplayer}
          title="Multiplayer"
          disabled={status === "connecting"}
        />
      </div>
      <MultiplayerPopup
        isOpen={isMultiplayerPopupOpen}
        onClose={handleCancel}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        status={status}
        availableRooms={availableRooms}
      />
    </div>
  );
}


