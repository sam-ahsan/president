import { create } from 'zustand';
import type { GameState, Card } from '../types';

interface GameStoreState {
  gameState: GameState | null;
  selectedCards: Card[];
  ws: WebSocket | null;
  
  setGameState: (state: GameState) => void;
  setWebSocket: (ws: WebSocket) => void;
  toggleCard: (card: Card) => void;
  clearSelection: () => void;
  playCards: () => void;
  pass: () => void;
  ready: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  selectedCards: [],
  ws: null,
  
  setGameState: (state) => set({ gameState: state }),
  setWebSocket: (ws) => set({ ws }),
  
  toggleCard: (card) => {
    const { selectedCards } = get();
    const index = selectedCards.findIndex(
      c => c.rank === card.rank && c.suit === card.suit
    );
    
    if (index === -1) {
      set({ selectedCards: [...selectedCards, card] });
    } else {
      set({ 
        selectedCards: selectedCards.filter((_, i) => i !== index)
      });
    }
  },
  
  clearSelection: () => set({ selectedCards: [] }),
  
  playCards: () => {
    const { ws, selectedCards } = get();
    if (ws && selectedCards.length > 0) {
      ws.send(JSON.stringify({
        type: 'play_cards',
        data: { cards: selectedCards },
        timestamp: Date.now()
      }));
      set({ selectedCards: [] });
    }
  },
  
  pass: () => {
    const { ws } = get();
    if (ws) {
      ws.send(JSON.stringify({
        type: 'pass',
        data: {},
        timestamp: Date.now()
      }));
    }
  },
  
  ready: () => {
    const { ws } = get();
    if (ws) {
      ws.send(JSON.stringify({
        type: 'ready',
        data: {},
        timestamp: Date.now()
      }));
    }
  }
}));
