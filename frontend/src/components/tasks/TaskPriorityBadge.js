import React from 'react';
import { 
  ExclamationTriangleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const TaskPriorityBadge = ({ priority }) => {
  let bgColor = '';
  let textColor = '';
  let icon = null;
  let priorityText = '';
  
  switch (parseInt(priority, 10)) {
    case 4: // Urgent
      bgColor = 'bg-red-100 dark:bg-red-900';
      textColor = 'text-red-800 dark:text-red-200';
      icon = <ExclamationCircleIcon className="h-4 w-4 mr-1" />;
      priorityText = 'Urgente';
      break;
    case 3: // High
      bgColor = 'bg-amber-100 dark:bg-amber-900';
      textColor = 'text-amber-800 dark:text-amber-200';
      icon = <ExclamationTriangleIcon className="h-4 w-4 mr-1" />;
      priorityText = 'Alta';
      break;
    case 2: // Medium
      bgColor = 'bg-blue-100 dark:bg-blue-900';
      textColor = 'text-blue-800 dark:text-blue-200';
      priorityText = 'Média';
      break;
    case 1: // Low
      bgColor = 'bg-green-100 dark:bg-green-900';
      textColor = 'text-green-800 dark:text-green-200';
      priorityText = 'Baixa';
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-200';
      priorityText = 'Média';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {icon}
      {priorityText}
    </span>
  );
};

export default TaskPriorityBadge;