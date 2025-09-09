import { Player as GamePlayer } from "room-service";

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
