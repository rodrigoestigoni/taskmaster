import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  CheckIcon,
  FaceFrownIcon,
  HandThumbDownIcon,
  DocumentTextIcon,
  ClockIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  FunnelIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';
import TaskStatusBadge from '../components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '../components/tasks/TaskPriorityBadge';
import EmptyState from '../components/common/EmptyState';
import TaskCompletionModal from '../components/common/TaskCompletionModal';
import DeleteTaskModal from '../components/common/DeleteTaskModal';
import TimeBlockingScheduler from '../components/common/TimeBlockingScheduler';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import MobileHeader from '../components/layout/MobileHeader';
import MobileTaskCard from '../components/tasks/MobileTaskCard';

export default function DayView() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const dateParam = queryParams.get('date');
  const [showTimeBlocker, setShowTimeBlocker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [taskContextMenu, setTaskContextMenu] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(
    dateParam ? parseISO(dateParam) : new Date()
  );
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { updateTaskStatus } = useTasks();
  const pageRef = useRef(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Estado para o modal de conclusão com meta
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  
  // Estado para filtros
  const [statusFilter, setStatusFilter] = useState({
    pending: true,
    in_progress: true,
    completed: true,
    failed: true,
    skipped: true
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Formata a data para exibição
  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  
  // Capitaliza a primeira letra
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);
  
  useEffect(() => {
    // Aplicar filtros quando as tarefas ou filtros mudarem
    applyFilters();
  }, [tasks, statusFilter]);

  // Função para determinar se é uma visualização mobile
  const isMobile = () => {
    return window.innerWidth < 768;
  };
  
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
  
  // Aplicar filtros às tarefas
  const applyFilters = () => {
    // Filtrar por status
    const filtered = tasks.filter(task => statusFilter[task.status] === true);
    setFilteredTasks(filtered);
  };
  
  // Alternar filtro de status específico
  const toggleStatusFilter = (status) => {
    setStatusFilter(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  // Verificar se algum filtro está ativo
  const isFilterActive = () => {
    return Object.values(statusFilter).includes(false);
  };
  
  // Resetar todos os filtros
  const resetFilters = () => {
    setStatusFilter({
      pending: true,
      in_progress: true,
      completed: true,
      failed: true,
      skipped: true
    });
  };
  
  // Mostrar apenas tarefas pendentes e em andamento
  const showActiveTasksOnly = () => {
    setStatusFilter({
      pending: true,
      in_progress: true,
      completed: false,
      failed: false,
      skipped: false
    });
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
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
      console.log(`Atualizando status da tarefa ${taskId}:`, { newStatus, actualValue, notes });
      
      // Determinar como chamar o updateTaskStatus com base no que foi passado
      let statusData;
      
      if (typeof newStatus === 'object') {
        // Se newStatus já é um objeto, usá-lo diretamente
        statusData = newStatus;
        
        // Adicionar notes se fornecido
        if (notes) {
          statusData.notes = notes;
        }
      } else {
        // Se newStatus é uma string, criar um objeto
        statusData = { status: newStatus };
        
        // Adicionar actual_value se fornecido
        if (actualValue !== null && actualValue !== undefined) {
          statusData.actual_value = actualValue;
        }
        
        // Adicionar notes se fornecido
        if (notes) {
          statusData.notes = notes;
        }
        
        // Adicionar a data atual se não estiver presente
        if (!statusData.date) {
          statusData.date = format(selectedDate, 'yyyy-MM-dd');
        }
      }
      
      console.log("Chamando TaskService.updateTaskStatus com:", taskId, statusData);
      
      // Chamar método do serviço
      await TaskService.updateTaskStatus(taskId, statusData);
      
      // Feedback tátil em dispositivos móveis
      if (navigator.vibrate) {
        navigator.vibrate(80);
      }
      
      // Atualize imediatamente o estado local
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId ? { ...t, status: typeof newStatus === 'string' ? newStatus : newStatus.status } : t
        )
      );
      
      // Mostre mensagem de sucesso
      toast.success('Status atualizado com sucesso');
      
      // Atualize a lista de tarefas
      await fetchTasks();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };
  
  // Função para concluir a tarefa com valor definido pelo usuário
  const handleCompletionConfirm = async ({ actualValue, notes }) => {
    if (!taskToComplete) return;
    
    try {
      await handleStatusChange(
        taskToComplete.id, 
        'completed', 
        actualValue, 
        notes
      );
      
      toast.success('Tarefa concluída e meta atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao concluir tarefa com meta:', error);
      toast.error('Erro ao concluir tarefa');
    } finally {
      setCompletionModalOpen(false);
      setTaskToComplete(null);
    }
  };

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Armazenar a tarefa para excluir e abrir o modal
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (mode) => {
    if (!taskToDelete) return;
    
    try {
      if (taskToDelete.repeat_pattern && taskToDelete.repeat_pattern !== 'none') {
        // Tarefa recorrente - usar o endpoint específico com o modo selecionado
        const date = taskToDelete.date || format(selectedDate, 'yyyy-MM-dd');
        await TaskService.deleteRecurringTask(taskToDelete.id, mode, date);
      } else {
        // Tarefa normal
        await TaskService.deleteTask(taskToDelete.id);
      }
      
      toast.success('Tarefa excluída com sucesso');
      
      // Remover a tarefa do estado local para atualização imediata da UI
      setTasks(tasks.filter(task => task.id !== taskToDelete.id));
      
      // Recarregar tarefas para garantir sincronização completa
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    } finally {
      // Fechar o modal e limpar a tarefa selecionada
      setDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };
  
  // Função de agendamento de tarefas para o TimeBlockingScheduler
  const handleScheduleTask = async (taskId, startTime, endTime) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }
      
      await TaskService.updateTask(taskId, {
        ...task,
        start_time: startTime,
        end_time: endTime
      });
      
      toast.success('Tarefa agendada com sucesso!');
      fetchTasks(); // Recarregar tarefas
    } catch (error) {
      console.error('Error scheduling task:', error);
      toast.error('Erro ao agendar tarefa');
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
    
    filteredTasks.forEach(task => {
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

    const isTaskToday = task.date ? format(parseISO(task.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : true;

    const isCompleted = task.status === 'completed';
    
    const isRecurring = task.repeat_pattern && task.repeat_pattern !== 'none';

    const categoryColor = task.category_color || '#4F46E5';
    
    return (
      <div 
        key={task.id} 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-task hover:shadow-task-hover transition-shadow duration-300 overflow-hidden"
      >
        <div className="h-2" style={{ backgroundColor: categoryColor }}></div>
        <div className="p-4">
          
        <div className="flex justify-between items-start">
          <div className="flex-1 flex items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{task.title}</h3>
            
            {/* Indicador de tarefa recorrente */}
            {isRecurring && (
              <span 
                className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                title={`Recorrência: ${
                  task.repeat_pattern === 'daily' ? 'Diária' :
                  task.repeat_pattern === 'weekly' ? 'Semanal' :
                  task.repeat_pattern === 'monthly' ? 'Mensal' :
                  task.repeat_pattern === 'weekdays' ? 'Dias úteis' :
                  task.repeat_pattern === 'weekends' ? 'Finais de semana' :
                  task.repeat_pattern === 'custom' ? 'Personalizada' : 'Recorrente'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recorrente
              </span>
            )}
          </div>
          <TaskPriorityBadge priority={task.priority} />
        </div>
        
        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <PlayIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
          <span>{startTime} - {endTime}</span>
          <span className="mx-2">•</span>
          <span>{task.duration_minutes} min</span>
        </div>
        
        {task.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
        )}
        
        <div className="mt-3 flex items-center">
          <span 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
          >
            {task.category_name}
          </span>
          <TaskStatusBadge status={task.status} />
        </div>
          
          <div className="flex space-x-2 gap-6 mt-3">
            {/* Botões para alterar status - mostrar apenas para tarefas de hoje que não estão concluídas */}
            {isTaskToday && !isCompleted ? (
              <>
                <button
                  onClick={() => {
                    // Usa o target_value da tarefa diretamente
                    if (task.goal) {
                      // Verificar se target_value existe
                      if (task.target_value) {
                        // Converter para número para garantir o tipo correto
                        const numValue = task.target_value;
                        // Chamar handleStatusChange com o target_value como actual_value
                        handleStatusChange(task.id, 'completed', numValue);
                      } else {
                        toast.error('Erro: Tarefa não possui valor alvo definido');
                      }
                    } else {
                      // Se não tiver meta, chama normalmente
                      handleStatusChange(task.id, 'completed');
                    }
                  }}
                  className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Marcar como concluída"
                >
                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                {task.status != 'in_progress' && (
                  <button
                  onClick={() => handleStatusChange(task.id, 'in_progress')}
                  className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="Marcar em andamento"
                >
                  <PlayIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                )}                
                <button
                  onClick={() => handleStatusChange(task.id, 'failed')}
                  className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                  title="Marcar como não realizada"
                >
                  <HandThumbDownIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : isTaskToday && isCompleted ? (
              // Para tarefas concluídas, mostrar uma mensagem ou apenas deixar vazio
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                <CheckIcon className="h-4 w-4 mr-1" />
                Concluída
              </span>
            ) : (
              // Para tarefas de outros dias
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                {format(parseISO(task.date), 'dd/MM/yyyy')}
              </span>
            )}
            <Link
              to={`/task/edit/${task.id}`}
              className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Editar tarefa"
            >
              <PencilIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
            
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evita propagação do evento
                handleDeleteTask(task.id);
              }}
              className="delete-button inline-flex items-center p-1 border border-red-300 dark:border-gray-600 rounded-full shadow-sm text-red-700 dark:text-red-300 bg-white dark:bg-red-700 hover:bg-red-50 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Excluir tarefa"
              aria-label="Excluir tarefa"
              type="button"
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            <Link
              to={`/enhanced_task/${task.id}`}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
            >
              <DocumentTextIcon className="h-3 w-3 mr-1" />
              Detalhes
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
      <div className="mb-8">
        <div className="flex items-center mb-4">
          {icon}
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 ml-2">{title}</h2>
        </div>
        <div className="space-y-3">
          {isMobile() 
            ? tasks.map(task => (
                <MobileTaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(taskId, statusData) => {
                    console.log("MobileTaskCard -> handleStatusChange:", taskId, statusData);
                    handleStatusChange(taskId, statusData);
                  }}
                  onDelete={(task) => {
                    console.log("MobileTaskCard -> handleDeleteTask:", task.id);
                    handleDeleteTask(task.id);
                  }}
                />
              ))
            : tasks.map(task => renderTaskCard(task))
          }
        </div>
      </div>
    );
  };
  
  return (
    <div 
      ref={pageRef}
      className="pb-20 md:pb-0" // Espaço para a navbar inferior em mobile
    >
      {/* Mobile responsive header */}
      {isMobile() ? (
        <MobileHeader 
          title={isToday(selectedDate) ? 'Hoje' : format(selectedDate, 'dd/MM')}
          onPrevious={handlePreviousDay}
          onNext={handleNextDay}
          onToday={handleToday}
          onMoreClick={() => setShowActionsMenu(!showActionsMenu)}
        />
      ) : (
        /* Desktop header */
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePreviousDay}
                className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{displayDate}</h1>
              <button
                onClick={handleNextDay}
                className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span>Hoje</span>
            </button>
          </div>
          
          {/* Action buttons - placed in a scrollable row on mobile if needed */}
          <div className="flex flex-wrap gap-2 items-center justify-start">
            <button
              onClick={fetchTasks}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`inline-flex items-center px-3 py-1.5 border ${isFilterActive() ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'} shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                <FunnelIcon className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Filtrar</span>
                {isFilterActive() && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-primary-500"></span>
                )}
              </button>
              
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1 divide-y divide-gray-200 dark:divide-gray-700">
                    <div className="px-4 py-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filtrar por status</h3>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={statusFilter.pending}
                            onChange={() => toggleStatusFilter('pending')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Pendente</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={statusFilter.in_progress}
                            onChange={() => toggleStatusFilter('in_progress')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Em andamento</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={statusFilter.completed}
                            onChange={() => toggleStatusFilter('completed')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Concluída</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={statusFilter.failed}
                            onChange={() => toggleStatusFilter('failed')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Falhou</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={statusFilter.skipped}
                            onChange={() => toggleStatusFilter('skipped')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Pulada</span>
                        </label>
                      </div>
                    </div>
                    <div className="px-4 py-2">
                      <button
                        onClick={() => {
                          showActiveTasksOnly();
                          setShowFilterMenu(false);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Mostrar apenas tarefas ativas
                      </button>
                    </div>
                    <div className="px-4 py-2">
                      <button
                        onClick={() => {
                          resetFilters();
                          setShowFilterMenu(false);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Link
              to="/task/new"
              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </Link>
            
            <button
              onClick={() => setShowTimeBlocker(!showTimeBlocker)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ClockIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{showTimeBlocker ? 'Ocultar Agenda' : 'Planejador'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile action menu - separado em botões claros em vez de swipe/menus */}
      {isMobile() && (
      <div className="flex justify-between items-center px-4 py-2 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex space-x-2">
          <button
            onClick={fetchTasks}
            className="flex items-center justify-center p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          {/* Menu de filtro em dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button
              className={`flex items-center justify-center p-2 rounded-full ${
                isFilterActive() 
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              } shadow-sm`}
            >
              <FunnelIcon className="h-5 w-5" />
              {isFilterActive() && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary-500"></span>
              )}
            </Menu.Button>
            
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="px-4 py-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filtrar por status</h3>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.pending}
                        onChange={() => toggleStatusFilter('pending')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Pendente</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.in_progress}
                        onChange={() => toggleStatusFilter('in_progress')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Em andamento</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.completed}
                        onChange={() => toggleStatusFilter('completed')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Concluída</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.failed}
                        onChange={() => toggleStatusFilter('failed')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Falhou</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={statusFilter.skipped}
                        onChange={() => toggleStatusFilter('skipped')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Pulada</span>
                    </label>
                  </div>
                  
                  <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={showActiveTasksOnly}
                      className="w-full text-left text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 py-1"
                    >
                      Mostrar apenas tarefas ativas
                    </button>
                    <button
                      onClick={resetFilters}
                      className="w-full text-left text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 py-1"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
        
        <div className="flex space-x-2">
          <Link
            to="/task/new"
            className="flex items-center px-3 py-1.5 rounded-md bg-primary-600 text-white shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            <span>Nova</span>
          </Link>
          
          <button
            onClick={() => setShowTimeBlocker(!showTimeBlocker)}
            className="flex items-center justify-center p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm"
          >
            <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    )}
      
      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState 
          title={tasks.length === 0 ? "Sem tarefas para hoje" : "Nenhuma tarefa corresponde aos filtros"}
          description={tasks.length === 0 ? "Não há tarefas planejadas para hoje. Que tal adicionar uma?" : "Tente ajustar os filtros para ver mais tarefas."}
          buttonText="Adicionar Tarefa"
          buttonLink="task/new"
          icon={<CalendarIcon className="h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="space-y-6 px-4 md:px-0">
          {/* Morning tasks */}
          {renderTaskSection(
            'Manhã (5h - 12h)', 
            morningTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            </span>
          )}
          
          {/* Afternoon tasks */}
          {renderTaskSection(
            'Tarde (12h - 18h)', 
            afternoonTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            </span>
          )}
          
          {/* Evening tasks */}
          {renderTaskSection(
            'Noite (18h - 22h)', 
            eveningTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          
          {/* Night tasks */}
          {renderTaskSection(
            'Madrugada (22h - 5h)', 
            nightTasks,
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      )}
      
      {showTimeBlocker && (
        <div className="mt-4 mb-6 overflow-x-auto">
          <TimeBlockingScheduler
            tasks={tasks}
            onScheduleTask={handleScheduleTask}
            onDetectConflict={(task, conflict) => {
              toast.warning(`Conflito detectado com a tarefa "${conflict.title}"`);
            }}
          />
        </div>
      )}
      
      {/* Modal para confirmar exclusão de tarefa recorrente */}
      <DeleteTaskModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        isRecurring={taskToDelete?.repeat_pattern && taskToDelete.repeat_pattern !== 'none'}
      />
      
      {/* Modal para completar tarefa com meta */}
      <TaskCompletionModal
        isOpen={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        onConfirm={handleCompletionConfirm}
        task={taskToComplete}
      />
      
      {/* Bottom Navigation for Mobile */}
      {isMobile() && <MobileBottomNav />}
    </div>
  );
}