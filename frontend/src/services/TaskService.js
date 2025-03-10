import apiClient from './ApiService';

const TaskService = {
  /**
   * Buscar todas as tarefas
   * @returns {Promise} - Promessa com a lista de tarefas
   */
  getTasks: async () => {
    return apiClient.get('/tasks/');
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
  createTask: async (taskData) => {
    return apiClient.post('/tasks/', taskData);
  },
  
  /**
   * Atualizar tarefa existente
   * @param {number} id - ID da tarefa
   * @param {Object} taskData - Dados atualizados da tarefa
   * @returns {Promise} - Promessa com os dados da tarefa atualizada
   */
  updateTask: async (id, taskData) => {
    return apiClient.put(`/tasks/${id}/`, taskData);
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
    
    // Log detalhado
    console.log(`Chamando API para atualizar status: id=${id}, status=${data.status}`, data);
    
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
  }
};

export default TaskService;