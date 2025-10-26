import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Lobby from './pages/Lobby'
import GameRoom from './pages/GameRoom'
import Leaderboard from './pages/Leaderboard'
import { useAuthStore } from './hooks/useAuthStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomCode" element={<GameRoom />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </motion.div>
    </div>
  )
}

export default App

