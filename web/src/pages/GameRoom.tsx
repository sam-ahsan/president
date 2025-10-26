import { motion } from 'framer-motion'

export default function GameRoom() {
  return (
    <div className="min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto"
      >
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Game Room
          </h1>
          <p className="text-center text-gray-600">
            Game room functionality coming soon...
          </p>
        </div>
      </motion.div>
    </div>
  )
}

