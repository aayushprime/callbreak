import { Player } from './player.js';
import { ClientMessage } from './message.js';
import { EventEmitter } from 'node:events';
import { Game } from './game.js';

// A factory function to create game instances.
// This allows the Room to be agnostic of specific game types.
export type GameFactory = (players: Map<string, Player>) => Game;

export class Room extends EventEmitter {
	public players: Map<string, Player> = new Map();
	public hostId: string | undefined = undefined;

	private game: Game | null = null;
	private isActive: boolean = false; // Is a game currently running?

	constructor(public readonly id: string, private readonly gameFactory: GameFactory, readonly onEmpty: () => void) {
		super();
	}

	// --- Message Routing ---
	public handleMessage(playerId: string, message: ClientMessage): void {
		const player = this.players.get(playerId);
		if (!player) return; // Should not happen

		if (message.scope === 'game' && this.isActive && this.game) {
			// Game is running, delegate game-related messages
			this.game.onMessage(player, message);
		} else if (message.scope === 'room') {
			// Not in an active game, handle lobby-related messages
			this.handleLobbyMessage(player, message);
		}
	}

	private handleLobbyMessage(player: Player, message: ClientMessage): void {
		if (message.type === 'startGame') {
			// SECURITY: Only the host can start the game.
			if (player.id !== this.hostId) return;
			if (this.isActive) {
				this.emit('send', 'room', player.id, 'error', { message: 'A game is already in progress.' });
				return;
			}

			const game = this.gameFactory(this.players);
			const error = game.tryStart(false);

			if (error) {
				this.emit('send', 'room', player.id, 'error', { message: error });
				return;
			}
			this.game = game;
			this.setupGameListeners();
			this.isActive = true;
			this.emit('broadcast', 'room', 'gameStarted', {});
		} else if (message.type === 'playAgain') {
			if (player.id !== this.hostId) return;
			this.handleLobbyMessage(player, { scope: 'room', type: 'startGame', payload: {} });
		}
	}

	public join(player: Player): void {
		if (this.isActive) {
			this.emit('send', 'room', player.id, 'error', { message: 'A game is already in progress.' });
			return;
		}
		// Announce to others
		this.emit('broadcast', 'room', 'playerJoined', player.toSerializable());

		this.players.set(player.id, player);
		if (!this.hostId) {
			this.hostId = player.id;
		}

		// Welcome the new player with the full room state
		const allPlayers = Array.from(this.players.values()).map((p) => p.toSerializable());
		this.emit('send', 'room', player.id, 'welcome', {
			players: allPlayers,
			hostId: this.hostId,
		});
	}

	public leave(playerId: string): void {
		const player = this.players.get(playerId);
		if (!player) return;

		if (this.isActive && this.game) {
			this.game.onDisconnect(player);
		}

		this.players.delete(playerId);
		this.emit('broadcast', 'room', 'playerLeft', { playerId });

		if (this.players.size === 0) {
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

		// The Room should not know about game message names; the game emits
		// only two events: 'broadcast' and 'send', and the Room forwards them.
		this.game.on('broadcast', (type: string, payload: any) => {
			this.emit('broadcast', 'game', type, payload);
		});

		this.game.on('send', (playerId: string, type: string, payload: any) => {
			this.emit('send', 'game', playerId, type, payload);
		});

		this.game.on('gameEnded', (reason) => {
			this.isActive = false;
			if (this.game) {
				this.game.removeAllListeners();
				this.game = null;
			}
			this.emit('broadcast', 'room', 'gameEnded', { reason });
		});

		this.game.on('error', (player, message) => {
			this.emit('send', 'game', player.id, 'error', { message });
		});
	}
}
