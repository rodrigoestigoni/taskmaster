import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PlusIcon, 
  FlagIcon,
  CheckCircleIcon,
  ClockIcon, 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import EmptyState from '../components/common/EmptyState';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, completed, all
  const [periodFilter, setPeriodFilter] = useState('all'); // all, weekly, monthly, quarterly, biannual, yearly
  
  useEffect(() => {
    fetchGoals();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [goals, filter, periodFilter]);
  
  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await TaskService.getGoals();
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let result = [...goals];
    
    // Aplicar filtro de status
    if (filter === 'active') {
      result = result.filter(goal => !goal.is_completed);
    } else if (filter === 'completed') {
      result = result.filter(goal => goal.is_completed);
    }
    
    // Aplicar filtro de período
    if (periodFilter !== 'all') {
      result = result.filter(goal => goal.period === periodFilter);
    }
    
    setFilteredGoals(result);
  };
  
  const handleDeleteGoal = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await TaskService.deleteGoal(id);
        setGoals(goals.filter(goal => goal.id !== id));
        toast.success('Meta excluída com sucesso!');
      } catch (error) {
        console.error('Error deleting goal:', error);
        toast.error('Erro ao excluir meta');
      }
    }
  };
  
  const handleUpdateProgress = async (id, value) => {
    try {
      await TaskService.updateGoalProgress(id, value);
      
      // Atualizar o estado local
      setGoals(prevGoals => 
        prevGoals.map(goal => 
          goal.id === id 
            ? { 
                ...goal, 
                current_value: value,
                progress_percentage: (value / goal.target_value) * 100,
                is_completed: (value / goal.target_value) * 100 >= 100
              } 
            : goal
        )
      );
      
      toast.success('Progresso atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating goal progress:', error);
      toast.error('Erro ao atualizar progresso');
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };
  
  // Renderiza um card de meta
  const renderGoalCard = (goal) => {
    return (
      <div 
        key={goal.id} 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${
          goal.is_completed ? 'border-l-4 border-green-500 dark:border-green-700' : ''
        }`}
      >
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <span 
                className="inline-block w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: goal.category_color }}
              ></span>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{goal.title}</h3>
            </div>
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {goal.period}
            </span>
          </div>
          
          {goal.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{goal.description}</p>
          )}
          
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <FlagIcon className="h-4 w-4 mr-1" />
              <span>Categoria: {goal.category_name}</span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>
                {goal.days_remaining > 0 
                  ? `${goal.days_remaining} dias restantes` 
                  : 'Prazo atingido'}
              </span>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-between items-center mb-1">
              <div>
                De {formatDate(goal.start_date)} até {formatDate(goal.end_date)}
              </div>
              <div className="font-medium">
                {goal.current_value} / {goal.target_value} ({Math.round(goal.progress_percentage)}%)
              </div>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className={`${
                  goal.is_completed ? 'bg-green-600' : 'bg-primary-600'
                } h-2.5 rounded-full`} 
                style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const newValue = prompt(`Atualizar progresso para "${goal.title}"?`, goal.current_value);
                  if (newValue !== null && !isNaN(newValue) && newValue.trim() !== '') {
                    handleUpdateProgress(goal.id, parseFloat(newValue));
                  }
                }}
                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Atualizar
              </button>
            </div>
            
            <div className="flex space-x-2">
              <Link
                to={`/goal/edit/${goal.id}`}
                className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <PencilIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                onClick={() => handleDeleteGoal(goal.id)}
                className="inline-flex items-center p-1 border border-gray-300 dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* Header com filtros */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
        
        <div className="flex space-x-2">
          <Link
            to="goal/new"
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Nova Meta
          </Link>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="period-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Período
            </label>
            <select
              id="period-filter"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Todos</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="biannual">Semestral</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchGoals}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Atualizar
            </button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState 
          title="Sem metas"
          description={filter === 'all' ? "Você ainda não possui metas. Que tal criar uma?" : "Não há metas correspondentes aos filtros selecionados."}
          buttonText="Criar Meta"
          buttonLink="goal/new"
          icon={<FlagIcon className="h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGoals.map(goal => renderGoalCard(goal))}
        </div>
      )}
    </div>
  );
}