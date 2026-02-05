const API_BASE = 'http://localhost:8000';

function logoutAndRedirect() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  window.location.href = '/login';
}

export async function apiFetch(path, options = {}) {
  const access = localStorage.getItem('access');

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
  });

  // если токен жив — просто возвращаем ответ
  if (response.status !== 401) {
    return response;
  }

  // === access истёк, пробуем refresh ===
  const refresh = localStorage.getItem('refresh');
  if (!refresh) {
    logoutAndRedirect();
    throw new Error('Нет refresh токена');
  }

  const refreshResponse = await fetch(`${API_BASE}/api/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  if (!refreshResponse.ok) {
    logoutAndRedirect();
    throw new Error('Refresh token истёк');
  }

  const refreshData = await refreshResponse.json();
  localStorage.setItem('access', refreshData.access);

  // === повторяем оригинальный запрос ===
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${refreshData.access}`,
    },
  });
}
