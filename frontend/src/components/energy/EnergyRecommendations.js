// frontend/src/components/energy/EnergyRecommendations.js
import React, { useState, useEffect } from 'react';
import TaskService from '../../services/TaskService';
import { Link } from 'react-router-dom';

const EnergyRecommendations = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [currentEnergy, setCurrentEnergy] = useState(5);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchRecommendations();
  }, []);
  
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      // First check if the energy profile exists
      try {
        await TaskService.getEnergyProfile();
      } catch (profileError) {
        console.error('Energy profile not found:', profileError);
        setError('Você precisa configurar seu perfil de energia primeiro.');
        setRecommendations([]);
        setLoading(false);
        return;
      }
      
      // Now get recommendations
      console.log('Fetching energy recommendations...');
      const response = await TaskService.getEnergyRecommendations();
      console.log('Raw energy recommendations response:', response);
      
      // Check if we got data in the expected format
      if (!response.data || !response.data.recommended_tasks) {
        console.error('Malformed response from recommendations API:', response);
        setError('Formato de resposta inválido das recomendações. Por favor, tente novamente.');
        setRecommendations([]);
        return;
      }
      
      console.log('Current energy level from API:', response.data.current_energy_level);
      console.log('Recommended tasks:', response.data.recommended_tasks);
      
      // Check if there are any recommendations
      if (response.data.recommended_tasks.length === 0) {
        setError(
          'Não foram encontradas tarefas para recomendar. Para receber recomendações, você precisa:' +
          '\n1. Ter tarefas pendentes programadas para hoje' +
          '\n2. Definir níveis de energia para suas tarefas ao criá-las'
        );
      } else {
        setRecommendations(response.data.recommended_tasks);
        setCurrentEnergy(response.data.current_energy_level || 5);
      }
    } catch (error) {
      console.error('Error fetching energy recommendations:', error);
      setError('Erro ao buscar recomendações. Tente novamente mais tarde.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar cada tarefa recomendada
  const renderTaskCard = (task) => {
    // Função para determinar o estilo com base no nível de energia
    const getEnergyStyle = (level) => {
      switch(level) {
        case 'high':
          return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
        case 'medium':
          return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
        case 'low':
          return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
        default:
          return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
      }
    };
    
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
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnergyStyle(task.energy_level)}`}>
            {task.energy_level === 'high' ? 'Alta Energia' : 
             task.energy_level === 'medium' ? 'Energia Média' : 'Baixa Energia'}
          </span>
        </div>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          {task.start_time && task.end_time ? (
            <span>{task.start_time} - {task.end_time}</span>
          ) : (
            <span>Não agendada</span>
          )}
        </div>
        
        <div className="mt-2 flex justify-end">
          <Link
            to={`/enhanced_task/${task.id}`}
            className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Ver detalhes
          </Link>
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
      
      {error ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
          {error}
          <div className="mt-2 flex">
            <Link 
              to="/energy" 
              className="text-red-800 dark:text-red-300 hover:underline font-medium text-xs"
            >
              Configurar perfil de energia
            </Link>
          </div>
        </div>
      ) : (
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
              <p>Sem tarefas recomendadas no momento</p>
              <p className="text-xs mt-2">
                Certifique-se de que você possui tarefas com níveis de energia definidos
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <button
          onClick={fetchRecommendations}
          className="flex-grow flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Atualizar recomendações
        </button>
        
        <Link 
          to="/energy"
          className="ml-2 flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Editar perfil
        </Link>
      </div>
    </div>
  );
};

export default EnergyRecommendations;