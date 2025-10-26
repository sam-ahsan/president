import { 
  GameState, 
  Player, 
  Card, 
  ClientMessage, 
  ServerMessage,
  validateClientMessage,
  CardSchema 
} from '@president/shared';

interface Env {
  DB: D1Database;
  LOBBY_KV: KVNamespace;
  PRESENCE_KV: KVNamespace;
  JWT_SECRET: string;
}

export class RoomActor {
  private state: DurableObjectState;
  private env: Env;
  private gameState: GameState;
  private connections: Map<string, WebSocket> = new Map();
  private roomCode: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.roomCode = state.id.name;
    this.gameState = this.getInitialGameState();
  }

  private getInitialGameState(): GameState {
    return {
      roomCode: this.roomCode,
      phase: 'lobby',
      players: [],
      pile: null,
      turnIndex: 0,
      roundNumber: 1
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests for room info
    if (url.pathname.endsWith('/info')) {
      return new Response(JSON.stringify({
        roomCode: this.roomCode,
        gameState: this.gameState,
        connections: this.connections.size
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    // Store the connection
    const connectionId = this.generateConnectionId();
    this.connections.set(connectionId, server);

    // Set up message handlers
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string);
        await this.handleMessage(connectionId, message);
      } catch (error) {
        console.error('Message handling error:', error);
        this.sendToConnection(connectionId, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    server.addEventListener('close', () => {
      this.connections.delete(connectionId);
      this.handlePlayerDisconnect(connectionId);
    });

    // Send initial game state
    this.sendToConnection(connectionId, {
      type: 'room_state',
      gameState: this.gameState,
      players: this.gameState.players
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleMessage(connectionId: string, message: unknown): Promise<void> {
    try {
      const clientMessage = validateClientMessage(message);
      
      switch (clientMessage.type) {
        case 'join_room':
          await this.handleJoinRoom(connectionId, clientMessage);
          break;
        case 'leave_room':
          await this.handleLeaveRoom(connectionId, clientMessage);
          break;
        case 'set_ready':
          await this.handleSetReady(connectionId, clientMessage);
          break;
        case 'play_cards':
          await this.handlePlayCards(connectionId, clientMessage);
          break;
        case 'pass_turn':
          await this.handlePassTurn(connectionId, clientMessage);
          break;
        case 'chat_message':
          await this.handleChatMessage(connectionId, clientMessage);
          break;
        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong' });
          break;
        default:
          this.sendToConnection(connectionId, {
            type: 'error',
            message: 'Unknown message type'
          });
      }
    } catch (error) {
      console.error('Message validation error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Invalid message'
      });
    }
  }

  private async handleJoinRoom(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'join_room') return;

    const { playerId, handle } = message;

    // Check if player already exists
    const existingPlayer = this.gameState.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
    } else {
      // Add new player
      const newPlayer: Player = {
        id: playerId,
        handle,
        hand: [],
        isConnected: true,
        isReady: false
      };
      this.gameState.players.push(newPlayer);
    }

    // Broadcast player joined
    this.broadcast({
      type: 'player_joined',
      player: this.gameState.players.find(p => p.id === playerId)!
    });

    // Send updated game state
    this.broadcast({
      type: 'room_state',
      gameState: this.gameState,
      players: this.gameState.players
    });
  }

  private async handleLeaveRoom(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'leave_room') return;

    const { playerId } = message;
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (player) {
      player.isConnected = false;
      
      // Broadcast player left
      this.broadcast({
        type: 'player_left',
        playerId
      });
    }
  }

  private async handleSetReady(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'set_ready') return;

    const { playerId, ready } = message;
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (player) {
      player.isReady = ready;
      
      // Broadcast ready state change
      this.broadcast({
        type: 'player_ready_changed',
        playerId,
        ready
      });

      // Check if all players are ready and start game
      if (this.gameState.phase === 'lobby' && this.allPlayersReady()) {
        await this.startGame();
      }
    }
  }

  private async handlePlayCards(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'play_cards') return;

    const { playerId, cards } = message;
    
    // TODO: Implement card validation and game logic
    // For now, just broadcast the cards played
    this.broadcast({
      type: 'cards_played',
      playerId,
      cards,
      pileRank: cards[0]?.rank || '',
      pileCount: cards.length
    });
  }

  private async handlePassTurn(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'pass_turn') return;

    const { playerId } = message;
    
    // TODO: Implement turn logic
    this.broadcast({
      type: 'turn_passed',
      playerId
    });
  }

  private async handleChatMessage(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'chat_message') return;

    const { playerId, message: chatMessage, handle } = message;
    
    this.broadcast({
      type: 'chat_message',
      playerId,
      handle,
      message: chatMessage,
      timestamp: new Date().toISOString()
    });
  }

  private handlePlayerDisconnect(connectionId: string): void {
    // Find player by connection and mark as disconnected
    // This is a simplified implementation
    this.broadcast({
      type: 'system_message',
      message: 'A player disconnected'
    });
  }

  private allPlayersReady(): boolean {
    return this.gameState.players.length >= 3 && 
           this.gameState.players.every(p => p.isReady);
  }

  private async startGame(): Promise<void> {
    this.gameState.phase = 'playing';
    
    // TODO: Implement game start logic
    // - Deal cards
    // - Set initial turn
    // - Initialize game state
    
    this.broadcast({
      type: 'system_message',
      message: 'Game started!'
    });

    this.broadcast({
      type: 'room_state',
      gameState: this.gameState,
      players: this.gameState.players
    });
  }

  private sendToConnection(connectionId: string, message: ServerMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((connection) => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      }
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

