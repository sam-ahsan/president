import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../hooks/useAuthStore'

export default function Lobby() {
  const [handle, setHandle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated, user } = useAuthStore()

  const handleGuestLogin = async () => {
    if (!handle.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim() })
      })
      
      if (response.ok) {
        const data = await response.json()
        login(data.user, data.token)
      } else {
        const error = await response.json()
        alert(error.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="card p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {user?.handle}!
            </h1>
            <p className="text-gray-600 mb-6">
              Ready to play President?
            </p>
            <div className="space-y-3">
              <button className="btn-primary w-full">
                Create Room
              </button>
              <button className="btn-secondary w-full">
                Join Room
              </button>
              <button className="btn-secondary w-full">
                View Leaderboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              President
            </h1>
            <p className="text-gray-600">
              A real-time multiplayer card game
            </p>
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
            
            <button
              onClick={handleGuestLogin}
              disabled={!handle.trim() || isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Play as Guest'}
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>No account required - just pick a name and play!</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

