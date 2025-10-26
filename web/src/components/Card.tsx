import { motion } from 'framer-motion'
import { Card as CardType } from '@shared'
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
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900'
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

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={onClick ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      onClick={onClick}
      className={`
        game-card flex flex-col items-center justify-center relative
        ${isSelected ? 'selected' : ''}
        ${isPlayable ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
    >
      <div className={`text-lg font-bold ${getCardColor(card.suit)}`}>
        {card.rank}
      </div>
      <div className={`text-xl ${getCardColor(card.suit)}`}>
        {getSuitSymbol(card.suit)}
      </div>
      
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center"
        >
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </motion.div>
      )}
    </motion.div>
  )
}

