import { Room } from './room.js';
import { Player } from './player.js';
import { Card, beats, getSuit, getRankValue, TRUMP_SUIT, computeValidCards } from 'common';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Bot extends Player {
	isBot: boolean;
	cards: Card[] = [];
	private hand: Card[] = [];

	constructor(readonly room: Room, id: string, name: string, country: string) {
		super(id, name, country);
		this.isBot = true;
	}

	// Additional bot-specific methods can be added here
	onGameMessage(message: { type: string; payload: any }) {
		if (message.type === 'gameState') {
			this.hand = message.payload.playerCards;
		} else if (message.type === 'getBid') {
			// Simple bot logic: bid 1 or 2
			const bid = Math.floor(Math.random() * 2) + 1;
			setTimeout(() => this.bid(bid), 500);
		} else if (message.type === 'getCard') {
			const { playedCards } = message.payload;
			const validCards = computeValidCards(
				this.hand,
				playedCards.map((p: any) => p.card)
			);

			const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
			setTimeout(() => this.playCard(cardToPlay), 500);
		}
	}

	private bid(bid: number) {
		this.room.handleMessage(this.id, {
			scope: 'game',
			type: 'bid',
			payload: { bid },
		});
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
