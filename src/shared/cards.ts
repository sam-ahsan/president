import type { Card } from './types';

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

export function createDeck(count: number = 1): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getCardValue(card: Card): number {
  const rankValue: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankValue[card.rank] || 0;
}

export function compareCards(card1: Card, card2: Card): number {
  return getCardValue(card1) - getCardValue(card2);
}

export function canBeatPrevious(played: Card[], previous?: Card[]): boolean {
  if (!previous || previous.length === 0) return true;
  
  // Must have the same number of cards
  if (played.length !== previous.length) return false;
  
  // Sort by value
  const playedSorted = [...played].sort((a, b) => getCardValue(a) - getCardValue(b));
  const previousSorted = [...previous].sort((a, b) => getCardValue(a) - getCardValue(b));
  
  // All played cards must be higher than the previous cards
  for (let i = 0; i < played.length; i++) {
    if (getCardValue(playedSorted[i]) <= getCardValue(previousSorted[i])) {
      return false;
    }
  }
  
  return true;
}

export function isValidSet(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  
  // Check if all cards have the same rank
  const rank = cards[0].rank;
  return cards.every(card => card.rank === rank);
}
