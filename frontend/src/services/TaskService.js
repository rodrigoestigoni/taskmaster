import apiClient from './ApiService';

const TaskService = {
  getEnergyRecommendations: async () => {
    try {
      const response = await apiClient.get('/tasks/energy_recommendations/');
      return response.data;
    } catch (error) {
      // Se o endpoint não estiver implementado ainda, retornar dados simulados
      console.log('Usando dados simulados para recomendações de energia');
      
      // Determinar nível de energia baseado na hora
      const hour = new Date().getHours();
      let currentEnergy = 5;
      
      if (hour >= 8 && hour < 12) currentEnergy = 8;
      else if (hour >= 14 && hour < 18) currentEnergy = 6;
      else if (hour >= 19 || hour < 5) currentEnergy = 3;
      
      // Filtrar tarefas pendentes para hoje
      const today = new Date();
      const todayIsoStr = today.toISOString().split('T')[0];
      
      const todayResponse = await apiClient.get(`/tasks/today/?date=${todayIsoStr}`);
      const pendingTasks = todayResponse.data.filter(t => t.status === 'pending');
      
      // Determinar quais tarefas recomendar baseado no nível de energia
      let energyMatch = 'medium';
      if (currentEnergy >= 8) energyMatch = 'high';
      else if (currentEnergy <= 4) energyMatch = 'low';
      
      // Encontrar tarefas que correspondam ao nível de energia
      let recommended = pendingTasks.filter(t => t.energy_level === energyMatch);
      
      // Se não tivermos tarefas suficientes, incluir outros níveis
      if (recommended.length < 3) {
        // Adicionar algumas de nível médio se o nível for alto ou baixo
        if (energyMatch !== 'medium') {
          recommended = [
            ...recommended,
            ...pendingTasks.filter(t => t.energy_level === 'medium').slice(0, 2)
          ];
        }
        
        // Se ainda for insuficiente, adicionar de qualquer nível
        if (recommended.length < 2) {
          recommended = [
            ...recommended,
            ...pendingTasks.filter(t => !recommended.includes(t)).slice(0, 3 - recommended.length)
          ];
        }
      }
      
      // Limitar a 3 recomendações
      recommended = recommended.slice(0, 3);
      
      return {
        current_energy_level: currentEnergy,
        recommended_tasks: recommended
      };
    }
  },
  
    /**
   * Buscar todas as tarefas
   * @returns {Promise} - Promessa com a lista de tarefas
   */
    getTasks: async () => {
      return apiClient.get('/tasks/');
    },
    countTodayTasks: async () => {
      try {
        // Primeiro obter tarefas do dia
        const today = new Date();
        const todayIsoStr = today.toISOString().split('T')[0];
        const response = await apiClient.get(`/tasks/today/?date=${todayIsoStr}`);
        
        // Contar por status
        const counts = {
          total: response.data.length,
          completed: 0,
          in_progress: 0,
          pending: 0, 
          failed: 0
        };
        
        // Somar status
        response.data.forEach(task => {
          if (task.status) {
            counts[task.status] = (counts[task.status] || 0) + 1;
          }
        });
        
        return counts;
      } catch (error) {
        console.error('Error counting tasks:', error);
        return {
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0,
          failed: 0
        };
      }
    },
    
    /**
     * Buscar tarefas do dia atual
     * @returns {Promise} - Promessa com a lista de tarefas de hoje
     */
    getTodayTasks: async () => {
      return apiClient.get('/tasks/today/');
    },
    
    /**
     * Buscar tarefas da semana atual
     * @returns {Promise} - Promessa com a lista de tarefas da semana
     */
    getWeekTasks: async () => {
      return apiClient.get('/tasks/week/');
    },
    
    /**
     * Buscar tarefas do mês atual
     * @returns {Promise} - Promessa com a lista de tarefas do mês
     */
    getMonthTasks: async () => {
      return apiClient.get('/tasks/month/');
    },
    
    /**
     * Buscar tarefas por data específica
     * @param {string} date - Data no formato YYYY-MM-DD
     * @returns {Promise} - Promessa com a lista de tarefas da data
     */
    getTasksByDate: async (date) => {
      return apiClient.get(`/tasks/today/?date=${date}`);
    },
  
    /**
     * Excluir tarefa recorrente com diferentes modos
     * @param {number} id - ID da tarefa
     * @param {string} mode - Modo de exclusão: 'only_this', 'this_and_future', 'all'
     * @param {string} date - Data da ocorrência (formato YYYY-MM-DD)
     * @returns {Promise} - Promessa com a resposta da exclusão
     */
    deleteRecurringTask: async (id, mode, date = null) => {
      let url = `/tasks/${id}/delete_recurring/?mode=${mode}`;
      if (date && mode !== 'all') {
        url += `&date=${date}`;
      }
      return apiClient.delete(url);
    },
  
    /**
     * Atualizar tarefa recorrente com diferentes modos
     * @param {number} id - ID da tarefa
     * @param {Object} taskData - Dados da tarefa
     * @param {string} mode - Modo de edição: 'only_this', 'this_and_future', 'all'
     * @param {string} date - Data da ocorrência (formato YYYY-MM-DD)
     * @returns {Promise} - Promessa com a resposta da atualização
     */
    updateRecurringTask: async (id, taskData, mode, date = null) => {
      // Implementação frontend simulada
      // No backend real, precisaria criar um endpoint específico
      
      // Adicionar o modo como parâmetro na URL
      let url = `/tasks/${id}/`;
      
      // Adicionar os parâmetros mode e date
      const params = new URLSearchParams();
      params.append('mode', mode);
      if (date && mode !== 'all') {
        params.append('date', date);
      }
      
      url += `?${params.toString()}`;
      
      return apiClient.put(url, taskData);
    },
  
    /**
     * Buscar tarefas da semana com datas específicas
     * @param {string} startDate - Data inicial no formato YYYY-MM-DD
     * @param {string} endDate - Data final no formato YYYY-MM-DD
     * @returns {Promise} - Promessa com a lista de tarefas da semana
     */
    getWeekTasksByDateRange: async (startDate, endDate) => {
      return apiClient.get(`/tasks/week/?start_date=${startDate}&end_date=${endDate}`);
    },
  
    /**
     * Buscar tarefas do mês específico
     * @param {number} year - Ano (ex: 2024)
     * @param {number} month - Mês (1-12)
     * @returns {Promise} - Promessa com a lista de tarefas do mês
     */
    getMonthTasksByYearMonth: async (year, month) => {
      return apiClient.get(`/tasks/month/?year=${year}&month=${month}`);
    },
    
    /**
     * Buscar tarefas por intervalo de datas
     * @param {string} startDate - Data inicial no formato YYYY-MM-DD
     * @param {string} endDate - Data final no formato YYYY-MM-DD
     * @returns {Promise} - Promessa com a lista de tarefas no intervalo
     */
    getTasksByDateRange: async (startDate, endDate) => {
      return apiClient.get(`/tasks/?date__gte=${startDate}&date__lte=${endDate}`);
    },
    
    /**
     * Buscar tarefa por ID
     * @param {number} id - ID da tarefa
     * @returns {Promise} - Promessa com os dados da tarefa
     */
    getTask: async (id) => {
      return apiClient.get(`/tasks/${id}/`);
    },
  
    getTaskOccurrence: async (taskId, date) => {
      return apiClient.get(`/tasks/${taskId}/occurrence/?date=${date}`);
    },
  
    getTasksByGoal: async (goalId) => {
      return apiClient.get(`/goals/${goalId}/related_tasks/`);
    },
    
    /**
     * Criar nova tarefa
     * @param {Object} taskData - Dados da tarefa
     * @returns {Promise} - Promessa com os dados da tarefa criada
     */
    createTask: async (taskData, ignoreOverlap = false) => {
      const url = ignoreOverlap ? '/tasks/?ignore_overlap=true' : '/tasks/';
      return apiClient.post(url, taskData);
    },
    
    /**
     * Atualizar tarefa existente
     * @param {number} id - ID da tarefa
     * @param {Object} taskData - Dados atualizados da tarefa
     * @returns {Promise} - Promessa com os dados da tarefa atualizada
     */
    updateTask: async (id, taskData, ignoreOverlap = false) => {
      const url = ignoreOverlap ? `/tasks/${id}/?ignore_overlap=true` : `/tasks/${id}/`;
      return apiClient.put(url, taskData);
    },
    
    /**
   * Atualizar status de tarefa
   * @param {number} id - ID da tarefa
   * @param {Object} statusData - Dados do status (status, date, actual_value, notes)
   * @returns {Promise} - Promessa com os dados atualizados
   */
  updateTaskStatus: async (id, statusData) => {
    console.log(`TaskService.updateTaskStatus iniciado: id=${id}`, statusData);
    
    // Garantir que temos um objeto statusData válido
    let data = statusData;
    
    // Se o statusData for uma string, converte para objeto
    if (typeof statusData === 'string') {
      console.log('Convertendo string para objeto:', statusData);
      data = { status: statusData };
    }
    // Se não for um objeto, cria um objeto
    else if (!statusData || typeof statusData !== 'object') {
      console.error('Dados de status inválidos:', statusData);
      throw new Error('Dados de status inválidos');
    }
    
    // Verificar se o status está presente
    if (data.status === undefined) {
      console.error('Status não definido nos dados:', data);
      throw new Error('Status não definido nos dados');
    }
    
    // Garantir que actual_value seja um número se estiver presente
    if (data.actual_value !== undefined) {
      // Converter para número se for string
      if (typeof data.actual_value === 'string') {
        data.actual_value = Number(data.actual_value);
        
        // Verificar se é um número válido
        if (isNaN(data.actual_value)) {
          console.error('Valor inválido fornecido:', statusData.actual_value);
          throw new Error('Valor inválido. Por favor, forneça um número.');
        }
      }
    }
    
    // Log detalhado
    console.log(`Chamando API para atualizar status: id=${id}, status=${data.status}, valor=${data.actual_value}`, data);
    
    try {
      // Chamar a API com dados explícitos
      const response = await apiClient.post(`/tasks/${id}/update_status/`, data);
      console.log('API respondeu com sucesso:', response.data);
      return response;
    } catch (error) {
      console.error('Erro na chamada de API updateTaskStatus:', error);
      throw error;
    }
  },
    
    /**
     * Marcar tarefa como concluída
     * @param {number} id - ID da tarefa
     * @param {Object} data - Dados adicionais (valor real, notas)
     * @returns {Promise} - Promessa com os dados atualizados
     */
    completeTask: async (id, data = {}) => {
      return apiClient.post(`/tasks/${id}/complete/`, data);
    },
    
    /**
     * Excluir tarefa
     * @param {number} id - ID da tarefa
     * @returns {Promise} - Promessa com a resposta da exclusão
     */
    deleteTask: async (id) => {
      return apiClient.delete(`/tasks/${id}/`);
    },
    
    /**
     * Buscar categorias
     * @returns {Promise} - Promessa com a lista de categorias
     */
    getCategories: async () => {
      return apiClient.get('/categories/');
    },
    
    /**
     * Buscar metas
     * @returns {Promise} - Promessa com a lista de metas
     */
    getGoals: async () => {
      return apiClient.get('/goals/');
    },
    
    /**
     * Buscar meta por ID
     * @param {number} id - ID da meta
     * @returns {Promise} - Promessa com os dados da meta
     */
    getGoal: async (id) => {
      return apiClient.get(`/goals/${id}/`);
    },
    
    /**
     * Criar nova meta
     * @param {Object} goalData - Dados da meta
     * @returns {Promise} - Promessa com os dados da meta criada
     */
    createGoal: async (goalData) => {
      return apiClient.post('/goals/', goalData);
    },
    
    /**
     * Atualizar meta existente
     * @param {number} id - ID da meta
     * @param {Object} goalData - Dados atualizados da meta
     * @returns {Promise} - Promessa com os dados da meta atualizada
     */
    updateGoal: async (id, goalData) => {
      return apiClient.put(`/goals/${id}/`, goalData);
    },
    
    /**
     * Atualizar progresso da meta
     * @param {number} id - ID da meta
     * @param {number} value - Novo valor atual
     * @returns {Promise} - Promessa com os dados atualizados
     */
    updateGoalProgress: async (id, value) => {
      return apiClient.post(`/goals/${id}/update_progress/`, { value });
    },
    
    /**
     * Excluir meta
     * @param {number} id - ID da meta
     * @returns {Promise} - Promessa com a resposta da exclusão
     */
    deleteGoal: async (id) => {
      return apiClient.delete(`/goals/${id}/`);
    },
    
    /**
     * Obter relatório de tarefas
     * @param {string} startDate - Data inicial opcional
     * @param {string} endDate - Data final opcional
     * @returns {Promise} - Promessa com os dados do relatório
     */
    getTaskReport: async (startDate, endDate) => {
      let url = '/tasks/report/';
      
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      } else if (startDate) {
        url += `?start_date=${startDate}`;
      } else if (endDate) {
        url += `?end_date=${endDate}`;
      }
      
      return apiClient.get(url);
    },
    
    /**
     * Obter relatório de metas
     * @param {string} startDate - Data inicial opcional
     * @param {string} endDate - Data final opcional
     * @returns {Promise} - Promessa com os dados do relatório
     */
    getGoalReport: async (startDate, endDate) => {
      let url = '/goals/report/';
      
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      } else if (startDate) {
        url += `?start_date=${startDate}`;
      } else if (endDate) {
        url += `?end_date=${endDate}`;
      }
      
      return apiClient.get(url);
    },
    
    /**
     * Obter dados do dashboard
     * @returns {Promise} - Promessa com os dados do dashboard
     */
    getDashboard: async () => {
      return apiClient.get('/tasks/dashboard/');
    },
    
    /**
     * Verificar se uma tarefa é recorrente
     * @param {Object} task - Objeto da tarefa
     * @returns {boolean} - Verdadeiro se a tarefa for recorrente
     */
    isRecurringTask: (task) => {
      return task && task.repeat_pattern && task.repeat_pattern !== 'none';
    },
    
    /**
     * Obter recomendações de tarefas com base no nível de energia
     * @returns {Promise} - Promessa com as tarefas recomendadas
     */
    getEnergyRecommendations: async () => {
      return apiClient.get('/tasks/energy_recommendations/');
    }
};

export default TaskService;