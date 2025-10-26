import { motion } from 'framer-motion'

export default function Leaderboard() {
  return (
    <div className="min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto"
      >
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Leaderboard
          </h1>
          <p className="text-center text-gray-600">
            Leaderboard functionality coming soon...
          </p>
        </div>
      </motion.div>
    </div>
  )
}

