import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/AuthService';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const email = localStorage.getItem('userEmail');
        
        if (token && email) {
          try {
            // Tentar verificar o token sem fazer uma chamada real
            const isTokenValid = await AuthService.verifyToken();
            
            if (isTokenValid) {
              setUser({ email });
            } else {
              // Tentar renovar o token
              const refreshToken = localStorage.getItem('refreshToken');
              if (refreshToken) {
                try {
                  // Chamar endpoint de refresh
                  const response = await axios.post(`/api/auth/token/refresh/`, {
                    refresh: refreshToken,
                  });
                  
                  // Atualizar token no localStorage
                  localStorage.setItem('accessToken', response.data.access);
                  setUser({ email });
                } catch (refreshError) {
                  // Falha na renovação, limpar tokens
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  localStorage.removeItem('userEmail');
                }
              }
            }
          } catch (error) {
            console.error("Token verification failed:", error);
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await AuthService.login(email, password);
      
      localStorage.setItem('accessToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
      localStorage.setItem('userEmail', email);
      
      setUser({ email });
      return { email };
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Falha na autenticação. Verifique suas credenciais.');
      throw err;
    }
  }
  
  const register = async (userData) => {
    setError(null);
    try {
      const response = await AuthService.register(userData);
      return response;
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.detail || 'Falha no registro. Tente novamente.');
      throw err;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    setUser(null);
  };
  
  const forgotPassword = async (email) => {
    setError(null);
    try {
      return await AuthService.forgotPassword(email);
    } catch (err) {
      console.error('Password reset request failed:', err);
      setError(err.response?.data?.detail || 'Falha ao solicitar redefinição de senha.');
      throw err;
    }
  };
  
  const resetPassword = async (token, newPassword) => {
    setError(null);
    try {
      return await AuthService.resetPassword(token, newPassword);
    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.response?.data?.detail || 'Falha ao redefinir senha.');
      throw err;
    }
  };
  
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};