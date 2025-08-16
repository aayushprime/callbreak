import { Card, Rank, Suit } from "./cards.js";

const RANK_VALUES: { [key in Rank]: number } = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const TRUMP_SUIT: Suit = "S";

export function getSuit(card: Card): Suit {
  return card.slice(-1) as Suit;
}

export function getRankValue(card: Card): number {
  const rank = card.length === 3 ? card.slice(0, 2) : card.slice(0, 1);
  return RANK_VALUES[rank as Rank];
}

export function beats(cardA: Card, cardB: Card, leadingSuit: Suit): boolean {
  const suitA = getSuit(cardA);
  const suitB = getSuit(cardB);
  const rankA = getRankValue(cardA);
  const rankB = getRankValue(cardB);

  if (suitA === TRUMP_SUIT && suitB !== TRUMP_SUIT) {
    return true;
  }
  if (suitB === TRUMP_SUIT && suitA !== TRUMP_SUIT) {
    return false;
  }

  if (suitA === suitB) {
    return rankA > rankB;
  }

  if (suitB !== leadingSuit) {
    return suitA === leadingSuit;
  }
  return false;
}
