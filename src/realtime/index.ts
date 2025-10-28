import type { Env } from './env';
export { RoomActor } from './room-actor';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // Handle WebSocket upgrade
    if (url.pathname.startsWith('/room/')) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const roomId = url.pathname.split('/')[2];
      if (!roomId) {
        return new Response('Missing room ID', { status: 400 });
      }

      // Get RoomActor instance
      const id = env.ROOM_ACTOR.idFromName(roomId);
      const stub = env.ROOM_ACTOR.get(id);
      
      return stub.fetch(request);
    }

    return new Response('Not Found', { status: 404, headers });
  }
};