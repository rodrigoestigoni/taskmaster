import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';
import TaskStatusBadge from '../components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '../components/tasks/TaskPriorityBadge';
import EmptyState from '../components/common/EmptyState';

// Componente para visualização móvel
const MobileWeekView = ({ weekDays, startDate, getTasksForDay, weekTasks, formatTime }) => {
  const [selectedDay, setSelectedDay] = useState(new Date());
  
  // Ao mudar de semana, selecionar o primeiro dia da nova semana
  useEffect(() => {
    setSelectedDay(startDate);
  }, [startDate]);
  
  const dayTasks = getTasksForDay(selectedDay);
  
  return (
    <div>
      {/* Abas de dias horizontais scrolláveis */}
      <div className="mb-4 overflow-x-auto flex">
        <div className="flex space-x-1 min-w-full pb-1">
          {weekDays.map(day => {
            const isSelected = day.getDate() === selectedDay.getDate() && 
                             day.getMonth() === selectedDay.getMonth();
            const isCurrent = isToday(day);
            
            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-2 text-center min-w-[80px] rounded-lg ${
                  isSelected 
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100 font-medium' 
                    : 'bg-white dark:bg-gray-800'
                } ${
                  isCurrent && !isSelected
                    ? 'ring-1 ring-primary-400 dark:ring-primary-500'
                    : ''
                }`}
              >
                <p className="text-xs">{format(day, 'EEE', { locale: ptBR })}</p>
                <p className={`text-sm mt-1 ${isSelected ? 'font-bold' : ''}`}>
                  {format(day, 'dd/MM')}
                </p>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Exibir tarefas do dia selecionado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
        <h3 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">
          {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        
        <div className="space-y-3">
          {dayTasks.length > 0 ? (
            dayTasks.map(task => (
              <div 
                key={task.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 sm:p-3 mb-2 border-l-4"
                style={{ borderLeftColor: task.category_color || '#8b5cf6' }}
              >
                <div className="flex justify-between">
                  <h3 className="text-xs sm:text-sm font-medium truncate text-gray-900 dark:text-white">
                    {task.title}
                  </h3>
                  <TaskPriorityBadge priority={task.priority} />
                </div>
                
                <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
                </div>
                
                <div className="mt-2 flex justify-between items-center">
                  <TaskStatusBadge status={task.status} />
                  
                  <Link
                    to={`/task/edit/${task.id}`}
                    className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Sem tarefas para este dia</p>
              <Link
                to="/task/new"
                className="mt-2 inline-block text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Adicionar tarefa
              </Link>
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            to={`/day?date=${format(selectedDay, 'yyyy-MM-dd')}`}
            className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Ver detalhes do dia
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function WeekView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekTasks, setWeekTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { updateTaskStatus } = useTasks();
  
  // Obtém o início e fim da semana para a data selecionada
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Semana começa na segunda
  const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Semana termina no domingo
  
  // Array com todos os dias da semana atual
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Detecta quando a tela muda de tamanho para aplicar layout responsivo
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    fetchWeekTasks();
  }, [selectedDate]);
  
  const fetchWeekTasks = async () => {
    setLoading(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const response = await TaskService.getTasksByDateRange(
        formattedStartDate, 
        formattedEndDate
      );
      
      setWeekTasks(response.data);
    } catch (error) {
      console.error('Error fetching week tasks:', error);
      toast.error('Erro ao carregar tarefas da semana');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousWeek = () => {
    setSelectedDate(prevDate => subWeeks(prevDate, 1));
  };
  
  const handleNextWeek = () => {
    setSelectedDate(prevDate => addWeeks(prevDate, 1));
  };
  
  const handleCurrentWeek = () => {
    setSelectedDate(new Date());
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Filtra tarefas para um dia específico
  const getTasksForDay = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return weekTasks.filter(task => task.date === formattedDate);
  };
  
  // Renderiza um card de tarefa
  const renderTaskCard = (task) => {
    return (
      <div 
        key={task.id} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 sm:p-3 mb-2 border-l-4"
        style={{ borderLeftColor: task.category_color || '#8b5cf6' }}
      >
        <div className="flex justify-between">
          <h3 className="text-xs sm:text-sm font-medium truncate text-gray-900 dark:text-white">
            {task.title}
          </h3>
          <TaskPriorityBadge priority={task.priority} />
        </div>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
        </div>
        
        <div className="mt-2 flex justify-between items-center">
          <TaskStatusBadge status={task.status} />
          
          <Link
            to={`/task/edit/${task.id}`}
            className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Editar
          </Link>
        </div>
      </div>
    );
  };
  
  // Renderiza um dia da semana para desktop
  const renderDesktopDay = (date) => {
    const dayTasks = getTasksForDay(date);
    const formattedDay = format(date, 'EEE', { locale: ptBR });
    const formattedDate = format(date, 'dd/MM');
    const isCurrentDay = isToday(date);
    
    return (
      <div 
        key={date.toString()} 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${
          isCurrentDay 
            ? 'ring-2 ring-primary-500 dark:ring-primary-400' 
            : ''
        }`}
      >
        <div className={`text-center mb-3 pb-2 border-b ${
          isCurrentDay 
            ? 'border-primary-500 dark:border-primary-400' 
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <h3 className={`text-sm font-semibold capitalize ${
            isCurrentDay 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-gray-800 dark:text-gray-200'
          }`}>
            {formattedDay}
          </h3>
          <span className={`text-xs ${
            isCurrentDay 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {formattedDate}
          </span>
        </div>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {dayTasks.length > 0 ? (
            dayTasks.map(task => renderTaskCard(task))
          ) : (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
              Sem tarefas
            </div>
          )}
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            to={`/day?date=${format(date, 'yyyy-MM-dd')}`}
            className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Ver dia
          </Link>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* Header com navegação */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={handlePreviousWeek}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white">
            <span className="hidden sm:inline">
              {format(startDate, "dd 'de' MMMM", { locale: ptBR })} - {format(endDate, "dd 'de' MMMM", { locale: ptBR })}
            </span>
            <span className="sm:hidden">
              {format(startDate, "dd/MM")} - {format(endDate, "dd/MM")}
            </span>
          </h1>
          <button
            onClick={handleNextWeek}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCurrentWeek}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <span className="hidden sm:inline">Semana Atual</span>
            <span className="sm:hidden">Atual</span>
          </button>
          <button
            onClick={fetchWeekTasks}
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
      
      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : weekTasks.length === 0 ? (
        <EmptyState 
          title="Sem tarefas para esta semana"
          description="Não há tarefas planejadas para esta semana. Que tal adicionar alguma?"
          buttonText="Adicionar Tarefa"
          buttonLink="/task/new"
          icon={<CalendarIcon className="h-12 w-12 text-gray-400" />}
        />
      ) : (
        <>
          {isMobile ? (
              <MobileWeekView 
                weekDays={weekDays} 
                startDate={startDate} 
                getTasksForDay={getTasksForDay}
                weekTasks={weekTasks}
                formatTime={formatTime}
              />
            ) : (
              <div className="grid grid-cols-7 gap-3 sm:gap-4">
                {weekDays.map(day => renderDesktopDay(day))}
              </div>
            )}
        </>
      )}
    </div>
  );
}