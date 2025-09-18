import { rooms } from "./registry.js";

export function getRooms() {
  return Array.from(rooms.values()).map((room) => ({
    roomCode: room.id,
    roomFee: room.roomFee,
    playerCount: room.players.size,
  }));
}
