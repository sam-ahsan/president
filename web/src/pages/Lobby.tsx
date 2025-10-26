import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../hooks/useAuthStore'
import { pageVariants, buttonVariants } from '../animations/variants'

const API_URL = 'http://localhost:8787'

export default function Lobby() {
  const [handle, setHandle] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticated, user, token } = useAuthStore()
  const navigate = useNavigate()

  const handleGuestLogin = async () => {
    if (!handle.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim() })
      })
      
      if (response.ok) {
        const data = await response.json()
        login(data.user, data.token)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!isAuthenticated) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/api/room/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          maxPlayers: 8,
          isPrivate: false,
          settings: {
            allowJokers: false,
            useTwoDecks: false
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        navigate(`/room/${data.roomCode}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create room')
      }
    } catch (error) {
      console.error('Create room error:', error)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode || !isAuthenticated) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/api/room/${roomCode}`)
      if (response.ok) {
        navigate(`/room/${roomCode}`)
      } else {
        setError('Room not found')
      }
    } catch (error) {
      console.error('Join room error:', error)
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="max-w-2xl w-full space-y-6"
        >
          {/* Welcome Section */}
          <div className="card p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome, {user?.handle}!
            </h1>
            <p className="text-gray-600 mb-8">
              Ready to play President?
            </p>

            {/* Create Room */}
            <div className="mb-4">
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </motion.button>
            </div>

            {/* Join Room */}
            <div className="space-y-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="input-field"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleJoinRoom}
                disabled={!roomCode || isLoading}
                className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Room
              </motion.button>
            </div>

            {/* Navigation */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <a 
                href="/leaderboard"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Leaderboard →
              </a>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-md w-full"
      >
        <div className="card p-8">
          <div className="text-center mb-8">
            <motion.h1 
              className="text-5xl font-bold text-gray-900 mb-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              President
            </motion.h1>
            <motion.p 
              className="text-gray-600 text-lg"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              A real-time multiplayer card game
            </motion.p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose your handle
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && handleGuestLogin()}
              />
            </div>
            
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={handleGuestLogin}
              disabled={!handle.trim() || isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Play as Guest'}
            </motion.button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>No account required - just pick a name and play!</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}