import { 
  GameState, 
  Player, 
  Card, 
  ClientMessage, 
  ServerMessage,
  validateClientMessage,
  CardSchema,
  GameSettings,
  GameSettingsSchema 
} from '@president/shared';
import { generateDeck, canPlayCards, hasPlayerWon, assignRoles, calculateEloChange } from './gameLogic';

interface Env {
  DB: D1Database;
  LOBBY_KV: KVNamespace;
  PRESENCE_KV: KVNamespace;
  JWT_SECRET: string;
}

interface ConnectionData {
  playerId: string;
  connectionId: string;
}

export class RoomActor {
  private state: DurableObjectState;
  private env: Env;
  private gameState: GameState;
  private connections: Map<string, WebSocket> = new Map();
  private playerToConnection: Map<string, string> = new Map();
  private roomCode: string;
  private gameSettings: GameSettings = {
    allowJokers: false,
    useTwoDecks: false,
    maxPlayers: 8,
    isPrivate: false
  };
  private playersPassedThisTrick: Set<string> = new Set();

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
      this.playerToConnection.set(playerId, connectionId);
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
      this.playerToConnection.set(playerId, connectionId);
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
    if (this.gameState.phase !== 'playing') {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Game is not in playing phase'
      });
      return;
    }

    const { playerId, cards } = message;
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player || this.gameState.players[this.gameState.turnIndex].id !== playerId) {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Not your turn'
      });
      return;
    }

    // Validate cards
    if (!this.validatePlay(player, cards)) {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Invalid play'
      });
      return;
    }

    // Remove cards from player hand
    cards.forEach(cardToPlay => {
      const index = player.hand.findIndex(
        c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit
      );
      if (index > -1) {
        player.hand.splice(index, 1);
      }
    });

    // Update pile
    this.gameState.pile = {
      cards,
      rank: cards[0].rank,
      count: cards.length
    };

    this.playersPassedThisTrick.clear();

    // Broadcast cards played
    this.broadcast({
      type: 'cards_played',
      playerId,
      cards,
      pileRank: cards[0].rank,
      pileCount: cards.length
    });

    // Check if player won
    if (hasPlayerWon(player)) {
      await this.handlePlayerWon(player);
      return;
    }

    // Move to next turn
    this.nextTurn();
  }

  private async handlePassTurn(connectionId: string, message: ClientMessage): Promise<void> {
    if (message.type !== 'pass_turn') return;
    if (this.gameState.phase !== 'playing') {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Game is not in playing phase'
      });
      return;
    }

    const { playerId } = message;
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player || this.gameState.players[this.gameState.turnIndex].id !== playerId) {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Not your turn'
      });
      return;
    }

    this.playersPassedThisTrick.add(playerId);

    // Broadcast turn passed
    this.broadcast({
      type: 'turn_passed',
      playerId
    });

    // Check if everyone passed
    if (this.playersPassedThisTrick.size >= this.gameState.players.length) {
      // Everyone passed, reset the trick
      this.gameState.pile = null;
      this.playersPassedThisTrick.clear();
    } else {
      // Move to next turn
      this.nextTurn();
    }
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
    const playerId = Array.from(this.playerToConnection.entries()).find(
      ([_, connId]) => connId === connectionId
    )?.[0];

    if (playerId) {
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = false;
        
        this.broadcast({
          type: 'system_message',
          message: `${player.handle} disconnected`
        });

        this.broadcast({
          type: 'room_state',
          gameState: this.gameState,
          players: this.gameState.players
        });
      }
    }
  }

  private allPlayersReady(): boolean {
    const connectedPlayers = this.gameState.players.filter(p => p.isConnected);
    return connectedPlayers.length >= 3 && 
           connectedPlayers.every(p => p.isReady);
  }

  private async startGame(): Promise<void> {
    this.gameState.phase = 'playing';
    
    // Generate and deal cards
    const numPlayers = this.gameState.players.length;
    const deck = this.gameSettings.useTwoDecks || numPlayers > 6
      ? [...generateDeck(), ...generateDeck()]
      : generateDeck();

    const dealtData = this.dealCards(deck, this.gameState.players);
    this.gameState.players = dealtData.players;
    this.gameState.deck = dealtData.deck;
    this.gameState.turnIndex = 0;

    this.broadcast({
      type: 'system_message',
      message: 'Game started! Good luck!'
    });

    this.broadcast({
      type: 'turn_changed',
      turnIndex: this.gameState.turnIndex,
      playerId: this.gameState.players[this.gameState.turnIndex].id
    });

    this.broadcast({
      type: 'room_state',
      gameState: this.gameState,
      players: this.gameState.players
    });
  }

  private dealCards(deck: Card[], players: Player[]): { players: Player[]; deck: Card[] } {
    const shuffledDeck = [...deck];
    const updatedPlayers = players.map(player => ({
      ...player,
      hand: []
    }));

    // Deal cards round-robin
    let cardIndex = 0;
    while (cardIndex < shuffledDeck.length && cardIndex < shuffledDeck.length) {
      for (let playerIndex = 0; playerIndex < updatedPlayers.length && cardIndex < shuffledDeck.length; playerIndex++) {
        updatedPlayers[playerIndex].hand.push(shuffledDeck[cardIndex]);
        cardIndex++;
      }
    }

    return {
      players: updatedPlayers,
      deck: shuffledDeck.slice(cardIndex)
    };
  }

  private validatePlay(player: Player, cards: Card[]): boolean {
    // Check if player has all the cards
    for (const card of cards) {
      const hasCard = player.hand.some(c => c.rank === card.rank && c.suit === card.suit);
      if (!hasCard) return false;
    }

    // Check if all cards are same rank
    if (!cards.every(c => c.rank === cards[0].rank)) return false;

    // Check if play beats current pile
    if (this.gameState.pile) {
      return canPlayCards(cards, this.gameState.pile.cards);
    }

    return true;
  }

  private nextTurn(): void {
    this.gameState.turnIndex = (this.gameState.turnIndex + 1) % this.gameState.players.length;
    
    this.broadcast({
      type: 'turn_changed',
      turnIndex: this.gameState.turnIndex,
      playerId: this.gameState.players[this.gameState.turnIndex].id
    });
  }

  private async handlePlayerWon(winner: Player): Promise<void> {
    // Assign roles
    const playersWithRoles = assignRoles(this.gameState.players);
    this.gameState.players = playersWithRoles;

    this.broadcast({
      type: 'round_end',
      winnerId: winner.id,
      roles: Object.fromEntries(playersWithRoles.map(p => [p.id, p.role]))
    });

    // End game if everyone finished
    const remainingPlayers = this.gameState.players.filter(p => p.hand.length > 0);
    if (remainingPlayers.length <= 1) {
      await this.endGame();
    }
  }

  private async endGame(): Promise<void> {
    this.gameState.phase = 'game_end';
    const playersWithRoles = assignRoles(this.gameState.players);
    this.gameState.players = playersWithRoles;

    this.broadcast({
      type: 'game_end',
      finalRankings: playersWithRoles.map((p, idx) => ({
        playerId: p.id,
        handle: p.handle,
        role: p.role || 'citizen',
        rank: idx + 1
      }))
    });

    // TODO: Calculate and store ELO changes
    // TODO: Save match to database
  }

  private sendToConnection(connectionId: string, message: ServerMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  private broadcast(message: ServerMessage): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((connection) => {
      if (connection.readyState === WebSocket.OPEN) {
        try {
          connection.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}