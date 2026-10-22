import React, { useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom'; 
import { useIdleTimer } from 'react-idle-timer'; // npm install react-idle-timer
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { setupInterceptors } from './services/api';
import './App.css';

const GlobalLoader = () => ( <div className="global-loader" /> );

function App() {
  const { isInitializing, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    setupInterceptors(logout);
  }, [logout]);

  // --- IDLE SESSION TIMEOUT ---
  // Automatically logs out after 1 hour (3,600,000 ms) of inactivity
  useIdleTimer({
    timeout: 1000 * 60 * 60, // 1 hour
    onIdle: () => {
      if (isAuthenticated) {
        // You might want a modal warning first in a real app, 
        // but for strict compliance, immediate logout is safer.
        alert("Session timed out due to inactivity.");
        logout();
      }
    },
    debounce: 500,
    disabled: !isAuthenticated // Only run timer if logged in
  });

  if (!isInitializing) {
    return <GlobalLoader />;
  }

  return (
    
    <div className="app-container">
     
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/search" element={<SearchPage />} />
          {/* Add dashboard or other routes here */}
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/search" />} />
      </Routes>
    </div>
  );
}

export default App;