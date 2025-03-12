import React, { useState, useEffect } from 'react';

const VisualGoalProgress = ({ goal }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [projection, setProjection] = useState(null);
  
  // Calculate the percentage completed
  const progressPercentage = Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100);
  
  // Determine if a milestone has been reached
  useEffect(() => {
    // Celebrate at 25%, 50%, 75%, and 100%
    const milestones = [25, 50, 75, 100];
    if (milestones.includes(progressPercentage)) {
      setShowCelebration(true);
      
      // Hide celebration after 3 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [progressPercentage]);
  
  // Calculate time-based projection
  useEffect(() => {
    if (!goal.start_date || !goal.end_date || goal.is_completed) {
      setProjection(null);
      return;
    }
    
    const startDate = new Date(goal.start_date);
    const endDate = new Date(goal.end_date);
    const today = new Date();
    
    // Calculate days elapsed and days remaining
    const totalDays = diffDays(endDate, startDate);
    const daysElapsed = diffDays(today, startDate);
    const daysRemaining = diffDays(endDate, today);
    
    if (daysElapsed <= 0 || totalDays <= 0) {
      setProjection(null);
      return;
    }
    
    // If current value is 0, show different message
    if (goal.current_value <= 0) {
      setProjection({
        status: 'not_started',
        daysRemaining: daysRemaining
      });
      return;
    }
    
    // Calculate progress rate per day
    const dailyProgress = goal.current_value / daysElapsed;
    
    // Estimate completion date
    const daysToCompletion = (goal.target_value - goal.current_value) / dailyProgress;
    const projectedCompletionDate = addDays(today, daysToCompletion);
    
    // Determine if we're ahead or behind schedule
    const idealProgressNow = (daysElapsed / totalDays) * goal.target_value;
    const progressStatus = goal.current_value >= idealProgressNow ? 'ahead' : 'behind';
    
    setProjection({
      date: projectedCompletionDate,
      status: progressStatus,
      daysToCompletion: Math.round(daysToCompletion)
    });
  }, [goal]);
  
  // Helper function to calculate days difference
  const diffDays = (date1, date2) => {
    const diffTime = Math.abs(date1 - date2);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  // Helper function to add days to a date
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  // Helper function to format a date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Render the celebration animation
  const renderCelebration = () => {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 p-4 rounded-lg shadow-lg">
          <div className="text-2xl font-bold text-center">
            {progressPercentage === 100 ? (
              <span className="text-green-500">🎉 Meta concluída! 🎉</span>
            ) : (
              <span className="text-primary-500">🎯 {progressPercentage}% alcançado! 🎯</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Determine circle color based on progress
  const getProgressColor = () => {
    if (progressPercentage >= 100) return '#10b981'; // Green
    if (progressPercentage >= 75) return '#3b82f6'; // Blue
    if (progressPercentage >= 50) return '#f59e0b'; // Yellow
    if (progressPercentage >= 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="relative p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {showCelebration && renderCelebration()}
      
      <div className="flex flex-col items-center">
        {/* Progress Ring */}
        <div className="relative w-48 h-48">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />
            {/* Progress circle */}
            <circle
              className="transition-all duration-1000 ease-in-out"
              strokeWidth="8"
              strokeLinecap="round"
              stroke={getProgressColor()}
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercentage / 100)}`}
              transform="rotate(-90 50 50)"
            />
            {/* Progress text */}
            <text
              x="50"
              y="50"
              className="text-2xl font-bold"
              fill="currentColor"
              dominantBaseline="middle"
              textAnchor="middle"
            >
              {progressPercentage}%
            </text>
          </svg>
        </div>
        
        {/* Current vs. Target */}
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">Progresso</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {goal.current_value} / {goal.target_value}
          </div>
        </div>
        
        {/* Time-based projections */}
        {projection && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg w-full">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Projeção
            </h4>
            
            <div className="flex flex-col space-y-1 text-sm">
              {projection.status === 'not_started' ? (
                <div className="text-gray-600 dark:text-gray-300">
                  Sem progresso registrado ainda. Você tem {projection.daysRemaining} dias para completar esta meta.
                </div>
              ) : (
                <>
                  <div className={`${
                    projection.status === 'ahead' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    Você está {projection.status === 'ahead' ? 'adiantado' : 'atrasado'} em relação ao cronograma.
                  </div>
                  
                  <div className="text-gray-600 dark:text-gray-300">
                    No ritmo atual, você completará esta meta em {projection.daysToCompletion} dias.
                    {projection.date && (
                      <span className="font-medium"> ({formatDate(projection.date)})</span>
                    )}
                  </div>
                  
                  {projection.date > new Date(goal.end_date) && (
                    <div className="text-red-600 dark:text-red-400 font-medium">
                      Isso é depois do prazo final! Você precisará aumentar seu ritmo.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Days remaining */}
        {goal.days_remaining > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {goal.days_remaining} dias restantes
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualGoalProgress;