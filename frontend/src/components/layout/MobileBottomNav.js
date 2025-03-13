import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDaysIcon,
  CalendarIcon,
  ChartBarIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const MobileBottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  
  const getActiveClass = (route) => {
    if (path === route) {
      return "text-primary-600 dark:text-primary-400";
    }
    return "text-gray-500 dark:text-gray-400";
  };
  
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
      <div className="grid h-full grid-cols-5">
        <Link 
          to="/day" 
          className={`flex flex-col items-center justify-center ${getActiveClass('/day')}`}
        >
          <CalendarDaysIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Dia</span>
        </Link>
        
        <Link 
          to="/week" 
          className={`flex flex-col items-center justify-center ${getActiveClass('/week')}`}
        >
          <CalendarIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Semana</span>
        </Link>
        
        <Link
          to="/task/new"
          className="flex flex-col items-center justify-center"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg -mt-5">
            <PlusIcon className="w-6 h-6" />
          </div>
        </Link>
        
        <Link 
          to="/month" 
          className={`flex flex-col items-center justify-center ${getActiveClass('/month')}`}
        >
          <CalendarIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Mês</span>
        </Link>
        
        <Link 
          to="/dashboard" 
          className={`flex flex-col items-center justify-center ${getActiveClass('/dashboard')}`}
        >
          <ChartBarIcon className="w-6 h-6" />
          <span className="text-xs mt-1">Stats</span>
        </Link>
      </div>
    </div>
  );
};

export default MobileBottomNav;