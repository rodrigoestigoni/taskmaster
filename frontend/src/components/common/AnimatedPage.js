import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    x: '100%',
  },
  in: {
    opacity: 1,
    x: 0,
  },
  out: {
    opacity: 0,
    x: '-100%',
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3
};

const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="flex-1 overflow-hidden"
    >
      {children}
    </motion.div>
  );
};

export default AnimatedPage;