import jwt from 'jsonwebtoken';
import { UserSessionSchema } from '@president/shared';

// Generate a random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a guest user session
export async function createGuestUser(db: D1Database, handle: string): Promise<{ token: string; userId: string }> {
  const userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Insert user
  await db.prepare(`
    INSERT INTO users (id, handle, created_at)
    VALUES (?, ?, ?)
  `).bind(userId, handle, new Date().toISOString()).run();

  // Create session
  const session = await createUserSession(userId, handle, true);
  
  return {
    token: session.token,
    userId
  };
}

// Create a user session with JWT
export async function createUserSession(userId: string, handle: string, isGuest: boolean): Promise<{ token: string }> {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const payload = {
    userId,
    handle,
    isGuest,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = jwt.sign(payload, secret);
  
  return { token };
}

// Validate JWT token
export function validateToken(token: string, secret: string): any {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

