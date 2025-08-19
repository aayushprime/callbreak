import { Room } from './room.js';
import { Player } from './player.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Bot extends Player {
	isBot: boolean;

	constructor(
		readonly room: Room,
		id: string,
		name: string,
		country: string,
	) {
		super(id, name, country);
		this.isBot = true;
	}

	// Additional bot-specific methods can be added here
	async onGameMessage(message: any): Promise<void> {
		console.log(`Bot ${this.name} received message:`, message);
		if (message.type === 'getBid') {
			const bid = 2;
			await delay(10000);
			this.room.handleMessage(this.id, { scope: 'game', type: 'bid', payload: { bid } });
		}
	}

	onRoomMessage(message: any): void {
		console.log(`Bot ${this.name} received room message:`, message);
	}
}
