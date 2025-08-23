import { Room } from './room.js';
import { Player } from './player.js';
import { Card, beats, getSuit, getRankValue, TRUMP_SUIT, computeValidCards } from 'common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Bot extends Player {
	isBot: boolean;
	cards: Card[] = [];

	constructor(readonly room: Room, id: string, name: string, country: string) {
		super(id, name, country);
		this.isBot = true;
	}

	// Additional bot-specific methods can be added here
	async onGameMessage(message: any): Promise<void> {
		console.log(`Bot ${this.name} received message:`, message);
		if (message.type === 'getBid') {
			const bid = 2;
			await delay(1200);
			this.room.handleMessage(this.id, { scope: 'game', type: 'bid', payload: { bid } });
		} else if (message.type === 'gameState') {
			// snapshot for a single player provides playerCards as an array
			this.cards = Array.isArray(message.payload?.playerCards) ? [...message.payload.playerCards] : [];
		} else if (message.type === 'getCard') {
			const playedCards = (message.payload?.playedCards || []) as Card[];

			// compute valid cards according to Callbreak rules (follow suit, else trump rules)
			const candidates = computeValidCards(this.cards, playedCards);
			if (candidates.length === 0) {
				// nothing to play (shouldn't happen) - fallback to first card
				if (this.cards.length === 0) return;
				await delay(500);
				this.playCard(this.cards[0]);
				return;
			}

			// pick a random valid card and play it after a short delay to simulate thinking
			const idx = Math.floor(Math.random() * candidates.length);
			const cardToPlay = candidates[idx];
			await delay(800 + Math.floor(Math.random() * 800));
			this.playCard(cardToPlay);
		}
	}

	// computeValidCards moved to common.logic

	private playCard(card: Card) {
		// update local hand and send play message to room
		this.cards = this.cards.filter((c) => c !== card);
		this.room.handleMessage(this.id, {
			scope: 'game',
			type: 'playCard',
			payload: { card },
		});
	}

	onRoomMessage(message: any): void {
		console.log(`Bot ${this.name} received room message:`, message);
	}
}
