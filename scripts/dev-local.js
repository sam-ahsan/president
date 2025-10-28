#!/usr/bin/env node

/**
 * President - Local Development Server
 * 
 * This script runs a local development environment using:
 * - Node.js for API and WebSocket server
 * - In-memory database (no file dependencies)
 * - In-memory storage for KV (replacing KV Store)
 * - Native WebSocket support
 * 
 * Usage: node scripts/dev-local.js
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = 8787;

// Simple in-memory database implementation
class SimpleDB {
  constructor() {
    this.data = {
      users: {},
      sessions: {},
      rooms: {},
      matches: {},
      match_results: {}
    };
    console.log('✓ In-memory database initialized');
  }

  // Mock SQL-like interface
  prepare(query) {
    return new QueryExecutor(query, this.data);
  }
}

class QueryExecutor {
  constructor(query, data) {
    this.query = query;
    this.data = data;
  }

  run(...params) {
    // Simple INSERT handling
    if (this.query.includes('INSERT INTO users')) {
      const id = params[0];
      this.data.users[id] = {
        id, username: params[1], email: params[2], created_at: params[3],
        elo_rating: 1000, games_played: 0, games_won: 0
      };
    } else if (this.query.includes('INSERT INTO rooms')) {
      this.data.rooms[params[0]] = {
        id: params[0], name: params[1], host_id: params[2],
        max_players: params[3], current_players: params[4] || 0,
        status: params[5], created_at: params[6]
      };
    }
  }

  get(...params) {
    // Simple SELECT WHERE id = ?
    if (this.query.includes('SELECT') && this.query.includes('WHERE id = ?')) {
      const id = params[0];
      if (this.query.includes('FROM rooms')) {
        return this.data.rooms[id] || null;
      } else if (this.query.includes('FROM users')) {
        return this.data.users[id] || null;
      } else if (this.query.includes('FROM sessions')) {
        return this.data.sessions[id] || null;
      }
    }
    return null;
  }

  all(...params) {
    // Simple SELECT all
    if (this.query.includes('FROM rooms')) {
      const rooms = Object.values(this.data.rooms);
      const allRooms = rooms.filter(r => !r.status || r.status === params[0] || r.status === 'waiting');
      return { results: allRooms };
    } else if (this.query.includes('FROM users') || this.query.includes('FROM leaderboard')) {
      return { results: Object.values(this.data.users).filter(u => u.games_played > 0) };
    }
    return { results: [] };
  }
}

// Initialize in-memory database
console.log('Initializing in-memory database...');
const db = new SimpleDB();

// In-memory KV store
const kvStore = new Map();

// WebSocket server for real-time game
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', mode: 'local' }));
    return;
  }

  // API Routes
  if (url.pathname === '/api/auth/guest' && req.method === 'POST') {
    handleGuestAuth(req, res);
    return;
  }

  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    handleCreateRoom(req, res);
    return;
  }

  if (url.pathname === '/api/rooms' && req.method === 'GET') {
    handleListRooms(req, res);
    return;
  }

  if (url.pathname.startsWith('/api/rooms/') && req.method === 'GET') {
    handleGetRoom(req, res, url);
    return;
  }

  if (url.pathname === '/api/leaderboard') {
    handleLeaderboard(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket upgrade for game rooms
const wss = new WebSocketServer({ server, path: '/room' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const roomId = url.searchParams.get('roomId');
  
  console.log(`WebSocket connected to room: ${roomId}`);
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received:', message.type);
    
    // Echo back for local testing
    ws.send(JSON.stringify({
      type: 'game_state_update',
      data: {
        gameState: {
          roomId,
          players: [],
          currentPlayer: null,
          currentPlay: [],
          playerHands: [],
          round: 1,
          status: 'playing',
          roles: {}
        }
      },
      timestamp: Date.now()
    }));
  });
  
  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
});

// Handlers
async function handleGuestAuth(req, res) {
  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { username } = JSON.parse(body);
      const finalUsername = username || `Guest${Math.random().toString(36).substring(2, 9)}`;
      
      const token = Math.random().toString(36).substring(2);
      const now = Date.now();
      
      const session = {
        id: crypto.randomUUID(),
        username: finalUsername,
        token,
        isGuest: true,
        createdAt: now,
        expiresAt: now + (7 * 24 * 60 * 60 * 1000)
      };
      
      kvStore.set(token, session);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        token,
        user: { username: finalUsername, isGuest: true }
      }));
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function handleCreateRoom(req, res) {
  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { name, maxPlayers } = JSON.parse(body);
      const roomId = crypto.randomUUID();
      
      const room = {
        id: roomId,
        name,
        hostId: 'local-host',
        maxPlayers,
        currentPlayers: 0,
        status: 'waiting',
        createdAt: Date.now()
      };
      
      db.prepare(`
        INSERT INTO rooms (id, name, host_id, max_players, current_players, status, created_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `).run(roomId, name, 'local-host', maxPlayers, 'waiting', Date.now());
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room));
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function handleListRooms(req, res) {
  try {
    const rooms = db.prepare('SELECT * FROM rooms WHERE status = ? ORDER BY created_at DESC LIMIT 50')
      .all('waiting');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rooms));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function handleGetRoom(req, res, url) {
  try {
    const roomId = url.pathname.split('/')[3];
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    
    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Room not found' }));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(room));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function handleLeaderboard(req, res) {
  try {
    const leaderboard = db.prepare(`
      SELECT id, username, elo_rating, games_played, games_won, 
             CASE WHEN games_played > 0 THEN (games_won * 100.0 / games_played) ELSE 0 END as win_rate
      FROM users 
      WHERE games_played > 0
      ORDER BY elo_rating DESC 
      LIMIT 100
    `).all();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaderboard));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Cleanup function
function cleanup() {
  console.log('\n\nShutting down gracefully...');
  console.log('✓ In-memory database cleared');
  console.log('✓ Server stopped');
  process.exit(0);
}

// Handle cleanup
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 Local development server running!');
  console.log(`   API: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/room`);
  console.log('\n💡 Note: This is a simplified local server for development.');
  console.log('   For full functionality, use wrangler dev.');
  console.log('\nPress Ctrl+C to stop\n');
});

// Export for testing
export { server, db, kvStore };
