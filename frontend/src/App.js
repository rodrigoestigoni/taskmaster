import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Main pages
import Dashboard from './pages/Dashboard';
import DayView from './pages/DayView';
import WeekView from './pages/WeekView';
import MonthView from './pages/MonthView';
import TaskForm from './pages/TaskForm';
import GoalForm from './pages/GoalForm';
import Goals from './pages/Goals';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

// Context
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { ThemeProvider } from './context/ThemeContext';

// Auth guard
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
    return (
      <Router basename="/taskmaster">
        <ThemeProvider>
          <AuthProvider>
            <TaskProvider>
              <ToastContainer position="top-right" autoClose={3000} />
              <Routes>
                {/* Auth routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                
                {/* Protected routes */}
                <Route element={<PrivateRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/day" element={<DayView />} />
                    <Route path="/week" element={<WeekView />} />
                    <Route path="/month" element={<MonthView />} />
                    <Route path="/task/new" element={<TaskForm />} />
                    <Route path="/task/edit/:id" element={<TaskForm />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/goal/new" element={<GoalForm />} />
                    <Route path="/goal/edit/:id" element={<GoalForm />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>
                
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </TaskProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    );
  }

export default App;