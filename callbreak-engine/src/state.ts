import { Card, createStandardDeck, drawCards } from "./cards.js";
import { getSuit, getRankValue, beats, TRUMP_SUIT } from "./logic.js";
import { Player } from "room-service";

export interface RoundHistory {
  roundNumber: number;
  bids: Map<string, number>;
  tricksWon: Map<string, number>;
  playedTricks: { player: string; card: Card }[][];
  biddingOrder: string[];
}

export interface ClientRoundHistory {
  roundNumber: number;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  playedTricks: { player: string; card: Card }[][];
  biddingOrder: string[];
}

export type GameStateSnapshot = {
  players: string[];
  you: string;
  playerCards: Card[];
  turn: number;
  phase: "bidding" | "playing" | "round_over" | "game_over";
  roundNumber: number;
  bids: Record<string, number>;
  playedCards: { player: string; card: Card }[];
  tricksWon: Record<string, number>;
  validCards: Card[];
  roundHistory: ClientRoundHistory[];
  points: Record<string, number>;
  winner: string | null;
};

const TOTAL_ROUNDS = 1;

export class CallbreakState {
  players: Player[];
  playerCards: { [key: string]: Card[] } = {};

  turn: number;
  winner: string | null;
  roundNumber: number = 0;

  bids: Map<string, number> = new Map();
  points: Map<string, number> = new Map();
  tricksWon: Map<string, number> = new Map();

  phase: "bidding" | "playing" | "round_over" | "game_over" = "bidding";

  cardsHistory: { player: string; card: Card }[][] = [];
  playedCards: { player: string; card: Card }[] = [];
  trickLeadPlayerIndex: number;

  roundHistory: RoundHistory[] = [];
  private currentBiddingOrder: string[] = [];

  constructor(players: Player[]) {
    if (players.length !== 4) {
      throw new Error("Callbreak requires exactly 4 players.");
    }
    const ids = players.map((p) => p.id);
    if (ids.some((id) => !id)) {
      throw new Error("Each player must have a valid ID.");
    }
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== players.length) {
      throw new Error("Player IDs must be unique.");
    }

    this.players = players;
    this.winner = null;
    this.players.forEach((player) => this.points.set(player.id, 0));
    this.turn = 0;
    this.trickLeadPlayerIndex = 0;
  }

  newRound() {
    if (this.roundNumber >= TOTAL_ROUNDS) {
      this.phase = "game_over";
      return;
    }

    const isFirstRound = this.roundNumber === 0;

    this.roundNumber += 1;
    let deck = createStandardDeck(true);
    for (const player of this.players) {
      this.playerCards[player.id] = drawCards(deck, 13);
      this.playerCards[player.id].sort((a, b) => {
        const suitA = getSuit(a);
        const suitB = getSuit(b);
        if (suitA === suitB) return getRankValue(b) - getRankValue(a);
        return suitA.localeCompare(suitB);
      });
    }

    this.bids.clear();
    this.tricksWon.clear();
    this.players.forEach((p) => this.tricksWon.set(p.id, 0));
    this.cardsHistory = [];
    this.playedCards = [];

    if (isFirstRound) {
      // For the first round, the turn is set by dealer rotation.
      const dealerIndex = (this.roundNumber - 1) % this.players.length;
      this.turn = (dealerIndex + 1) % this.players.length;
      this.trickLeadPlayerIndex = this.turn;
    } else {
      // For subsequent rounds, the winner of the last trick starts.
      // The 'turn' is already correctly set by the last call to resolveTrick().
      this.trickLeadPlayerIndex = this.turn;
    }

    this.currentBiddingOrder = [];
    for (let i = 0; i < this.players.length; i++) {
      const playerIndex = (this.turn + i) % this.players.length;
      this.currentBiddingOrder.push(this.players[playerIndex].id);
    }

    this.phase = "bidding";
  }

  submitBid(playerId: string, bid: number) {
    if (this.phase !== "bidding")
      throw new Error("Cannot submit a bid outside of the bidding phase.");
    if (this.players[this.turn].id !== playerId)
      throw new Error("It's not your turn to bid.");
    if (bid < 1 || bid > 8) throw new Error("Bid must be between 1 and 8.");

    this.bids.set(playerId, bid);
    this.turn = (this.turn + 1) % this.players.length;

    if (this.bids.size === this.players.length) {
      this.phase = "playing";
      this.turn = this.trickLeadPlayerIndex;
    }
  }

  playCard(playerId: string, card: Card) {
    if (this.phase !== "playing")
      throw new Error("Cannot play cards outside of the playing phase.");
    if (this.players[this.turn].id !== playerId)
      throw new Error("It's not your turn to play.");
    if (!this.playerCards[playerId].includes(card))
      throw new Error("You do not have this card.");
    if (!this.isValidPlay(playerId, card)) {
      throw new Error("Invalid card played. You must follow the game rules.");
    }

    this.playedCards.push({ player: playerId, card: card });
    this.playerCards[playerId] = this.playerCards[playerId].filter(
      (c) => c !== card
    );

    // The turn advances, but the trick is not resolved automatically.
    // The server will call resolveTrick() explicitly.
    if (this.playedCards.length < this.players.length) {
      this.turn = (this.turn + 1) % this.players.length;
    }
  }

  private isValidPlay(playerId: string, cardToPlay: Card): boolean {
    const playerHand = this.playerCards[playerId];
    if (this.playedCards.length === 0) return true;
    const leadingSuit = getSuit(this.playedCards[0].card);
    const playerHasLeadingSuit = playerHand.some(
      (c) => getSuit(c) === leadingSuit
    );
    if (playerHasLeadingSuit) return getSuit(cardToPlay) === leadingSuit;
    const playerHasTrump = playerHand.some((c) => getSuit(c) === TRUMP_SUIT);
    if (playerHasTrump) {
      if (getSuit(cardToPlay) !== TRUMP_SUIT) return false;
      const highestTrumpInTrickValue = this.playedCards
        .filter((c) => getSuit(c.card) === TRUMP_SUIT)
        .reduce((max, c) => Math.max(max, getRankValue(c.card)), 0);
      if (getRankValue(cardToPlay) > highestTrumpInTrickValue) return true;
      const canPlayHigherTrump = playerHand.some(
        (c) =>
          getSuit(c) === TRUMP_SUIT &&
          getRankValue(c) > highestTrumpInTrickValue
      );
      return !canPlayHigherTrump;
    }
    return true;
  }

  resolveTrick() {
    let winningPlay = this.playedCards[0];
    let winnerIndex = this.trickLeadPlayerIndex;
    const leadingSuit = getSuit(this.playedCards[0].card);

    for (let i = 1; i < this.playedCards.length; i++) {
      const currentPlay = this.playedCards[i];
      if (beats(currentPlay.card, winningPlay.card, leadingSuit)) {
        winningPlay = currentPlay;
        winnerIndex = (this.trickLeadPlayerIndex + i) % this.players.length;
      }
    }

    const winnerId = this.players[winnerIndex].id;
    this.tricksWon.set(winnerId, (this.tricksWon.get(winnerId) || 0) + 1);

    this.cardsHistory.push([...this.playedCards]);
    this.playedCards = [];
    this.turn = winnerIndex;
    this.trickLeadPlayerIndex = winnerIndex;

    if (Object.values(this.playerCards).every((hand) => hand.length === 0)) {
      this.updatePoints();
      this.archiveRoundHistory();
      this.phase = "round_over";

      if (this.roundNumber >= TOTAL_ROUNDS) {
        this.phase = "game_over";
        this.determineGameWinner();
      }
    }
    return winnerId;
  }

  updatePoints() {
    this.players.forEach((player) => {
      const playerId = player.id;
      const bid = this.bids.get(playerId)!;
      const tricks = this.tricksWon.get(playerId)!;
      let currentPoints = this.points.get(playerId)!;
      if (tricks < bid) {
        currentPoints -= bid;
      } else {
        const extraTricks = tricks - bid;
        currentPoints += bid + extraTricks * 0.1;
      }
      this.points.set(playerId, parseFloat(currentPoints.toFixed(2)));
    });
  }

  private determineGameWinner() {
    let maxPoints = -Infinity;
    let gameWinner: Player | null = null;
    for (const player of this.players) {
      const playerPoints = this.points.get(player.id)!;
      if (playerPoints > maxPoints) {
        maxPoints = playerPoints;
        gameWinner = player;
      }
    }
    this.winner = gameWinner ? gameWinner.id : null;
  }

  /**
   * Creates a snapshot of the completed round's data and adds it to the roundHistory.
   * This is called after the last trick of a round is resolved.
   */
  private archiveRoundHistory() {
    const historyEntry: RoundHistory = {
      roundNumber: this.roundNumber,
      // Create copies to prevent mutation when the state is reset for the next round
      bids: new Map(this.bids),
      tricksWon: new Map(this.tricksWon),
      playedTricks: [...this.cardsHistory],
      biddingOrder: [...this.currentBiddingOrder],
    };
    this.roundHistory.push(historyEntry);
  }

  toJSON() {
    return {
      players: this.players,
      playerCards: this.playerCards,
      turn: this.turn,
      winner: this.winner,
      roundNumber: this.roundNumber,
      bids: Object.fromEntries(this.bids),
      points: Object.fromEntries(this.points),
      tricksWon: Object.fromEntries(this.tricksWon),
      phase: this.phase,
      cardsHistory: this.cardsHistory,
      playedCards: this.playedCards,
      trickLeadPlayerIndex: this.trickLeadPlayerIndex,
      roundHistory: this.roundHistory.map((rh) => ({
        ...rh,
        bids: Object.fromEntries(rh.bids),
        tricksWon: Object.fromEntries(rh.tricksWon),
      })),
      currentBiddingOrder: this.currentBiddingOrder,
    };
  }

  static fromJSON(data: any): CallbreakState {
    const state = new CallbreakState(data.players);
    state.playerCards = data.playerCards;
    state.turn = data.turn;
    state.winner = data.winner;
    state.roundNumber = data.roundNumber;
    state.bids = new Map(Object.entries(data.bids));
    state.points = new Map(Object.entries(data.points));
    state.tricksWon = new Map(Object.entries(data.tricksWon));
    state.phase = data.phase;
    state.cardsHistory = data.cardsHistory;
    state.playedCards = data.playedCards;
    state.trickLeadPlayerIndex = data.trickLeadPlayerIndex;
    state.roundHistory = data.roundHistory.map((rh: any) => ({
      ...rh,
      bids: new Map(Object.entries(rh.bids)),
      tricksWon: new Map(Object.entries(rh.tricksWon)),
    }));
    state.currentBiddingOrder = data.currentBiddingOrder;
    return state;
  }
}
