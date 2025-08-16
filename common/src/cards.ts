export type Suit = "H" | "D" | "C" | "S";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

// Card is now just a templated string
export type Card = `${Rank}${Suit}`;

export type Deck = Card[];

export function createStandardDeck(shuffle: boolean = false): Deck {
  const suits: Suit[] = ["H", "D", "C", "S"];
  const ranks: Rank[] = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];

  const deck: Deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }
  if (shuffle) {
    // A more robust shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  return deck;
}

export function drawCards(deck: Deck, count: number): Card[] {
  if (count > deck.length) {
    throw new Error("Not enough cards in the deck to draw.");
  }
  return deck.splice(0, count);
}
