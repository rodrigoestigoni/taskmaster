import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  PlusIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import DeleteTaskModal from '../components/common/DeleteTaskModal';
import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';
import TaskStatusBadge from '../components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '../components/tasks/TaskPriorityBadge';
import EmptyState from '../components/common/EmptyState';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import MobileHeader from '../components/layout/MobileHeader';
import MobileTaskCard from '../components/tasks/MobileTaskCard';

export default function WeekView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekTasks, setWeekTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState([]); // Array para controlar múltiplos dias expandidos
  const [activeDayIndex, setActiveDayIndex] = useState(null); // Para visualização mobile
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const { updateTaskStatus } = useTasks();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Função para determinar se é uma visualização mobile
  const isMobile = () => {
    return window.innerWidth < 768;
  };
  
  // Obtém o início e fim da semana para a data selecionada
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Semana começa na segunda
  const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Semana termina no domingo
  
  // Array com todos os dias da semana atual
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  useEffect(() => {
    fetchWeekTasks();
    
    // Inicialmente, expanda o dia atual se estiver na semana atual
    const today = new Date();
    const isTodayInCurrentWeek = weekDays.some(day => isToday(day));
    
    if (isTodayInCurrentWeek) {
      const todayIndex = weekDays.findIndex(day => isToday(day));
      if (todayIndex !== -1) {
        setExpandedDays([todayIndex]);
        setActiveDayIndex(todayIndex);
      }
    } else {
      // Se não estiver na semana atual, expanda o primeiro dia
      setExpandedDays([0]);
      setActiveDayIndex(0);
    }
  }, [selectedDate]);
  
  const fetchWeekTasks = async () => {
    setLoading(true);
    try {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      console.log(`Buscando tarefas da semana: ${formattedStartDate} a ${formattedEndDate}`);
      
      // Usar o método que envia as datas como parâmetros para o backend
      const response = await TaskService.getWeekTasksByDateRange(
        formattedStartDate, 
        formattedEndDate
      );
      
      console.log(`${response.data.length} tarefas encontradas`);
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
  
  // Atualizar uma tarefa para um novo status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Status atualizado com sucesso');
      
      // Atualizar a lista de tarefas local
      setWeekTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status da tarefa');
    }
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Filtra tarefas para um dia específico e ordena por hora de início
  const getTasksForDay = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const tasksForDay = weekTasks.filter(task => task.date === formattedDate);
    
    // Ordenar as tarefas por hora de início
    return tasksForDay.sort((a, b) => a.start_time.localeCompare(b.start_time));
  };
  
  // Função para excluir uma tarefa
  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (mode) => {
    if (!taskToDelete) {
      console.error('Nenhuma tarefa para excluir!');
      return;
    }
    
    try {
      console.log('WeekView -> handleDeleteConfirm:', taskToDelete.id, 'Modo:', mode);
      
      const isRecurring = TaskService.isRecurringTask(taskToDelete);
      if (isRecurring) {
        // Para tarefas recorrentes, use o método específico
        console.log('Excluindo tarefa recorrente:', taskToDelete.id, mode, taskToDelete.date);
        await TaskService.deleteRecurringTask(
          taskToDelete.id, 
          mode, 
          taskToDelete.date || format(selectedDate, 'yyyy-MM-dd')
        );
      } else {
        // Para tarefas normais
        console.log('Excluindo tarefa normal:', taskToDelete.id);
        await TaskService.deleteTask(taskToDelete.id);
      }
      
      toast.success('Tarefa excluída com sucesso');
      
      // Atualizar a lista de tarefas
      fetchWeekTasks();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    } finally {
      // Fechar o modal
      setDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };
  
  // Renderiza versão desktop do card de tarefa
  const renderTaskCard = (task) => {
    return (
      <div 
        key={task.id} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-2 border-l-4 hover:shadow-md transition-shadow duration-300"
        style={{ borderLeftColor: task.category_color || '#8b5cf6' }}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {task.title}
          </h3>
          <TaskPriorityBadge priority={task.priority} />
        </div>
        
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-3 w-3 mr-1" />
          <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
          {TaskService.isRecurringTask(task) && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Recorrente
            </span>
          )}
        </div>
        
        <div className="mt-2 flex justify-between items-center">
          <TaskStatusBadge status={task.status} />
          
          <div className="flex space-x-2">
            <Link
              to={`/task/edit/${task.id}`}
              className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Editar
            </Link>
            <button
              onClick={() => handleDeleteTask(task)}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Manipula a expansão de um dia (versão desktop)
  const toggleDayExpansion = (index) => {
    setExpandedDays(prev => {
      // Na versão desktop, permitimos múltiplos dias expandidos
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // Renderiza um dia da semana com acordeão para a interface desktop
  const renderAccordionDay = (date, index) => {
    const dayTasks = getTasksForDay(date);
    const formattedDay = format(date, 'EEEE', { locale: ptBR });
    const formattedDate = format(date, 'dd/MM');
    const isCurrentDay = isToday(date);
    const isExpanded = expandedDays.includes(index);
    
    return (
      <div 
        key={date.toString()} 
        className={`mb-3 rounded-lg shadow ${
          isCurrentDay 
            ? 'ring-2 ring-primary-500 dark:ring-primary-400' 
            : ''
        }`}
      >
        <button
          onClick={() => toggleDayExpansion(index)}
          className={`w-full flex items-center justify-between p-4 ${
            isCurrentDay 
              ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          } rounded-lg ${!isExpanded ? 'rounded-b-lg' : ''}`}
        >
          <div className="flex flex-col items-start">
            <h3 className="text-sm font-semibold capitalize">
              {formattedDay}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate} • {dayTasks.length} tarefas
            </span>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {dayTasks.length > 0 ? (
                dayTasks.map(task => renderTaskCard(task))
              ) : (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  Sem tarefas para este dia
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <Link
                to={`/day?date=${format(date, 'yyyy-MM-dd')}`}
                className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Ver detalhes do dia
              </Link>
              <Link
                to="/task/new"
                className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Nova tarefa
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderiza navegação entre dias para mobile (estilo tabs)
  const renderMobileDayTabs = () => {
    return (
      <div className="mb-4 -mx-1">
        <div className="flex space-x-1 overflow-x-auto p-1 scrollbar-hide">
          {weekDays.map((day, index) => {
            const isActive = activeDayIndex === index;
            const isCurrentDay = isToday(day);
            const formattedDay = format(day, 'EEE', { locale: ptBR });
            const formattedDate = format(day, 'd');
            const tasksCount = getTasksForDay(day).length;
            
            return (
              <button
                key={day.toString()}
                onClick={() => setActiveDayIndex(index)}
                className={`flex flex-col items-center p-2 rounded-md min-w-[4rem] ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                } ${
                  isCurrentDay && !isActive 
                    ? 'ring-1 ring-primary-500 dark:ring-primary-400' 
                    : ''
                }`}
              >
                <span className={`text-xs font-medium capitalize ${
                  isCurrentDay && !isActive 
                    ? 'text-primary-500 dark:text-primary-400' 
                    : ''
                }`}>
                  {formattedDay}
                </span>
                <span className="text-sm font-bold">{formattedDate}</span>
                {tasksCount > 0 && (
                  <span className={`text-xs mt-1 ${
                    isActive 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {tasksCount} {tasksCount === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderiza conteúdo específico para dispositivos móveis
  const renderMobileContent = () => {
    if (activeDayIndex === null) return null;
    
    const activeDay = weekDays[activeDayIndex];
    const dayTasks = getTasksForDay(activeDay);
    const formattedDay = format(activeDay, 'EEEE', { locale: ptBR });
    const formattedDate = format(activeDay, 'dd/MM/yyyy');
    const isCurrentDay = isToday(activeDay);
    
    return (
      <div>
        {/* Tabs para navegação entre dias */}
        {renderMobileDayTabs()}
        
        {/* Cabeçalho do dia */}
        <div className="px-4 mb-3">
          <h2 className={`text-lg font-semibold capitalize ${
            isCurrentDay ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'
          }`}>
            {formattedDay}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formattedDate}
          </p>
        </div>
        
        {/* Lista de tarefas do dia */}
        <div className="space-y-0 px-4">
          {dayTasks.length > 0 ? (
            dayTasks.map(task => (
              <MobileTaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteTask}
              />
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Sem tarefas para este dia
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Que tal adicionar uma nova tarefa?
              </p>
              <Link
                to={`/task/new?date=${format(activeDay, 'yyyy-MM-dd')}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Link>
            </div>
          )}
        </div>
        
        {/* Botões de ação de fácil acesso */}
        {dayTasks.length > 0 && (
          <div className="mt-6 px-4">
            <Link
              to={`/day?date=${format(activeDay, 'yyyy-MM-dd')}`}
              className="w-full block text-center px-4 py-2 border border-primary-300 text-primary-700 dark:border-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900 rounded-md mb-2"
            >
              Ver detalhes do dia
            </Link>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="pb-20 md:pb-0"> {/* Espaço para a navbar inferior em mobile */}
      {/* Header com navegação - versão responsiva */}
      {isMobile() ? (
        <MobileHeader 
          title={`${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}`}
          onPrevious={handlePreviousWeek}
          onNext={handleNextWeek}
          onToday={handleCurrentWeek}
          onMoreClick={() => setShowActionsMenu(!showActionsMenu)}
        />
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousWeek}
              className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM", { locale: ptBR })}
            </h1>
            <button
              onClick={handleNextWeek}
              className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCurrentWeek}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span>Semana Atual</span>
            </button>
            <button
              onClick={fetchWeekTasks}
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
      
      {/* Mobile action buttons */}
      {isMobile() && (
        <div className="flex justify-between items-center px-4 py-2 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex space-x-2">
            <button
              onClick={fetchWeekTasks}
              className="flex items-center justify-center p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm"
            >
              <ArrowPathIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          <Link
            to="/task/new"
            className="flex items-center px-3 py-1.5 rounded-md bg-primary-600 text-white shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>Nova Tarefa</span>
          </Link>
        </div>
      )}
      
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
        <div>
          {isMobile() ? renderMobileContent() : (
            <div className="space-y-3">
              {weekDays.map((day, index) => renderAccordionDay(day, index))}
            </div>
          )}
        </div>
      )}
      
      <DeleteTaskModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isRecurring={taskToDelete?.repeat_pattern && taskToDelete.repeat_pattern !== 'none'}
      />
      {/* Bottom Navigation for Mobile */}
      {isMobile() && <MobileBottomNav />}
    </div>
  );
}