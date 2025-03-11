import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  DocumentTextIcon,
  FlagIcon,
  PencilIcon,
  TrashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

import TaskService from '../services/TaskService';

import PomodoroTimer from '../components/common/PomodoroTimer';
import VisualGoalProgress from '../components/common/VisualGoalProgress';
import TimeBlockingScheduler from '../components/common/TimeBlockingScheduler';
import TaskOverlapModal from '../components/common/TaskOverlapModal';

const EnhancedTaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [overlappingTask, setOverlappingTask] = useState(null);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details, pomodoro, timeblock
  
  // Fetch task data when component mounts
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch task details
        const taskResponse = await TaskService.getTask(id);
        setTask(taskResponse.data);
        
        // If task has a goal, fetch goal details
        if (taskResponse.data.goal) {
          const goalResponse = await TaskService.getGoal(taskResponse.data.goal);
          setGoal(goalResponse.data);
        }
        
        // Fetch today's tasks for time blocking
        const todayTasks = await TaskService.getTodayTasks();
        setTasks(todayTasks.data);
      } catch (error) {
        console.error('Error fetching task details:', error);
        toast.error('Erro ao carregar detalhes da tarefa');
        navigate('/day');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate]);
  
  // Update task status handler
  const handleStatusChange = async (taskId, newStatus, actualValue, notes) => {
    try {
      // Default actualValue to task.target_value if available
      if (newStatus === 'completed' && !actualValue && task.target_value) {
        actualValue = task.target_value;
      }
      
      await TaskService.updateTaskStatus(taskId, {
        status: newStatus,
        date: task.date,
        actual_value: actualValue,
        notes: notes || task.notes
      });
      
      // Update local task state
      setTask((prevTask) => ({
        ...prevTask,
        status: newStatus,
        actual_value: actualValue || prevTask.actual_value
      }));
      
      // Refetch goal if needed
      if (task.goal && newStatus === 'completed') {
        const goalResponse = await TaskService.getGoal(task.goal);
        setGoal(goalResponse.data);
      }
      
      toast.success(`Status da tarefa atualizado para ${newStatus}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status da tarefa');
    }
  };
  
  // Pomodoro session complete handler
  const handlePomodoroComplete = async (taskId) => {
    // If the task is already completed, do nothing
    if (task.status === 'completed') return;
    
    // Ask user if they want to mark as completed
    const shouldComplete = window.confirm("Sessão Pomodoro concluída! Deseja marcar esta tarefa como concluída?");
    
    if (shouldComplete) {
      await handleStatusChange(taskId, 'completed');
    }
  };
  
  // Handle scheduling task
  const handleScheduleTask = async (taskId, startTime, endTime) => {
    try {
      await TaskService.updateTask(taskId, {
        ...task,
        start_time: startTime,
        end_time: endTime
      });
      
      // Update local task state
      setTask((prevTask) => ({
        ...prevTask,
        start_time: startTime,
        end_time: endTime
      }));
      
      // Also update in tasks array
      setTasks((prevTasks) => 
        prevTasks.map((t) => 
          t.id === taskId 
            ? { ...t, start_time: startTime, end_time: endTime } 
            : t
        )
      );
      
      toast.success("Tarefa agendada com sucesso!");
    } catch (error) {
      console.error('Error scheduling task:', error);
      toast.error('Erro ao agendar tarefa');
    }
  };
  
  // Handle conflict detection
  const handleConflictDetection = (task, conflict) => {
    setOverlappingTask(conflict);
    setShowOverlapModal(true);
  };
  
  // Format time from "HH:MM:SS" to "HH:MM"
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };
  
  // Get energy level text
  const getEnergyLevelText = (level) => {
    switch (level) {
      case 'high': return 'Alta Energia';
      case 'medium': return 'Energia Média';
      case 'low': return 'Baixa Energia';
      default: return 'Energia Média';
    }
  };
  
  // Get energy level color
  const getEnergyLevelColor = (level) => {
    switch (level) {
      case 'high': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'medium': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'low': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tarefa não encontrada</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            A tarefa solicitada não existe ou foi removida.
          </p>
          <div className="mt-4">
            <Link
              to="/day"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para Hoje
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="h-2" style={{ backgroundColor: task.category_color || '#4F46E5' }}></div>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="mr-3 p-1.5 text-gray-400 hover:text-gray-500 rounded-full flex items-center justify-center"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Status Badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  task.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  task.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {task.status === 'completed' ? 'Concluída' :
                   task.status === 'in_progress' ? 'Em Andamento' :
                   task.status === 'pending' ? 'Pendente' :
                   task.status === 'failed' ? 'Falhou' : 'Pulada'}
                </span>
                
                {/* Priority Badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.priority == 4 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  task.priority == 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  task.priority == 2 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {task.priority == 4 ? 'Urgente' :
                   task.priority == 3 ? 'Alta' :
                   task.priority == 2 ? 'Média' : 'Baixa'}
                </span>
                
                {/* Category Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ 
                  backgroundColor: `${task.category_color}20`,
                  color: task.category_color
                }}>
                  {task.category_name}
                </span>
                
                {/* Energy Level Badge */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEnergyLevelColor(task.energy_level)}`}>
                  <BoltIcon className="h-3 w-3 mr-1" />
                  {getEnergyLevelText(task.energy_level)}
                </span>
              </div>
              
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                {/* Date and Time */}
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>{task.date} {task.start_time && task.end_time && (
                    <span>• {formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
                  )}</span>
                </div>
                
                {/* Duration */}
                {task.duration_minutes && (
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{task.duration_minutes} minutos</span>
                  </div>
                )}
                
                {/* Goal */}
                {task.goal_title && (
                  <div className="flex items-center">
                    <FlagIcon className="h-4 w-4 mr-2" />
                    <span>Meta: {task.goal_title}</span>
                  </div>
                )}
                
                {/* Description */}
                {task.description && (
                  <div className="mt-3">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      <span className="font-medium">Descrição</span>
                    </div>
                    <p className="mt-1 ml-6 text-sm whitespace-pre-line">{task.description}</p>
                  </div>
                )}
                
                {/* Notes */}
                {task.notes && (
                  <div className="mt-3">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      <span className="font-medium">Observações</span>
                    </div>
                    <p className="mt-1 ml-6 text-sm whitespace-pre-line">{task.notes}</p>
                  </div>
                )}
              </div>
              
              {/* Task Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Status Update Buttons */}
                {task.status !== 'completed' && (
                  <button
                    onClick={() => {
                      const actualValue = task.target_value || (
                        prompt('Valor realizado (deixe em branco se não aplicável):', '')
                      );
                      handleStatusChange(task.id, 'completed', actualValue || null);
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Concluir
                  </button>
                )}
                
                {task.status !== 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Em Andamento
                  </button>
                )}
                
                {/* Edit Button */}
                <Link
                  to={`/task/edit/${task.id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Editar
                </Link>
                
                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
                      TaskService.deleteTask(task.id)
                        .then(() => {
                          toast.success("Tarefa excluída com sucesso!");
                          navigate("/day");
                        })
                        .catch(error => {
                          console.error('Error deleting task:', error);
                          toast.error("Erro ao excluir tarefa");
                        });
                    }
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Excluir
                </button>
              </div>
            </div>
            
            {/* Goal Progress (if applicable) */}
            {goal && (
              <div>
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Progresso da Meta
                </h3>
                <VisualGoalProgress goal={goal} />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs for additional features */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('pomodoro')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'pomodoro'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Pomodoro
            </button>
            <button
              onClick={() => setActiveTab('timeblock')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'timeblock'
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Agenda
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'details' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Detalhes da Tarefa
              </h3>
              
              {task.repeat_pattern && task.repeat_pattern !== 'none' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Informações de Recorrência
                  </h4>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Padrão: {
                      task.repeat_pattern === 'daily' ? 'Diariamente' :
                      task.repeat_pattern === 'weekdays' ? 'Dias úteis (Seg-Sex)' :
                      task.repeat_pattern === 'weekends' ? 'Finais de semana' :
                      task.repeat_pattern === 'weekly' ? 'Semanalmente' :
                      task.repeat_pattern === 'monthly' ? 'Mensalmente' :
                      task.repeat_pattern === 'custom' ? 'Personalizado' : ''
                    }
                  </p>
                  {task.repeat_end_date && (
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Até: {task.repeat_end_date}
                    </p>
                  )}
                  {task.repeat_pattern === 'custom' && task.repeat_days && (
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Dias: {task.repeat_days}
                    </p>
                  )}
                </div>
              )}
              
              {task.target_value && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Progresso da Tarefa
                  </h4>
                  <div className="mt-2 flex items-center">
                    <div className="flex-1">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-primary-600 h-2.5 rounded-full"
                          style={{ width: `${Math.min(((task.actual_value || 0) / task.target_value) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                      {task.actual_value || 0} / {task.target_value}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Additional task metrics could go here */}
            </div>
          )}
          
          {activeTab === 'pomodoro' && (
            <PomodoroTimer 
              taskId={task.id} 
              taskTitle={task.title}
              onComplete={handlePomodoroComplete}
            />
          )}
          
          {activeTab === 'timeblock' && (
            <TimeBlockingScheduler
              tasks={tasks}
              onScheduleTask={handleScheduleTask}
              onDetectConflict={handleConflictDetection}
            />
          )}
        </div>
      </div>
      
      {/* Overlap Modal */}
      <TaskOverlapModal
        isOpen={showOverlapModal}
        onClose={() => setShowOverlapModal(false)}
        onConfirm={() => {
          setShowOverlapModal(false);
          // Future handlers for conflict resolution
        }}
        overlappingTask={overlappingTask}
      />
    </div>
  );
};

export default EnhancedTaskDetail;