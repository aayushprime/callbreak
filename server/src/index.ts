import uWS, { WebSocket, HttpRequest, HttpResponse } from "uwebsockets.js";
import {
  CallbreakGame,
  ServerMessage,
  ClientMessage,
  CallbreakBot,
} from "callbreak-engine";
import { CallbreakRoom } from "./room.js";
import { Player, GameFactory, BotFactory, Room } from "room-service";
import { rooms } from "./registry.js";
import { getRooms } from "./api.js";

interface UserData {
  playerId: string | null;
  roomId: string | null;
  name: string | null;
  noCreate: boolean;
  roomFee: number;
}

interface WebSocketAttachment {
  player: Player;
  room: Room;
}

type CustomWebSocket = WebSocket<UserData> & {
  attachment: WebSocketAttachment;
};

const gameFactory: GameFactory = (players) => new CallbreakGame(players);
const botFactory: BotFactory = (player) => new CallbreakBot(player);

class RoomManager {
  getOrCreateRoom(
    roomId: string,
    gameFactory: GameFactory,
    roomFee: number,
  ): { room: Room; isNew: boolean } {
    let isNew = false;

    if (!rooms.has(roomId)) {
      const room = new CallbreakRoom(
        roomId,
        gameFactory,
        botFactory,
        roomFee,
        () => rooms.delete(roomId),
      );
      rooms.set(roomId, room);
      isNew = true;
    }

    return { room: rooms.get(roomId)!, isNew };
  }
}

export class ServerController {
  private roomManager = new RoomManager();
  private connectionMap = new Map<string, WebSocket<UserData>>();

  constructor(port: number) {
    const app = uWS
      .App({})
      .get("/api/rooms", (res, req) => {
        const rooms = getRooms();
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify(rooms));
      })
      .ws<UserData>("/*", {
        upgrade: (res: HttpResponse, req: HttpRequest, context) => {
          const secWebSocketKey = req.getHeader("sec-websocket-key");
          const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
          const secWebSocketExtensions = req.getHeader(
            "sec-websocket-extensions",
          );

          const params = new URLSearchParams(req.getQuery());
          const playerId = params.get("id");
          const roomId = params.get("roomId");
          const name = params.get("name");
          const noCreate = params.get("noCreate") === "true";
          const roomFee = Number(params.get("roomFee") || "0");

          res.upgrade(
            { playerId, roomId, name, noCreate, roomFee },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context,
          );
        },

        /* `open` handler validates, sends a specific error message on failure, then closes. */
        open: (ws: WebSocket<UserData>) => {
          const { playerId, roomId, name, noCreate } = ws.getUserData();

          // --- VALIDATION BLOCK ---

          // 1. Check for missing credentials.
          if (!playerId || !roomId || !name) {
            const reason = "Missing credentials";
            console.log(`Validation failed: ${reason}.`, {
              playerId,
              roomId,
              name,
            });
            // Send a structured error message first
            ws.send(JSON.stringify({ type: "error", message: reason }));
            // Then close the connection
            ws.end(4000, reason);
            return;
          }

          // 2. Check if player ID is already in use.
          if (this.connectionMap.has(playerId)) {
            const reason = "Player ID already connected";
            console.log(`Validation failed: ${reason}:`, playerId);
            ws.send(JSON.stringify({ type: "error", message: reason }));
            ws.end(4001, reason);
            return;
          }

          // 3. Check if joining a non-existent room is disallowed.
          const room = rooms.get(roomId);
          if (!room && noCreate) {
            const reason = "Room not found";
            console.log(
              `Validation failed: ${reason} and creation is disabled.`,
            );
            ws.send(JSON.stringify({ type: "error", message: reason }));
            ws.end(4002, reason);
            return;
          }

          // --- END VALIDATION ---

          // If all checks pass, proceed with the connection setup.
          ws.send(JSON.stringify({ type: "open" }));
          this.onConnection(ws);
        },

        message: (
          ws: WebSocket<UserData>,
          message: ArrayBuffer,
          isBinary: boolean,
        ) => {
          // This will only be called for fully established connections, not for the error messages above.
          const { player, room } = (ws as CustomWebSocket).attachment;
          this.onMessage(player, room, message);
        },

        close: (
          ws: WebSocket<UserData>,
          code: number,
          message: ArrayBuffer,
        ) => {
          const attachment = (ws as CustomWebSocket).attachment;
          if (attachment) {
            const { player, room } = attachment;
            this.onClose(player, room);
          } else {
            console.log(`Connection closed pre-attachment. Code: ${code}`);
          }
        },
      });
    app.listen("0.0.0.0", 8080, (socket) => {
      if (socket) {
        console.log(`Server started on 0.0.0.0 ${port}`);
      } else {
        console.log(`Failed to start server on port ${port}`);
      }
    });
    app.listen("::", port, (socket) => {
      if (socket) {
        console.log(`Server started on :: ${port}`);
      } else {
        console.log(`Failed to start server on port ${port}`);
      }
    });
  }

  /**
   * Handles a new, validated WebSocket connection.
   */
  private onConnection(ws: WebSocket<UserData>): void {
    const { playerId, roomId, name, roomFee } = ws.getUserData();

    const player = new Player(playerId!, name!, "US");
    this.connectionMap.set(player.id, ws);

    const { room, isNew } = this.roomManager.getOrCreateRoom(
      roomId!,
      gameFactory,
      roomFee,
    );

    if (isNew) {
      this.setupRoomListeners(room);
    }

    (ws as CustomWebSocket).attachment = { player, room };

    room.join(player);
  }

  private setupRoomListeners(room: Room): void {
    room.on(
      "broadcast",
      (scope: "room" | "game", type: string, payload: any) => {
        const message: ServerMessage = { scope, type, payload };
        const stringifiedMessage = JSON.stringify(message);

        room.players.forEach((player: Player) => {
          const conn = this.connectionMap.get(player.id);
          if (conn) {
            conn.send(stringifiedMessage);
          }
        });
      },
    );

    room.on(
      "send",
      (
        scope: "room" | "game",
        playerId: string,
        type: string,
        payload: any,
      ) => {
        const message: ServerMessage = { scope, type, payload };
        const stringifiedMessage = JSON.stringify(message);

        const conn = this.connectionMap.get(playerId);
        if (conn) {
          conn.send(stringifiedMessage);
        }
      },
    );

    room.on("close", (playerId: string, reason: string) => {
      const conn = this.connectionMap.get(playerId);
      if (conn) {
        conn.send(JSON.stringify({ type: "error", message: reason }));
        conn.end(4002, reason);
      }
    });
  }

  private onMessage(player: Player, room: Room, data: ArrayBuffer): void {
    const message: ClientMessage = JSON.parse(Buffer.from(data).toString());
    room.handleMessage(player.id, message);
  }

  private onClose(player: Player, room: Room): void {
    console.log(`Player ${player.name} (${player.id}) disconnected.`);
    this.connectionMap.delete(player.id);
    room.leave(player.id);
  }
}

new ServerController(8080);
