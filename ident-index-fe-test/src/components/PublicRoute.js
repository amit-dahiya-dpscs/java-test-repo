import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = () => {
  const { isAuthenticated } = useAuth();

  // If the user IS authenticated, redirect them away from the public page (e.g., login)
  // to the main search page. Otherwise, render the public page.
  return isAuthenticated ? <Navigate to="/search" /> : <Outlet />;
};

export default PublicRoute;