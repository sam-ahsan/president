import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { pageVariants } from '../animations/variants'

const API_URL = 'http://localhost:8787'

interface LeaderboardEntry {
  userId: string
  handle: string
  elo: number
  games: number
  wins: number
  rank: number
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Loading leaderboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
              <p className="text-white/70">Top players by ELO rating</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary text-white bg-white/20 hover:bg-white/30"
            >
              Back to Lobby
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    ELO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Games
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Wins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                      No players on leaderboard yet
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => (
                    <motion.tr
                      key={entry.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getRankEmoji(index + 1)}</span>
                          {index > 2 && <span className="text-white/70 text-lg">#{index + 1}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{entry.handle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary-400">{entry.elo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/70">{entry.games}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/70">{entry.wins || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/70">
                          {entry.games > 0 ? ((entry.wins || 0) / entry.games * 100).toFixed(1) : 0}%
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-white/70 text-sm mb-1">Total Players</div>
            <div className="text-2xl font-bold text-white">{leaderboard.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-white/70 text-sm mb-1">Top ELO</div>
            <div className="text-2xl font-bold text-primary-400">
              {leaderboard[0]?.elo || 1000}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-white/70 text-sm mb-1">Total Games</div>
            <div className="text-2xl font-bold text-white">
              {leaderboard.reduce((sum, entry) => sum + entry.games, 0)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}