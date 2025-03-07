import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChartBarIcon, 
  CalendarIcon, 
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';

// Registrar componentes do Chart.js
Chart.register(...registerables);

export default function Reports() {
  const [taskReport, setTaskReport] = useState(null);
  const [goalReport, setGoalReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  const fetchReports = async () => {
    setLoading(true);
    try {
      const [taskResp, goalResp] = await Promise.all([
        TaskService.getTaskReport(dateRange.startDate, dateRange.endDate),
        TaskService.getGoalReport(dateRange.startDate, dateRange.endDate)
      ]);
      
      setTaskReport(taskResp.data);
      setGoalReport(goalResp.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };
  
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };
  
  // Gráfico de status das tarefas
  const getTaskStatusChart = () => {
    if (!taskReport || !taskReport.status || taskReport.status.length === 0) {
      return null;
    }
    
    const data = {
      labels: taskReport.status.map(item => {
        switch (item.status) {
          case 'completed': return 'Concluídas';
          case 'pending': return 'Pendentes';
          case 'in_progress': return 'Em andamento';
          case 'failed': return 'Falhou';
          case 'skipped': return 'Pulada';
          default: return item.status;
        }
      }),
      datasets: [
        {
          data: taskReport.status.map(item => item.count),
          backgroundColor: [
            '#10b981', // Verde para concluídas
            '#f59e0b', // Amarelo para pendentes
            '#3b82f6', // Azul para em andamento
            '#ef4444', // Vermelho para falhou
            '#6b7280'  // Cinza para pulada
          ],
          borderWidth: 0,
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const percentage = Math.round(value / taskReport.total_tasks * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '65%',
    };
    
    return (
      <div className="h-64">
        <Doughnut data={data} options={options} />
      </div>
    );
  };
  
  // Gráfico de categorias de tarefas
  const getTaskCategoriesChart = () => {
    if (!taskReport || !taskReport.categories || taskReport.categories.length === 0) {
      return null;
    }
    
    const data = {
      labels: taskReport.categories.map(item => item.category__name),
      datasets: [
        {
          label: 'Total de Tarefas',
          data: taskReport.categories.map(item => item.count),
          backgroundColor: taskReport.categories.map(item => item.category__color || '#4F46E5'),
          borderColor: taskReport.categories.map(item => item.category__color || '#4F46E5'),
          borderWidth: 1,
        },
        {
          label: 'Tarefas Concluídas',
          data: taskReport.categories.map(item => item.completed),
          backgroundColor: taskReport.categories.map(item => `${item.category__color}88` || '#4F46E588'),
          borderColor: taskReport.categories.map(item => item.category__color || '#4F46E5'),
          borderWidth: 1,
        }
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
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(107, 114, 128, 0.1)'
          }
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
    };
    
    return (
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    );
  };
  
  // Gráfico de tendência de conclusão
  const getCompletionTrendChart = () => {
    if (!taskReport || !taskReport.days || taskReport.days.length === 0) {
      return null;
    }
    
    const data = {
      labels: taskReport.days.map(item => format(new Date(item.date), 'dd/MM')),
      datasets: [
        {
          label: 'Taxa de Conclusão (%)',
          data: taskReport.days.map(item => item.completion_rate || 0),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Total de Tarefas',
          data: taskReport.days.map(item => item.total || 0),
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
  
  // Gráfico de progresso de metas por categoria
  const getGoalProgressChart = () => {
    if (!goalReport || !goalReport.categories || goalReport.categories.length === 0) {
      return null;
    }
    
    const data = {
      labels: goalReport.categories.map(item => item.category__name),
      datasets: [
        {
          label: 'Progresso Médio (%)',
          data: goalReport.categories.map(item => item.avg_progress || 0),
          backgroundColor: goalReport.categories.map(item => item.category__color || '#4F46E5'),
          borderColor: goalReport.categories.map(item => item.category__color || '#4F46E5'),
          borderWidth: 1,
        }
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
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Progresso Médio (%)',
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          ticks: {
            color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
          },
          grid: {
            color: document.documentElement.classList.contains('dark') ? 'rgba(229, 231, 235, 0.1)' : 'rgba(107, 114, 128, 0.1)'
          }
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
    };
    
    return (
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
      </div>
      
      {/* Filtro de data */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Final
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
          
          <div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Filtrar
            </button>
          </div>
          
          <div>
            <button
              type="button"
              onClick={fetchReports}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Atualizar
            </button>
          </div>
        </form>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* Métricas de Tarefas */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-primary-500" />
              Desempenho de Tarefas
            </h2>
            
            {taskReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Tarefas</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{taskReport.total_tasks}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tarefas Concluídas</h3>
                    <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{taskReport.completed_tasks}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Taxa de Conclusão</h3>
                    <p className="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {taskReport.completion_rate ? Math.round(taskReport.completion_rate) : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Status das Tarefas</h3>
                    {getTaskStatusChart() || (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Tarefas por Categoria</h3>
                    {getTaskCategoriesChart() || (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Tendência de Conclusão</h3>
                  {getCompletionTrendChart() || (
                    <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                      Sem dados suficientes
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Métricas de Metas */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-primary-500" />
              Desempenho de Metas
            </h2>
            
            {goalReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Metas</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{goalReport.total_goals}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Metas Concluídas</h3>
                    <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{goalReport.completed_goals}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progresso Médio</h3>
                    <p className="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {goalReport.avg_progress ? Math.round(goalReport.avg_progress) : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Progresso por Categoria</h3>
                    {getGoalProgressChart() || (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Metas por Período</h3>
                    {goalReport.periods && goalReport.periods.length > 0 ? (
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Período</th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Total</th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Concluídas</th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Progresso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                            {goalReport.periods.map((period, index) => (
                              <tr key={index}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                  {period.period === 'weekly' ? 'Semanal' :
                                   period.period === 'monthly' ? 'Mensal' :
                                   period.period === 'quarterly' ? 'Trimestral' :
                                   period.period === 'biannual' ? 'Semestral' :
                                   period.period === 'yearly' ? 'Anual' : period.period}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{period.total}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{period.completed}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                  {Math.round(period.avg_progress || 0)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}