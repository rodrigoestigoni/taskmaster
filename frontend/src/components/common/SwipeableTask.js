import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

// Componente usando o padrão de swipe para mobile
const SwipeableTask = ({ 
  task, 
  onStatusChange, 
  onDelete 
}) => {
  const [offset, setOffset] = useState(0);
  const touchStartX = useRef(0);
  const swipeableRef = useRef(null);
  
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    
    // Limitar o swipe para direita (completar) ou esquerda (excluir)
    if (diff > 0 && diff < 100) {
      // Swipe para direita (completar)
      setOffset(diff);
    } else if (diff < 0 && diff > -100) {
      // Swipe para esquerda (excluir)
      setOffset(diff);
    }
  };
  
  const handleTouchEnd = () => {
    if (offset > 75) {
      // Completar tarefa
      onStatusChange(task.id, 'completed');
      triggerSuccess();
    } else if (offset < -75) {
      // Confirmar exclusão
      onDelete(task);
    }
    
    // Resetar posição
    setOffset(0);
  };
  
  const triggerSuccess = () => {
    // Adicionar feedback visual de sucesso
    if (swipeableRef.current) {
      swipeableRef.current.classList.add('bg-green-50');
      setTimeout(() => {
        if (swipeableRef.current) {
          swipeableRef.current.classList.remove('bg-green-50');
        }
      }, 500);
    }
    
    // Vibração se disponível
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
  };
  
  const isCompleted = task.status === 'completed';
  const categoryColor = task.category_color || '#4F46E5';
  
  return (
    <div 
      ref={swipeableRef}
      className="relative overflow-hidden rounded-lg shadow-sm mb-3 touch-manipulation"
    //   onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    //   onTouchEnd={handleTouchEnd}
    >
      {/* Ações de swipe (esquerda) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white"
        style={{ width: '100px' }}
      >
        <TrashIcon className="h-6 w-6" />
      </div>
      
      {/* Ações de swipe (direita) */}
      <div 
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-green-500 text-white"
        style={{ width: '100px' }}
      >
        <CheckIcon className="h-6 w-6" />
      </div>
      
      {/* Conteúdo da tarefa */}
      <div 
        className={`bg-white dark:bg-gray-800 p-3 relative z-10 transition-transform border-l-4`}
        style={{ 
          transform: `translateX(${offset}px)`,
          borderLeftColor: categoryColor 
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
              {task.title}
            </h3>
            
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <PlayIcon className="flex-shrink-0 mr-1 h-3 w-3" />
              <span className="truncate">{task.start_time.substring(0, 5)} - {task.end_time.substring(0, 5)}</span>
            </div>
          </div>
          
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {task.category_name}
          </span>
        </div>
        
        {/* Pequenos botões de ação para funcionalidade alternativa */}
        <div className="flex space-x-2 mt-2">
          {!isCompleted && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="p-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              aria-label="Completar"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
          
          <Link
            to={`/task/edit/${task.id}`}
            className="p-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            aria-label="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SwipeableTask;