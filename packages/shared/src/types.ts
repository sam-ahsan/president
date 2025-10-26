import { z } from 'zod';

// Card representation
export const CardSchema = z.object({
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']),
  suit: z.enum(['hearts', 'diamonds', 'clubs', 'spades'])
});

export type Card = z.infer<typeof CardSchema>;

// Player representation
export const PlayerSchema = z.object({
  id: z.string(),
  handle: z.string(),
  hand: z.array(CardSchema),
  role: z.enum(['president', 'vice_president', 'citizen', 'vice_scum', 'scum']).optional(),
  isConnected: z.boolean().default(true),
  isReady: z.boolean().default(false)
});

export type Player = z.infer<typeof PlayerSchema>;

// Game state
export const GameStateSchema = z.object({
  roomCode: z.string(),
  phase: z.enum(['lobby', 'playing', 'round_end', 'game_end']),
  players: z.array(PlayerSchema),
  pile: z.object({
    cards: z.array(CardSchema),
    rank: z.string(),
    count: z.number()
  }).nullable(),
  turnIndex: z.number(),
  winnerId: z.string().optional(),
  roundNumber: z.number().default(1),
  deck: z.array(CardSchema).optional()
});

export type GameState = z.infer<typeof GameStateSchema>;

// Room information
export const RoomSchema = z.object({
  code: z.string(),
  hostId: z.string(),
  maxPlayers: z.number().default(8),
  isPrivate: z.boolean().default(false),
  createdAt: z.string(),
  gameState: GameStateSchema
});

export type Room = z.infer<typeof RoomSchema>;

// User session
export const UserSessionSchema = z.object({
  userId: z.string(),
  handle: z.string(),
  isGuest: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string()
});

export type UserSession = z.infer<typeof UserSessionSchema>;

// Match result
export const MatchResultSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  winnerId: z.string(),
  players: z.array(z.object({
    userId: z.string(),
    handle: z.string(),
    rank: z.number(),
    eloDelta: z.number()
  })),
  startedAt: z.string(),
  finishedAt: z.string()
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

// Leaderboard entry
export const LeaderboardEntrySchema = z.object({
  userId: z.string(),
  handle: z.string(),
  elo: z.number(),
  games: z.number(),
  wins: z.number(),
  rank: z.number()
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

