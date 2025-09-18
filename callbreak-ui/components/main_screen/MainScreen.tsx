"use client";
import Image from "next/image";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/contexts/ToastContext";
import { useRoom } from "@/contexts/RoomContext";
import { usePathname } from "next/navigation";
import { generateRandomCode } from "@/lib/utils";
import { usePlayerName } from "@/hooks/usePlayerName";
import { MultiplayerPopup } from "@/components/ui/MultiplayerPopup";
import { WaitingPopup } from "@/components/ui/WaitingPopup";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { idl, BettingContract } from "betting-contract-idl";

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
  const { connected, publicKey, signTransaction, signAllTransactions } =
    useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [isMultiplayerPopupOpen, setMultiplayerPopupOpen] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<
    {
      roomCode: string;
      matchId: string;
      roomFee: number;
      playerCount: number;
    }[]
  >([]);
  const [isJoining, setIsJoining] = useState(false);
  const [joiningMessage, setJoiningMessage] = useState("");

  const pathname = usePathname();

  const pendingJoinRef = useRef<{
    roomId: string;
    matchId: string;
    roomFee: number;
    isJoin: boolean;
  } | null>(null);

  const getProvider = () => {
    if (!publicKey || !signTransaction || !signAllTransactions)
      throw new Error("Wallet not connected");
    const provider = new AnchorProvider(
      connection,
      { publicKey, signTransaction, signAllTransactions },
      { preflightCommitment: "processed" }
    );
    return provider;
  };

  const joinMatch = async (
    roomId: string,
    matchId: string,
    roomFee: number
  ) => {
    if (!publicKey) {
      addToast("Please connect your wallet first.", { color: "red" });
      return false;
    }
    try {
      const provider = getProvider();
      const program = new Program(idl as BettingContract, provider);

      const matchAccount = new PublicKey(roomId);

      await program.methods
        .joinMatch(matchId)
        .accounts({
          player: publicKey,
          matchAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      addToast("Successfully joined match!", { color: "green" });
      return true;
    } catch (err: any) {
      addToast(err.message, { color: "red" });
      return false;
    }
  };

  const fetchRooms = useCallback(() => {
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
  }, [addToast]);

  useEffect(() => {
    if (isMultiplayerPopupOpen && connected) {
      fetchRooms(); // Fetch immediately on open
      const interval = setInterval(fetchRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [isMultiplayerPopupOpen, connected, fetchRooms]);

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    if (
      pathParts.length === 2 &&
      playerName &&
      !roomState.manualDisconnect &&
      publicKey
    ) {
      const [roomType, roomId] = pathParts;
      if (roomType === "multi") {
        getMatchAccount(roomId).then((matchAccount) => {
          console.log("Match account", matchAccount);
          if (
            matchAccount &&
            matchAccount.players
              .map((p: PublicKey) => p.toBase58())
              .includes(publicKey.toBase58())
          ) {
            const isLocal = false;
            dispatch({
              type: "SET_ROOM",
              payload: {
                id: playerName,
                name: playerName,
                roomId,
                isLocal,
              },
            });
          } else {
            addToast("You are not a player in this match.", { color: "red" });
            window.history.pushState({}, "", "/");
          }
        });
      } else if (roomType === "local") {
        dispatch({
          type: "SET_ROOM",
          payload: {
            id: playerName,
            name: playerName,
            roomId,
            isLocal: true,
          },
        });
      }
    }
  }, [pathname, playerName, dispatch, roomState.manualDisconnect, publicKey]);

  useEffect(() => {
    const pathParts = pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      roomService.disconnect();
    }
  }, [pathname, roomService]);

  useEffect(() => {
    const handleOpen = async () => {
      const roomType = roomState.isLocal ? "local" : "multi";
      window.history.pushState({}, "", `/${roomType}/${roomState.roomId}`);
      setScene("game");
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

  const getMatchAccount = async (matchId: string) => {
    try {
      const provider = getProvider();
      const program = new Program(idl as BettingContract, provider);
      const matchPda = new PublicKey(matchId);
      const matchAccount = await (program.account as any).matchAccount.fetch(
        matchPda
      );
      return matchAccount;
    } catch (error) {
      console.error("Failed to fetch match account:", error);
      return null;
    }
  };

  const handleCreateRoom = async (roomFee: number) => {
    if (!publicKey) {
      addToast("Please connect your wallet first.", { color: "red" });
      return;
    }
    try {
      const res = await fetch(
        `http://${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomFee, host: publicKey.toBase58() }),
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const { roomId } = await res.json();

      pendingJoinRef.current = { roomId, roomFee, isJoin: false };
      dispatch({
        type: "SET_ROOM",
        payload: {
          id: playerName,
          name: playerName,
          roomId,
          isLocal: false,
        },
      });
      roomService.connect(playerName, playerName, roomId, false, roomFee);
      setMultiplayerPopupOpen(false);
    } catch (error: any) {
      addToast(`Failed to create room: ${error.message}`, { color: "red" });
    }
  };

  const handleJoinRoom = async (
    roomCode: string,
    matchId: string,
    roomFee: number
  ) => {
    if (!roomCode) return;

    setMultiplayerPopupOpen(false);
    setIsJoining(true);
    setJoiningMessage("Checking if you are already in the match...");

    const matchAccountData = await getMatchAccount(roomCode);
    if (
      matchAccountData &&
      publicKey &&
      matchAccountData.players
        .map((p: PublicKey) => p.toBase58())
        .includes(publicKey.toBase58())
    ) {
      setJoiningMessage("You are already in the match. Joining...");
      pendingJoinRef.current = {
        roomId: roomCode,
        matchId,
        roomFee,
        isJoin: false, // Don't re-join if already a player
      };
      dispatch({
        type: "SET_ROOM",
        payload: {
          id: playerName,
          name: playerName,
          roomId: roomCode,
          isLocal: false,
        },
      });
      roomService.connect(
        playerName,
        playerName,
        roomCode,
        true,
        roomFee,
        publicKey?.toBase58()
      );
      return;
    }

    setJoiningMessage("Connecting to room...");
    pendingJoinRef.current = {
      roomId: roomCode,
      matchId,
      roomFee,
      isJoin: true,
    };
    dispatch({
      type: "SET_ROOM",
      payload: {
        id: playerName,
        name: playerName,
        roomId: roomCode,
        isLocal: false,
      },
    });
    roomService.connect(
      playerName,
      playerName,
      roomCode,
      true,
      roomFee,
      publicKey?.toBase58()
    );
  };

  const [isJoiningOnline, setIsJoiningOnline] = useState(false);

  const handleSinglePlayer = () => {
    const newRoomId = "L-" + generateRandomCode();
    dispatch({
      type: "SET_ROOM",
      payload: {
        id: playerName,
        name: playerName,
        roomId: newRoomId,
        isLocal: true,
      },
    });
  };

  const handleOnlineJoin = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setIsJoiningOnline(true);
    try {
      const roomFee = 1; // Hardcoded room fee
      const res = await fetch(
        `http://${process.env.NEXT_PUBLIC_BACKEND_URL}/api/join-online`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomFee, host: publicKey?.toBase58() }),
        }
      );
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const { roomId, matchId } = await res.json();
      
      const success = await joinMatch(roomId, matchId, roomFee);

      if (success) {
        dispatch({
          type: "SET_ROOM",
          payload: {
            id: playerName,
            name: playerName,
            roomId: roomId,
            isLocal: false,
          },
        });
        roomService.connect(
          playerName,
          playerName,
          roomId,
          true,
          roomFee,
          publicKey?.toBase58()
        );
      }
    } catch (error: any) {
      addToast(`Failed to join online game: ${error.message}`, {
        color: "red",
      });
    } finally {
      setIsJoiningOnline(false);
    }
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
          onClick={handleOnlineJoin}
          title="Online"
          disabled={status === "connecting" || isJoiningOnline}
        />
      </div>
      <WaitingPopup isOpen={isJoining} message={joiningMessage} />
    </div>
  );
}