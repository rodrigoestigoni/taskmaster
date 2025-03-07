import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  ClockIcon,
  ArrowPathIcon as SpinnerIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import EmptyState from '../components/common/EmptyState';

export default function MonthView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthTasks, setMonthTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Primeiro dia do mês
  const monthStart = startOfMonth(selectedDate);
  // Último dia do mês
  const monthEnd = endOfMonth(selectedDate);
  // Nome do mês formatado
  const monthName = format(monthStart, 'MMMM yyyy', { locale: ptBR });
  // Primeiro dia da primeira semana do calendário
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Último dia da última semana do calendário
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  // Todos os dias que serão mostrados no calendário
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  // Dias da semana para o cabeçalho
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  
  useEffect(() => {
    fetchMonthTasks();
  }, [selectedDate]);
  
  const fetchMonthTasks = async () => {
    setLoading(true);
    try {
      const formattedStartDate = format(monthStart, 'yyyy-MM-dd');
      const formattedEndDate = format(monthEnd, 'yyyy-MM-dd');
      
      const response = await TaskService.getTasksByDateRange(
        formattedStartDate, 
        formattedEndDate
      );
      
      setMonthTasks(response.data);
    } catch (error) {
      console.error('Error fetching month tasks:', error);
      toast.error('Erro ao carregar tarefas do mês');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousMonth = () => {
    setSelectedDate(prevDate => subMonths(prevDate, 1));
  };
  
  const handleNextMonth = () => {
    setSelectedDate(prevDate => addMonths(prevDate, 1));
  };
  
  const handleCurrentMonth = () => {
    setSelectedDate(new Date());
  };
  
  // Retorna as tarefas para um dia específico
  const getTasksForDay = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return monthTasks.filter(task => task.date === formattedDate);
  };
  
  // Retorna estatísticas das tarefas para um dia específico
  const getTaskStats = (date) => {
    const tasks = getTasksForDay(date);
    
    if (tasks.length === 0) return null;
    
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    
    return {
      total: tasks.length,
      completed,
      inProgress,
      pending,
      hasPriority: tasks.some(task => task.priority >= 3) // Alta ou Urgente
    };
  };
  
  // Renderiza uma célula do calendário
  const renderDay = (date) => {
    const dayNumber = format(date, 'd');
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isCurrentDay = isToday(date);
    const taskStats = getTaskStats(date);
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    return (
      <div
        key={date.toString()}
        className={`min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 ${
          isCurrentMonth 
            ? 'bg-white dark:bg-gray-800' 
            : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600'
        } ${
          isCurrentDay 
            ? 'ring-2 ring-primary-500 dark:ring-primary-400' 
            : ''
        }`}
      >
        <div className="flex justify-between items-start">
          <span className={`text-sm font-medium ${
            isCurrentDay 
              ? 'text-primary-600 dark:text-primary-400' 
              : isCurrentMonth 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-400 dark:text-gray-600'
          }`}>
            {dayNumber}
          </span>
          
          {taskStats && (
            <Link
              to={`/day?date=${formattedDate}`}
              className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Ver
            </Link>
          )}
        </div>
        
        {taskStats && (
          <div className="mt-2 space-y-1">
            {taskStats.total > 0 && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <CalendarIcon className="h-3 w-3 mr-1" />
                <span>{taskStats.total} tarefas</span>
              </div>
            )}
            
            {taskStats.completed > 0 && (
              <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                <CheckIcon className="h-3 w-3 mr-1" />
                <span>{taskStats.completed} concluídas</span>
              </div>
            )}
            
            {taskStats.pending > 0 && (
              <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>{taskStats.pending} pendentes</span>
              </div>
            )}
            
            {taskStats.inProgress > 0 && (
              <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                <SpinnerIcon className="h-3 w-3 mr-1" />
                <span>{taskStats.inProgress} em andamento</span>
              </div>
            )}
            
            {taskStats.hasPriority && (
              <div className="mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div>
      {/* Header com navegação */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousMonth}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
            {monthName}
          </h1>
          <button
            onClick={handleNextMonth}
            className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCurrentMonth}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <span>Mês Atual</span>
          </button>
          <button
            onClick={fetchMonthTasks}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span>Atualizar</span>
          </button>
          <Link
            to="/task/new"
            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>Nova Tarefa</span>
          </Link>
        </div>
      </div>
      
      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Cabeçalho com os dias da semana */}
          <div className="grid grid-cols-7 gap-0 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map((day, index) => (
              <div 
                key={index} 
                className="py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendário */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map(day => renderDay(day))}
          </div>
        </div>
      )}
    </div>
  );
}