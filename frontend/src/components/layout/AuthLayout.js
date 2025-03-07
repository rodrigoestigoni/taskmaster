import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Layout para páginas de autenticação
 * Redireciona para o dashboard se o usuário já estiver autenticado
 */
const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // Enquanto verifica a autenticação, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // Redirecionar para o dashboard se já estiver autenticado
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }
  
  // Renderizar o conteúdo da página de autenticação
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Outlet />
    </div>
  );
};

export default AuthLayout;