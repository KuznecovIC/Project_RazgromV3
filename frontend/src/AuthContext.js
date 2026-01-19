// src/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.user && parsed.session?.token) {
          setUser(parsed.user);
          setSessionToken(parsed.session.token);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const value = {
    user,
    sessionToken,
    isLoading,
    isAuthenticated: !!sessionToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// УПРОЩЕННАЯ ВЕРСИЯ без throw error
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || { 
    user: null, 
    sessionToken: null, 
    isLoading: false, 
    isAuthenticated: false 
  };
};