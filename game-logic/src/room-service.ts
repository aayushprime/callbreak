import { EventEmitter } from 'events';
import { ClientMessage } from './message';

export type RoomConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export abstract class RoomService extends EventEmitter {
  abstract status: RoomConnectionStatus;
  abstract errorMessage: string | null;
  abstract connect(id: string, name: string, roomId: string): void;
  abstract disconnect(): void;
  abstract send(message: ClientMessage): void;
}
