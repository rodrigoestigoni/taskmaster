import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';

const MobileHeader = ({ 
  title, 
  onPrevious, 
  onNext, 
  onToday, 
  showCreateButton = true,
  showMoreMenu = true,
  onMoreClick
}) => {
  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm pb-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onPrevious}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 focus:outline-none"
            aria-label="Anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          
          <button
            onClick={onNext}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 focus:outline-none"
            aria-label="Próximo"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {showCreateButton && (
            <Link
              to="/task/new"
              className="p-2 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300 active:bg-primary-200 dark:active:bg-primary-800 focus:outline-none"
              aria-label="Nova tarefa"
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          )}
          
          {showMoreMenu && (
            <button
              onClick={onMoreClick}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 focus:outline-none"
              aria-label="Mais opções"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4">
        <button
          onClick={onToday}
          className="text-sm text-primary-600 dark:text-primary-400 font-medium"
        >
          Hoje
        </button>
      </div>
    </div>
  );
};

export default MobileHeader;