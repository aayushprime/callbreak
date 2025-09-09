import { Player } from './player.js';
import { EventEmitter } from 'events';

export abstract class Bot extends EventEmitter {
	player: Player;

	constructor(player: Player) {
		super();
		this.player = player;
		this.player.isBot = true;
	}

	get id() {
		return this.player.id;
	}

	// Additional bot-specific methods can be added here
	abstract onGameMessage(message: { type: string; payload: any }): void;
}
