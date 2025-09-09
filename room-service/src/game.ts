import { EventEmitter } from 'events';
import { Player } from './player.js';
import { ClientMessage } from './message.js';
export abstract class Game extends EventEmitter {
	constructor(protected readonly players: Map<string, Player>) {
		super();
	}

	public abstract allowStart(): null | string;
	public abstract start(): void;
	public abstract onMessage(player: Player, message: ClientMessage): void;
	public abstract onDisconnect(player: Player): void;
	public abstract onReconnect(player: Player): void;
}
