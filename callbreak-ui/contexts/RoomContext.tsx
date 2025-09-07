"use client";
import React, { createContext, useContext, useReducer, useEffect } from "react";
import RoomService, { RoomConnectionStatus } from "@/lib/RoomService";
import { Player, RoomState } from "@/lib/RoomState";

type RoomAction =
  | { type: "SET_ROOM"; payload: { id: string; name: string; roomId: string } }
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
};

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "SET_ROOM":
      return { ...initialState, ...action.payload, manualDisconnect: false };
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
  roomService: typeof RoomService;
};

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [roomState, dispatch] = useReducer(roomReducer, initialState);

  useEffect(() => {
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

    RoomService.on("status", handleStatusChange);
    RoomService.on("error", handleError);
    RoomService.on("welcome", handleWelcome);
    RoomService.on("playerJoined", handlePlayerJoined);
    RoomService.on("playerLeft", handlePlayerLeft);
    RoomService.on("hostChanged", handleHostChanged);

    return () => {
      RoomService.off("status", handleStatusChange);
      RoomService.off("error", handleError);
      RoomService.off("welcome", handleWelcome);
      RoomService.off("playerJoined", handlePlayerJoined);
      RoomService.off("playerLeft", handlePlayerLeft);
      RoomService.off("hostChanged", handleHostChanged);
    };
  }, []);

  return (
    <RoomContext.Provider value={{ roomState, dispatch, roomService: RoomService }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}