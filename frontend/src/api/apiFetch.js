const API_BASE = 'http://localhost:8000';
const REQUEST_TIMEOUT = 10000; // 10 секунд

function logoutAndRedirect() {
  // 🔥 ИСПРАВЛЕНО: удаляем все возможные варианты названий токенов
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  window.location.href = '/login';
}

export async function apiFetch(path, options = {}) {
  // 🔥 ИСПРАВЛЕНО: пробуем найти токен под любым именем
  const access = 
    localStorage.getItem('accessToken') || 
    localStorage.getItem('access') || 
    localStorage.getItem('token');
  
  // ✅ ВАЖНО: если отправляем FormData (файлы/аудио), нельзя принудительно ставить Content-Type.
  // Браузер сам добавит multipart boundary.
  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData;
  
  // Создаем AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    let response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }), // ✅ Условный заголовок
        ...(options.headers || {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    });

    clearTimeout(timeoutId);

    // если токен жив — просто возвращаем ответ
    if (response.status !== 401) {
      return response;
    }

    // === access истёк, пробуем refresh ===
    // 🔥 ИСПРАВЛЕНО: пробуем найти refresh под любым именем
    const refresh = 
      localStorage.getItem('refreshToken') || 
      localStorage.getItem('refresh');
    
    if (!refresh) {
      logoutAndRedirect();
      throw new Error('Нет refresh токена');
    }

    try {
      const refreshController = new AbortController();
      const refreshTimeoutId = setTimeout(() => refreshController.abort(), REQUEST_TIMEOUT);

      const refreshResponse = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: 'POST',
        signal: refreshController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      clearTimeout(refreshTimeoutId);

      if (!refreshResponse.ok) {
        logoutAndRedirect();
        throw new Error('Refresh token истёк');
      }

      const refreshData = await refreshResponse.json();
      // 🔥 СОХРАНЯЕМ В ОБОИХ ФОРМАТАХ ДЛЯ СОВМЕСТИМОСТИ
      localStorage.setItem('access', refreshData.access);
      localStorage.setItem('accessToken', refreshData.access);

      // === повторяем оригинальный запрос с новым токеном ===
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT);

      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...options,
        signal: retryController.signal,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }), // ✅ Условный заголовок и здесь
          ...(options.headers || {}),
          Authorization: `Bearer ${refreshData.access}`,
        },
      });

      clearTimeout(retryTimeoutId);
      return retryResponse;

    } catch (refreshError) {
      if (refreshError.name === 'AbortError') {
        console.error('Таймаут при обновлении токена');
        throw new Error('Таймаут при обновлении токена');
      }
      throw refreshError;
    }

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('Таймаут запроса:', path);
      throw new Error('Таймаут запроса. Сервер не отвечает.');
    }
    
    console.error('Ошибка при выполнении запроса:', error);
    throw error;
  }
}