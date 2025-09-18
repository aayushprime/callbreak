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
import { getRooms, createRoom, getMatchAccount, createRoomAndAddBots, startMatch, settleMatch, closeMatch } from "./api.js";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import {
  Program,
  AnchorProvider,
  Wallet,
  IdlAccounts,
} from "@coral-xyz/anchor";

import type { BettingContract } from "betting-contract-idl";
import {idl} from "betting-contract-idl"
import keys from "./keys.json" with { type: "json" };

// Derive the MatchAccount type from the IDL
type MatchAccount = IdlAccounts<BettingContract>["matchAccount"];

const generateRandomName = () => {
  const adjectives = ["Red", "Green", "Blue", "Yellow", "Purple", "Orange"];
  const nouns = ["Lion", "Tiger", "Bear", "Wolf", "Fox", "Eagle"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};

interface UserData {
  playerId: string | null;
  roomId: string | null;
  name: string | null;
  publicKey: string | null;
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

// This is a mock env for the api.ts functions.
// In a real-world scenario, you'd load this from a .env file or secrets manager.
const env = {
  SOLANA_RPC_URL: "http://127.0.0.1:8899",
  SERVER_WALLET_PRIVATE_KEY: process.env.SERVER_WALLET_PRIVATE_KEY || JSON.stringify(keys.host),
};

const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
const privateKeyBytes = JSON.parse(env.SERVER_WALLET_PRIVATE_KEY);
const serverKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
const wallet = new Wallet(serverKeypair);

const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const program = new Program<BettingContract>(idl as any, provider);

const withCors = (res: HttpResponse) => {
  res.writeHeader("Access-Control-Allow-Origin", "*");
  res.writeHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.writeHeader("Access-Control-Allow-Headers", "Content-Type");
  return res;
};

class RoomManager {
  getOrCreateRoom(
    roomId: string,
    gameFactory: GameFactory,
    roomFee: number
  ): { room: Room; isNew: boolean } {
    let isNew = false;

    if (!rooms.has(roomId)) {
      const isLocal = roomId.startsWith("L-");
      const room = new CallbreakRoom(
        roomId,
        gameFactory,
        botFactory,
        roomFee,
        () => rooms.delete(roomId),
        isLocal
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
      .options("/api/*", (res, req) => {
        withCors(res).end();
      })
      .get("/api/rooms", (res, req) => {
        res.onAborted(() => {
          res.aborted = true;
        });

        getRooms(program)
          .then((rooms) => {
            if (!res.aborted) {
              res.cork(() => {
                withCors(res)
                  .writeHeader("Content-Type", "application/json")
                  .end(JSON.stringify(rooms));
              });
            }
          })
          .catch((err) => {
            if (!res.aborted) {
              res.cork(() => {
                withCors(res)
                  .writeStatus("500 Internal Server Error")
                  .end("Failed to fetch rooms");
              });
            }
          });
      })
      .post("/api/rooms", (res, req) => {
        res.onData(async (ab, isLast) => {
          if (isLast) {
            try {
              const body = JSON.parse(Buffer.from(ab).toString());
              console.log("POST ", body);
              const { roomFee } = body;
              if (!roomFee) {
                res.cork(() => {
                  res.writeStatus("400 Bad Request");
                  withCors(res).end("Missing roomFee");
                });
                return;
              }
              const { roomId, matchId } = await createRoom(program, roomFee, serverKeypair);
              res.cork(() => {
                withCors(res)
                  .writeHeader("Content-Type", "application/json")
                  .end(JSON.stringify({ roomId, matchId }));
              });
            } catch (error: any) {
              res.writeStatus("500 Internal Server Error");
              withCors(res).end(error.message);
            }
          }
        });
        res.onAborted(() => {
          console.log("Request aborted");
        });
      })
      .post("/api/join-online", (res, req) => {
        res.onData(async (ab, isLast) => {
          if (isLast) {
            try {
              const body = JSON.parse(Buffer.from(ab).toString());
              const { roomFee } = body;
              if (!roomFee) {
                res.cork(() => {
                  res.writeStatus("400 Bad Request");
                  withCors(res).end("Missing roomFee");
                });
                return;
              }
              const {roomId, matchId} = await createRoomAndAddBots(program, roomFee, serverKeypair);
              res.cork(() => {
                withCors(res)
                  .writeHeader("Content-Type", "application/json")
                  .end(JSON.stringify({ roomId, matchId }));
              });
            } catch (error: any) {
              res.writeStatus("500 Internal Server Error");
              withCors(res).end(error.message);
            }
          }
        });
        res.onAborted(() => {
          console.log("Request aborted");
        });
      })
      .ws<UserData>("/*", {
        upgrade: (res: HttpResponse, req: HttpRequest, context) => {
          const secWebSocketKey = req.getHeader("sec-websocket-key");
          const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
          const secWebSocketExtensions = req.getHeader(
            "sec-websocket-extensions"
          );

          const params = new URLSearchParams(req.getQuery());
          const playerId = params.get("id");
          const roomId = params.get("roomId");
          const name = params.get("name");
          const publicKey = params.get("publicKey");
          const noCreate = params.get("noCreate") === "true";
          const roomFee = Number(params.get("roomFee") || "0");

          res.upgrade(
            { playerId, roomId, name, publicKey, noCreate, roomFee },
            secWebSocketKey,
            secWebSocketProtocol,
            secWebSocketExtensions,
            context
          );
        },

        open: async (ws: WebSocket<UserData>) => {
          const { playerId, roomId, name, publicKey, noCreate, roomFee } =
            ws.getUserData();
          if (!playerId || !roomId || !name || !publicKey) {
            const reason = "Missing credentials";
            ws.send(JSON.stringify({ type: "error", message: reason }));
            ws.end(4000, reason);
            return;
          }
          if (this.connectionMap.has(playerId)) {
            const reason = "Player ID already connected";
            ws.send(JSON.stringify({ type: "error", message: reason }));
            ws.end(4001, reason);
            return;
          }
          
          const { room, isNew } = this.roomManager.getOrCreateRoom(
            roomId!,
            gameFactory,
            roomFee
          );

          if (!roomId.startsWith("L-")) {
            const matchAccount = (await getMatchAccount(
              program,
              roomId
            )) as MatchAccount;
            if (!matchAccount) {
              const reason = "On-chain match not found";
              ws.send(JSON.stringify({ type: "error", message: reason }));
              ws.end(4004, reason);
              return;
            }
            const playerPubkeys = matchAccount.players.map((p: PublicKey) =>
              p.toBase58()
            );
            if (!playerPubkeys.includes(publicKey)) {
              const reason = "You are not a player in this on-chain match";
              ws.send(JSON.stringify({ type: "error", message: reason }));
              ws.end(4005, reason);
              return;
            }

            if (isNew) {
              this.setupRoomListeners(room);
              const botKeypairs = Object.values(keys.bots).map((bot) => Keypair.fromSecretKey(new Uint8Array(bot)));
              const botPubkeys = botKeypairs.map(k => k.publicKey.toBase58());
              
              const onChainBots = matchAccount.players.filter((p: PublicKey) => botPubkeys.includes(p.toBase58()));

              onChainBots.forEach((botKey: PublicKey, i: number) => {
                room.joinBot(botKey.toBase58());
              });
            }
          }

          ws.send(JSON.stringify({ type: "open" }));
          this.onConnection(ws, room);
        },

        message: (
          ws: WebSocket<UserData>,
          message: ArrayBuffer,
          isBinary: boolean
        ) => {
          const { player, room } = (ws as CustomWebSocket).attachment;
          this.onMessage(player, room, message);
        },

        close: (
          ws: WebSocket<UserData>,
          code: number,
          message: ArrayBuffer
        ) => {
          const attachment = (ws as CustomWebSocket).attachment;
          if (attachment) {
            const { player, room } = attachment;
            this.onClose(player, room);
          }
        },
      });
    app.listen(port, (socket) => {
      if (socket) {
        console.log(`Server started on port ${port}`);
      } else {
        console.log(`Failed to start server on port ${port}`);
      }
    });
  }

  private onConnection(ws: WebSocket<UserData>, room: Room): void {
    const { playerId } = ws.getUserData();
    const name = generateRandomName();
    const player = new Player(playerId!, name, "US");
    this.connectionMap.set(player.id, ws);
    
    (ws as CustomWebSocket).attachment = { player, room };
    room.join(player);

    if (room.players.size === 4) {
      room.startGame();
    }
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
      }
    );
    room.on(
      "send",
      (
        scope: "room" | "game",
        playerId: string,
        type: string,
        payload: any
      ) => {
        const message: ServerMessage = { scope, type, payload };
        const stringifiedMessage = JSON.stringify(message);
        const conn = this.connectionMap.get(playerId);
        if (conn) {
          conn.send(stringifiedMessage);
        }
      }
    );
    room.on("close", (playerId: string, reason: string) => {
      const conn = this.connectionMap.get(playerId);
      if (conn) {
        conn.send(JSON.stringify({ type: "error", message: reason }));
        conn.end(4002, reason);
      }
    });

    room.on("gameStartedOnChain", async () => {
      const matchAccount = await getMatchAccount(program, room.id);
      if (matchAccount) {
        await startMatch(program, matchAccount.id, serverKeypair);
      }
    });

    room.on("gameEndedOnChain", async (winnerId: string) => {
      const matchAccount = await getMatchAccount(program, room.id);
      if (matchAccount) {
        const winnerIndex = matchAccount.players.findIndex((p: PublicKey) => p.toBase58() === winnerId);
        if (winnerIndex !== -1) {
          await settleMatch(program, matchAccount.id, winnerIndex, serverKeypair);
          await closeMatch(program, matchAccount.id, serverKeypair);
        }
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