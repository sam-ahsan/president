import { Variants } from 'framer-motion'

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.8, rotate: 180 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  hover: { scale: 1.05, rotate: 2 },
  tap: { scale: 0.95 }
}

export const cardDealVariants: Variants = {
  initial: { y: -100, rotate: 180, opacity: 0 },
  animate: { y: 0, rotate: 0, opacity: 1 },
  transition: { type: "spring", stiffness: 300, damping: 20 }
}

export const pileVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 }
}

export const playerSeatVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 }
}

export const chatVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
}

export const buttonVariants: Variants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

