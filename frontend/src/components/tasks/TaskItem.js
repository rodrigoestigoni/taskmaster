import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckIcon,
  PlayIcon,
  XMarkIcon,
  PencilIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import CategoryIcon from './CategoryIcon';

/**
 * Componente que renderiza um item de tarefa
 * @param {Object} task - Dados da tarefa
 * @param {Function} onStatusChange - Função para alterar o status da tarefa
 */
const TaskItem = ({ task, onStatusChange }) => {
  // Formata a hora
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Cor de fundo baseada na categoria
  const categoryColor = task.category_color || '#4F46E5';
  const categoryIcon = task.category_icon || 'tag';
  
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
    >
      {/* Barra colorida no topo */}
      <div className="h-2" style={{ backgroundColor: categoryColor }}></div>
      
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 flex items-center gap-2">
            {/* Ícone da categoria */}
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${categoryColor}20` }}
            >
              <CategoryIcon 
                name={categoryIcon} 
                color={categoryColor} 
                size={4} 
              />
            </div>
            
            {/* Título da tarefa */}
            <h3 className="text-md sm:text-lg font-medium text-gray-900 dark:text-white">
              {task.title}
            </h3>
          </div>
          
          {/* Badge de prioridade */}
          <TaskPriorityBadge priority={task.priority} />
        </div>
        
        {/* Horários */}
        <div className="mt-2 flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
          <span>
            {formatTime(task.start_time)} - {formatTime(task.end_time)} 
            <span className="ml-2">({task.duration_minutes} min)</span>
          </span>
        </div>
        
        {/* Descrição (opcional) */}
        {task.description && (
          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {task.description}
          </p>
        )}
        
        {/* Status e categoria */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TaskStatusBadge status={task.status} />
          
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {task.category_name}
          </span>
          
          {/* Meta associada (se houver) */}
          {task.goal_title && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {task.goal_title}
            </span>
          )}
        </div>
        
        {/* Botões de ação */}
        <div className="mt-4 flex justify-between">
          <div className="flex space-x-2">
            {/* Botões para alteração de status */}
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Marcar como concluída"
            >
              <CheckIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Marcar em andamento"
            >
              <PlayIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onStatusChange(task.id, 'failed')}
              className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Marcar como falha"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          
          {/* Botão de edição */}
          <Link
            to={`/task/edit/${task.id}`}
            className="inline-flex items-center p-1.5 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            title="Editar tarefa"
          >
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;