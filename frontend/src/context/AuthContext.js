import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthService from '../services/AuthService';

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
        
        if (token) {
          const userData = await AuthService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
      
      localStorage.setItem('accessToken', response.data.access || response.data.token);
      localStorage.setItem('refreshToken', response.data.refresh || response.data.refresh_token);
      
      const userData = await AuthService.getCurrentUser();
      setUser(userData);
      return userData;
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
  
  const updateProfile = async (userData) => {
    setError(null);
    try {
      const updatedUser = await AuthService.updateProfile(userData);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Profile update failed:', err);
      setError(err.response?.data?.detail || 'Falha ao atualizar perfil.');
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
    updateProfile,
    isAuthenticated: !!user,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};