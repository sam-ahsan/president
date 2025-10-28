import { motion } from 'framer-motion';
import type { Card } from '../types';

interface CardProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
}

export default function CardComponent({ card, selected = false, onClick }: CardProps) {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'spades': return '♠';
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-white';
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -10 }}
      animate={{ scale: selected ? 1.1 : 1, y: selected ? -10 : 0 }}
      className={`
        w-16 h-24 bg-white rounded-lg shadow-lg cursor-pointer
        flex flex-col items-center justify-center
        border-2 ${selected ? 'border-yellow-400' : 'border-gray-800'}
        transition-all
      `}
    >
      <div className={`text-sm font-bold ${getSuitColor(card.suit)}`}>
        {card.rank}
      </div>
      <div className={`text-2xl ${getSuitColor(card.suit)}`}>
        {getSuitSymbol(card.suit)}
      </div>
    </motion.div>
  );
}
