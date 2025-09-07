import { EventEmitter } from 'node:events';
import { Player } from './player.js';
import { ClientMessage } from './message.js';
import { CallbreakState, Card, getSuit, TRUMP_SUIT, getRankValue, computeValidCards } from 'common';

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Abstract Game Class ---
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
		this.resyncPlayer(player.id);
	}

	private resyncPlayer(playerId: string) {
		this.emit('send', playerId, 'gameState', this.snapshot(playerId));
		this.emit('send', playerId, 'turnTimer', { msLeft: this.remainingTimeMs() });
	}

	public allowStart(): null | string {
		if (this.players.size !== 4) {
			return '4 players required.';
		}
		return null;
	}

	public start(): void {
		const players = Array.from(this.players.values()).map((p) => ({ id: p.id }));
		this.state = new CallbreakState(players);
		this.state.newRound();

		this.sendGameState();

		// start first turn
		this.notifyTurn();
		this.startTurnTimer();
	}

	public async onMessage(player: Player, message: ClientMessage<any>): Promise<void> {
		console.log(`CallbreakGame received message from ${player.id}:`, message);
		try {
			switch (message.type) {
				case 'requestGameState': {
					this.resyncPlayer(player.id);
					break;
				}
				case 'bid': {
					const { bid } = message.payload as BidMessage;
					if (this.state.phase !== 'bidding') throw new Error('Not bidding phase');
					if (this.currentPlayerId() !== player.id) throw new Error('Not your turn');

					this.state.submitBid(player.id, bid);
					this.emit('broadcast', 'playerBid', { playerId: player.id, bid });
					this.emit('broadcast', 'bidMade', {});
					this.sendGameState();

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
					this.sendGameState();

					if (this.state.playedCards.length === 0) {
						const winnerId = this.state.resolveTrick();
						this.emit('broadcast', 'trickWon', { winnerId });
					}

					// If a trick resolved, state may have advanced the turn and/or round
					if (this.isPhase('round_over')) {
						// Start next round automatically
						await delay(2000);
						this.state.newRound();
						// this.emit('broadcast', 'gameState', this.snapshot());
					}

					if (this.isPhase('game_over')) {
						this.clearTimers();
						this.sendGameState();
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
			// resync player
			this.resyncPlayer(player.id);
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
	private snapshot(playerId: string) {
		// Return a JSON-serializable snapshot. Convert Maps to plain objects.
		const mapToObj = (m: Map<string, any>) => Object.fromEntries(m.entries());
		const isPlayerTurn = this.currentPlayerId() === playerId;
		const validCards =
			this.state.phase === 'playing' && isPlayerTurn
				? computeValidCards(
						this.state.playerCards[playerId],
						this.state.playedCards.map((p) => p.card)
				  )
				: [];
		return {
			players: this.state.players.map((p) => p.id),
			you: playerId,
			playerCards: this.state.playerCards[playerId],
			turn: this.state.turn,
			phase: this.state.phase,
			bids: mapToObj(this.state.bids),
			playedCards: this.state.playedCards,
			validCards,
		};
	}

	private currentPlayerId(): string {
		return this.state.players[this.state.turn].id;
	}

	private notifyTurn() {
		if (this.state.phase === 'bidding') {
			this.emit('send', this.currentPlayerId(), 'getBid', {});
		} else if (this.state.phase === 'playing') {
			this.emit('send', this.currentPlayerId(), 'getCard', {
				playedCards: this.state.playedCards,
			});
		}
	}

	private startTurnTimer() {
		this.clearTimers(); // clearTimers now only needs to handle setTimeout
		const DURATION_MS = 30_000;
		this.turnDeadlineMs = Date.now() + DURATION_MS;

		const playerId = this.currentPlayerId();

		this.emit('broadcast', 'turnTimer', { playerId: playerId, msLeft: this.remainingTimeMs() });

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
				this.sendGameState();
			} else if (this.isPhase('playing')) {
				// Auto-play the first valid card
				const hand = this.state.playerCards[playerId];
				const validCard = this.pickRandomValidCard(playerId, hand);
				this.state.playCard(playerId, validCard);
				this.emit('broadcast', 'playerCard', { playerId, card: validCard });
				this.sendGameState();
			}

			if (this.isPhase('round_over')) {
				this.state.newRound();
				this.sendGameState();
			}
			if (this.isPhase('game_over')) {
				this.clearTimers();
				this.sendGameState();
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
		const candidates = computeValidCards(
			hand,
			this.state.playedCards.map((p) => p.card)
		);
		const idx = Math.floor(Math.random() * candidates.length);
		return candidates[idx];
	}

	// computeValidCards is provided by common.logic
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

	private sendGameState() {
		for (const p of this.players.keys()) {
			const player = this.players.get(p)!;
			this.emit('send', player.id, 'gameState', this.snapshot(player.id));
		}
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
