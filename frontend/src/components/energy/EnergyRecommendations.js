// frontend/src/components/energy/EnergyRecommendations.js
import React, { useState, useEffect } from 'react';
import TaskService from '../../services/TaskService';

const EnergyRecommendations = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [currentEnergy, setCurrentEnergy] = useState(5);
  
  useEffect(() => {
    fetchRecommendations();
  }, []);
  
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await TaskService.getEnergyRecommendations();
      setRecommendations(response.data.recommended_tasks);
      setCurrentEnergy(response.data.current_energy_level);
    } catch (error) {
      console.error('Error fetching energy recommendations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar cada tarefa recomendada
  const renderTaskCard = (task) => {
    // Renderização similar ao componente EnergyTaskView
    return (
      <div 
        key={task.id} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-3 border-l-4 hover:shadow-md transition-shadow"
        style={{ borderLeftColor: task.category_color || '#4F46E5' }}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {task.title}
          </h3>
          
          {/* Badge de nível de energia */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {task.energy_level === 'high' ? 'Alta Energia' : 
             task.energy_level === 'medium' ? 'Energia Média' : 'Baixa Energia'}
          </span>
        </div>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>{task.start_time} - {task.end_time}</span>
        </div>
      </div>
    );
  };
  
  // Widget de nível de energia
  const renderEnergyLevel = () => {
    // Determinar cor com base no nível
    let color, label;
    if (currentEnergy >= 8) {
      color = 'bg-green-500';
      label = 'Alta Energia';
    } else if (currentEnergy >= 5) {
      color = 'bg-blue-500';
      label = 'Energia Média';
    } else {
      color = 'bg-yellow-500';
      label = 'Baixa Energia';
    }
    
    return (
      <div className="flex items-center mb-4">
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-lg`}>
          {currentEnergy}
        </div>
        <div className="ml-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Seu nível de energia atual</div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="animate-pulse p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Recomendações de Energia
      </h2>
      
      {renderEnergyLevel()}
      
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Tarefas ideais para seu nível de energia atual
        </div>
        
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map(task => renderTaskCard(task))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            Sem tarefas recomendadas no momento
          </div>
        )}
      </div>
      
      <button
        onClick={fetchRecommendations}
        className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Atualizar recomendações
      </button>
    </div>
  );
};

export default EnergyRecommendations;