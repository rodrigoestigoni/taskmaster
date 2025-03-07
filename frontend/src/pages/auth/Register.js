import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [generalError, setGeneralError] = useState('');
  
  // Valores iniciais do formulário
  const initialValues = {
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    agree_terms: false,
  };
  
  // Esquema de validação
  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, 'Nome de usuário deve ter pelo menos 3 caracteres')
      .max(30, 'Nome de usuário deve ter no máximo 30 caracteres')
      .required('Nome de usuário é obrigatório'),
    email: Yup.string()
      .email('Email inválido')
      .required('Email é obrigatório'),
    password: Yup.string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
      )
      .required('Senha é obrigatória'),
    password_confirm: Yup.string()
      .oneOf([Yup.ref('password'), null], 'As senhas devem coincidir')
      .required('Confirmação de senha é obrigatória'),
    first_name: Yup.string()
      .max(30, 'Nome deve ter no máximo 30 caracteres'),
    last_name: Yup.string()
      .max(30, 'Sobrenome deve ter no máximo 30 caracteres'),
    agree_terms: Yup.boolean()
      .oneOf([true], 'Você deve concordar com os termos')
      .required('Você deve concordar com os termos'),
  });
  
  // Submeter o formulário
  const handleSubmit = async (values, { setSubmitting }) => {
    setGeneralError('');
    
    try {
      await register(values);
      toast.success('Registro realizado com sucesso! Por favor, faça login.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Extrair mensagens de erro da API
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = [];
          
          // Iterar sobre os campos com erro
          Object.keys(errorData).forEach(key => {
            const messages = errorData[key];
            if (Array.isArray(messages)) {
              errorMessages.push(`${key}: ${messages.join(' ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${key}: ${messages}`);
            }
          });
          
          if (errorMessages.length > 0) {
            setGeneralError(errorMessages.join('\n'));
          } else {
            setGeneralError('Erro ao realizar registro. Verifique seus dados e tente novamente.');
          }
        } else {
          setGeneralError(
            typeof errorData === 'string' 
              ? errorData 
              : 'Erro ao realizar registro. Verifique seus dados e tente novamente.'
          );
        }
      } else {
        setGeneralError('Erro ao realizar registro. Verifique seus dados e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-primary-600 dark:text-primary-400">TaskMaster</h1>
        <h2 className="mt-2 text-center text-xl font-bold text-gray-900 dark:text-white">Crie sua conta</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Ou{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            faça login se já possui uma conta
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {generalError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200 whitespace-pre-line">{generalError}</p>
                </div>
              </div>
            </div>
          )}
          
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome
                    </label>
                    <div className="mt-1">
                      <Field
                        id="first_name"
                        name="first_name"
                        type="text"
                        autoComplete="given-name"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                      />
                      <ErrorMessage name="first_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sobrenome
                    </label>
                    <div className="mt-1">
                      <Field
                        id="last_name"
                        name="last_name"
                        type="text"
                        autoComplete="family-name"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                      />
                      <ErrorMessage name="last_name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome de usuário
                  </label>
                  <div className="mt-1">
                    <Field
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                    />
                    <ErrorMessage name="username" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <div className="mt-1">
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                    />
                    <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                  </label>
                  <div className="mt-1">
                    <Field
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                    />
                    <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmar senha
                  </label>
                  <div className="mt-1">
                    <Field
                      id="password_confirm"
                      name="password_confirm"
                      type="password"
                      autoComplete="new-password"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                    />
                    <ErrorMessage name="password_confirm" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div className="flex items-center">
                  <Field
                    id="agree_terms"
                    name="agree_terms"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 rounded"
                  />
                  <label htmlFor="agree_terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Concordo com os <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">termos de serviço</a> e <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">política de privacidade</a>
                  </label>
                </div>
                <ErrorMessage name="agree_terms" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {isSubmitting ? 'Registrando...' : 'Criar conta'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default Register;