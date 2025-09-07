export type Player = {
  id: string;
  name: string;
  country: string;
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
}
