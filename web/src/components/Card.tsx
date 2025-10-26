import { motion } from 'framer-motion'
import { Card as CardType } from '@president/shared'
import { cardVariants } from '../animations/variants'

interface CardProps {
  card: CardType
  isSelected?: boolean
  isPlayable?: boolean
  onClick?: () => void
  className?: string
}

export default function Card({ 
  card, 
  isSelected = false, 
  isPlayable = false, 
  onClick,
  className = '' 
}: CardProps) {
  const getCardColor = (suit: CardType['suit']) => {
    return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1f2937'
  }

  const getSuitSymbol = (suit: CardType['suit']) => {
    const symbols = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    }
    return symbols[suit]
  }

  const color = getCardColor(card.suit)
  const suitSymbol = getSuitSymbol(card.suit)

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={onClick && isPlayable ? "hover" : undefined}
      whileTap={onClick && isPlayable ? "tap" : undefined}
      onClick={onClick}
      className={`
        w-14 h-20 bg-white rounded-lg shadow-lg border-2 border-gray-200
        flex flex-col items-center justify-center relative
        ${isSelected ? 'ring-2 ring-primary-500 shadow-primary-500/50' : ''}
        ${isPlayable && onClick ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'}
        ${className}
      `}
      style={{
        transform: isSelected ? 'scale(1.05) translateY(-4px)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Card Background Pattern */}
      <div className="absolute inset-0 opacity-5 rounded-lg" 
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
          backgroundSize: '8px 8px'
        }}
      />
      
      {/* Top Left Corner */}
      <div className="absolute top-1 left-1 flex flex-col items-start">
        <div className="text-xs font-bold" style={{ color }}>{card.rank}</div>
        <div className="text-xs" style={{ color }}>{suitSymbol}</div>
      </div>

      {/* Center Suit */}
      <div className="text-3xl font-bold" style={{ color }}>
        {suitSymbol}
      </div>

      {/* Bottom Right Corner (rotated) */}
      <div className="absolute bottom-1 right-1 flex flex-col items-start rotate-180">
        <div className="text-xs font-bold" style={{ color }}>{card.rank}</div>
        <div className="text-xs" style={{ color }}>{suitSymbol}</div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <div className="w-3 h-3 bg-white rounded-full"></div>
        </motion.div>
      )}
    </motion.div>
  )
}