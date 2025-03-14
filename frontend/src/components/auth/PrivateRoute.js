import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  console.log('PrivateRoute check:', { isAuthenticated, loading, path: location.pathname });
  
  // Enquanto verifica a autenticação, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // Redirecionar para login se não estiver autenticado
  // Preserva o caminho atual para redirecionamento após login
  if (!isAuthenticated) {
    // Se já estiver na página de login, não redirecione (evita loop)
    if (location.pathname.includes('login')) {
      return <Outlet />;
    }
    return <Navigate to="login" state={{ from: location }} replace />;
  }
  
  // Renderizar o conteúdo da rota protegida
  return <Outlet />;
};

export default PrivateRoute;