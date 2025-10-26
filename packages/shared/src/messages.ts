import { z } from 'zod';
import { CardSchema, PlayerSchema } from './types';

// Base message structure
export const BaseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.string().optional()
});

// Client to Server Messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  // Room management
  BaseMessageSchema.extend({
    type: z.literal('join_room'),
    roomCode: z.string(),
    playerId: z.string(),
    handle: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('leave_room'),
    playerId: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('set_ready'),
    playerId: z.string(),
    ready: z.boolean()
  }),
  
  // Game actions
  BaseMessageSchema.extend({
    type: z.literal('play_cards'),
    playerId: z.string(),
    cards: z.array(CardSchema)
  }),
  BaseMessageSchema.extend({
    type: z.literal('pass_turn'),
    playerId: z.string()
  }),
  
  // Chat
  BaseMessageSchema.extend({
    type: z.literal('chat_message'),
    playerId: z.string(),
    message: z.string(),
    handle: z.string()
  }),
  
  // Heartbeat
  BaseMessageSchema.extend({
    type: z.literal('ping'),
    playerId: z.string()
  })
]);

// Server to Client Messages
export const ServerMessageSchema = z.discriminatedUnion('type', [
  // Room updates
  BaseMessageSchema.extend({
    type: z.literal('room_state'),
    gameState: z.any(), // Will be GameStateSchema in practice
    players: z.array(PlayerSchema)
  }),
  BaseMessageSchema.extend({
    type: z.literal('player_joined'),
    player: PlayerSchema
  }),
  BaseMessageSchema.extend({
    type: z.literal('player_left'),
    playerId: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('player_ready_changed'),
    playerId: z.string(),
    ready: z.boolean()
  }),
  
  // Game events
  BaseMessageSchema.extend({
    type: z.literal('cards_played'),
    playerId: z.string(),
    cards: z.array(CardSchema),
    pileRank: z.string(),
    pileCount: z.number()
  }),
  BaseMessageSchema.extend({
    type: z.literal('turn_passed'),
    playerId: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('turn_changed'),
    turnIndex: z.number(),
    playerId: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('round_end'),
    winnerId: z.string(),
    roles: z.record(z.string(), z.string()) // playerId -> role
  }),
  BaseMessageSchema.extend({
    type: z.literal('game_end'),
    finalRankings: z.array(z.object({
      playerId: z.string(),
      handle: z.string(),
      role: z.string(),
      rank: z.number()
    }))
  }),
  
  // Chat
  BaseMessageSchema.extend({
    type: z.literal('chat_message'),
    playerId: z.string(),
    handle: z.string(),
    message: z.string(),
    timestamp: z.string()
  }),
  
  // System messages
  BaseMessageSchema.extend({
    type: z.literal('system_message'),
    message: z.string()
  }),
  BaseMessageSchema.extend({
    type: z.literal('error'),
    message: z.string(),
    code: z.string().optional()
  }),
  
  // Heartbeat
  BaseMessageSchema.extend({
    type: z.literal('pong')
  })
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// Helper functions for message validation
export function validateClientMessage(data: unknown): ClientMessage {
  return ClientMessageSchema.parse(data);
}

export function validateServerMessage(data: unknown): ServerMessage {
  return ServerMessageSchema.parse(data);
}

// Message type guards
export function isClientMessage(data: unknown): data is ClientMessage {
  return ClientMessageSchema.safeParse(data).success;
}

export function isServerMessage(data: unknown): data is ServerMessage {
  return ServerMessageSchema.safeParse(data).success;
}

