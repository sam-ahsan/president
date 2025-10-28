import type { Env } from './env';
import type { WebSocketMessage, GameState, Player, Card, RoomStatus as GameStatus } from '../shared/types';
import { createDeck, isValidSet, canBeatPrevious } from '../shared/cards';
import { verifyJWT, getJWTSecret } from '../shared/auth';

class RoomActor {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<string, WebSocket>;
  private gameState: GameState;
  private players: Map<string, Player>;
  private currentPlayerId?: string;
  private currentPlay?: Card[];
  private round: number = 1;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.players = new Map();
    this.gameState = {
      roomId: '',
      players: new Map(),
      playerHands: new Map(),
      deck: [],
      round: 1,
      status: 'dealing',
      roles: new Map()
    };
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Missing token', { status: 401 });
    }

    try {
      const payload = await verifyJWT(token, getJWTSecret());
      const userId = payload.userId || payload.sessionId;
      const username = payload.username;

      // Accept WebSocket connection
      this.handleSession(server, userId, username);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      return new Response('Invalid token', { status: 401 });
    }
  }

  handleSession(ws: WebSocket, userId: string, username: string) {
    ws.accept();
    
    // Add player
    const player: Player = {
      id: userId,
      username,
      isReady: false
    };
    
    this.players.set(userId, player);
    this.sessions.set(userId, ws);

    // Setup message handler
    ws.addEventListener('message', async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        await this.handleMessage(userId, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: Date.now()
        }));
      }
    });

    // Setup close handler
    ws.addEventListener('close', () => {
      this.players.delete(userId);
      this.sessions.delete(userId);
      this.broadcast({
        type: 'player_left',
        data: { playerId: userId },
        timestamp: Date.now()
      });
    });

    // Send current game state
    this.sendGameState(userId);
    
    // Notify others
    this.broadcast({
      type: 'player_joined',
      data: { player: { id: userId, username } },
      timestamp: Date.now()
    }, userId);
  }

  async handleMessage(userId: string, message: WebSocketMessage) {
    switch (message.type) {
      case 'play_cards':
        await this.handlePlayCards(userId, message.data.cards);
        break;
      case 'pass':
        await this.handlePass(userId);
        break;
      case 'ready':
        await this.handleReady(userId);
        break;
      case 'chat':
        this.broadcast(message);
        break;
      default:
        break;
    }
  }

  async handleReady(userId: string) {
    const player = this.players.get(userId);
    if (!player) return;
    
    player.isReady = true;
    
    // If all players ready and game not started
    const allReady = Array.from(this.players.values()).every(p => p.isReady);
    if (allReady && this.players.size >= 3 && this.gameState.status === 'dealing') {
      await this.startGame();
    }
  }

  async startGame() {
    const playerCount = this.players.size;
    const deckCount = playerCount > 6 ? 2 : 1;
    const deck = createDeck(deckCount);
    
    // Deal cards
    const playerIds = Array.from(this.players.keys());
    const hands: Map<string, Card[]> = new Map();
    
    // Simple dealing: distribute cards one by one
    let cardIndex = 0;
    for (let i = 0; i < deck.length; i++) {
      const playerId = playerIds[cardIndex % playerCount];
      if (!hands.has(playerId)) {
        hands.set(playerId, []);
      }
      hands.get(playerId)!.push(deck[i]);
      cardIndex++;
    }
    
    this.gameState = {
      roomId: this.state.id.toString(),
      players: this.players,
      playerHands: hands,
      deck: [],
      round: 1,
      status: 'playing',
      roles: new Map()
    };
    
    // Start with first player
    this.currentPlayerId = playerIds[0];
    
    this.broadcast({
      type: 'game_state_update',
      data: { gameState: this.serializeGameState() },
      timestamp: Date.now()
    });
  }

  async handlePlayCards(userId: string, cards: Card[]) {
    if (this.currentPlayerId !== userId) {
      this.sendError(userId, 'Not your turn');
      return;
    }

    if (cards.length === 0) {
      this.sendError(userId, 'Must play at least one card');
      return;
    }

    if (!isValidSet(cards)) {
      this.sendError(userId, 'All cards must have the same rank');
      return;
    }

    if (!canBeatPrevious(cards, this.currentPlay)) {
      this.sendError(userId, 'Cards must beat previous play');
      return;
    }

    // Remove cards from player hand
    const hand = this.gameState.playerHands.get(userId);
    if (!hand) return;

    for (const card of cards) {
      const index = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (index !== -1) {
        hand.splice(index, 1);
      }
    }

    this.currentPlay = cards;

    // Check if player is out of cards (winner)
    if (hand.length === 0) {
      this.handleRoundEnd(userId);
    } else {
      this.nextPlayer();
    }

    this.broadcast({
      type: 'game_state_update',
      data: { gameState: this.serializeGameState() },
      timestamp: Date.now()
    });
  }

  async handlePass(userId: string) {
    if (this.currentPlayerId !== userId) {
      this.sendError(userId, 'Not your turn');
      return;
    }

    this.nextPlayer();
    
    this.broadcast({
      type: 'game_state_update',
      data: { gameState: this.serializeGameState() },
      timestamp: Date.now()
    });
  }

  nextPlayer() {
    const playerIds = Array.from(this.players.keys());
    const currentIndex = playerIds.indexOf(this.currentPlayerId || '');
    const nextIndex = (currentIndex + 1) % playerIds.length;
    this.currentPlayerId = playerIds[nextIndex];
  }

  handleRoundEnd(winnerId: string) {
    // This is a simplified version - in full implementation,
    // you'd track all positions and assign roles
    this.gameState.status = 'round_end';
    
    // Assign basic roles
    this.gameState.roles.set(winnerId, 'president');
    
    this.broadcast({
      type: 'game_end',
      data: { winner: winnerId, roles: Object.fromEntries(this.gameState.roles) },
      timestamp: Date.now()
    });
  }

  sendGameState(userId: string) {
    const ws = this.sessions.get(userId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'game_state_update',
        data: { gameState: this.serializeGameState() },
        timestamp: Date.now()
      }));
    }
  }

  sendError(userId: string, message: string) {
    const ws = this.sessions.get(userId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message },
        timestamp: Date.now()
      }));
    }
  }

  broadcast(message: WebSocketMessage, excludeUserId?: string) {
    for (const [userId, ws] of this.sessions.entries()) {
      if (userId !== excludeUserId) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  serializeGameState() {
    return {
      roomId: this.gameState.roomId,
      players: Array.from(this.players.entries()),
      currentPlayer: this.currentPlayerId,
      currentPlay: this.currentPlay,
      playerHands: Array.from(this.gameState.playerHands.entries()),
      round: this.gameState.round,
      status: this.gameState.status,
      winner: this.gameState.winner,
      roles: Object.fromEntries(this.gameState.roles)
    };
  }
}

// Export at module boundary
export { RoomActor };
