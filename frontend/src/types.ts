export interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

export interface Player {
  id: string;
  username: string;
  isReady: boolean;
  position?: number;
}

export interface GameState {
  roomId: string;
  players: [string, Player][];
  currentPlayer?: string;
  currentPlay?: Card[];
  playerHands: [string, Card[]][];
  round: number;
  status: 'dealing' | 'playing' | 'round_end' | 'game_end';
  winner?: string;
  roles: Record<string, 'president' | 'vice_president' | 'neutral' | 'vice_scum' | 'scum'>;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface User {
  id?: string;
  username: string;
  token?: string;
  isGuest: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export type MessageType = 
  | 'join_room'
  | 'leave_room'
  | 'player_joined'
  | 'player_left'
  | 'game_state_update'
  | 'play_cards'
  | 'pass'
  | 'deal_cards'
  | 'round_end'
  | 'game_end'
  | 'error'
  | 'chat'
  | 'ready';
