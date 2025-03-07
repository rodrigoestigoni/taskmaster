import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';

const EmptyState = ({ title, description, buttonText, buttonLink, icon }) => {
  return (
    <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
      <div className="flex flex-col items-center">
        <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
          {icon}
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        
        {buttonText && buttonLink && (
          <div className="mt-6">
            <Link
              to={buttonLink}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              {buttonText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;