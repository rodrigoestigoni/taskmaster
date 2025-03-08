import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  PauseIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';
import TaskStatusBadge from '../components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '../components/tasks/TaskPriorityBadge';
import EmptyState from '../components/common/EmptyState';

export default function DayView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { updateTaskStatus } = useTasks();
  
  // Formata a data para exibição
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  
  // Capitaliza a primeira letra
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);
  
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const response = await TaskService.getTasksByDate(dateString);
      
      // Ordenar tarefas por hora de início
      const sortedTasks = response.data.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
      });
      
      setTasks(sortedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };
  
  const handleNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };
  
  const handleToday = () => {
    setSelectedDate(new Date());
  };
  
  const handleStatusChange = async (taskId, newStatus, actualValue = null, notes = null) => {
    try {
      await updateTaskStatus(taskId, newStatus, selectedDate, actualValue, notes);
      toast.success('Status atualizado com sucesso');
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status');
    }
  };
  
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Agrupa tarefas por período do dia
  const groupTasksByPeriod = () => {
    const morningTasks = [];
    const afternoonTasks = [];
    const eveningTasks = [];
    const nightTasks = [];
    
    tasks.forEach(task => {
      const hour = parseInt(task.start_time.split(':')[0], 10);
      
      if (hour >= 5 && hour < 12) {
        morningTasks.push(task);
      } else if (hour >= 12 && hour < 18) {
        afternoonTasks.push(task);
      } else if (hour >= 18 && hour < 22) {
        eveningTasks.push(task);
      } else {
        nightTasks.push(task);
      }
    });
    
    return { morningTasks, afternoonTasks, eveningTasks, nightTasks };
  };
  
  const { morningTasks, afternoonTasks, eveningTasks, nightTasks } = groupTasksByPeriod();
  
  // Renderiza o card de uma tarefa
  const renderTaskCard = (task) => {
    const startTime = formatTime(task.start_time);
    const endTime = formatTime(task.end_time);
    
    // Cor de fundo baseada na categoria
    const categoryColor = task.category_color || '#4F46E5';
    
    return (
      <div 
        key={task.id} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
      >
        <div className="h-2" style={{ backgroundColor: categoryColor }}></div>
        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-md sm:text-lg font-medium text-gray-900 dark:text-white">{task.title}</h3>
              <div className="mt-1 flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                <span>{startTime} - {endTime}</span>
                <span className="mx-2">•</span>
                <span>{task.duration_minutes} min</span>
              </div>
            </div>
            <TaskPriorityBadge priority={task.priority} />
          </div>
          
          {task.description && (
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>
          )}
          
          <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2">
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              {task.category_name}
            </span>
            <TaskStatusBadge status={task.status} />
          </div>
          
          <div className="mt-3 sm:mt-4 flex justify-between">
            <div className="flex space-x-2">
              {/* Buttons to change status */}
              <button
                onClick={() => handleStatusChange(task.id, 'completed')}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                title="Marcar como concluída"
              >
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleStatusChange(task.id, 'in_progress')}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Marcar em andamento"
              >
                <PlayIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleStatusChange(task.id, 'failed')}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                title="Marcar como falha"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            
            <Link
              to={`/task/edit/${task.id}`}
              className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Editar tarefa"
            >
              <PencilIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderiza uma seção de tarefas para um período do dia
  const renderTaskSection = (title, tasks, icon) => {
    if (tasks.length === 0) return null;
    
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center mb-3 sm:mb-4">
          {icon}
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2">{title}</h2>
        </div>
        <div className="space-y-3">
          {tasks.map(task => renderTaskCard(task))}
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* Date navigation */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={handlePreviousDay}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{displayDate}</h1>
          <button
            onClick={handleNextDay}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleToday}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <span>Hoje</span>
          </button>
          <button
            onClick={fetchTasks}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <Link
            to="/task/new"
            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nova Tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        </div>
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState 
          title="Sem tarefas para hoje"
          description="Não há tarefas planejadas para hoje. Que tal adicionar uma?"
          buttonText="Adicionar Tarefa"
          buttonLink="/task/new"
          icon={<CalendarIcon className="h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="space-y-6">
          {/* Morning tasks */}
          {renderTaskSection(
            'Manhã (5h - 12h)', 
            morningTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
              <SunIcon className="w-4 h-4" />
            </span>
          )}
          
          {/* Afternoon tasks */}
          {renderTaskSection(
            'Tarde (12h - 18h)', 
            afternoonTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
              <FireIcon className="w-4 h-4" />
            </span>
          )}
          
          {/* Evening tasks */}
          {renderTaskSection(
            'Noite (18h - 22h)', 
            eveningTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              <StarIcon className="w-4 h-4" />
            </span>
          )}
          
          {/* Night tasks */}
          {renderTaskSection(
            'Madrugada (22h - 5h)', 
            nightTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              <MoonIcon className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}