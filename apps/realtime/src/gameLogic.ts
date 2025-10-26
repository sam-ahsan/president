import { GameState, Player, Card } from '@president/shared';

// Card ranks in order (2 is lowest, Ace is highest)
export const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Generate a standard 52-card deck
export function generateDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  
  return shuffleDeck(deck);
}

// Shuffle the deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards to players
export function dealCards(deck: Card[], players: Player[]): { deck: Card[]; players: Player[] } {
  const shuffledDeck = shuffleDeck(deck);
  const updatedPlayers = players.map(player => ({
    ...player,
    hand: []
  }));

  // Deal cards round-robin style
  let cardIndex = 0;
  while (cardIndex < shuffledDeck.length) {
    for (let playerIndex = 0; playerIndex < updatedPlayers.length && cardIndex < shuffledDeck.length; playerIndex++) {
      updatedPlayers[playerIndex].hand.push(shuffledDeck[cardIndex]);
      cardIndex++;
    }
  }

  return {
    deck: shuffledDeck.slice(cardIndex), // Remaining cards
    players: updatedPlayers
  };
}

// Validate if cards can be played - President card game rules
export function canPlayCards(cards: Card[], pileCards: Card[] | null): boolean {
  if (!cards || cards.length === 0) return false;
  
  // All cards must be the same rank
  const rank = cards[0].rank;
  if (!cards.every(card => card.rank === rank)) return false;

  // If no pile, any cards can be played
  if (!pileCards || pileCards.length === 0) return true;

  // Check if we can beat the current pile
  const pileRank = pileCards[0].rank;
  const pileCount = pileCards.length;

  // Must play same count of cards
  if (cards.length !== pileCount) return false;

  // Must play higher rank
  return getRankValue(rank) > getRankValue(pileRank);
}

// Get numeric value of a card rank
export function getRankValue(rank: Card['rank']): number {
  return CARD_RANKS.indexOf(rank);
}

// Check if a player has won (no cards left)
export function hasPlayerWon(player: Player): boolean {
  return player.hand.length === 0;
}

// Assign roles based on game completion order
export function assignRoles(players: Player[]): Player[] {
  // Sort players by hand size (ascending - fewer cards = better rank)
  const sortedPlayers = [...players].sort((a, b) => a.hand.length - b.hand.length);
  
  const roleMap: Record<number, 'president' | 'vice_president' | 'citizen' | 'vice_scum' | 'scum'> = {
    0: 'president',
    1: 'vice_president', 
    2: 'citizen',
    3: 'vice_scum',
    4: 'scum'
  };

  return sortedPlayers.map((player, index) => ({
    ...player,
    role: roleMap[index] || 'citizen'
  }));
}

// Calculate ELO rating change
export function calculateEloChange(playerElo: number, opponentElo: number, won: boolean): number {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  
  return Math.round(K * (actualScore - expectedScore));
}

// Check if cards can beat the current pile
export function canBeatPile(cards: Card[], pileCards: Card[]): boolean {
  if (!pileCards || pileCards.length === 0) return true;
  
  const rank = cards[0].rank;
  const pileRank = pileCards[0].rank;
  const pileCount = pileCards.length;

  // Must play same count of cards
  if (cards.length !== pileCount) return false;

  // Must play higher rank
  return getRankValue(rank) > getRankValue(pileRank);
}

// Sort hand by rank for display
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
    if (rankDiff !== 0) return rankDiff;
    
    // If ranks are equal, sort by suit
    const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'];
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
  });
}

// Check if player has valid play given current pile
export function getValidPlays(player: Player, pileCards: Card[] | null): Card[][] {
  if (!pileCards || pileCards.length === 0) {
    // Any card or set can be played
    return player.hand.map(c => [c]);
  }

  const validPlays: Card[][] = [];
  const pileRank = pileCards[0].rank;
  const pileCount = pileCards.length;

  // Group hand by rank
  const byRank = new Map<string, Card[]>();
  for (const card of player.hand) {
    if (!byRank.has(card.rank)) {
      byRank.set(card.rank, []);
    }
    byRank.get(card.rank)!.push(card);
  }

  // Find valid plays
  for (const [rank, cards] of byRank.entries()) {
    if (getRankValue(rank) <= getRankValue(pileRank)) continue;
    if (cards.length < pileCount) continue;

    // Get all combinations of the required count
    const combinations = getCombinations(cards, pileCount);
    validPlays.push(...combinations);
  }

  return validPlays;
}

// Get all combinations of specific size
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size > arr.length) return [];
  if (size === 0) return [[]];
  if (size === 1) return arr.map(x => [x]);

  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), size - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }

  return result;
}