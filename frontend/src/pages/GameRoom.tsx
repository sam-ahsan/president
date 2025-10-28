import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion } from 'framer-motion';
import CardComponent from '../components/Card';

export default function GameRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { gameState, selectedCards, toggleCard, playCards, pass, ready, clearSelection } = useGameStore();

  const token = user?.token || localStorage.getItem('auth_token') || '';
  
  useEffect(() => {
    if (!isAuthenticated() || !user?.token) {
      navigate('/');
      return;
    }
  }, [id, navigate, isAuthenticated, user?.token]);

  useWebSocket(id!, token);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-400">Connecting to game...</div>
        </div>
      </div>
    );
  }

  // Get current player's hand
  const myHand = gameState.playerHands.find(([id]) => id === user?.id)?.[1] || [];
  const isMyTurn = gameState.currentPlayer === user?.id;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Room {id}</h2>
          <div className="text-sm text-gray-400">
            Round {gameState.round} • {gameState.status}
          </div>
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {gameState.players.map(([playerId, player]) => (
            <motion.div
              key={playerId}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className={`p-4 rounded-lg border ${
                gameState.currentPlayer === playerId 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-white/20 bg-white/10'
              }`}
            >
              <div className="font-semibold">{player.username}</div>
              <div className="text-sm text-gray-400">
                {gameState.playerHands.find(([id]) => id === playerId)?.[1]?.length || 0} cards
              </div>
            </motion.div>
          ))}
        </div>

        {/* Current Play */}
        {gameState.currentPlay && gameState.currentPlay.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4 mb-6 text-center">
            <div className="text-sm text-gray-400 mb-2">Last Play</div>
            <div className="flex justify-center gap-2">
              {gameState.currentPlay.map((card, i) => (
                <CardComponent key={i} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Game Actions */}
        {gameState.status === 'playing' && isMyTurn && (
          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">Your Turn</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={playCards}
                disabled={selectedCards.length === 0}
                className="px-6 py-3 bg-blue-500 rounded-lg font-semibold disabled:opacity-50"
              >
                Play ({selectedCards.length})
              </button>
              <button
                onClick={pass}
                className="px-6 py-3 bg-gray-500 rounded-lg font-semibold"
              >
                Pass
              </button>
            </div>
          </div>
        )}

        {/* My Hand */}
        <div className="bg-white/10 rounded-lg p-6">
          <div className="text-center mb-4 text-lg font-semibold">Your Cards</div>
          <div className="flex flex-wrap justify-center gap-2">
            {myHand.map((card, i) => (
              <button
                key={i}
                onClick={() => toggleCard(card)}
              >
                <CardComponent 
                  card={card}
                  selected={selectedCards.some(c => c.suit === card.suit && c.rank === card.rank)}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
