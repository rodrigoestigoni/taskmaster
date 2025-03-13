import { useState, useRef } from 'react';

export const useSwipeGesture = (onSwipeLeft, onSwipeRight) => {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;
  
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const onTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    
    if (Math.abs(distance) < minSwipeDistance) {
      return; // Não foi um swipe significativo
    }
    
    if (distance > 0) {
      // Swipe para esquerda
      onSwipeLeft && onSwipeLeft();
    } else {
      // Swipe para direita
      onSwipeRight && onSwipeRight();
    }
  };
  
  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

export default useSwipeGesture;