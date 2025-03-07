import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { format, addDays } from 'date-fns';
import { toast } from 'react-toastify';

import TaskService from '../services/TaskService';
import { useTasks } from '../context/TaskContext';

const GoalForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const { categories, fetchCategories } = useTasks();
  
  // Buscar categorias se ainda não foram carregadas
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
    
    // Se for modo de edição, carregar dados da meta
    if (isEditing) {
      const fetchGoal = async () => {
        try {
          const response = await TaskService.getGoal(id);
          setGoal(response.data);
        } catch (error) {
          console.error('Error fetching goal:', error);
          toast.error('Erro ao carregar meta');
          navigate('/goals');
        } finally {
          setLoading(false);
        }
      };
      
      fetchGoal();
    }
  }, [id, isEditing, fetchCategories, categories.length, navigate]);
  
  // Valores iniciais para o formulário
  const getInitialValues = () => {
    if (isEditing && goal) {
      return {
        title: goal.title || '',
        description: goal.description || '',
        category: goal.category || '',
        period: goal.period || 'monthly',
        start_date: goal.start_date || format(new Date(), 'yyyy-MM-dd'),
        end_date: goal.end_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        target_value: goal.target_value || '',
        current_value: goal.current_value || '0',
        measurement_unit: goal.measurement_unit || 'count',
        custom_unit: goal.custom_unit || '',
      };
    }
    
    // Valores padrão para nova meta
    return {
      title: '',
      description: '',
      category: categories.length > 0 ? categories[0].id : '',
      period: 'monthly',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      target_value: '',
      current_value: '0',
      measurement_unit: 'count',
      custom_unit: '',
    };
  };
  
  // Esquema de validação do formulário
  const validationSchema = Yup.object().shape({
    title: Yup.string().required('O título é obrigatório'),
    category: Yup.number().required('Selecione uma categoria'),
    period: Yup.string().required('Selecione um período'),
    start_date: Yup.date().required('A data de início é obrigatória'),
    end_date: Yup.date()
      .required('A data de término é obrigatória')
      .min(
        Yup.ref('start_date'),
        'Data de término deve ser posterior à data de início'
      ),
    target_value: Yup.number()
      .required('O valor alvo é obrigatório')
      .positive('Deve ser um valor positivo'),
    current_value: Yup.number()
      .min(0, 'Não pode ser negativo'),
    measurement_unit: Yup.string().required('Selecione uma unidade de medida'),
    custom_unit: Yup.string().when('measurement_unit', {
      is: 'custom',
      then: Yup.string().required('Especifique a unidade personalizada'),
    }),
  });
  
  // Submeter o formulário
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Converter campos vazios para null
      const goalData = { ...values };
      Object.keys(goalData).forEach(key => {
        if (goalData[key] === '') {
            goalData[key] = null;
          }
        });
        
        if (isEditing) {
          await TaskService.updateGoal(id, goalData);
          toast.success('Meta atualizada com sucesso!');
        } else {
          await TaskService.createGoal(goalData);
          toast.success('Meta criada com sucesso!');
        }
        
        // Redirecionar para a página de metas
        navigate('/goals');
      } catch (error) {
        console.error('Error saving goal:', error);
        toast.error(
          error.response?.data?.detail || 
          'Erro ao salvar meta. Verifique os dados e tente novamente.'
        );
      } finally {
        setSubmitting(false);
      }
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
          {isEditing ? 'Editar Meta' : 'Nova Meta'}
        </h2>
        
        <Formik
          initialValues={getInitialValues()}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, isSubmitting }) => (
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
                    placeholder="Nome da meta"
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
                  placeholder="Descrição da meta"
                />
              </div>
              
              {/* Período e Datas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Período
                  </label>
                  <Field
                    as="select"
                    id="period"
                    name="period"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="biannual">Semestral</option>
                    <option value="yearly">Anual</option>
                  </Field>
                  <ErrorMessage name="period" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
                
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Início
                  </label>
                  <Field
                    id="start_date"
                    name="start_date"
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  <ErrorMessage name="start_date" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
                
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Término
                  </label>
                  <Field
                    id="end_date"
                    name="end_date"
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                  <ErrorMessage name="end_date" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              {/* Valores e Unidade de Medida */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="target_value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Alvo
                  </label>
                  <Field
                    id="target_value"
                    name="target_value"
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Ex: 30, 500, 10000"
                  />
                  <ErrorMessage name="target_value" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
                
                <div>
                  <label htmlFor="current_value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor Atual
                  </label>
                  <Field
                    id="current_value"
                    name="current_value"
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Ex: 0, 5, 100"
                  />
                  <ErrorMessage name="current_value" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
                
                <div>
                  <label htmlFor="measurement_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unidade de Medida
                  </label>
                  <Field
                    as="select"
                    id="measurement_unit"
                    name="measurement_unit"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  >
                    <option value="count">Contagem</option>
                    <option value="time">Tempo</option>
                    <option value="pages">Páginas</option>
                    <option value="money">Dinheiro</option>
                    <option value="weight">Peso</option>
                    <option value="distance">Distância</option>
                    <option value="volume">Volume</option>
                    <option value="custom">Personalizado</option>
                  </Field>
                  <ErrorMessage name="measurement_unit" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              {/* Unidade Personalizada */}
              {values.measurement_unit === 'custom' && (
                <div>
                  <label htmlFor="custom_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unidade Personalizada
                  </label>
                  <Field
                    id="custom_unit"
                    name="custom_unit"
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Ex: livros, projetos, cursos"
                  />
                  <ErrorMessage name="custom_unit" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              )}
              
              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/goals')}
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
  
  export default GoalForm;