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
  ArrowPathIcon as SpinnerIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

import TaskService from '../services/TaskService';
import EmptyState from '../components/common/EmptyState';
import MobileBottomNav from '../components/layout/MobileBottomNav';

export default function MonthView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthTasks, setMonthTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  
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
  
  // Função para determinar se é uma visualização mobile
  const isMobile = () => {
    return window.innerWidth < 768;
  };

  useEffect(() => {
    fetchMonthTasks();
  }, [selectedDate]);
  
  const fetchMonthTasks = async () => {
    setLoading(true);
    try {
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth() + 1; // getMonth() retorna 0-11
      
      console.log(`Buscando tarefas do mês: ${selectedYear}/${selectedMonth}`);
      
      // Usar o método que envia o ano e mês como parâmetros para o backend
      const response = await TaskService.getMonthTasksByYearMonth(
        selectedYear,
        selectedMonth
      );
      
      console.log(`${response.data.length} tarefas encontradas`);
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
    
    // Feedback tátil
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  };
  
  const handleNextMonth = () => {
    setSelectedDate(prevDate => addMonths(prevDate, 1));
    
    // Feedback tátil
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
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
  
  // Renderiza o cabeçalho mobile
  const renderMobileHeader = () => {
    return (
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm pb-2 mb-4">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200"
              aria-label="Mês anterior"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {monthName}
            </h1>
            
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200"
              aria-label="Próximo mês"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200"
              aria-label="Mais opções"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Menu de ações - aparece ao clicar no botão de três pontos */}
        <AnimatePresence>
          {showActionsMenu && (
            <motion.div 
              className="absolute right-4 top-16 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 w-48"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="space-y-1">
                <button
                  onClick={() => {
                    handleCurrentMonth();
                    setShowActionsMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Ir para mês atual
                </button>
                
                <button
                  onClick={() => {
                    fetchMonthTasks();
                    setShowActionsMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Atualizar
                </button>
                
                <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/task/new"
                    className="flex items-center w-full px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900 rounded-md"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nova tarefa
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  
  // Renderiza uma célula do calendário otimizada para touch
  const renderTouchableDay = (date) => {
    const dayNumber = format(date, 'd');
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isCurrentDay = isToday(date);
    const taskStats = getTaskStats(date);
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    return (
      <Link
        key={date.toString()}
        to={`/day?date=${formattedDate}`}
        className={`relative min-h-[70px] p-2 border border-gray-200 dark:border-gray-700 touch-manipulation ${
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
        </div>
        
        {taskStats && (
          <div className="mt-2 flex justify-center space-x-1">
            {taskStats.pending > 0 && (
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            )}
            {taskStats.inProgress > 0 && (
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            )}
            {taskStats.completed > 0 && (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </div>
        )}
        
        {taskStats && taskStats.total > 0 && (
          <div className="absolute bottom-1 right-1 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-semibold w-5 h-5">
            {taskStats.total}
          </div>
        )}
      </Link>
    );
  };
  
  // Renderiza um calendário mais compacto para mobile
  const renderMobileCalendar = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Cabeçalho com os dias da semana - mais compacto para mobile */}
        <div className="grid grid-cols-7 gap-0 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className="py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {isMobile() ? day.charAt(0) : day}
            </div>
          ))}
        </div>
        
        {/* Calendário */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map(day => renderTouchableDay(day))}
        </div>
      </div>
    );
  };
  
  return (
    <div 
      className="pb-20 md:pb-0" // Espaço para a navbar inferior em mobile
    >
      {/* Header com navegação - versão responsiva */}
      {isMobile() ? renderMobileHeader() : (
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
      )}
      
      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="px-1 md:px-0">
          {renderMobileCalendar()}
        </div>
      )}
      
      {/* Bottom Navigation for Mobile */}
      {isMobile() && <MobileBottomNav />}
    </div>
  );
}