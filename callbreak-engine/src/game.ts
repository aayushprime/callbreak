import { EventEmitter } from "events";
import { Player, ClientMessage, Game } from "room-service";
import { CallbreakState } from "./state.js";
import { Card } from "./cards.js";
import { computeValidCards } from "./logic.js";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BidMessage = { bid: number };
type PlayCardMessage = { card: Card };

export class CallbreakGame extends Game {
  private state!: CallbreakState;
  private disconnected = new Set<string>();

  // turn timing
  private turnDeadlineMs: number = 0;
  private timeoutHandle: NodeJS.Timeout | null = null;
  private timerDisabled: boolean;

  constructor(players: Map<string, Player>, options: { timer?: boolean } = {}) {
    super(players);
    this.timerDisabled = options.timer === false;
  }

  public onReconnect(player: Player): void {
    this.disconnected.delete(player.id);
    this.resyncPlayer(player.id);
  }

  private resyncPlayer(playerId: string) {
    this.emit("send", playerId, "gameState", this.snapshot(playerId));
    this.emit("send", playerId, "turnTimer", {
      msLeft: this.remainingTimeMs(),
    });
  }

  public allowStart(): null | string {
    if (this.players.size !== 4) {
      return "4 players required.";
    }
    return null;
  }

  public start(): void {
    const players = Array.from(this.players.values()).map((p) => ({
      id: p.id,
    }));
    this.state = new CallbreakState(players);
    this.state.newRound();

    this.sendGameState();

    // start first turn
    this.notifyTurn();
    this.startTurnTimer();
  }

  public async onMessage(
    player: Player,
    message: ClientMessage<any>,
  ): Promise<void> {
    console.log(`CallbreakGame received message from ${player.id}:`, message);
    try {
      switch (message.type) {
        case "requestGameState": {
          this.resyncPlayer(player.id);
          break;
        }
        case "bid": {
          const { bid } = message.payload as BidMessage;
          if (this.state.phase !== "bidding")
            throw new Error("Not bidding phase");
          if (this.currentPlayerId() !== player.id)
            throw new Error("Not your turn");

          this.state.submitBid(player.id, bid);
          this.emit("broadcast", "playerBid", { playerId: player.id, bid });
          this.emit("broadcast", "bidMade", {});
          this.sendGameState();

          // If bidding finished, playing starts, otherwise next bidder
          this.notifyTurn();
          this.startTurnTimer();
          break;
        }
        case "playCard": {
          const { card } = message.payload as PlayCardMessage;
          if (this.state.phase !== "playing")
            throw new Error("Not playing phase");
          if (this.currentPlayerId() !== player.id)
            throw new Error("Not your turn");

          this.state.playCard(player.id, card);
          this.emit("broadcast", "playerCard", { playerId: player.id, card });
          this.sendGameState(); // Important: send state with the 4th card visible

          if (this.state.playedCards.length < 4) {
            // Trick is not over, just advance to next player
            this.notifyTurn();
            this.startTurnTimer();
          } else {
            // Trick is over
            const winnerId = this.state.resolveTrick();
            this.emit("broadcast", "trickWon", { winnerId });

            if (this.isPhase("game_over")) {
              this.clearTimers();
              this.emit("broadcast", "gameEnded", {
                reason: "completed",
                winnerId: this.state.winner,
              });
              this.emit("ended", "completed", { winnerId: this.state.winner });
              return;
            }

            if (this.isPhase("round_over")) {
              await delay(2000); // Let clients see scores
              this.state.newRound();
              this.sendGameState();
              this.notifyTurn();
              this.startTurnTimer();
            } else {
              // Normal trick win, wait for client animation
              await delay(1500);
              this.notifyTurn();
              this.startTurnTimer();
            }
          }
          break;
        }
        default:
          // ignore unknown game message types for now
          break;
      }
    } catch (e: any) {
      this.emit("error", player, e?.message ?? "Invalid action");
      // resync player
      this.resyncPlayer(player.id);
    }
  }

  public onDisconnect(player: Player): void {
    this.disconnected.add(player.id);
    if (this.isPhase("bidding")) {
      // Cancel the game if anyone disconnects during bidding
      this.clearTimers();
      this.emit("broadcast", "gameEnded", {
        reason: "player_disconnected_during_bidding",
        playerId: player.id,
      });
      this.emit("ended", "player_disconnected_during_bidding");
    }
  }

  // --- helpers ---
  private snapshot(playerId: string) {
    // Return a JSON-serializable snapshot. Convert Maps to plain objects.
    const mapToObj = (m: Map<string, any>) => Object.fromEntries(m.entries());
    const isPlayerTurn = this.currentPlayerId() === playerId;
    const validCards =
      this.state.phase === "playing" && isPlayerTurn
        ? computeValidCards(
            this.state.playerCards[playerId],
            this.state.playedCards.map((p) => p.card),
          )
        : [];
    return {
      players: this.state.players.map((p: { id: string }) => p.id),
      you: playerId,
      playerCards: this.state.playerCards[playerId],
      turn: this.state.turn,
      phase: this.state.phase,
      roundNumber: this.state.roundNumber,
      bids: mapToObj(this.state.bids),
      playedCards: this.state.playedCards,
      tricksWon: mapToObj(this.state.tricksWon),
      validCards,
      roundHistory: this.state.roundHistory.map((rh: any) => ({
        ...rh,
        bids: mapToObj(rh.bids),
        tricksWon: mapToObj(rh.tricksWon),
      })),
      points: mapToObj(this.state.points),
      winner: this.state.winner,
    };
  }

  private currentPlayerId(): string {
    return this.state.players[this.state.turn].id;
  }

  private notifyTurn() {
    if (this.state.phase === "bidding") {
      this.emit("send", this.currentPlayerId(), "getBid", {});
    } else if (this.state.phase === "playing") {
      this.emit("send", this.currentPlayerId(), "getCard", {
        playedCards: this.state.playedCards,
      });
    }
  }

  private startTurnTimer() {
    if (this.timerDisabled) {
      this.emit("broadcast", "turnTimer", {
        playerId: this.currentPlayerId(),
        msLeft: -1,
      });
      return;
    }
    this.clearTimers(); // clearTimers now only needs to handle setTimeout
    const DURATION_MS = 30_000;
    this.turnDeadlineMs = Date.now() + DURATION_MS;

    const playerId = this.currentPlayerId();

    this.emit("broadcast", "turnTimer", {
      playerId: playerId,
      msLeft: this.remainingTimeMs(),
    });

    // The server's setTimeout remains as the authoritative enforcer of the turn limit.
    this.timeoutHandle = setTimeout(() => {
      this.onTurnTimeout();
    }, DURATION_MS);
  }

  private onTurnTimeout() {
    const playerId = this.currentPlayerId();
    try {
      if (this.isPhase("bidding")) {
        // Auto-bid minimum
        this.state.submitBid(playerId, 1);
        this.emit("broadcast", "playerBid", { playerId, bid: 1 });
        this.emit("broadcast", "bidMade", {});
        this.sendGameState();
      } else if (this.isPhase("playing")) {
        // Auto-play the first valid card
        const hand = this.state.playerCards[playerId];
        const validCard = this.pickRandomValidCard(playerId, hand);
        this.state.playCard(playerId, validCard);
        this.emit("broadcast", "playerCard", { playerId, card: validCard });
        this.sendGameState();
      }

      if (this.isPhase("round_over")) {
        this.state.newRound();
        this.sendGameState();
      }
      if (this.isPhase("game_over")) {
        this.clearTimers();
        this.sendGameState();
        this.emit("broadcast", "gameEnded", {
          reason: "completed",
          winnerId: this.state.winner,
        });
        this.emit("ended", "completed", { winnerId: this.state.winner });
        return;
      }

      this.notifyTurn();
      this.startTurnTimer();
    } catch (e) {
      // If auto action fails, end game to prevent stuck state
      this.clearTimers();
      this.emit("broadcast", "gameEnded", { reason: "stalled" });
      this.emit("ended", "stalled");
    }
  }

  private pickRandomValidCard(playerId: string, hand: Card[]): Card {
    const candidates = computeValidCards(
      hand,
      this.state.playedCards.map((p) => p.card),
    );
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  // computeValidCards is provided by common.logic
  private remainingTimeMs(): number {
    if (this.timerDisabled) return -1;
    return Math.max(0, this.turnDeadlineMs - Date.now());
  }

  private clearTimers() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private isPhase(phase: CallbreakState["phase"]): boolean {
    return (this.state as any).phase === phase;
  }

  private sendGameState() {
    for (const p of this.players.keys()) {
      const player = this.players.get(p)!;
      this.emit("send", player.id, "gameState", this.snapshot(player.id));
    }
  }

  public toJSON() {
    return {
      state: this.state.toJSON(),
      disconnected: Array.from(this.disconnected),
      timerDisabled: this.timerDisabled,
    };
  }

  public static fromJSON(
    data: any,
    players: Map<string, Player>,
  ): CallbreakGame {
    const game = new CallbreakGame(players, { timer: !data.timerDisabled });
    game.state = CallbreakState.fromJSON(data.state);
    game.disconnected = new Set(data.disconnected);
    return game;
  }
}
