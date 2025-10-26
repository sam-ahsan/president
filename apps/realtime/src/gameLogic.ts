import { GameState, Player, Card } from '@president/shared';

// Card ranks in order (2 is lowest, Ace is highest)
const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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

// Validate if cards can be played
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
  
  const roleMap = {
    0: 'president',
    1: 'vice_president', 
    2: 'citizen',
    3: 'vice_scum',
    4: 'scum'
  };

  return sortedPlayers.map((player, index) => ({
    ...player,
    role: roleMap[index as keyof typeof roleMap] || 'citizen'
  }));
}

// Calculate ELO rating change
export function calculateEloChange(playerElo: number, opponentElo: number, won: boolean): number {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  
  return Math.round(K * (actualScore - expectedScore));
}

