import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameState } from '../types';

const API_URL = import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function useWebSocket(roomId: string, token: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const { setGameState, setWebSocket } = useGameStore();

  useEffect(() => {
    const wsUrl = API_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/room/${roomId}?token=${token}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebSocket(ws);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'game_state_update') {
        setGameState(message.data.gameState as GameState);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, token, setGameState, setWebSocket]);
}
