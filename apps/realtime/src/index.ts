import { RoomActor } from './room';

// Environment bindings
interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  LOBBY_KV: KVNamespace;
  PRESENCE_KV: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade for room connections
    if (url.pathname.startsWith('/api/room/') && url.pathname.endsWith('/join')) {
      const roomCode = url.pathname.split('/')[3];
      
      if (!roomCode || roomCode.length !== 6) {
        return new Response('Invalid room code', { status: 400 });
      }

      // Get the Durable Object for this room
      const roomId = env.ROOM.idFromName(roomCode);
      const room = env.ROOM.get(roomId);

      // Forward the request to the Durable Object
      return room.fetch(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

// Export the Durable Object class
export { RoomActor };

