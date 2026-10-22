import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiClient, logoutUserApi, resetLogoutFlag } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = useCallback(async () => {
    try {
        // Tell backend to clear the HttpOnly cookie
        await logoutUserApi(); 
    } catch (e) {
        console.warn("Logout API call failed", e);
    }

    setUser(null);
    sessionStorage.removeItem('user');
    // Clear the Authorization header if it was ever set (cleanup)
    delete apiClient.defaults.headers.common['Authorization'];

  }, []);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        // We no longer check for a token string. 
        // We check if we have user details. The Cookie is hidden in the browser.
        // If the cookie is invalid/expired, the first API call will fail with 401 
        // and the api.js interceptor will call logout().
        const storedUser = sessionStorage.getItem('user');

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to initialize auth state:", error);
        logout();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [logout]); 

  const login = async (credentials) => {
    try {
      resetLogoutFlag();
      const { data } = await apiClient.post('/auth/login', credentials);
      
      // The Backend no longer returns the token in the body (it's in a cookie).
      // It returns the username and authorities.
      const userPayload = {
        username: data.username,
        roles: data.authorities || [] // Backend returns a direct list now
      };

      setUser(userPayload);
      sessionStorage.setItem('user', JSON.stringify(userPayload));
      
      // We do NOT set apiClient headers here anymore.
    } catch (error) {
      console.error("AuthContext login failed:", error);
      logout();
      throw error;
    }
  };

  const value = { isAuthenticated: !!user, user, isInitializing, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};