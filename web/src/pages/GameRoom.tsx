import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuthStore } from '../hooks/useAuthStore'
import { ServerMessage, GameState, Player } from '@president/shared'
import Card from '../components/Card'
import { pageVariants } from '../animations/variants'

const REALTIME_URL = 'ws://localhost:8788/api/room'

export default function GameRoom() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { user, token, isAuthenticated } = useAuthStore()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [messages, setMessages] = useState<Array<{ type: string; content: string; timestamp: string }>>([])

  const { isConnected, sendMessage } = useWebSocket({
    url: `${REALTIME_URL}/${roomCode}/join`,
    onMessage: (message: ServerMessage) => {
      console.log('Received message:', message)
      
      switch (message.type) {
        case 'room_state':
          setGameState(message.gameState)
          break
        case 'cards_played':
          addSystemMessage(`${message.playerId} played ${message.cards.length} card(s)`)
          break
        case 'turn_passed':
          addSystemMessage(`${message.playerId} passed`)
          break
        case 'turn_changed':
          addSystemMessage(`It's ${message.playerId}'s turn`)
          break
        case 'round_end':
          addSystemMessage(`Round ended! ${message.winnerId} won!`)
          break
        case 'chat_message':
          setMessages(prev => [...prev, {
            type: 'chat',
            content: `${message.handle}: ${message.message}`,
            timestamp: message.timestamp
          }])
          break
        case 'system_message':
          addSystemMessage(message.message)
          break
        default:
          console.log('Unhandled message type:', message.type)
      }
    },
    onOpen: () => {
      console.log('WebSocket connected')
      // Join the room
      if (user && roomCode) {
        sendMessage({
          type: 'join_room',
          playerId: user.id,
          handle: user.handle,
          roomCode
        })
      }
    },
    onClose: () => {
      addSystemMessage('Disconnected from server')
    }
  })

  useEffect(() => {
    if (!isAuthenticated || !roomCode) {
      navigate('/')
    }
  }, [isAuthenticated, roomCode, navigate])

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, {
      type: 'system',
      content,
      timestamp: new Date().toISOString()
    }])
  }

  const handleCardClick = (rank: string, suit: string) => {
    const cardKey = `${rank}_${suit}`
    setSelectedCards(prev => {
      if (prev.includes(cardKey)) {
        return prev.filter(c => c !== cardKey)
      } else {
        return [...prev, cardKey]
      }
    })
  }

  const handlePlayCards = () => {
    if (!gameState || !user) return
    
    const myPlayer = gameState.players.find(p => p.id === user.id)
    if (!myPlayer) return

    const cardsToPlay = selectedCards.map(key => {
      const [rank, suit] = key.split('_')
      return { rank, suit }
    })

    sendMessage({
      type: 'play_cards',
      playerId: user.id,
      cards: cardsToPlay
    })

    setSelectedCards([])
  }

  const handlePassTurn = () => {
    if (!user) return
    
    sendMessage({
      type: 'pass_turn',
      playerId: user.id
    })
  }

  const handleSetReady = (ready: boolean) => {
    if (!user) return
    
    sendMessage({
      type: 'set_ready',
      playerId: user.id,
      ready
    })
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700 mb-2">Loading game...</div>
          <div className="text-sm text-gray-500">
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>
    )
  }

  const myPlayer = gameState.players.find(p => p.id === user?.id)
  const isMyTurn = gameState.players[gameState.turnIndex]?.id === user?.id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col"
      >
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-t-lg p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Room {roomCode}</h1>
              <p className="text-white/70 text-sm">
                {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''} connected
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary text-white bg-white/20 hover:bg-white/30"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4">
          {/* Players Area */}
          <div className="col-span-8 bg-white/10 backdrop-blur-lg rounded-lg p-4">
            <h2 className="text-white font-semibold mb-4">Players</h2>
            <div className="grid grid-cols-2 gap-3">
              {gameState.players.map((player, idx) => (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  isMyTurn={gameState.turnIndex === idx}
                  isMySeat={player.id === user?.id}
                />
              ))}
            </div>
          </div>

          {/* Pile and Controls */}
          <div className="col-span-4 space-y-4">
            {/* Pile */}
            {gameState.pile && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/10 backdrop-blur-lg rounded-lg p-4"
              >
                <h3 className="text-white font-semibold mb-2">Current Pile</h3>
                <div className="flex gap-2">
                  {gameState.pile.cards.map((card, idx) => (
                    <Card key={idx} card={card} />
                  ))}
                </div>
                <p className="text-white/70 text-sm mt-2">
                  {gameState.pile.count} × {gameState.pile.rank}
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            {gameState.phase === 'playing' && isMyTurn && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 space-y-2">
                <button
                  onClick={handlePlayCards}
                  disabled={selectedCards.length === 0}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  Play Selected Cards
                </button>
                <button
                  onClick={handlePassTurn}
                  className="btn-secondary w-full"
                >
                  Pass
                </button>
              </div>
            )}

            {/* Lobby Ready */}
            {gameState.phase === 'lobby' && !myPlayer?.isReady && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
                <button
                  onClick={() => handleSetReady(true)}
                  className="btn-primary w-full"
                >
                  Ready to Play
                </button>
              </div>
            )}
          </div>
        </div>

        {/* My Hand */}
        {myPlayer && myPlayer.hand.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-b-lg p-4">
            <h3 className="text-white font-semibold mb-3">Your Hand ({myPlayer.hand.length} cards)</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {myPlayer.hand.map((card, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -8 }}
                  onClick={() => handleCardClick(card.rank, card.suit)}
                  className={`
                    ${selectedCards.includes(`${card.rank}_${card.suit}`) ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  <Card card={card} isPlayable={true} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="bg-black/20 backdrop-blur-lg rounded-lg p-3 max-h-32 overflow-y-auto">
          {messages.slice(-3).map((msg, idx) => (
            <div key={idx} className="text-white/70 text-sm">
              {msg.content}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function PlayerSeat({ player, isMyTurn, isMySeat }: { player: Player; isMyTurn: boolean; isMySeat: boolean }) {
  return (
    <motion.div
      className={`p-3 rounded-lg ${isMyTurn ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-white/5'}`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{player.handle}</p>
          <p className="text-white/50 text-xs">{player.hand.length} cards</p>
        </div>
        {player.isReady && (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        )}
        {isMyTurn && (
          <div className="text-primary-500 text-xs font-semibold">TURN</div>
        )}
      </div>
    </motion.div>
  )
}