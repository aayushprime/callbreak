import { Player } from './player.js';
import { Card } from './cards.js';
import { computeValidCards } from './logic.js';
import { EventEmitter } from 'events';

export class Bot extends EventEmitter {
	isBot: boolean;
	cards: Card[] = [];
	private hand: Card[] = [];
	player: Player;

	constructor(
		id: string,
		name: string,
		country: string,
	) {
		super();
		this.player = new Player(id, name, country);
		this.isBot = true;
	}

	get id() {
		return this.player.id;
	}

	// Additional bot-specific methods can be added here
	onGameMessage(message: { type: string; payload: any }) {
		if (message.type === 'gameState') {
			this.hand = message.payload.playerCards;
		} else if (message.type === 'getBid') {
			// Simple bot logic: bid 1 or 2
			const bid = Math.floor(Math.random() * 2) + 1;
			setTimeout(() => this.bid(bid), 1000);
		} else if (message.type === 'getCard') {
			const { playedCards } = message.payload;
			const validCards = computeValidCards(
				this.hand,
				playedCards.map((p: { player: Player, card: Card }) => p.card),
			);

			const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
			setTimeout(() => this.playCard(cardToPlay), 1000);
		}
	}

	private bid(bid: number) {
		this.emit('action', {
			scope: 'game',
			type: 'bid',
			payload: { bid },
		});
	}

	private playCard(card: Card) {
		// update local hand and send play message to room
		this.cards = this.cards.filter((c) => c !== card);
		this.emit('action', {
			scope: 'game',
			type: 'playCard',
			payload: { card },
		});
	}
}
