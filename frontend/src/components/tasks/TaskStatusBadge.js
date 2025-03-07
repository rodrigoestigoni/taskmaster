import React from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon,
  XCircleIcon,
  PauseCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const TaskStatusBadge = ({ status }) => {
  let bgColor = '';
  let textColor = '';
  let icon = null;
  let statusText = '';
  
  switch (status) {
    case 'completed':
      bgColor = 'bg-green-100 dark:bg-green-900';
      textColor = 'text-green-800 dark:text-green-200';
      icon = <CheckCircleIcon className="h-4 w-4 mr-1" />;
      statusText = 'Concluída';
      break;
    case 'in_progress':
      bgColor = 'bg-blue-100 dark:bg-blue-900';
      textColor = 'text-blue-800 dark:text-blue-200';
      icon = <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />;
      statusText = 'Em andamento';
      break;
    case 'pending':
      bgColor = 'bg-yellow-100 dark:bg-yellow-900';
      textColor = 'text-yellow-800 dark:text-yellow-200';
      icon = <ClockIcon className="h-4 w-4 mr-1" />;
      statusText = 'Pendente';
      break;
    case 'failed':
      bgColor = 'bg-red-100 dark:bg-red-900';
      textColor = 'text-red-800 dark:text-red-200';
      icon = <XCircleIcon className="h-4 w-4 mr-1" />;
      statusText = 'Falhou';
      break;
    case 'skipped':
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-200';
      icon = <PauseCircleIcon className="h-4 w-4 mr-1" />;
      statusText = 'Pulada';
      break;
    default:
      bgColor = 'bg-gray-100 dark:bg-gray-700';
      textColor = 'text-gray-800 dark:text-gray-200';
      icon = <ClockIcon className="h-4 w-4 mr-1" />;
      statusText = 'Desconhecido';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {icon}
      {statusText}
    </span>
  );
};

export default TaskStatusBadge;