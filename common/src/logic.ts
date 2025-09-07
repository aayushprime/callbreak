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

export function computeValidCards(hand: Card[], playedCards: Card[]): Card[] {
	if (!hand || hand.length === 0) return [];
	if (!playedCards || playedCards.length === 0) return [...hand];

	const leadingSuit = getSuit(playedCards[0]);
	const hasLeading = hand.some((c) => getSuit(c) === leadingSuit);
	if (hasLeading) {
		const leadingCards = hand.filter((c) => getSuit(c) === leadingSuit);
		const highestCardInTrick = playedCards
			.filter((c) => getSuit(c) === leadingSuit)
			.reduce((max, c) => (getRankValue(c) > getRankValue(max) ? c : max), playedCards[0]);
		const higherCards = leadingCards.filter((c) => beats(c, highestCardInTrick, leadingSuit));
		if (higherCards.length > 0) return higherCards;
		return leadingCards;
	}

	const hasTrump = hand.some((c) => getSuit(c) === TRUMP_SUIT);
	if (hasTrump) {
		const highestTrumpInTrick = playedCards
			.filter((c) => getSuit(c) === TRUMP_SUIT)
			.reduce((max, c) => Math.max(max, getRankValue(c)), 0);
		const higherTrumps = hand.filter(
			(c) => getSuit(c) === TRUMP_SUIT && getRankValue(c) > highestTrumpInTrick
		);
		if (higherTrumps.length > 0) return higherTrumps;
		const trumpCards = hand.filter((c) => getSuit(c) === TRUMP_SUIT);
		if (trumpCards.length > 0) return trumpCards;
	}

	return [...hand];
}
