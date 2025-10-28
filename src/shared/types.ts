export interface User {
  id: string;
  username: string;
  email?: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
}

export interface Session {
  id: string;
  userId?: string;
  username: string;
  token: string;
  isGuest: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  createdAt: number;
  finishedAt?: number;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  username: string;
  isReady: boolean;
  position?: number;
}

export type Card = {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
};

export interface GameState {
  roomId: string;
  players: Map<string, Player>;
  currentPlayer?: string;
  currentPlay?: Card[];
  playerHands: Map<string, Card[]>;
  deck: Card[];
  round: number;
  status: GameStatus;
  winner?: string;
  roles: Map<string, PlayerRole>;
}

export type GameStatus = 'dealing' | 'playing' | 'round_end' | 'game_end';
export type PlayerRole = 'president' | 'vice_president' | 'neutral' | 'vice_scum' | 'scum';

export interface WebSocketMessage {
  type: MessageType;
  data: any;
  timestamp: number;
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
  | 'chat';

export interface AuthRequest {
  username?: string;
  email?: string;
  password?: string;
}

export interface CreateRoomRequest {
  name: string;
  maxPlayers: number;
  isPrivate?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  win_rate: number;
}
