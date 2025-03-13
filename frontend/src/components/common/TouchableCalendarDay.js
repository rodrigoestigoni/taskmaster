import React from 'react';
import { format, isToday, isSameMonth } from 'date-fns';
import { Link } from 'react-router-dom';

const TouchableCalendarDay = ({ date, tasks, selectedMonth }) => {
  const dayNumber = format(date, 'd');
  const isCurrentMonth = isSameMonth(date, selectedMonth);
  const isCurrentDay = isToday(date);
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Estatísticas das tarefas
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const total = tasks.length;
  
  return (
    <Link 
      to={`/day?date=${formattedDate}`}
      className={`min-h-[60px] p-2 border flex flex-col relative touch-manipulation ${
        isCurrentMonth 
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
          : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800'
      } ${
        isCurrentDay 
          ? 'ring-2 ring-primary-500 dark:ring-primary-400 z-10' 
          : ''
      }`}
    >
      <span className={`text-sm font-medium ${
        isCurrentDay 
          ? 'text-primary-600 dark:text-primary-400' 
          : isCurrentMonth 
            ? 'text-gray-900 dark:text-white' 
            : 'text-gray-400 dark:text-gray-600'
      }`}>
        {dayNumber}
      </span>
      
      {total > 0 && (
        <div className="mt-1 flex justify-center">
          {/* Indicadores visuais de tarefas */}
          <div className="flex space-x-1">
            {completed > 0 && (
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            )}
            {inProgress > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
            {pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
};

export default TouchableCalendarDay;