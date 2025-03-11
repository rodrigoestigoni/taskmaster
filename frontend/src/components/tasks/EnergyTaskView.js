import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BoltIcon,
  ClockIcon,
  CheckIcon,
  PlayIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

// Componente para exibir tarefas agrupadas por nível de energia
const EnergyTaskView = ({ tasks, onStatusChange, onDeleteTask }) => {
  // Estado para armazenar o modo de visualização
  const [viewMode, setViewMode] = useState('energy'); // 'energy' ou 'time'
  
  // Função para formatar a hora
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Agrupar tarefas por nível de energia
  const groupTasksByEnergy = () => {
    const highEnergyTasks = tasks.filter(task => task.energy_level === 'high');
    const mediumEnergyTasks = tasks.filter(task => task.energy_level === 'medium');
    const lowEnergyTasks = tasks.filter(task => task.energy_level === 'low' || !task.energy_level);
    
    return { highEnergyTasks, mediumEnergyTasks, lowEnergyTasks };
  };
  
  // Renderizar um card de tarefa
  const renderTaskCard = (task) => {
    // Definir ícone e estilo com base no nível de energia
    let energyIcon, energyColor, energyBg, energyText;
    
    switch(task.energy_level) {
      case 'high':
        energyIcon = <BoltIcon className="h-4 w-4" />;
        energyColor = 'text-green-800 dark:text-green-200';
        energyBg = 'bg-green-100 dark:bg-green-900';
        energyText = 'Alta Energia';
        break;
      case 'medium':
        energyIcon = <BoltIcon className="h-4 w-4" />;
        energyColor = 'text-blue-800 dark:text-blue-200';
        energyBg = 'bg-blue-100 dark:bg-blue-900';
        energyText = 'Energia Média';
        break;
      default:
        energyIcon = <BoltIcon className="h-4 w-4" />;
        energyColor = 'text-yellow-800 dark:text-yellow-200';
        energyBg = 'bg-yellow-100 dark:bg-yellow-900';
        energyText = 'Baixa Energia';
    }
    
    // Classe de correspondência de energia (em um app real isso seria calculado)
    // Simulando uma correspondência baseada na hora do dia
    const now = new Date();
    const hour = now.getHours();
    let energyMatchClass = '';
    
    if (task.energy_level === 'high' && (hour >= 8 && hour < 11)) {
      energyMatchClass = 'ring-2 ring-green-500'; // Boa correspondência pela manhã
    } else if (task.energy_level === 'medium' && (hour >= 14 && hour < 17)) {
      energyMatchClass = 'ring-2 ring-green-500'; // Boa correspondência à tarde
    } else if (task.energy_level === 'low' && (hour >= 20 || hour < 5)) {
      energyMatchClass = 'ring-2 ring-green-500'; // Boa correspondência à noite
    }
    
    return (
      <div 
        key={task.id || Math.random().toString()} 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-3 border-l-4 hover:shadow-md transition-shadow ${energyMatchClass}`}
        style={{ borderLeftColor: task.category_color || '#4F46E5' }}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {task.title}
          </h3>
          
          {/* Badge de nível de energia */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${energyBg} ${energyColor}`}>
            {energyIcon}
            <span className="ml-1">{energyText}</span>
          </span>
        </div>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-3 w-3 mr-1" />
          <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
        </div>
        
        <div className="mt-2 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500"
              title="Marcar como concluída"
            >
              <CheckIcon className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500"
              title="Marcar em andamento"
            >
              <PlayIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex space-x-2">
            <Link
              to={`/task/edit/${task.id}`}
              className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <PencilIcon className="h-3 w-3" aria-hidden="true" />
            </Link>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <TrashIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Alternar entre visualizações
  const toggleViewMode = () => {
    setViewMode(viewMode === 'energy' ? 'time' : 'energy');
  };
  
  const { highEnergyTasks, mediumEnergyTasks, lowEnergyTasks } = groupTasksByEnergy();
  
  return (
    <div>
      {/* Botão de alternância de visualização */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={toggleViewMode}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {viewMode === 'energy' ? (
            <>
              <ClockIcon className="h-4 w-4 mr-1" />
              Ver por Horário
            </>
          ) : (
            <>
              <BoltIcon className="h-4 w-4 mr-1" />
              Ver por Energia
            </>
          )}
        </button>
      </div>
      
      {viewMode === 'energy' ? (
        // Visualização por energia
        <div>
          {/* Seção de tarefas de alta energia */}
          {highEnergyTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-2">
                  <BoltIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-md font-medium text-gray-900 dark:text-white">
                  Alta Energia ({highEnergyTasks.length})
                </h2>
              </div>
              <div className="pl-8">
                {highEnergyTasks.map(task => renderTaskCard(task))}
              </div>
            </div>
          )}
          
          {/* Seção de tarefas de energia média */}
          {mediumEnergyTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2">
                  <BoltIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-md font-medium text-gray-900 dark:text-white">
                  Energia Média ({mediumEnergyTasks.length})
                </h2>
              </div>
              <div className="pl-8">
                {mediumEnergyTasks.map(task => renderTaskCard(task))}
              </div>
            </div>
          )}
          
          {/* Seção de tarefas de baixa energia */}
          {lowEnergyTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mr-2">
                  <BoltIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-md font-medium text-gray-900 dark:text-white">
                  Baixa Energia ({lowEnergyTasks.length})
                </h2>
              </div>
              <div className="pl-8">
                {lowEnergyTasks.map(task => renderTaskCard(task))}
              </div>
            </div>
          )}
          
          {/* Mensagem se não houver tarefas */}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Sem tarefas</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Crie uma nova tarefa para começar a organizar seu dia
              </p>
              <div className="mt-6">
                <Link
                  to="/task/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Nova Tarefa
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Visualização por hora (renderização simplificada)
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-2">
                <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-md font-medium text-gray-900 dark:text-white">
                Visualização por Horário
              </h2>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Neste modo você vê suas tarefas agrupadas por período do dia.
            </p>
            
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Manhã (5h - 12h)
              </h3>
              {/* Lista simplificada */}
              <div className="space-y-2">
                {tasks.slice(0, 2).map(task => (
                  <div key={task.id || Math.random()} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        task.energy_level === 'high' ? 'bg-green-500' :
                        task.energy_level === 'medium' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></span>
                      <span className="text-gray-700 dark:text-gray-300">{task.title}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">{formatTime(task.start_time)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Tarde (12h - 18h)
              </h3>
              {/* Lista simplificada */}
              <div className="space-y-2">
                {tasks.slice(2, 4).map(task => (
                  <div key={task.id || Math.random()} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        task.energy_level === 'high' ? 'bg-green-500' :
                        task.energy_level === 'medium' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></span>
                      <span className="text-gray-700 dark:text-gray-300">{task.title}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">{formatTime(task.start_time)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button 
              onClick={toggleViewMode}
              className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <BoltIcon className="h-4 w-4 mr-1" />
              Voltar para visualização por energia
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergyTaskView;