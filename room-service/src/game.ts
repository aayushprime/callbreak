import { EventEmitter } from 'node:events';
import { Player } from './player.js';
import { ClientMessage } from './message.js';
import { CallbreakState, Card, getSuit, TRUMP_SUIT, getRankValue } from 'common';

// --- Abstract Game Class ---
export abstract class Game extends EventEmitter {
	constructor(protected readonly players: Map<string, Player>) {
		super();
	}

	public abstract tryStart(restart: boolean): string | null;
	public abstract onMessage(player: Player, message: ClientMessage): void;
	public abstract onDisconnect(player: Player): void;
	public abstract onReconnect(player: Player): void;
}

type BidMessage = { bid: number };
type PlayCardMessage = { card: Card };

export class CallbreakGame extends Game {
	private state!: CallbreakState;
	private disconnected = new Set<string>();

	// turn timing
	private turnDeadlineMs: number = 0;
	private tickInterval: NodeJS.Timeout | null = null;
	private timeoutHandle: NodeJS.Timeout | null = null;

	constructor(players: Map<string, Player>) {
		super(players);
	}

	public onReconnect(player: Player): void {
		this.disconnected.delete(player.id);
		this.emit('broadcast', 'gameState', this.snapshot());
		if (this.currentPlayerId() === player.id) {
			this.emit('send', player.id, 'turnTimer', { msLeft: this.remainingTimeMs() });
		}
	}

	public tryStart(restart = false): string | null {
		if (this.players.size !== 4) {
			return '4 players required.';
		}

		const players = Array.from(this.players.values()).map((p) => ({ id: p.id }));
		this.state = new CallbreakState(players);
		this.state.newRound();

		// announce and push initial state
		this.emit('broadcast', 'gameStart', this.snapshot());
		this.emit('broadcast', 'gameState', this.snapshot());

		// start first turn
		this.notifyTurn();
		this.startTurnTimer();
		return null;
	}

	public onMessage(player: Player, message: ClientMessage<any>): void {
		try {
			switch (message.type) {
				case 'bid': {
					const { bid } = message.payload as BidMessage;
					if (this.state.phase !== 'bidding') throw new Error('Not bidding phase');
					if (this.currentPlayerId() !== player.id) throw new Error('Not your turn');

					this.state.submitBid(player.id, bid);
					this.emit('broadcast', 'playerBid', { playerId: player.id, bid });
					this.emit('broadcast', 'gameState', this.snapshot());

					// If bidding finished, playing starts, otherwise next bidder
					this.notifyTurn();
					this.startTurnTimer();
					break;
				}
				case 'playCard': {
					const { card } = message.payload as PlayCardMessage;
					if (this.state.phase !== 'playing') throw new Error('Not playing phase');
					if (this.currentPlayerId() !== player.id) throw new Error('Not your turn');

					this.state.playCard(player.id, card);
					this.emit('broadcast', 'playerCard', { playerId: player.id, card });
					this.emit('broadcast', 'gameState', this.snapshot());

					// If a trick resolved, state may have advanced the turn and/or round
					if (this.isPhase('round_over')) {
						// Start next round automatically
						this.state.newRound();
						this.emit('broadcast', 'gameState', this.snapshot());
					}

					if (this.isPhase('game_over')) {
						this.clearTimers();
						this.emit('broadcast', 'gameState', this.snapshot());
						this.emit('broadcast', 'gameEnded', { reason: 'completed' });
						this.emit('ended', 'completed');
						return;
					}

					this.notifyTurn();
					this.startTurnTimer();
					break;
				}
				default:
					// ignore unknown game message types for now
					break;
			}
		} catch (e: any) {
			this.emit('error', player, e?.message ?? 'Invalid action');
		}
	}

	public onDisconnect(player: Player): void {
		this.disconnected.add(player.id);
		if (this.isPhase('bidding')) {
			// Cancel the game if anyone disconnects during bidding
			this.clearTimers();
			this.emit('broadcast', 'gameEnded', { reason: 'player_disconnected_during_bidding', playerId: player.id });
			this.emit('ended', 'player_disconnected_during_bidding');
		}
	}

	// --- helpers ---
	private snapshot() {
		// Return a JSON-serializable snapshot. Convert Maps to plain objects.
		const mapToObj = (m: Map<string, any>) => Object.fromEntries(m.entries());
		return {
			players: this.state.players,
			playerCards: this.state.playerCards,
			turn: this.state.turn,
			winner: this.state.winner,
			roundNumber: this.state.roundNumber,
			bids: mapToObj(this.state.bids),
			points: mapToObj(this.state.points),
			tricksWon: mapToObj(this.state.tricksWon),
			phase: this.state.phase,
			cardsHistory: this.state.cardsHistory,
			playedCards: this.state.playedCards,
			trickLeadPlayerIndex: this.state.trickLeadPlayerIndex,
			// For brevity, omit roundHistory Map conversions here
		};
	}

	private currentPlayerId(): string {
		return this.state.players[this.state.turn].id;
	}

	private notifyTurn() {
		if (this.state.phase === 'bidding') {
			this.emit('send', this.currentPlayerId(), 'getBid', {});
		} else if (this.state.phase === 'playing') {
			this.emit('send', this.currentPlayerId(), 'getCard', {});
		}
	}

	private startTurnTimer() {
		this.clearTimers(); // clearTimers now only needs to handle setTimeout
		const DURATION_MS = 30_000;
		this.turnDeadlineMs = Date.now() + DURATION_MS;

		const playerId = this.currentPlayerId();

		// Send the timer information ONCE to the client.
		// The client is now responsible for displaying the countdown.
		this.emit('send', playerId, 'turnTimer', { msLeft: this.remainingTimeMs() });

		// The server's setTimeout remains as the authoritative enforcer of the turn limit.
		this.timeoutHandle = setTimeout(() => {
			this.onTurnTimeout();
		}, DURATION_MS);
	}

	private onTurnTimeout() {
		const playerId = this.currentPlayerId();
		try {
			if (this.isPhase('bidding')) {
				// Auto-bid minimum
				this.state.submitBid(playerId, 1);
				this.emit('broadcast', 'playerBid', { playerId, bid: 1 });
				this.emit('broadcast', 'gameState', this.snapshot());
			} else if (this.isPhase('playing')) {
				// Auto-play the first valid card
				const hand = this.state.playerCards[playerId];
				const validCard = this.pickRandomValidCard(playerId, hand);
				this.state.playCard(playerId, validCard);
				this.emit('broadcast', 'playerCard', { playerId, card: validCard });
				this.emit('broadcast', 'gameState', this.snapshot());
			}

			if (this.isPhase('round_over')) {
				this.state.newRound();
				this.emit('broadcast', 'gameState', this.snapshot());
			}
			if (this.isPhase('game_over')) {
				this.clearTimers();
				this.emit('broadcast', 'gameState', this.snapshot());
				this.emit('broadcast', 'gameEnded', { reason: 'completed' });
				this.emit('ended', 'completed');
				return;
			}

			this.notifyTurn();
			this.startTurnTimer();
		} catch (e) {
			// If auto action fails, end game to prevent stuck state
			this.clearTimers();
			this.emit('broadcast', 'gameEnded', { reason: 'stalled' });
			this.emit('ended', 'stalled');
		}
	}

	private pickRandomValidCard(playerId: string, hand: Card[]): Card {
		const candidates = this.computeValidCardsForHand(playerId, hand);
		const idx = Math.floor(Math.random() * candidates.length);
		return candidates[idx];
	}

	private computeValidCardsForHand(playerId: string, hand: Card[]): Card[] {
		const played = this.state.playedCards;
		if (played.length === 0) return [...hand];
		const leadingSuit = getSuit(played[0]);
		const hasLeading = hand.some((c) => getSuit(c) === leadingSuit);
		if (hasLeading) {
			return hand.filter((c) => getSuit(c) === leadingSuit);
		}
		const hasTrump = hand.some((c) => getSuit(c) === TRUMP_SUIT);
		if (hasTrump) {
			const highestTrumpInTrick = played.filter((c) => getSuit(c) === TRUMP_SUIT).reduce((max, c) => Math.max(max, getRankValue(c)), 0);
			const higherTrumps = hand.filter((c) => getSuit(c) === TRUMP_SUIT && getRankValue(c) > highestTrumpInTrick);
			if (higherTrumps.length > 0) return higherTrumps;
			return hand.filter((c) => getSuit(c) === TRUMP_SUIT);
		}
		return [...hand];
	}

	private remainingTimeMs(): number {
		return Math.max(0, this.turnDeadlineMs - Date.now());
	}

	private clearTimers() {
		// No longer need to clear tickInterval
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
	}

	private isPhase(phase: CallbreakState['phase']): boolean {
		return (this.state as any).phase === phase;
	}
}

/* messages

<- gameStart [we start game now!]
<- gameState [game state force update]

<- getBid [its your turn to bid]
<- playerBid [someone has bid]

<- turnTimer [time left for your turn]
<- playerCard [someone/you has played a card]
<- getCard [its your turn to play a card]

<- gameEnded [room will clear this game after this]

-> bid
-> playCard

if someone goes to the lobby url 
- if they are member, welcome -> game screen
- if they are not member, error -> main screen

 */
