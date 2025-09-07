import {
	Bot,
	CallbreakGame,
	Game,
	GameFactory,
	Player,
	RoomService,
	RoomConnectionStatus,
	ClientMessage,
} from 'game-logic';

const LOCAL_STORAGE_PREFIX = 'callbreak-game-';

class LocalRoom extends RoomService {
	public status: RoomConnectionStatus = 'disconnected';
	public errorMessage: string | null = null;
	public players: Map<string, Player> = new Map();
	public hostId: string | undefined = undefined;

	private game: CallbreakGame | null = null;
	private isActive: boolean = false;
	private bots: Record<string, Bot> = {};
	private localPlayerId: string | null = null;
	private roomId: string | null = null;

	constructor() {
		super();
	}

	connect(id: string, name: string, roomId: string, noCreate: boolean = false): void {
		if (this.status === 'connected' || this.status === 'connecting') return;

		this.status = 'connecting';
		this.emit('status', this.status);
		this.localPlayerId = id;
		this.roomId = roomId;

		setTimeout(() => {
			this.hostId = id;
			const player = new Player(id, name, 'US');
			this.join(player);

			const savedGame = localStorage.getItem(LOCAL_STORAGE_PREFIX + this.roomId);
			if (savedGame) {
				try {
					const savedState = JSON.parse(savedGame);
					this.game = CallbreakGame.fromJSON(savedState, this.players);
					this.setupGameListeners();
					this.emit('gameStarted', {});
					this.isActive = true;
					// Resync all players
					for (const p of this.players.values()) {
						this.game.onReconnect(p);
					}
				} catch (e) {
					console.error("Error loading saved game", e);
					localStorage.removeItem(LOCAL_STORAGE_PREFIX + this.roomId);
					this.handleMessage(id, { type: 'startGame', scope: 'room', payload: {} });
				}
			} else {
				this.handleMessage(id, { type: 'startGame', scope: 'room', payload: {} });
			}

			this.status = 'connected';
			this.emit('status', this.status);
			this.emit('open');
		}, 100);
	}

	disconnect(): void {
		if (this.roomId) {
			localStorage.removeItem(LOCAL_STORAGE_PREFIX + this.roomId);
		}
		this.players.clear();
		this.bots = {};
		if (this.game) {
			this.game.removeAllListeners();
			this.game = null;
		}
		this.isActive = false;
		this.status = 'disconnected';
		this.emit('status', this.status);
	}

	send(message: ClientMessage): void {
		if (this.localPlayerId) {
			this.handleMessage(this.localPlayerId, message);
		}
	}

	private join(player: Player): void {
		if (this.isActive && this.game) {
			if (this.players.has(player.id)) {
				this.game.onReconnect(player);
			}
			return;
		}

		this.emit('playerJoined', player.toSerializable());
		this.players.set(player.id, player);

		const allPlayers = Array.from(this.players.values()).map((p) => p.toSerializable());
		if (player.id === this.localPlayerId) {
			this.emit('welcome', {
				players: allPlayers,
				hostId: this.hostId,
			});
		}

		if (Object.keys(this.bots).length === 0) {
			while (this.players.size < 4) {
				const botId = `bot-${this.players.size + 1}`;
				const bot = new Bot(botId, `Bot ${this.players.size + 1}`, 'US');
				this.bots[bot.id] = bot;
				bot.on('action', (action) => this.handleMessage(bot.id, action as ClientMessage));
				this.join(bot.player);
			}
		}
	}

	private handleMessage(playerId: string, message: ClientMessage): void {
		const player = this.players.get(playerId);
		if (!player) return;

		if (message.scope === 'game' && this.isActive && this.game) {
			this.game.onMessage(player, message);
		} else if (message.scope === 'room') {
			this.handleLobbyMessage(player, message);
		}
	}

	private handleLobbyMessage(player: Player, message: ClientMessage): void {
		if (message.type === 'startGame') {
			if (player.id !== this.hostId) return;
			if (this.isActive) return;

			const gameFactory: GameFactory = (players) => new CallbreakGame(players, { timer: false });
			const game = gameFactory(this.players);
			const error = game.allowStart();

			if (error) {
				if (player.id === this.localPlayerId) {
					this.emit('error', { message: error });
				}
				return;
			}
			this.game = game as CallbreakGame;
			this.setupGameListeners();
			this.emit('gameStarted', {});
			this.isActive = true;
			this.game.start();
		}
	}

	private setupGameListeners(): void {
		if (!this.game) return;

		const saveGameState = () => {
			if (this.game && this.roomId) {
				localStorage.setItem(LOCAL_STORAGE_PREFIX + this.roomId, JSON.stringify(this.game.toJSON()));
			}
		};

		this.game.on('broadcast', (type: string, payload: any) => {
			this.emit(type, payload);
			Object.values(this.bots).forEach((b) => b.onGameMessage({ type, payload }));
			saveGameState();
		});

		this.game.on('send', (playerId: string, type: string, payload: any) => {
			const bot = this.bots[playerId];
			if (bot) {
				bot.onGameMessage({ type, payload });
			} else if (playerId === this.localPlayerId) {
				this.emit(type, payload);
			}
			saveGameState();
		});

		this.game.on('ended', (reason: string, { winnerId }: { winnerId?: string } = {}) => {
			this.isActive = false;
			if (this.roomId) {
				localStorage.removeItem(LOCAL_STORAGE_PREFIX + this.roomId);
			}
			this.game?.removeAllListeners();
			this.game = null;
			this.emit('gameEnded', { reason, winnerId });
		});

		this.game.on('error', (player: Player, message: string) => {
			if (player.id === this.localPlayerId) {
				this.emit('error', { message });
			}
		});
	}
}

const instance = new LocalRoom();
export default instance;
