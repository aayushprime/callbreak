import uWS, { TemplatedApp, WebSocket } from 'uwebsockets.js';

import { GameFactory } from './lobby.js';
import { Player } from './player.js';
import { CallbreakGame } from './game.js';
import { Room } from './lobby.js';
import { ServerMessage, ClientMessage } from './message.js';

// Define the shape of the data passed from upgrade to the open event.
interface UserData {
	playerId: string | null;
	roomId: string | null;
	name: string | null;
	noCreate: boolean;
}

// Define the shape of the data we attach to the WebSocket after connection.
interface WebSocketAttachment {
	player: Player;
	room: Room;
}

// Combine the WebSocket type with our custom attachment for cleaner casting.
type CustomWebSocket = WebSocket<UserData> & { attachment: WebSocketAttachment };

class RoomManager {
	rooms = new Map<string, Room>();

	getOrCreateRoom(roomId: string, gameFactory: GameFactory): { room: Room; isNew: boolean } {
		let isNew = false;

		if (!this.rooms.has(roomId)) {
			const room = new Room(roomId, gameFactory, () => this.rooms.delete(roomId));
			this.rooms.set(roomId, room);
			isNew = true;
		}

		return { room: this.rooms.get(roomId)!, isNew };
	}
}

export class ServerController {
	private roomManager = new RoomManager();
	private connectionMap = new Map<string, WebSocket<UserData>>();

	constructor(port: number) {
		uWS
			.App({})
			.ws<UserData>('/*', {
				upgrade: (res, req, context) => {
					const secWebSocketKey = req.getHeader('sec-websocket-key');
					const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
					const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

					const params = new URLSearchParams(req.getQuery());
					const playerId = params.get('id');
					const roomId = params.get('roomId');
					const name = params.get('name');
					const noCreate = params.get('noCreate') === 'true';

					res.upgrade({ playerId, roomId, name, noCreate }, secWebSocketKey, secWebSocketProtocol, secWebSocketExtensions, context);
				},

				/* `open` handler validates, sends a specific error message on failure, then closes. */
				open: (ws: WebSocket<UserData>) => {
					const { playerId, roomId, name, noCreate } = ws.getUserData();

					// --- VALIDATION BLOCK ---

					// 1. Check for missing credentials.
					if (!playerId || !roomId || !name) {
						const reason = 'Missing credentials';
						console.log(`Validation failed: ${reason}.`, { playerId, roomId, name });
						// Send a structured error message first
						ws.send(JSON.stringify({ type: 'error', message: reason }));
						// Then close the connection
						ws.end(4000, reason);
						return;
					}

					// 2. Check if player ID is already in use.
					if (this.connectionMap.has(playerId)) {
						const reason = 'Player ID already connected';
						console.log(`Validation failed: ${reason}:`, playerId);
						ws.send(JSON.stringify({ type: 'error', message: reason }));
						ws.end(4001, reason);
						return;
					}

					// 3. Check if joining a non-existent room is disallowed.
					const room = this.roomManager.rooms.get(roomId);
					if (!room && noCreate) {
						const reason = 'Room not found';
						console.log(`Validation failed: ${reason} and creation is disabled.`);
						ws.send(JSON.stringify({ type: 'error', message: reason }));
						ws.end(4002, reason);
						return;
					}

					// --- END VALIDATION ---

					// If all checks pass, proceed with the connection setup.
					ws.send(JSON.stringify({ type: 'open' }));
					this.onConnection(ws);
				},

				message: (ws: WebSocket<UserData>, message: ArrayBuffer, isBinary: boolean) => {
					// This will only be called for fully established connections, not for the error messages above.
					const { player, room } = (ws as CustomWebSocket).attachment;
					this.onMessage(player, room, message);
				},

				close: (ws: WebSocket<UserData>, code: number, message: ArrayBuffer) => {
					const attachment = (ws as CustomWebSocket).attachment;
					if (attachment) {
						const { player, room } = attachment;
						this.onClose(player, room);
					} else {
						console.log(`Connection closed pre-attachment. Code: ${code}`);
					}
				},
			})
			.listen(port, (token) => {
				if (token) {
					console.log(`Server started on port ${port}`);
				} else {
					console.log(`Failed to start server on port ${port}`);
				}
			});
	}

	/**
	 * Handles a new, validated WebSocket connection.
	 */
	private onConnection(ws: WebSocket<UserData>): void {
		const { playerId, roomId, name } = ws.getUserData();

		const player = new Player(playerId!, name!, 'US');
		this.connectionMap.set(player.id, ws);

		const gameFactory = (players: Map<string, Player>) => new CallbreakGame(players);
		const { room, isNew } = this.roomManager.getOrCreateRoom(roomId!, gameFactory);

		if (isNew) {
			this.setupRoomListeners(room);
		}

		(ws as CustomWebSocket).attachment = { player, room };

		room.join(player);
	}

	private setupRoomListeners(room: Room): void {
		room.on('broadcast', (scope: 'room' | 'game', type: string, payload: any) => {
			const message: ServerMessage = { scope, type, payload };
			const stringifiedMessage = JSON.stringify(message);

			room.players.forEach((player) => {
				const conn = this.connectionMap.get(player.id);
				if (conn) {
					conn.send(stringifiedMessage);
				}
			});
		});

		room.on('send', (scope: 'room' | 'game', playerId: string, type: string, payload: any) => {
			const message: ServerMessage = { scope, type, payload };
			const stringifiedMessage = JSON.stringify(message);

			const conn = this.connectionMap.get(playerId);
			if (conn) {
				conn.send(stringifiedMessage);
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
