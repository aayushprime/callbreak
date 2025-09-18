"use client";
import { useGame } from "./GameContext";
import React, { createContext, useContext, useReducer, useEffect } from "react";
import RoomService from "@/lib/RoomService";
import LocalRoomService from "@/lib/LocalRoomService";
import { Player, RoomState } from "@/lib/RoomState";
import {
  RoomConnectionStatus,
} from "@/lib/RoomService";
import { EventEmitter } from "events";

type RoomAction =
  | { type: "SET_ROOM"; payload: { id: string; name: string; roomId: string; isLocal?: boolean } }
  | { type: "SET_STATUS"; payload: RoomConnectionStatus }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_PLAYERS"; payload: Player[] }
  | { type: "SET_HOST"; payload: string }
  | { type: "PLAYER_JOINED"; payload: Player }
  | { type: "PLAYER_LEFT"; payload: string }
  | { type: "MANUAL_DISCONNECT" }
  | { type: "RESET" };

const initialState: RoomState = {
  id: "",
  name: "",
  roomId: "",
  players: [],
  hostId: "",
  status: "disconnected",
  errorMessage: null,
  manualDisconnect: false,
  isLocal: false,
};

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "SET_ROOM":
      return { ...initialState, ...action.payload, manualDisconnect: false, isLocal: !!action.payload.isLocal, status: "connecting" };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_ERROR":
      return { ...state, status: "error", errorMessage: action.payload };
    case "SET_PLAYERS":
      return { ...state, players: action.payload };
    case "SET_HOST":
      return { ...state, hostId: action.payload };
    case "PLAYER_JOINED":
      return { ...state, players: [...state.players, action.payload] };
    case "PLAYER_LEFT":
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.payload),
      };
    case "MANUAL_DISCONNECT":
      return { ...initialState, manualDisconnect: true };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

type RoomContextType = {
  roomState: RoomState;
  dispatch: React.Dispatch<RoomAction>;
  roomService: EventEmitter;
};

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [roomState, dispatch] = useReducer(roomReducer, initialState);
  const roomService = roomState.isLocal ? LocalRoomService : RoomService;
  const { setScene } = useGame();

  useEffect(() => {
    if (roomState.status === 'connecting') {
      roomService.connect(roomState.id, roomState.name, roomState.roomId);
    }
  }, [roomState.status, roomState.id, roomState.name, roomState.roomId, roomService]);

  useEffect(() => {
    const service = roomState.isLocal ? LocalRoomService : RoomService;

    const handleStatusChange = (status: RoomConnectionStatus) => {
      dispatch({ type: "SET_STATUS", payload: status });
    };

    const handleError = ({ message }: { message: string }) => {
      dispatch({ type: "SET_ERROR", payload: message });
    };

    const handleWelcome = (payload: { players: Player[]; hostId: string }) => {
      dispatch({ type: "SET_PLAYERS", payload: payload.players });
      dispatch({ type: "SET_HOST", payload: payload.hostId });
    };

    const handlePlayerJoined = (player: Player) => {
      dispatch({ type: "PLAYER_JOINED", payload: player });
    };

    const handlePlayerLeft = ({ playerId }: { playerId: string }) => {
      dispatch({ type: "PLAYER_LEFT", payload: playerId });
    };

    const handleHostChanged = ({ newHostId }: { newHostId: string }) => {
      dispatch({ type: "SET_HOST", payload: newHostId });
    };

    const handleGameStarted = () => {
      setScene("game");
    };

    service.on("status", handleStatusChange);
    service.on("error", handleError);
    service.on("welcome", handleWelcome);
    service.on("playerJoined", handlePlayerJoined);
    service.on("playerLeft", handlePlayerLeft);
    service.on("hostChanged", handleHostChanged);
    service.on("gameStarted", handleGameStarted);

    return () => {
      service.off("status", handleStatusChange);
      service.off("error", handleError);
      service.off("welcome", handleWelcome);
      service.off("playerJoined", handlePlayerJoined);
      service.off("playerLeft", handlePlayerLeft);
      service.off("hostChanged", handleHostChanged);
      service.off("gameStarted", handleGameStarted);
    };
  }, [roomState.isLocal, setScene]);

  return (
    <RoomContext.Provider value={{ roomState, dispatch, roomService }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  const roomService = ctx.roomState.isLocal ? LocalRoomService : RoomService;
  return { ...ctx, roomService };
}
