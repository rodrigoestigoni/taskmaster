import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { format, parse } from 'date-fns';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [goals, setGoals] = useState([]);
  const { categories, fetchCategories } = useTasks();
  
  // Buscar categorias se ainda não foram carregadas
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
    
    // Carregar metas disponíveis
    const fetchGoals = async () => {
      try {
        const response = await TaskService.getGoals();
        // Filtrar apenas metas não concluídas
        const activeGoals = response.data.filter(goal => !goal.is_completed);
        setGoals(activeGoals);
      } catch (error) {
        console.error('Error fetching goals:', error);
        toast.error('Não foi possível carregar as metas');
      }
    };
    
    fetchGoals();
    
    // Se for modo de edição, carregar dados da tarefa
    if (isEditing) {
      const fetchTask = async () => {
        try {
          const response = await TaskService.getTask(id);
          
          // Formatar campos de data e hora para o formulário
          const taskData = {
            ...response.data,
            date: response.data.date,
            start_time: response.data.start_time,
            end_time: response.data.end_time,
          };
          
          setTask(taskData);
        } catch (error) {
          console.error('Error fetching task:', error);
          toast.error('Erro ao carregar tarefa');
          navigate('/day');
        } finally {
          setLoading(false);
        }
      };
      
      fetchTask();
    }
  }, [id, isEditing, fetchCategories, categories.length, navigate]);
  
  // Valores iniciais para o formulário
  const getInitialValues = () => {
    if (isEditing && task) {
      return {
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        date: task.date || format(new Date(), 'yyyy-MM-dd'),
        start_time: task.start_time || '08:00',
        end_time: task.end_time || '09:00',
        priority: task.priority || 2,
        repeat_pattern: task.repeat_pattern || 'none',
        repeat_days: task.repeat_days || '',
        repeat_end_date: task.repeat_end_date || '',
        goal: task.goal || '',
        target_value: task.target_value || '',
        notes: task.notes || '',
      };
    }
    
    // Valores padrão para nova tarefa
    return {
      title: '',
      description: '',
      category: categories.length > 0 ? categories[0].id : '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '09:00',
      priority: 2,
      repeat_pattern: 'none',
      repeat_days: '',
      repeat_end_date: '',
      goal: '',
      target_value: '',
      notes: '',
    };
  };
  
  // Esquema de validação do formulário
  const validationSchema = Yup.object().shape({
    title: Yup.string().required('O título é obrigatório'),
    category: Yup.number().required('Selecione uma categoria'),
    date: Yup.date().required('A data é obrigatória'),
    start_time: Yup.string().required('Hora de início é obrigatória'),
    end_time: Yup.string()
      .required('Hora de término é obrigatória')
      .test(
        'is-after-start',
        'Hora de término deve ser após a hora de início',
        function (value) {
          const { start_time } = this.parent;
          if (!start_time || !value) return true;
          
          // Parse times into Date objects for comparison
          const startDate = parse(start_time, 'HH:mm', new Date());
          const endDate = parse(value, 'HH:mm', new Date());
          
          // Handle tasks that wrap around midnight
          if (endDate < startDate) {
            // If end time is earlier than start time, assume it's for the next day
            // This allows tasks like 23:00 - 01:00
            return true;
          }
          
          return endDate > startDate;
        }
      ),
    priority: Yup.number().required('Selecione uma prioridade'),
    repeat_pattern: Yup.string().required('Selecione um padrão de repetição'),
    repeat_days: Yup.string().when('repeat_pattern', {
      is: 'custom',
      then: () => Yup.string().required('Especifique os dias de repetição'),
    }),
    repeat_end_date: Yup.date().when('repeat_pattern', {
      is: (val) => val !== 'none',
      then: () => Yup.date().min(
        Yup.ref('date'),
        'Data final deve ser posterior à data inicial'
      ),
    }),
    target_value: Yup.number().nullable(),
  });
  
  // Submeter o formulário
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Calcular duração em minutos se não fornecida
      if (!values.duration_minutes) {
        const startTime = parse(values.start_time, 'HH:mm', new Date());
        const endTime = parse(values.end_time, 'HH:mm', new Date());
        
        // Lidar com tarefas que passam da meia-noite
        let durationMinutes;
        if (endTime < startTime) {
          // Adicionar 24 horas ao endTime
          const endTimeNextDay = new Date(endTime);
          endTimeNextDay.setDate(endTimeNextDay.getDate() + 1);
          
          durationMinutes = Math.round((endTimeNextDay - startTime) / (1000 * 60));
        } else {
          durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
        }
        
        values.duration_minutes = durationMinutes;
      }
      
      // Converter campos vazios para null
      const taskData = { ...values };
      Object.keys(taskData).forEach(key => {
        if (taskData[key] === '') {
          taskData[key] = null;
        }
      });
      
      if (isEditing) {
        await TaskService.updateTask(id, taskData);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await TaskService.createTask(taskData);
        toast.success('Tarefa criada com sucesso!');
      }
      
      // Redirecionar para a visualização diária
      navigate('/day');
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error(
        error.response?.data?.detail || 
        'Erro ao salvar tarefa. Verifique os dados e tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };
  
  // Condicional para mostrar campos específicos
  const shouldShowRepeatOptions = (values) => {
    return values.repeat_pattern && values.repeat_pattern !== 'none';
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
        {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
      </h2>
      
      <Formik
        initialValues={getInitialValues()}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, isSubmitting, setFieldValue }) => (
          <Form className="space-y-6">
            {/* Título e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título
                </label>
                <Field
                  id="title"
                  name="title"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Nome da tarefa"
                />
                <ErrorMessage name="title" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria
                </label>
                <Field
                  as="select"
                  id="category"
                  name="category"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="category" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Descrição
              </label>
              <Field
                as="textarea"
                id="description"
                name="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Descrição da tarefa"
              />
            </div>
            
            {/* Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data
                </label>
                <Field
                  id="date"
                  name="date"
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <ErrorMessage name="date" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hora de Início
                </label>
                <Field
                  id="start_time"
                  name="start_time"
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <ErrorMessage name="start_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hora de Término
                </label>
                <Field
                  id="end_time"
                  name="end_time"
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <ErrorMessage name="end_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Prioridade e Padrão de Repetição */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prioridade
                </label>
                <Field
                  as="select"
                  id="priority"
                  name="priority"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value={1}>Baixa</option>
                  <option value={2}>Média</option>
                  <option value={3}>Alta</option>
                  <option value={4}>Urgente</option>
                </Field>
                <ErrorMessage name="priority" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                <label htmlFor="repeat_pattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Repetição
                </label>
                <Field
                  as="select"
                  id="repeat_pattern"
                  name="repeat_pattern"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="none">Não repetir</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekdays">Dias úteis (Seg-Sex)</option>
                  <option value="weekends">Finais de semana</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                  <option value="custom">Personalizado</option>
                </Field>
                <ErrorMessage name="repeat_pattern" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Opções de Repetição Condicionais */}
            {shouldShowRepeatOptions(values) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {values.repeat_pattern === 'custom' && (
                  <div>
                    <label htmlFor="repeat_days" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dias de Repetição
                    </label>
                    <Field
                      id="repeat_days"
                      name="repeat_days"
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Ex: 0,2,4 (0=Seg, 6=Dom)"
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      0 = Segunda, 1 = Terça, 2 = Quarta, ..., 6 = Domingo
                    </div>
                    <ErrorMessage name="repeat_days" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                )}
                
                <div>
                  <label htmlFor="repeat_end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Repetir até
                  </label>
                  <Field
                    id="repeat_end_date"
                    name="repeat_end_date"
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  <ErrorMessage name="repeat_end_date" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>
            )}
            
            {/* Meta Associada e Valor Alvo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta Associada (opcional)
                </label>
                <Field
                  as="select"
                  id="goal"
                  name="goal"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Selecione uma meta (opcional)</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </Field>
              </div>
              
              <div>
                <label htmlFor="target_value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor Alvo (opcional)
                </label>
                <Field
                  id="target_value"
                  name="target_value"
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Ex: 30 para 30 minutos, 5 para 5km, etc."
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Valor planejado para esta tarefa (ex: minutos, páginas, km)
                </div>
                <ErrorMessage name="target_value" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Observações */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações (opcional)
              </label>
              <Field
                as="textarea"
                id="notes"
                name="notes"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Observações adicionais, como treino específico, livro a ser lido, etc."
              />
            </div>
            
            {/* Botões de Ação */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default TaskForm;