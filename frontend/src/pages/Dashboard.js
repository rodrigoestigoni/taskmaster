import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ArrowPathIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  PlusIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import TaskStatusBadge from '../components/tasks/TaskStatusBadge';
import TaskPriorityBadge from '../components/tasks/TaskPriorityBadge';
import EmptyState from '../components/common/EmptyState';

// Registrar componentes do Chart.js
Chart.register(...registerables);

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [activeGoals, setActiveGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardData();
    fetchTodayTasks();
    fetchActiveGoals();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const response = await TaskService.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Em vez de mostrar toast de erro, apenas inicializa com dados vazios
      setDashboardData({
        today: { total: 0, completed: 0, in_progress: 0, pending: 0, high_priority: 0 },
        week: { total: 0, completed: 0, completion_rate: 0 },
        goals: { total: 0, active: 0, completed: 0, close_to_deadline: 0 },
        completion_trend: []
      });
    }
  };
  
  const fetchTodayTasks = async () => {
    try {
      const response = await TaskService.getTodayTasks();
      // Ordenar por hora de início
      const sortedTasks = response.data.sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      );
      setTodayTasks(sortedTasks);
    } catch (error) {
      console.error('Error fetching today tasks:', error);
      // Inicializar com array vazio em vez de mostrar erro
      setTodayTasks([]);
    }
  };
  
  const fetchActiveGoals = async () => {
    try {
      const response = await TaskService.getGoals();
      // Filtrar apenas metas ativas
      const goals = response.data.filter(goal => !goal.is_completed);
      
      // Ordenar por prazo mais próximo
      const sortedGoals = goals.sort((a, b) => {
        const daysA = a.days_remaining || 0;
        const daysB = b.days_remaining || 0;
        return daysA - daysB;
      });
      
      setActiveGoals(sortedGoals.slice(0, 3)); // Mostrar apenas as 3 primeiras
    } catch (error) {
      console.error('Error fetching active goals:', error);
      setActiveGoals([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Formatar hora
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };
  
  // Dados para o gráfico de linha de conclusão
  const getCompletionTrendChart = () => {
    if (!dashboardData || !dashboardData.completion_trend || dashboardData.completion_trend.length === 0) {
      return null;
    }
    
    const data = {
      labels: dashboardData.completion_trend.map(item => format(new Date(item.date), 'dd/MM')),
      datasets: [
        {
          label: 'Taxa de Conclusão (%)',
          data: dashboardData.completion_trend.map(item => item.rate || 0),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Total de Tarefas',
          data: dashboardData.completion_trend.map(item => item.total || 0),
          borderColor: '#0ea5e9',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          yAxisID: 'y1',
        },
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Conclusão (%)',
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(107, 114, 128, 0.1)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Número de Tarefas',
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151',
            precision: 0
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(107, 114, 128, 0.1)'
          }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    };
    
    return (
      <div className="h-80">
        <Line data={data} options={options} />
      </div>
    );
  };
  
  // Dados para o gráfico de rosca de status
  const getStatusChart = () => {
    if (!dashboardData || !dashboardData.today) {
      return null;
    }
    
    const { completed, in_progress, pending, total } = dashboardData.today;
    const failed = total - completed - in_progress - pending;
    
    const data = {
      labels: ['Concluídas', 'Em Andamento', 'Pendentes', 'Falhou'],
      datasets: [
        {
          data: [completed, in_progress, pending, failed],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          borderWidth: 0,
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '70%',
    };
    
    return (
      <div className="h-64">
        <Doughnut data={data} options={options} />
      </div>
    );
  };
  
  // Renderiza cartão de estatísticas
  const renderStatCard = (title, value, icon, color, description) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${color}`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">{value}</div>
                </dd>
              </dl>
            </div>
          </div>
          {description && (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Renderiza as próximas tarefas de hoje
  const renderUpcomingTasks = () => {
    // Filtrar apenas tarefas pendentes ou em andamento
    const upcomingTasks = todayTasks.filter(task => 
      task.status === 'pending' || task.status === 'in_progress'
    ).slice(0, 5); // Mostrar apenas as próximas 5
    
    if (upcomingTasks.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500" />
          <p className="mt-2 text-sm">Todas as tarefas de hoje foram concluídas!</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {upcomingTasks.map(task => (
          <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-l-4" 
               style={{ borderLeftColor: task.category_color || '#8b5cf6' }}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white">{task.title}</h3>
                <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center pt-3">
          <Link to="day" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            Ver todas as tarefas
          </Link>
        </div>
      </div>
    );
  };
  
  // Renderiza as metas ativas
  const renderActiveGoals = () => {
    if (activeGoals.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FlagIcon className="h-12 w-12 mx-auto" />
          <p className="mt-2 text-sm">Sem metas ativas no momento.</p>
          <Link to="goal/new" className="mt-2 inline-flex items-center text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            <PlusIcon className="h-4 w-4 mr-1" />
            Criar Meta
          </Link>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {activeGoals.map(goal => (
          <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: goal.category_color }}></span>
                  {goal.title}
                </h3>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {goal.days_remaining > 0 ? (
                    <span>{goal.days_remaining} dias restantes</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Prazo final hoje!</span>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {goal.period}
              </span>
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span>Progresso: {Math.round(goal.progress_percentage)}%</span>
                <span>{goal.current_value} / {goal.target_value}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${goal.progress_percentage}%` }}></div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="text-center pt-2">
          <Link to="goals" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium">
            Ver todas as metas
          </Link>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Data atual */}
      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}
      </div>
      
      {/* Resumo do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardData?.today && (
          <>
            {renderStatCard(
              'Tarefas Hoje',
              dashboardData.today.total,
              <CalendarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
              'bg-indigo-100 dark:bg-indigo-900',
              `${dashboardData.today.completed} de ${dashboardData.today.total} concluídas`
            )}
            
            {renderStatCard(
              'Taxa de Conclusão (Semana)',
              `${Math.round(dashboardData.week.completion_rate)}%`,
              <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />,
              'bg-green-100 dark:bg-green-900',
              `${dashboardData.week.completed} de ${dashboardData.week.total} tarefas`
            )}
            
            {renderStatCard(
              'Prioridade Alta',
              dashboardData.today.high_priority,
              <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />,
              'bg-red-100 dark:bg-red-900',
              'Tarefas que requerem atenção imediata'
            )}
            
            {renderStatCard(
              'Metas Ativas',
              dashboardData.goals.active,
              <FlagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
              'bg-blue-100 dark:bg-blue-900',
              `${dashboardData.goals.close_to_deadline} próximas do prazo`
            )}
          </>
        )}
      </div>
      
      {/* Gráficos e Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Tendência */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tendência de Conclusão (Últimos 30 dias)</h2>
          {getCompletionTrendChart() || (
            <div className="flex justify-center items-center h-80 text-gray-400 dark:text-gray-500">
              <p>Dados insuficientes para exibir o gráfico</p>
            </div>
          )}
        </div>
        
        {/* Status do Dia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Status do Dia</h2>
          {getStatusChart() || (
            <div className="flex justify-center items-center h-64 text-gray-400 dark:text-gray-500">
              <p>Sem tarefas hoje</p>
            </div>
          )}
        </div>
        
        {/* Próximas Tarefas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Próximas Tarefas Hoje</h2>
          {renderUpcomingTasks()}
        </div>
        
        {/* Metas Ativas */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Metas em Andamento</h2>
          {renderActiveGoals()}
        </div>
      </div>
      
      {/* Ações Rápidas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <Link to="task/new" className="flex flex-col items-center justify-center p-4 bg-primary-50 dark:bg-primary-900 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors">
            <PlusIcon className="h-6 w-6 text-primary-700 dark:text-primary-300 mb-2" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Nova Tarefa</span>
          </Link>
          
          <Link to="day" className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
            <CalendarIcon className="h-6 w-6 text-blue-700 dark:text-blue-300 mb-2" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ver Hoje</span>
          </Link>
          
          <Link to="goal/new" className="flex flex-col items-center justify-center p-4 bg-amber-50 dark:bg-amber-900 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800 transition-colors">
            <FlagIcon className="h-6 w-6 text-amber-700 dark:text-amber-300 mb-2" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Nova Meta</span>
          </Link>
          
          <Link to="reports" className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
            <ChartBarIcon className="h-6 w-6 text-green-700 dark:text-green-300 mb-2" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Relatórios</span>
          </Link>
        </div>
      </div>
    </div>
  );
};