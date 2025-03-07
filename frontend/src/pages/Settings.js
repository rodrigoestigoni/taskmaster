import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { 
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  BellIcon
} from '@heroicons/react/24/outline';

import TaskService from '../services/TaskService';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const { user, updateProfile } = useAuth();
  
  useEffect(() => {
    fetchUserPreferences();
  }, []);
  
  const fetchUserPreferences = async () => {
    setLoading(true);
    try {
      // Simular a resposta da API (em produção seria uma chamada real)
      // const response = await TaskService.getUserPreferences();
      // setPreferences(response.data);
      
      // Configurações simuladas para demonstração
      setPreferences({
        default_view: 'day',
        start_day_of_week: 0, // 0 = Segunda, 6 = Domingo
        wake_up_time: '05:15',
        sleep_time: '22:30',
        work_start_time: '08:00',
        work_end_time: '17:00',
        reminder_before_minutes: 15,
        theme: theme,
      });
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      toast.error('Erro ao carregar preferências');
    } finally {
      setLoading(false);
    }
  };
  
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    toast.success('Tema atualizado!');
  };
  
  // Esquema de validação
  const validationSchema = Yup.object().shape({
    default_view: Yup.string().required('Selecione uma visualização padrão'),
    start_day_of_week: Yup.number().required('Selecione o dia inicial da semana'),
    wake_up_time: Yup.string().nullable(),
    sleep_time: Yup.string().nullable(),
    work_start_time: Yup.string().nullable(),
    work_end_time: Yup.string().nullable(),
    reminder_before_minutes: Yup.number().min(0, 'Deve ser positivo').nullable(),
  });
  
  // Submeter o formulário
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Em produção, seria uma chamada real à API
      // await TaskService.updateUserPreferences(values);
      
      setPreferences(values);
      toast.success('Preferências atualizadas com sucesso!');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Erro ao atualizar preferências');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Submeter atualização de perfil
  const handleProfileUpdate = async (values, { setSubmitting }) => {
    try {
      await updateProfile(values);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
      
      {/* Seção de Tema */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Cog6ToothIcon className="h-5 w-5 mr-2 text-primary-500" />
          Aparência
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
              theme === 'light' 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <SunIcon className="h-8 w-8 text-yellow-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Tema Claro</span>
          </button>
          
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
              theme === 'dark' 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <MoonIcon className="h-8 w-8 text-indigo-500 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Tema Escuro</span>
          </button>
          
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border ${
                theme === 'system' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              <ComputerDesktopIcon className="h-8 w-8 text-blue-500 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Sistema</span>
            </button>
          </div>
        </div>
        
        {/* Preferências do Aplicativo */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Cog6ToothIcon className="h-5 w-5 mr-2 text-primary-500" />
            Preferências do Aplicativo
          </h2>
          
          {preferences && (
            <Formik
              initialValues={preferences}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="default_view" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Visualização Padrão
                      </label>
                      <Field
                        as="select"
                        id="default_view"
                        name="default_view"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="day">Dia</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                      </Field>
                      <ErrorMessage name="default_view" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                    
                    <div>
                      <label htmlFor="start_day_of_week" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Dia de Início da Semana
                      </label>
                      <Field
                        as="select"
                        id="start_day_of_week"
                        name="start_day_of_week"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value={0}>Segunda-feira</option>
                        <option value={6}>Domingo</option>
                      </Field>
                      <ErrorMessage name="start_day_of_week" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="wake_up_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Horário de Despertar
                      </label>
                      <Field
                        id="wake_up_time"
                        name="wake_up_time"
                        type="time"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      <ErrorMessage name="wake_up_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                    
                    <div>
                      <label htmlFor="sleep_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Horário de Dormir
                      </label>
                      <Field
                        id="sleep_time"
                        name="sleep_time"
                        type="time"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      <ErrorMessage name="sleep_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="work_start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Início do Expediente
                      </label>
                      <Field
                        id="work_start_time"
                        name="work_start_time"
                        type="time"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      <ErrorMessage name="work_start_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                    
                    <div>
                      <label htmlFor="work_end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fim do Expediente
                      </label>
                      <Field
                        id="work_end_time"
                        name="work_end_time"
                        type="time"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                      <ErrorMessage name="work_end_time" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="reminder_before_minutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notificar antes da tarefa (minutos)
                    </label>
                    <Field
                      id="reminder_before_minutes"
                      name="reminder_before_minutes"
                      type="number"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Tempo em minutos para enviar uma notificação antes do início da tarefa
                    </div>
                    <ErrorMessage name="reminder_before_minutes" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar Preferências'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>
        
        {/* Configurações de Perfil */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Cog6ToothIcon className="h-5 w-5 mr-2 text-primary-500" />
            Perfil do Usuário
          </h2>
          
          {user && (
            <Formik
              initialValues={{
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                bio: user.bio || '',
              }}
              onSubmit={handleProfileUpdate}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nome
                      </label>
                      <Field
                        id="first_name"
                        name="first_name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sobrenome
                      </label>
                      <Field
                        id="last_name"
                        name="last_name"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      O email não pode ser alterado
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bio
                    </label>
                    <Field
                      as="textarea"
                      id="bio"
                      name="bio"
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Um pouco sobre você"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      {isSubmitting ? 'Salvando...' : 'Atualizar Perfil'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </div>
      </div>
    );
  }