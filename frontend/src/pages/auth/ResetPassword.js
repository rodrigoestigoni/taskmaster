import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Extrair token da URL (normalmente viria como um parâmetro de consulta)
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');
  
  // Valores iniciais do formulário
  const initialValues = {
    password: '',
    password_confirm: '',
  };
  
  // Esquema de validação
  const validationSchema = Yup.object().shape({
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
  });
  
  // Submeter o formulário
  const handleSubmit = async (values, { setSubmitting }) => {
    setGeneralError('');
    
    if (!token) {
      setGeneralError('Token de recuperação inválido ou expirado.');
      setSubmitting(false);
      return;
    }
    
    try {
      await resetPassword(token, values.password);
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (error) {
      console.error('Password reset error:', error);
      setGeneralError(
        error.response?.data?.detail || 
        'Erro ao redefinir senha. O link pode estar expirado ou ser inválido.'
      );
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-extrabold text-primary-600 dark:text-primary-400">TaskMaster</h1>
          <h2 className="mt-2 text-center text-xl font-bold text-gray-900 dark:text-white">Redefinição de senha</h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 dark:bg-red-900 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Link inválido</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      O link de redefinição de senha é inválido ou expirou. Por favor, solicite um novo link.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link to="forgot-password" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                Solicitar novo link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-primary-600 dark:text-primary-400">TaskMaster</h1>
        <h2 className="mt-2 text-center text-xl font-bold text-gray-900 dark:text-white">Redefinição de senha</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="space-y-6">
              <div className="rounded-md bg-green-50 dark:bg-green-900 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400 dark:text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Senha redefinida</h3>
                    <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                      <p>
                        Sua senha foi redefinida com sucesso. Agora você pode fazer login com sua nova senha.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Link to="login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                  Ir para a página de login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {generalError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700 dark:text-red-200">{generalError}</p>
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
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nova senha
                      </label>
                      <div className="mt-1">
                        <Field
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                          placeholder="••••••••"
                        />
                        <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirmar nova senha
                      </label>
                      <div className="mt-1">
                        <Field
                          id="password_confirm"
                          name="password_confirm"
                          type="password"
                          autoComplete="new-password"
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                          placeholder="••••••••"
                        />
                        <ErrorMessage name="password_confirm" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;