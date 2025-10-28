import type { Session } from './types';

export async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createJWT(payload: object, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const message = `${header}.${body}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${message}.${sigBase64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  
  const [header, body, signature] = parts;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    Uint8Array.from(atob(signature), c => c.charCodeAt(0)),
    encoder.encode(`${header}.${body}`)
  );
  
  if (!isValid) throw new Error('Invalid JWT signature');
  
  return JSON.parse(atob(body));
}

export async function createSession(
  userId: string | undefined,
  username: string,
  isGuest: boolean
): Promise<Session> {
  const id = crypto.randomUUID();
  const token = await generateToken();
  const now = Date.now();
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days
  
  return {
    id,
    userId,
    username,
    token,
    isGuest,
    createdAt: now,
    expiresAt
  };
}

export function getJWTSecret(): string {
  // In production, use secrets or environment variables
  return 'your-secret-key-change-this-in-production';
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Combine password and salt
  const saltedData = new Uint8Array(data.length + salt.length);
  saltedData.set(data, 0);
  saltedData.set(salt, data.length);
  
  // Hash the salted password
  const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
  const hash = new Uint8Array(hashBuffer);
  
  // Store salt and hash together
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...hash));
  
  return `${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = storedHash.split(':');
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const storedHashBytes = Uint8Array.from(atob(hashBase64), c => c.charCodeAt(0));
    
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Combine password and salt
    const saltedData = new Uint8Array(passwordData.length + salt.length);
    saltedData.set(passwordData, 0);
    saltedData.set(salt, passwordData.length);
    
    // Hash the salted password
    const hashBuffer = await crypto.subtle.digest('SHA-256', saltedData);
    const computedHash = new Uint8Array(hashBuffer);
    
    // Compare arrays
    if (computedHash.length !== storedHashBytes.length) return false;
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHashBytes[i]) return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}
