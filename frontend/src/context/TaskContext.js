import React, { createContext, useState, useContext, useEffect } from 'react';
import { format } from 'date-fns';
import TaskService from '../services/TaskService';

const TaskContext = createContext();

export const useTasks = () => useContext(TaskContext);

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Funções de carregamento inicial apenas se estiver autenticado
  useEffect(() => {
    // Importar o contexto de autenticação
    const token = localStorage.getItem('accessToken');
    
    // Só carregar os dados se o usuário estiver autenticado
    if (token) {
      fetchCategories();
      fetchTodayTasks();
    }
  }, []);
  
  // Buscar categorias
  const fetchCategories = async () => {
    try {
      const response = await TaskService.getCategories();
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Falha ao carregar categorias.');
    }
  };
  
  // Buscar tarefas do dia
  const fetchTodayTasks = async () => {
    setLoading(true);
    try {
      const response = await TaskService.getTodayTasks();
      setTodayTasks(response.data);
    } catch (err) {
      console.error('Error fetching today tasks:', err);
      setError('Falha ao carregar tarefas de hoje.');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar tarefas por data
  const fetchTasksByDate = async (date) => {
    setLoading(true);
    try {
      const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      const response = await TaskService.getTasksByDate(formattedDate);
      return response.data;
    } catch (err) {
      console.error('Error fetching tasks by date:', err);
      setError('Falha ao carregar tarefas para a data selecionada.');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar tarefas da semana
  const fetchWeekTasks = async (startDate, endDate) => {
    setLoading(true);
    try {
      const formattedStartDate = typeof startDate === 'string' ? startDate : format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = typeof endDate === 'string' ? endDate : format(endDate, 'yyyy-MM-dd');
      const response = await TaskService.getTasksByDateRange(formattedStartDate, formattedEndDate);
      return response.data;
    } catch (err) {
      console.error('Error fetching week tasks:', err);
      setError('Falha ao carregar tarefas da semana.');
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Criar tarefa
  const createTask = async (taskData) => {
    try {
      const response = await TaskService.createTask(taskData);
      return response.data;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  };
  
  // Atualizar tarefa
  const updateTask = async (taskId, taskData) => {
    try {
      const response = await TaskService.updateTask(taskId, taskData);
      return response.data;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };
  
  // Deletar tarefa
  const deleteTask = async (taskId) => {
    try {
      await TaskService.deleteTask(taskId);
      // Atualizar listas locais
      setTasks(tasks.filter(task => task.id !== taskId));
      setTodayTasks(todayTasks.filter(task => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };
  
  // Atualizar status da tarefa
  const updateTaskStatus = async (taskId, status, date, actualValue = null, notes = null) => {
    try {
      const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      
      const data = {
        status,
        date: formattedDate
      };
      
      if (actualValue !== null) {
        data.actual_value = actualValue;
      }
      
      if (notes) {
        data.notes = notes;
      }
      
      const response = await TaskService.updateTaskStatus(taskId, data);
      
      // Make sure we're updating the local state after the API call
      // This ensures the UI reflects the changes immediately
      setTasks(prevTasks => 
        prevTasks.map(task => 
          String(task.id) === String(taskId)
            ? { ...task, status: status } 
            : task
        )
      );
      
      // Also update todayTasks if the updated task is for today
      const today = format(new Date(), 'yyyy-MM-dd');
      if (formattedDate === today) {
        fetchTodayTasks();
      }
      
      return response.data;
    } catch (err) {
      console.error('Error updating task status:', err);
      throw err;
    }
  };
  
  // Valor do contexto
  const value = {
    tasks,
    todayTasks,
    categories,
    loading,
    error,
    fetchCategories,
    fetchTodayTasks,
    fetchTasksByDate,
    fetchWeekTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
  
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};