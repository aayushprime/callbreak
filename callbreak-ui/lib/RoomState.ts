import { Player as GamePlayer } from "game-logic";

export type Player = GamePlayer & {
  picture: string;
};

export interface RoomState {
  id: string;
  name: string;
  roomId: string;
  players: Player[];
  hostId: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  errorMessage: string | null;
  manualDisconnect: boolean;
  isLocal: boolean;
}