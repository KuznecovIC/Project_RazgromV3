// frontend/src/context/UserContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Поиск токена во всех возможных местах
  const getAuthToken = useCallback(() => {
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access') ||
      localStorage.getItem('token')
    );
  }, []);

  // ✅ Функция пинга присутствия
  const pingPresence = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch('/api/presence/ping/', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      // console.log('📡 Presence ping sent'); // можно закомментировать
    } catch (e) {
      // молча (сетевая ошибка — не критично)
    }
  }, [getAuthToken]);

  // ✅ Загрузка пользователя
  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/me/profile/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data);
        
        // ✅ Сразу после успешной загрузки пользователя — пингуем присутствие
        pingPresence();
      } else if (response.status === 401) {
        // Токен невалидный - очищаем
        localStorage.removeItem('accessToken');
        localStorage.removeItem('access');
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, pingPresence]);

  // ✅ Эффект для пинга присутствия с таймером
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    // ✅ Пинг при монтировании (если уже есть токен)
    pingPresence();

    // ✅ Регулярный пинг каждые 30 секунд (НО НЕ НА СТРАНИЦЕ ПРОФИЛЯ)
    const interval = setInterval(() => {
      // ✅ Проверяем, находимся ли мы на странице профиля
      const isProfilePage = window.location.pathname.startsWith('/profile');
      
      // ✅ Пингуем только если НЕ на странице профиля
      if (!isProfilePage) {
        pingPresence();
      }
    }, 30000);

    // ✅ Пинг при возвращении на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // ✅ При возвращении на вкладку тоже проверяем, не на профиле ли мы
        const isProfilePage = window.location.pathname.startsWith('/profile');
        if (!isProfilePage) {
          pingPresence();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ Очистка при размонтировании
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getAuthToken, pingPresence]);

  // ✅ Загрузка пользователя при монтировании
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateUser = useCallback((newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('access');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const value = {
    user,
    loading,
    updateUser,
    logout,
    fetchUser,
    getAuthToken,
    pingPresence, // 👈 экспортируем, если понадобится вызвать вручную
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;