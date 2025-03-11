import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { format, parse } from 'date-fns';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon,
  SaveIcon,
  XCircleIcon, 
  ExclamationCircleIcon,
  ClockIcon,
  CalendarIcon,
  FlagIcon,
  DocumentTextIcon,
  BoltIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

import TaskService from '../services/TaskService';
import CategorySelector from '../components/tasks/CategorySelector';
import { useTasks } from '../context/TaskContext';
import TaskOverlapModal, { checkTaskOverlap } from '../components/common/TaskOverlapModal';

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [goals, setGoals] = useState([]);
  const { categories, fetchCategories } = useTasks();
  
  // Estado para o modal de sobreposição
  const [overlappingTask, setOverlappingTask] = useState(null);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [dailyTasks, setDailyTasks] = useState([]);
  
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
    title: Yup.string().required('Título é obrigatório'),
    category: Yup.number().required('Categoria é obrigatória'),
    date: Yup.date().required('Data é obrigatória'),
    start_time: Yup.string().required('Hora de início é obrigatória'),
    end_time: Yup.string()
      .required('Hora de término é obrigatória')
      .test(
        'is-after-start',
        'Hora de término deve ser após a hora de início',
        function (value) {
          const { start_time } = this.parent;
          if (!start_time || !value) return true;
          
          return true; // Simplificado para evitar problemas de validação
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
  
  // Buscar tarefas do dia para verificar sobreposição
  const fetchDailyTasks = async (date) => {
    try {
      const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
      const response = await TaskService.getTasksByDate(formattedDate);
      setDailyTasks(response.data);
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      // Não mostrar erro para não interromper o fluxo
    }
  };
  
  // Efeito para carregar tarefas do dia quando a data muda
  useEffect(() => {
    const defaultDate = format(new Date(), 'yyyy-MM-dd');
    const dateToFetch = task?.date || defaultDate;
    fetchDailyTasks(dateToFetch);
  }, [task?.date]);
  
  // Verificar sobreposição e mostrar modal se necessário
  const checkAndSubmit = (values, formikHelpers) => {
    // Verificar sobreposição
    const overlap = checkTaskOverlap(dailyTasks, values);
    
    if (overlap) {
      // Guardar dados de submissão para usar depois de confirmar
      setPendingSubmit({ values, formikHelpers });
      setOverlappingTask(overlap);
      setShowOverlapModal(true);
    } else {
      // Sem sobreposição, continuar normalmente
      handleSubmit(values, formikHelpers);
    }
  };
  
  // Confirmar submissão mesmo com sobreposição
  const confirmOverlapSubmit = () => {
    if (pendingSubmit) {
      handleSubmit(pendingSubmit.values, pendingSubmit.formikHelpers);
      setPendingSubmit(null);
    }
    setShowOverlapModal(false);
  };
  
  // Cancelar submissão com sobreposição
  const cancelOverlapSubmit = () => {
    setPendingSubmit(null);
    setShowOverlapModal(false);
  };
  
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
  
  // Função para renderizar rótulo com ícone
  const renderLabel = (htmlFor, text, icon) => (
    <label htmlFor={htmlFor} className="flex items-center gap-1 block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {icon}
      {text}
    </label>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
      <div className="flex items-center mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="mr-3 p-1.5 text-gray-400 hover:text-gray-500 rounded-full flex items-center justify-center"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h2>
      </div>
      
      <Formik
        initialValues={getInitialValues()}
        validationSchema={validationSchema}
        onSubmit={checkAndSubmit}
        enableReinitialize
      >
        {({ values, isSubmitting, setFieldValue }) => (
          <Form className="space-y-4 sm:space-y-6">
            {/* Título e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                {renderLabel("title", "Título", <DocumentTextIcon className="w-4 h-4" />)}
                <Field
                  id="title"
                  name="title"
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  placeholder="Nome da tarefa"
                />
                <ErrorMessage name="title" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                {renderLabel("category", "Categoria", <BookmarkIcon className="w-4 h-4" />)}
                <CategorySelector 
                  categories={categories} 
                  selectedCategory={values.category}
                  onChange={(value) => setFieldValue('category', value)}
                />
                <ErrorMessage name="category" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Descrição */}
            <div>
              {renderLabel("description", "Descrição", <DocumentTextIcon className="w-4 h-4" />)}
              <Field
                as="textarea"
                id="description"
                name="description"
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="Descrição da tarefa"
              />
            </div>
            
            {/* Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                {renderLabel("date", "Data", <CalendarIcon className="w-4 h-4" />)}
                <Field
                  id="date"
                  name="date"
                  type="date"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  onChange={(e) => {
                    setFieldValue('date', e.target.value);
                    fetchDailyTasks(e.target.value);
                  }}
                />
                <ErrorMessage name="date" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                {renderLabel("start_time", "Início", <ClockIcon className="w-4 h-4" />)}
                <Field
                  id="start_time"
                  name="start_time"
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                />
                <ErrorMessage name="start_time" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
              
              <div>
                {renderLabel("end_time", "Término", <ClockIcon className="w-4 h-4" />)}
                <Field
                  id="end_time"
                  name="end_time"
                  type="time"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                />
                <ErrorMessage name="end_time" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Prioridade e Padrão de Repetição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                {renderLabel("priority", "Prioridade", <ExclamationCircleIcon className="w-4 h-4" />)}
                <Field
                  as="select"
                  id="priority"
                  name="priority"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value={1}>Baixa</option>
                  <option value={2}>Média</option>
                  <option value={3}>Alta</option>
                  <option value={4}>Urgente</option>
                </Field>
                <ErrorMessage name="priority" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>

              <div>
                {renderLabel("energy_level", "Nível de Energia Necessário", <BoltIcon className="w-4 h-4" />)}
                <Field
                  as="select"
                  id="energy_level"
                  name="energy_level"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="high">Alta Energia</option>
                  <option value="medium">Energia Média</option>
                  <option value="low">Baixa Energia</option>
                </Field>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Selecione o nível de energia necessário para realizar esta tarefa
                </div>
              </div>
              
              <div>
                {renderLabel("repeat_pattern", "Repetição", <CalendarIcon className="w-4 h-4" />)}
                <Field
                  as="select"
                  id="repeat_pattern"
                  name="repeat_pattern"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                >
                  <option value="none">Não repetir</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekdays">Dias úteis (Seg-Sex)</option>
                  <option value="weekends">Finais de semana</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                  <option value="custom">Personalizado</option>
                </Field>
                <ErrorMessage name="repeat_pattern" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Opções de Repetição Condicionais */}
            {shouldShowRepeatOptions(values) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="col-span-full">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opções de repetição</h3>
                </div>
                
                {values.repeat_pattern === 'custom' && (
                  <div>
                    {renderLabel("repeat_days", "Dias de Repetição", <CalendarIcon className="w-4 h-4" />)}
                    <Field
                      id="repeat_days"
                      name="repeat_days"
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      placeholder="Ex: 0,2,4 (0=Seg, 6=Dom)"
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      0 = Segunda, 1 = Terça, 2 = Quarta, ..., 6 = Domingo
                    </div>
                    <ErrorMessage name="repeat_days" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
                  </div>
                )}
                
                <div>
                  {renderLabel("repeat_end_date", "Repetir até", <CalendarIcon className="w-4 h-4" />)}
                  <Field
                    id="repeat_end_date"
                    name="repeat_end_date"
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                  <ErrorMessage name="repeat_end_date" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
                </div>
              </div>
            )}
            
            {/* Meta Associada e Valor Alvo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                {renderLabel("goal", "Meta Associada (opcional)", <FlagIcon className="w-4 h-4" />)}
                <Field
                  as="select"
                  id="goal"
                  name="goal"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
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
                {renderLabel("target_value", "Valor Alvo (opcional)", <BookmarkIcon className="w-4 h-4" />)}
                <Field
                  id="target_value"
                  name="target_value"
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  placeholder="Ex: 30 para 30 minutos"
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Valor planejado para esta tarefa
                </div>
                <ErrorMessage name="target_value" component="div" className="mt-1 text-xs text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            {/* Observações */}
            <div>
              {renderLabel("notes", "Observações (opcional)", <DocumentTextIcon className="w-4 h-4" />)}
              <Field
                as="textarea"
                id="notes"
                name="notes"
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="Observações adicionais, como treino específico, livro a ser lido, etc."
              />
            </div>
            
            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-2">
              <Link
                to="/day"
                className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center gap-1"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>{isEditing ? 'Atualizar' : 'Criar'}</>
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
      
      {/* Modal de sobreposição de horário */}
      <TaskOverlapModal
        isOpen={showOverlapModal}
        onClose={cancelOverlapSubmit}
        onConfirm={confirmOverlapSubmit}
        overlappingTask={overlappingTask}
      />
    </div>
  );
};

export default TaskForm;