import { Player } from './player.js';
import { ClientMessage } from './message.js';
import { EventEmitter } from 'events';
import { Game } from './game.js';
import { Bot } from './bot.js';

export type GameFactory = (players: Map<string, Player>) => Game;
export type BotFactory = (profile: Player) => Bot;

export class Room extends EventEmitter {
	public players: Map<string, Player> = new Map();
	public hostId: string | undefined = undefined;

	private game: Game | null = null;
	private isActive: boolean = false; // Is a game currently running?
	private bots: Record<string, Bot> = {};

	constructor(
		public readonly id: string,
		private readonly gameFactory: GameFactory,
		private readonly botFactory: BotFactory,
		readonly onEmpty: () => void,
	) {
		super();
	}

	public handleMessage(playerId: string, message: ClientMessage): void {
		const player = this.players.get(playerId);
		if (!player) return;
		if (message.scope === 'game' && this.isActive && this.game) {
			this.game.onMessage(player as Player, message);
		} else if (message.scope === 'room') {
			this.handleLobbyMessage(player, message);
		}
	}

	private handleLobbyMessage(player: Player, message: ClientMessage): void {
		if (message.type === 'startGame') {
			// SECURITY: Only the host can start the game.
			if (player.id !== this.hostId) return;

			if (this.isActive) {
				this.emit('close', player.id, 'A game is already in progress.');
				return;
			}

			const game = this.gameFactory(this.players as Map<string, Player>);
			const error = game.allowStart();

			if (error) {
				this.emit('send', 'room', player.id, 'error', { message: error });
				return;
			}
			this.game = game;
			this.setupGameListeners();

			this.emit('broadcast', 'room', 'gameStarted', {});

			this.isActive = true;
			this.game.start();
		} else if (message.type === 'playAgain') {
			if (player.id !== this.hostId) return;
			this.handleLobbyMessage(player, { scope: 'room', type: 'startGame', payload: {} });
		}
	}

	public join(player: Player): void {
		if (this.isActive && this.game) {
			if (this.players.has(player.id)) {
				this.game.onReconnect(player as Player);
			} else {
				this.emit('close', player.id, 'A game is already in progress.');
			}
			return;
		}
		// Announce to others
		this.emit('broadcast', 'room', 'playerJoined', player.toSerializable());

		this.players.set(player.id, player);
		if (!this.hostId) {
			this.hostId = player.id;
		}

		const allPlayers = Array.from(this.players.values()).map((p) => p.toSerializable());
		this.emit('send', 'room', player.id, 'welcome', {
			players: allPlayers,
			hostId: this.hostId,
		});

		if (!player.isBot) {
			// join 3 bots
			while (this.players.size < 4) {
				const botId = `bot-${this.players.size + 1}`;
				const botPlayer = new Player(botId, `Bot ${this.players.size + 1}`, 'US');
				const bot = this.botFactory(botPlayer);
				this.bots[bot.id] = bot;
				bot.on('action', (action) => this.handleMessage(bot.id, action));
				this.join(bot.player);
			}
		}
	}

	public leave(playerId: string): void {
		const player = this.players.get(playerId);
		if (!player) return;

		if (this.isActive && this.game) {
			this.game.onDisconnect(player as Player);
		}

		this.players.delete(playerId);
		this.emit('broadcast', 'room', 'playerLeft', { playerId });

		if (this.players.size === 0) {
			this.onEmpty();
			return;
		}

		const allBots = Array.from(this.players.values()).every((p) => (p as any).isBot);
		if (allBots) {
			this.onEmpty();
			return;
		}

		if (this.hostId === playerId) {
			this.hostId = this.players.keys().next().value;
			this.emit('broadcast', 'room', 'hostChanged', { newHostId: this.hostId });
		}
	}

	private setupGameListeners(): void {
		if (!this.game) return;

		const emitBroadcast = (scope: string, type: string, payload: any) => this.emit('broadcast', scope, type, payload);

		const emitSend = (scope: string, playerId: string, type: string, payload: any) => this.emit('send', scope, playerId, type, payload);

		const bots = this.bots; // alias for readability

		this.game.on('broadcast', (type: string, payload: any) => {
			emitBroadcast('game', type, payload);
			Object.values(bots).forEach((b) => b.onGameMessage({ type, payload }));
		});

		this.game.on('send', (playerId: string, type: string, payload: any) => {
			const bot = bots[playerId];
			if (bot) {
				bot.onGameMessage({ type, payload });
			} else {
				emitSend('game', playerId, type, payload);
			}
		});

		this.game.on('gameEnded', (reason: string) => {
			this.isActive = false;

			this.game?.removeAllListeners();
			this.game = null;

			emitBroadcast('room', 'gameEnded', { reason });
			Object.values(bots).forEach((b) => b.onGameMessage({ type: 'gameEnded', payload: { reason } }));
		});

		this.game.on('error', (player: { id: string }, message: string) => {
			emitSend('game', player.id, 'error', { message });
		});
	}
}
