import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline';
import TaskStatusBadge from './TaskStatusBadge';

// Versão simplificada compatível com o TaskService existente
const MobileTaskCard = ({ 
  task, 
  onStatusChange, 
  onDelete 
}) => {
  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const categoryColor = task.category_color || '#4F46E5';
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Função para completar a tarefa
  const handleComplete = () => {
    if (task.goal && task.target_value) {
      // Para tarefas com meta, use o objeto completo
      const statusData = {
        status: 'completed',
        actual_value: task.target_value
      };
      console.log('Completando tarefa com meta:', statusData);
      onStatusChange(task.id, statusData);
    } else {
      // Para tarefas simples, apenas passe o status como string
      console.log('Completando tarefa simples');
      onStatusChange(task.id, 'completed');
    }
  };
  
  // Função para iniciar a tarefa
  const handleStart = () => {
    console.log('Iniciando tarefa');
    // Usar a forma de string para compatibilidade
    onStatusChange(task.id, 'in_progress');
  };
  
  // Função para marcar como falha
  const handleFail = () => {
    console.log('Marcando como falha');
    onStatusChange(task.id, 'failed');
  };
  
  // Função para excluir
  const handleDelete = () => {
    console.log('Solicitando exclusão');
    onDelete(task);
  };
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-3 border-l-4"
      style={{ borderLeftColor: categoryColor }}
    >
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
              {task.title}
            </h3>
            
            <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
              <PlayIcon className="flex-shrink-0 mr-1 h-3 w-3" />
              <span className="truncate">{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
            </div>
          </div>
          
          <TaskStatusBadge status={task.status} small />
        </div>
        
        {/* Categoria */}
        <div className="mt-3 flex justify-between items-center">
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {task.category_name}
          </span>
        </div>

        {/* Ações com botões diretos */}
        <div className="mt-3 flex justify-between items-center">
          <div className="flex space-x-2">
            {!isCompleted && (
              <>
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center p-2 border border-transparent rounded-full text-white bg-green-600 hover:bg-green-700"
                  type="button"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </button>
                
                {!isInProgress && (
                  <button
                    onClick={handleStart}
                    className="inline-flex items-center p-2 border border-transparent rounded-full text-white bg-blue-600 hover:bg-blue-700"
                    type="button"
                  >
                    <PlayIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                
                <button
                  onClick={handleFail}
                  className="inline-flex items-center p-2 border border-transparent rounded-full text-white bg-amber-600 hover:bg-amber-700"
                  type="button"
                >
                  <HandThumbDownIcon className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Link
              to={`/task/edit/${task.id}`}
              className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Link>
            
            <button
              onClick={handleDelete}
              className="inline-flex items-center p-2 border border-red-300 dark:border-red-900 rounded-full text-red-700 dark:text-red-300 bg-white dark:bg-gray-800"
              type="button"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTaskCard;