import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#D1D5DB]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2D808E]"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/*" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
};

import { NotificationProvider } from './context/NotificationContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
