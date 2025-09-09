import { ClientMessage } from "./message.js";
import { EventEmitter } from "events";
import { Game, Bot, Player, Room } from "room-service";

export type GameFactory = (players: Map<string, Player>) => Game;

export const CallbreakRoom = Room;
