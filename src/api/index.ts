import type { Env } from './env';
import { createJWT, verifyJWT, getJWTSecret, hashPassword, verifyPassword } from '../shared/auth';
import { createSession } from '../shared/auth';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'president-api' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Guest authentication
    if (path === '/api/auth/guest' && request.method === 'POST') {
      return handleGuestAuth(request, env, corsHeaders);
    }

    // User registration
    if (path === '/api/auth/register' && request.method === 'POST') {
      return handleRegister(request, env, corsHeaders);
    }

    // User login
    if (path === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env, corsHeaders);
    }

    // Create room
    if (path === '/api/rooms' && request.method === 'POST') {
      return handleCreateRoom(request, env, corsHeaders);
    }

    // List rooms
    if (path === '/api/rooms' && request.method === 'GET') {
      return handleListRooms(request, env, corsHeaders);
    }

    // Get room info
    if (path.startsWith('/api/rooms/') && request.method === 'GET') {
      const roomId = path.split('/')[3];
      return handleGetRoom(roomId, env, corsHeaders);
    }

    // Leaderboard
    if (path === '/api/leaderboard' && request.method === 'GET') {
      return handleLeaderboard(request, env, corsHeaders);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

async function handleGuestAuth(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Generate a unique random guest username
    let username: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      // Generate a random guest name with a number (e.g., "Guest123")
      const randomNum = Math.floor(Math.random() * 1000000);
      username = `Guest${randomNum}`;
      
      // Check if username exists in database
      const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(username) = ?')
        .bind(username.toLowerCase())
        .first();
      
      if (!existing) {
        break; // Username is unique
      }
      
      attempts++;
    } while (attempts < maxAttempts);
    
    // If we couldn't find a unique name after 10 attempts, add timestamp
    if (attempts >= maxAttempts) {
      username = `Guest${Date.now()}`;
    }
    
    // For guest users, don't create DB record - use session ID as identifier
    const session = await createSession(undefined, username, true);
    const guestUserId = `guest:${session.id}`; // Prefix to identify guest users
    
    const jwt = await createJWT(
      { 
        sessionId: session.id, 
        userId: guestUserId, // Use prefixed session ID for guests
        username: session.username,
        isGuest: true 
      }, 
      getJWTSecret()
    );

    // Store session in KV
    await env.SESSIONS.put(session.id, JSON.stringify(session), {
      expiration: Math.floor(session.expiresAt / 1000)
    });

    return new Response(JSON.stringify({ token: jwt, user: { id: guestUserId, username, isGuest: true } }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleRegister(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { username: string; email: string; password: string };
    
    // Validate username
    if (!body.username || body.username.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Username must be at least 3 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Validate password
    if (!body.password || body.password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    if (!/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/[0-9]/.test(body.password)) {
      return new Response(JSON.stringify({ error: 'Password must contain uppercase, lowercase, and a number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Check if username exists (case insensitive)
    const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(username) = ?')
      .bind(body.username.toLowerCase())
      .first();
    
    if (existing) {
      return new Response(JSON.stringify({ error: 'Username already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const userId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, body.username, body.email, passwordHash, Date.now()).run();

    const session = await createSession(userId, body.username, false);
    const jwt = await createJWT(
      { sessionId: session.id, userId, username: body.username, isGuest: false },
      getJWTSecret()
    );

    await env.SESSIONS.put(session.id, JSON.stringify(session), {
      expiration: Math.floor(session.expiresAt / 1000)
    });

    return new Response(JSON.stringify({ token: jwt, user: { username: body.username, isGuest: false } }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleLogin(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json() as { username: string; password: string };
    
    // Find user by username (case insensitive)
    const user = await env.DB.prepare(
      'SELECT id, username, password_hash FROM users WHERE LOWER(username) = ?'
    ).bind(body.username.toLowerCase()).first() as { id: string; username: string; password_hash: string | null } | undefined;
    
    if (!user || !user.password_hash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Verify password
    const isValid = await verifyPassword(body.password, user.password_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const session = await createSession(user.id, user.username, false);
    const jwt = await createJWT(
      { sessionId: session.id, userId: user.id, username: user.username, isGuest: false },
      getJWTSecret()
    );

    await env.SESSIONS.put(session.id, JSON.stringify(session), {
      expiration: Math.floor(session.expiresAt / 1000)
    });

    return new Response(JSON.stringify({ token: jwt, user: { username: user.username, isGuest: false } }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateRoom(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: corsHeaders
      });
    }

    const payload = await verifyJWT(token, getJWTSecret());
    
    if (!payload.userId && !payload.sessionId) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { 
        status: 401,
        headers: corsHeaders
      });
    }
    
    const body = await request.json() as { name: string; maxPlayers: number };
    
    const roomId = crypto.randomUUID();
    const hostId = payload.userId || payload.sessionId;
    
    await env.DB.prepare(
      'INSERT INTO rooms (id, name, host_id, max_players, current_players, status, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
    ).bind(roomId, body.name, hostId, body.maxPlayers, 'waiting', Date.now()).run();

    return new Response(JSON.stringify({ id: roomId, name: body.name, maxPlayers: body.maxPlayers }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleListRooms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const rooms = await env.DB.prepare(
      'SELECT * FROM rooms WHERE status = ? ORDER BY created_at DESC LIMIT 50'
    ).bind('waiting').all() as any;
    
    return new Response(JSON.stringify(rooms.results || []), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error: any) {
    console.error('Error listing rooms:', error);
    // Return empty array if table doesn't exist (e.g., first run)
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetRoom(roomId: string, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const room = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?')
      .bind(roomId)
      .first();
    
    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), { 
        status: 404,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify(room), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleLeaderboard(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      'SELECT id, username, elo_rating, games_played, games_won, win_rate FROM leaderboard LIMIT 100'
    ).all() as any;
    
    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
