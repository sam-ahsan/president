import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import jwtLib from 'jsonwebtoken';
import { generateRoomCode, createGuestUser, createUserSession } from './utils';
import { UserSessionSchema } from '@president/shared';

// Environment bindings
interface Env {
  DB: D1Database;
  LOBBY_KV: KVNamespace;
  PRESENCE_KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://president-game.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// JWT middleware for protected routes
const jwtMiddleware = jwt({
  secret: (c) => c.env.JWT_SECRET,
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Guest authentication
app.post('/api/auth/guest', async (c) => {
  try {
    const { handle } = await c.req.json();
    
    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      return c.json({ error: 'Handle is required' }, 400);
    }

    const trimmedHandle = handle.trim();
    if (trimmedHandle.length > 20) {
      return c.json({ error: 'Handle must be 20 characters or less' }, 400);
    }

    const userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
    const isLocalDev = c.env.ENVIRONMENT === 'development';
    
    // Try to use database first (production mode)
    try {
      const session = await createGuestUser(c.env.DB, trimmedHandle);
      
      return c.json({
        token: session.token,
        user: {
          id: session.userId,
          handle: trimmedHandle,
          isGuest: true
        }
      });
    } catch (dbError) {
      // Fall back to in-memory auth for local development
      console.log(`Database unavailable, using in-memory auth (dev mode: ${isLocalDev})`);
      
      const token = jwtLib.sign(
        {
          userId,
          handle: trimmedHandle,
          isGuest: true,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        },
        secret
      );
      
      return c.json({
        token,
        user: {
          id: userId,
          handle: trimmedHandle,
          isGuest: true
        }
      });
    }
  } catch (error) {
    console.error('Guest auth error:', error);
    return c.json({ error: 'Failed to create guest session', details: error.message }, 500);
  }
});

// Create room
app.post('/api/room/create', jwtMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload') as any;
    const { isPrivate = false, maxPlayers = 8 } = await c.req.json();

    if (maxPlayers < 3 || maxPlayers > 8) {
      return c.json({ error: 'Max players must be between 3 and 8' }, 400);
    }

    const roomCode = generateRoomCode();
    const roomData = {
      code: roomCode,
      hostId: payload.userId,
      maxPlayers,
      isPrivate,
      createdAt: new Date().toISOString(),
      gameState: {
        roomCode,
        phase: 'lobby',
        players: [],
        pile: null,
        turnIndex: 0,
        roundNumber: 1
      }
    };

    // Store room in KV
    await c.env.LOBBY_KV.put(`room:${roomCode}`, JSON.stringify(roomData), {
      expirationTtl: 3600 // 1 hour
    });

    // Update presence
    await c.env.PRESENCE_KV.put(`presence:${roomCode}`, '0');

    return c.json({
      roomCode,
      joinUrl: `/room/${roomCode}`,
      room: roomData
    });
  } catch (error) {
    console.error('Create room error:', error);
    return c.json({ error: 'Failed to create room' }, 500);
  }
});

// Get room info
app.get('/api/room/:code', async (c) => {
  try {
    const roomCode = c.req.param('code');
    const roomData = await c.env.LOBBY_KV.get(`room:${roomCode}`);

    if (!roomData) {
      return c.json({ error: 'Room not found' }, 404);
    }

    return c.json(JSON.parse(roomData));
  } catch (error) {
    console.error('Get room error:', error);
    return c.json({ error: 'Failed to get room' }, 500);
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (c) => {
  try {
    const { limit = 50, offset = 0 } = c.req.query();
    
    const stmt = c.env.DB.prepare(`
      SELECT 
        u.id as userId,
        u.handle,
        l.elo,
        l.games,
        l.wins,
        ROW_NUMBER() OVER (ORDER BY l.elo DESC) as rank
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.elo DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(parseInt(limit), parseInt(offset)).all();
    
    return c.json({
      leaderboard: result.results,
      total: result.results.length
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return c.json({ error: 'Failed to get leaderboard' }, 500);
  }
});

// Get match history
app.get('/api/match/:id', jwtMiddleware, async (c) => {
  try {
    const matchId = c.req.param('id');
    const payload = c.get('jwtPayload') as any;

    const stmt = c.env.DB.prepare(`
      SELECT m.*, mp.rank, mp.elo_delta
      FROM matches m
      JOIN match_players mp ON m.id = mp.match_id
      WHERE m.id = ? AND mp.user_id = ?
    `);

    const result = await stmt.bind(matchId, payload.userId).first();
    
    if (!result) {
      return c.json({ error: 'Match not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Match history error:', error);
    return c.json({ error: 'Failed to get match' }, 500);
  }
});

// Error handling
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;

