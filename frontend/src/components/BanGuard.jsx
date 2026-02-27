// frontend/src/components/BanGuard.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

// Оборачивает всё приложение и НЕ дает забаненному открыть никакие роуты кроме разрешенных
export default function BanGuard({ children }) {
  // UserContext хранит пользователя в `user`, перезагрузка профиля — `fetchUser`
  const { user, fetchUser, loading } = useUser();
  const ban = user?.ban;

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Разрешенные пути для забаненных пользователей
  const allowedWhileBanned = [
    '/banned',      // сама страница бана
    '/appeal',      // страница апелляции (если есть)
    '/login',       // страница входа
    '/register',    // страница регистрации
  ];

  // ✅ при каждом переходе проверяем профиль (чтобы бан прилетал без обновления)
  useEffect(() => {
    if (!user) return;
    if (typeof fetchUser === 'function') fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ✅ Дополнительно: лёгкий polling, чтобы бан прилетал даже без переходов по страницам
  useEffect(() => {
    if (!user) return;
    if (typeof fetchUser !== 'function') return;

    const id = setInterval(() => {
      fetchUser();
    }, 8000); // раз в 8 секунд

    return () => clearInterval(id);
  }, [user, fetchUser]);

  // ✅ жёсткий редирект - теперь разрешаем /banned, /appeal, /login, /register
  useEffect(() => {
    if (ban?.is_banned) {
      const currentPath = location.pathname;
      
      // Проверяем, находится ли текущий путь в списке разрешенных
      const isAllowed = allowedWhileBanned.some(path => 
        currentPath.startsWith(path)
      );
      
      if (!isAllowed) {
        navigate('/banned', { replace: true });
      }
    }
  }, [ban?.is_banned, location.pathname, navigate]);

  // чтобы не мигало содержимое запрещенной страницы
  if (ban?.is_banned) {
    const currentPath = location.pathname;
    const isAllowed = allowedWhileBanned.some(path => 
      currentPath.startsWith(path)
    );
    
    if (!isAllowed) return null;
  }

  // жёстко не показываем контент, пока проверяем профиль (иначе /track/:id успевает отрендериться)
  const hasToken = !!(
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access') ||
    localStorage.getItem('token')
  );
  
  // тоже разрешаем разрешенные пути пока грузится
  if (hasToken && loading) {
    const currentPath = location.pathname;
    const isAllowed = allowedWhileBanned.some(path => 
      currentPath.startsWith(path)
    );
    
    if (!isAllowed) return null;
  }

  return children;
}