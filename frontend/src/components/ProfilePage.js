import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GridScan from '../GridScan';
import Shuffle from '../components/Shuffle';
import GooeyNav from '../components/GooeyNav';
import FloatingLinesDropdown from '../components/FloatingLinesDropdown';
import Sidebar from '../components/Sidebar';
import GlassMusicPlayer from '../components/GlassMusicPlayer';
import logoMark from '../logo1.ico';
import './ProfilePage.css';

// Иконки (без изменений)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconProfile = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path
      d="M4.5 21c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"
    />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 18h12l-1.3-2.2a6.8 6.8 0 0 1-.9-3.4V11a4.8 4.8 0 0 0-9.6 0v1.4a6.8 6.8 0 0 1-.9 3.4Z"
      stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const IconMessage = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8A2.5 2.5 0 0 1 18.5 17H7l-4 3V6.5Z"
      stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round"
    />
    <path d="m6 8 6 4 6-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

const IconDots = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41zM19 3a2 2 0 012 2v4h-2V5H5v14h14v-4h2v4a2 2 0 01-2 2H5a2 2 0 01-2-2h14z"
      fill="currentColor"
    />
  </svg>
);

const IconUserCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
  </svg>
);

const IconHeart = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'fill 0.2s ease' }}>
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? "#8456ff" : "currentColor"}
      stroke={filled ? "#8456ff" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

// 🔥 Вспомогательная функция для осветления цвета
const brightenColor = (hex, factor) => {
  try {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
    const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
    const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  } catch (error) {
    return hex;
  }
};

// 🔥 Функция извлечения доминантного цвета
const extractDominantColor = async (imageUrl) => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    
    await loadPromise;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(img.width, 200);
    canvas.height = Math.min(img.height, 200);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorMap = new Map();
    
    // Анализ цветов с пропуском слишком светлых/тёмных
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Пропускаем слишком светлые (блики) и слишком тёмные (тени)
      if ((r > 230 && g > 230 && b > 230) || (r < 30 && g < 30 && b < 30)) {
        continue;
      }
      
      // Квантование для группировки похожих цветов
      const quantized = `${Math.floor(r / 16) * 16},${Math.floor(g / 16) * 16},${Math.floor(b / 16) * 16}`;
      
      if (colorMap.has(quantized)) {
        colorMap.set(quantized, colorMap.get(quantized) + 1);
      } else {
        colorMap.set(quantized, 1);
      }
    }
    
    // Находим самый частый цвет
    let maxCount = 0;
    let dominantColor = '#003196';
    
    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = color.split(',').map(Number);
        dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Создаем акцентный цвет (осветлённый доминантный)
    const accentColor = brightenColor(dominantColor, 0.3);
    
    return {
      dominant: dominantColor,
      accent: accentColor
    };
    
  } catch (error) {
    console.error('Ошибка извлечения цвета:', error);
    return {
      dominant: '#003196',
      accent: '#8456ff'
    };
  }
};

// 🔥 API функции
const getAuthToken = () => {
  return localStorage.getItem('access');
};

const api = {
  get: async (url) => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // ✅ КРИТИЧНОЕ ИСПРАВЛЕНИЕ: Для публичных профилей токен НЕ нужен!
    // Токен нужен только для /users/me/ и других защищенных эндпоинтов
    if (token && url !== '/users/me/') {
      // Добавляем токен только если он есть и это не публичный профиль
      // (но на самом деле публичные профили работают и без токена)
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log(`🌐 API GET: ${url}`, { hasToken: !!token });
    
    const response = await fetch(`http://localhost:8000/api${url}`, {
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  post: async (url, formData) => {
    const token = getAuthToken();
    if (!token) throw new Error('Требуется авторизация');
    
    const response = await fetch(`http://localhost:8000/api${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response.json();
  },
  
  patch: async (url, formData) => {
    const token = getAuthToken();
    if (!token) throw new Error('Требуется авторизация');
    
    const response = await fetch(`http://localhost:8000/api${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    
    return response.json();
  },
  
  delete: async (url) => {
    const token = getAuthToken();
    if (!token) throw new Error('Требуется авторизация');
    
    const response = await fetch(`http://localhost:8000/api${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  }
};

const ProfilePage = ({ 
  user: currentUserProp,
  onLogout,
  currentTrack,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  onNext,
  onPrevious,
  loopEnabled,
  onToggleLoop,
  onToggleLike,
  likedTracks,
  checkTrackLiked,
  trackData,
  updateUser
}) => {
  const navigate = useNavigate();
  const { id } = useParams(); // ✅ Получаем ID из URL
  
  console.log('👤 ProfilePage render:', { 
    userIdFromParams: id,
    currentUserId: currentUserProp?.id,
    isMyProfile: !id || (currentUserProp && id.toString() === currentUserProp.id?.toString())
  });
  
  // Состояния
  const [user, setUser] = useState(null);
  const [gridScanColors, setGridScanColors] = useState({
    gridBgColor: '#0b1020',
    linesColor: '#003196',
    scanColor: '#8456ff'
  });
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [extractingColor, setExtractingColor] = useState(false);
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(null);

  // 🔴 СОСТОЯНИЯ ДЛЯ FOLLOW СИСТЕМЫ (синхронизировано с TrackPage)
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // 🔴 ОТДЕЛЬНОЕ СОСТОЯНИЕ ДЛЯ МОИХ FOLLOW STATS (чтобы не зависеть от currentUserProp)
  const [myFollowStats, setMyFollowStats] = useState({
    followers: 0,
    following: 0
  });
  
  const userMenuRef = useRef(null);
  const headerFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);
  
  // ✅ ОПРЕДЕЛЯЕМ, ЧЕЙ ПРОФИЛЬ
  const profileUserId = useMemo(() => {
    return id || currentUserProp?.id;
  }, [id, currentUserProp?.id]);
  
  // ✅ ОПРЕДЕЛЯЕМ, ЭТО МОЙ ПРОФИЛЬ ИЛИ НЕТ
  useEffect(() => {
    const check = () => {
      if (!id) {
        setIsMyProfile(true);
        return;
      }
      
      if (!currentUserProp) {
        setIsMyProfile(false);
        return;
      }
      
      const isSameUser = id.toString() === currentUserProp.id?.toString();
      setIsMyProfile(isSameUser);
    };
    
    check();
  }, [id, currentUserProp]);

  // ✅ ОТДЕЛЬНАЯ ЗАГРУЗКА FOLLOW-STATS ДЛЯ СВОЕГО ПРОФИЛЯ
  useEffect(() => {
    // Работаем только для своего профиля и если знаем свой ID
    if (!isMyProfile || !profileUserId) return;

    const loadMyFollowStats = async () => {
      try {
        const statsResponse = await api.get(`/users/${profileUserId}/follow-stats/`);
        const stats = statsResponse?.stats || {};
        const followers = Number(stats.followers ?? 0);
        const following = Number(stats.following ?? 0);

        setMyFollowStats({ followers, following });
        console.log('✅ [MY FOLLOW STATS] Загружены данные:', { followers, following });
      } catch (error) {
        console.error('❌ [MY FOLLOW STATS] Ошибка загрузки:', error);
      }
    };

    loadMyFollowStats();
  }, [isMyProfile, profileUserId]);

  // 🔴 ФУНКЦИЯ ДЛЯ ПРОВЕРКИ СТАТУСА FOLLOW
  const checkFollowStatus = useCallback(async (targetUserId) => {
    const authToken = getAuthToken();
    if (!authToken) return false;

    try {
      const data = await api.get(`/users/${targetUserId}/check-follow/`);
      return data?.is_following || false;
    } catch (error) {
      console.error('❌ Ошибка проверки статуса подписки:', error);
      return false;
    }
  }, []);

  // 🔴 ФУНКЦИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ FOLLOW
  const handleFollowToggle = useCallback(async () => {
    const authToken = getAuthToken();

    if (!authToken) {
      alert('Войдите в систему, чтобы подписываться на пользователей');
      return;
    }

    if (followLoading) return;

    const targetUserId = user?.id || currentUserProp?.id;
    if (!targetUserId) return;
    if (isMyProfile) return;

    setFollowLoading(true);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:8000/api/users/${targetUserId}/follow/`, {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (response.ok) {
        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState);

        // 🔴 ОБНОВЛЯЕМ КОЛИЧЕСТВО ПОДПИСЧИКОВ В РЕАЛЬНОМ ВРЕМЕНИ
        setUser(prev => {
          if (!prev) return prev;
          const currentFollowers =
            parseInt(prev.followers_count ?? prev.followers ?? prev.followersCount ?? 0, 10) || 0;
          const newCount = isFollowing ? Math.max(0, currentFollowers - 1) : currentFollowers + 1;
          return {
            ...prev,
            followers_count: newCount,
            followers: newCount
          };
        });

        // 🔴 ДИСПАТЧИМ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ В ДРУГИХ КОМПОНЕНТАХ
        // ✅ Получаем ID текущего пользователя (кто подписывается)
        let currentUserId = currentUserProp?.id || null;
        if (!currentUserId) {
          try {
            const userData = localStorage.getItem('user');
            if (userData) {
              const parsed = JSON.parse(userData);
              currentUserId = parsed?.id || null;
            }
          } catch (e) {
            console.warn('Не удалось получить currentUserId из localStorage');
          }
        }
        
        // ✅ Если все еще не получили ID, пытаемся через API
        if (!currentUserId && authToken) {
          try {
            const meResponse = await fetch('http://localhost:8000/api/users/me/', {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            if (meResponse.ok) {
              const meData = await meResponse.json();
              currentUserId = meData?.user?.id || meData?.id || null;
            }
          } catch (e) {
            console.warn('Не удалось получить currentUserId через API');
          }
        }
        
        console.log('📤 Отправляю событие followStatusChanged:', {
          targetUserId,
          currentUserId,
          isFollowing: newFollowingState
        });
        
        window.dispatchEvent(new CustomEvent('followStatusChanged', {
          detail: {
            targetUserId,
            currentUserId, // ✅ КТО подписался
            isFollowing: newFollowingState,
            timestamp: Date.now()
          }
        }));
        
        // ✅ ДОПОЛНИТЕЛЬНО: Всегда обновляем данные текущего пользователя после подписки
        // Это гарантирует обновление счетчика Following в его профиле
        if (currentUserId) {
          console.log('🔄 [ПОДПИСКА] Обновляю данные текущего пользователя после подписки, currentUserId:', currentUserId);
          setTimeout(async () => {
            try {
              const followStatsResponse = await api.get(`/users/${currentUserId}/follow-stats/`);
              console.log('📡 [ПОДПИСКА] Ответ от follow-stats:', followStatsResponse);
              const stats = followStatsResponse?.stats || {};
              const actualFollowing = Number(stats.following ?? 0);
              const actualFollowers = Number(stats.followers ?? 0);
              
              console.log('📊 [ПОДПИСКА] Актуальная статистика текущего пользователя:', { 
                actualFollowing, 
                actualFollowers,
                currentUserId,
                profileUserId,
                isMyProfile,
                id
              });
              
              // ✅ Обновляем состояние user если это профиль текущего пользователя
              const isCurrentUserProfile = !id || String(id) === String(currentUserId);
              console.log('🔍 [ПОДПИСКА] Это профиль текущего пользователя?', isCurrentUserProfile);
              
              if (isCurrentUserProfile) {
                console.log('✅ [ПОДПИСКА] Обновляю состояние user');
                setUser(prev => {
                  if (!prev) {
                    console.warn('⚠️ [ПОДПИСКА] prev user is null');
                    return prev;
                  }
                  const updated = {
                    ...prev,
                    following_count: actualFollowing,
                    following: actualFollowing,
                    followers_count: actualFollowers,
                    followers: actualFollowers
                  };
                  console.log('🔄 [ПОДПИСКА] Обновленное состояние user:', updated);
                  return updated;
                });
              } else {
                console.log('⏭️ [ПОДПИСКА] Это не профиль текущего пользователя, обновляю только через updateUser');
              }
              
              // ✅ Всегда обновляем currentUserProp если есть функция updateUser
              if (updateUser && typeof updateUser === 'function') {
                const currentUserData = currentUserProp || user;
                if (currentUserData) {
                  const updatedUserData = {
                    ...currentUserData,
                    following_count: actualFollowing,
                    following: actualFollowing,
                    followers_count: actualFollowers,
                    followers: actualFollowers
                  };
                  console.log('🔄 [ПОДПИСКА] Обновляю currentUserProp через updateUser:', updatedUserData);
                  updateUser(updatedUserData);
                } else {
                  console.warn('⚠️ [ПОДПИСКА] currentUserData is null, не могу обновить через updateUser');
                }
              } else {
                console.warn('⚠️ [ПОДПИСКА] updateUser функция не доступна');
              }
            } catch (error) {
              console.error('❌ [ПОДПИСКА] Не удалось обновить данные после подписки:', error);
            }
          }, 300);
        } else {
          console.warn('⚠️ [ПОДПИСКА] currentUserId не определен, не могу обновить данные');
        }
      } else {
        alert(data?.error || 'Ошибка при изменении подписки');
        console.error('❌ Ошибка API подписки:', data?.error);
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка подписки:', error);
      alert('Сетевая ошибка при изменении подписки');
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowing, isMyProfile, user?.id, currentUserProp?.id]);
  
  // 🔥 Оптимизированная конфигурация GridScan
  const gridScanConfig = useMemo(() => ({
    gridBgColor: gridScanColors.gridBgColor,
    linesColor: gridScanColors.linesColor,
    scanColor: gridScanColors.scanColor,
    gridBgOpacity: 0.55,
    scanOpacity: 0.6,
    gridScale: 0.12,
    scanGlow: 1.2,
    bloomIntensity: 0.5
  }), [gridScanColors.gridBgColor, gridScanColors.linesColor, gridScanColors.scanColor]);
  
  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ИЗОБРАЖЕНИЙ
  const getImageUrl = useCallback((imageValue) => {
    if (!imageValue || 
        imageValue === 'null' || 
        imageValue === 'undefined' ||
        imageValue.trim() === '') {
      return null;
    }
    
    // Если это относительный путь, добавляем базовый URL
    if (imageValue.startsWith('/') && !imageValue.startsWith('//')) {
      return `http://localhost:8000${imageValue}`;
    }
    
    return imageValue;
  }, []);
  
  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ HEADER IMAGE
  const getHeaderImageUrl = useCallback(() => {
    if (!user) return null;
    
    // 🔥 ВАЖНО: Проверяем ВСЕ возможные названия полей
    const headerValue = 
      user.header_image ||      // Публичный профиль (новый формат)
      user.header_image_url ||  // Свой профиль (старый формат)
      user.header ||            // Резервное поле
      null;
    
    return getImageUrl(headerValue);
  }, [user, getImageUrl]);
  
  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ АВАТАРА
  const getAvatarUrl = useCallback(() => {
    if (!user) return null;
    
    // 🔥 ВАЖНО: Проверяем ВСЕ возможные названия полей
    const avatarValue = 
      user.avatar ||            // Основное поле (все профили)
      user.avatar_url ||        // Резервное поле
      user.profile_image ||     // Дополнительное поле
      null;
    
    return getImageUrl(avatarValue);
  }, [user, getImageUrl]);
  
  // 🔥 Мемоизированные URL изображений
  const headerImageUrl = useMemo(() => getHeaderImageUrl(), [getHeaderImageUrl]);
  const avatarUrl = useMemo(() => getAvatarUrl(), [getAvatarUrl]);
  
  // 🔥 Извлечение цветов из header image
  const extractColorsFromHeader = useCallback(async () => {
    if (!user || !headerImageUrl) return;
    
    setExtractingColor(true);
    
    try {
      const colors = await extractDominantColor(headerImageUrl);
      
      setGridScanColors({
        gridBgColor: colors.dominant,
        linesColor: brightenColor(colors.dominant, 0.2),
        scanColor: colors.accent
      });
      
    } catch (error) {
      console.error('Ошибка извлечения цвета:', error);
      // Используем gridscan_color из профиля, если есть
      if (user?.gridscan_color && 
          user.gridscan_color !== 'null' && 
          user.gridscan_color !== 'undefined' &&
          user.gridscan_color.trim() !== '') {
        setGridScanColors({
          gridBgColor: user.gridscan_color,
          linesColor: brightenColor(user.gridscan_color, 0.2),
          scanColor: brightenColor(user.gridscan_color, 0.3)
        });
      }
    } finally {
      setExtractingColor(false);
    }
  }, [user, headerImageUrl]);
  
  // ✅ ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const loadProfileData = useCallback(async () => {
    console.log('🔄 loadProfileData вызван', { id, profileUserId });
    
    if (!profileUserId) {
      console.log('❌ Нет profileUserId для загрузки');
      return;
    }
    
    setIsLoading(true);
    setProfileLoadError(null);
    
    try {
      let profileData;
      
      if (id) {
        // ✅ Загружаем ЧУЖОЙ профиль по ID
        // Эндпоинт должен быть: GET /api/users/<id>/
        console.log(`🔍 Загружаем чужой профиль по ID: ${id}`);
        profileData = await api.get(`/users/${id}/`);
        console.log('✅ Данные чужого профиля загружены:', profileData);
      } else {
        // ✅ Загружаем СВОЙ профиль
        console.log('🔍 Загружаем свой профиль');
        profileData = await api.get('/users/me/');
        console.log('✅ Данные своего профиля загружены:', profileData);
      }
      
      // 🔥 ДЕБАГГИНГ: Что пришло от сервера
      console.log('📊 Полученные данные пользователя:', {
        id: profileData.user?.id,
        username: profileData.user?.username,
        hasAvatar: !!profileData.user?.avatar,
        hasAvatarUrl: !!profileData.user?.avatar_url,
        hasHeaderImage: !!profileData.user?.header_image,
        hasHeaderImageUrl: !!profileData.user?.header_image_url,
        hasGridscanColor: !!profileData.user?.gridscan_color,
        allKeys: profileData.user ? Object.keys(profileData.user) : []
      });
      
      if (profileData.user) {
        setUser(profileData.user);
        
        // Обновляем текущего пользователя, если это его профиль
        if (!id && updateUser && typeof updateUser === 'function') {
          updateUser(profileData.user);
        }
        
        // 🔥 НЕМЕДЛЕННО обновляем URL изображений
        console.log('🖼️ Извлеченные URL:', {
          headerImageUrl: getHeaderImageUrl(),
          avatarUrl: getAvatarUrl()
        });
      } else {
        setUser(profileData);
      }

      // ✅ ДОПОЛНИТЕЛЬНО: подтягиваем актуальную статистику подписок/подписчиков
      try {
        if (profileUserId) {
          const followStatsResponse = await api.get(`/users/${profileUserId}/follow-stats/`);
          const stats = followStatsResponse?.stats || {};

          setUser(prev => {
            if (!prev) return prev;
            const followersCount = Number(stats.followers ?? prev.followers_count ?? prev.followers ?? 0);
            const followingCount = Number(stats.following ?? prev.following_count ?? prev.following ?? 0);

            return {
              ...prev,
              followers_count: followersCount,
              followers: followersCount,
              following_count: followingCount,
              following: followingCount
            };
          });
        }
      } catch (statsError) {
        console.warn('⚠️ Не удалось загрузить follow-stats:', statsError);
      }
      
      // Загрузка треков пользователя
      try {
        let tracksEndpoint;
        
        if (id) {
          // Для чужого профиля
          tracksEndpoint = `/users/${id}/tracks/`;
        } else {
          // Для своего профиля
          tracksEndpoint = '/my-tracks/';
        }
        
        console.log(`🔍 Загрузка треков по эндпоинту: ${tracksEndpoint}`);
        const tracksData = await api.get(tracksEndpoint);
        
        if (tracksData.success && tracksData.tracks) {
          setUserTracks(tracksData.tracks);
        } else if (tracksData.tracks) {
          setUserTracks(tracksData.tracks);
        } else if (tracksData.results) {
          setUserTracks(tracksData.results);
        } else {
          setUserTracks([]);
        }
        
        console.log(`✅ Загружено треков: ${userTracks.length}`);
        
      } catch (trackError) {
        console.log('⚠️ Не удалось загрузить треки:', trackError);
        setUserTracks([]);
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки профиля:', error);
      setProfileLoadError(error.message || 'Profile not found');
      
      // Если не удалось загрузить чужой профиль, но есть данные текущего пользователя
      if (!id && currentUserProp) {
        console.log('Используем данные текущего пользователя как fallback');
        setUser(currentUserProp);
      }
    } finally {
      setIsLoading(false);
      console.log('✅ Загрузка профиля завершена');
    }
  }, [id, currentUserProp, updateUser, profileUserId, getHeaderImageUrl, getAvatarUrl]);
  
  // ✅ ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ДАННЫХ - ТОЛЬКО ПРИ ИЗМЕНЕНИИ ID
  useEffect(() => {
    console.log(`🎯 Effect triggered with id: ${id}, currentUserProp:`, currentUserProp?.id);
    
    // Если нет ID и нет текущего пользователя - ничего не загружаем
    if (!id && !currentUserProp) {
      console.log('Нет данных для загрузки - показываем пустой экран');
      setIsLoading(false);
      return;
    }
    
    // Загружаем данные профиля
    loadProfileData();
    
    // Очистка не требуется, так как нет подписок
    return () => {
      console.log('🧹 Cleanup effect');
    };
  }, [id, currentUserProp?.id]); // ✅ ТОЛЬКО при изменении ID или currentUserProp.id!

  // ✅ Инициализация follow-статуса для чужого профиля + синхронизация через window event
  useEffect(() => {
    let isMounted = true;
    const targetUserId = user?.id;

    const init = async () => {
      if (!targetUserId || isMyProfile) return;
      const status = await checkFollowStatus(targetUserId);
      if (isMounted) setIsFollowing(status);
    };

    init();

    const onFollowChanged = (e) => {
      const detail = e?.detail;
      if (!detail || !targetUserId) return;
      if (String(detail.targetUserId) !== String(targetUserId)) return;
      setIsFollowing(!!detail.isFollowing);
    };

    window.addEventListener('followStatusChanged', onFollowChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('followStatusChanged', onFollowChanged);
    };
  }, [user?.id, isMyProfile, checkFollowStatus]);

  // ✅ Синхронизация счётчика FOLLOWING на МОЁМ профиле
  useEffect(() => {
    if (!isMyProfile) return;

    const handleMyFollowingChange = async (e) => {
      const detail = e?.detail;
      console.log('🔔 [МОЙ ПРОФИЛЬ] Событие followStatusChanged получено:', detail);
      
      if (!detail) return;
      
      // ✅ Получаем мой ID
      const myId = currentUserProp?.id || user?.id || profileUserId;
      console.log('👤 [МОЙ ПРОФИЛЬ] Мой ID:', myId, 'currentUserId из события:', detail.currentUserId);
      
      // ✅ Если currentUserId передан и это не я - игнорируем
      if (detail.currentUserId && myId && String(detail.currentUserId) !== String(myId)) {
        console.log('⏭️ [МОЙ ПРОФИЛЬ] Это не я подписался, игнорируем');
        return;
      }

      // ✅ Если это мой профиль - ВСЕГДА обновляем данные с сервера
      console.log('✅ [МОЙ ПРОФИЛЬ] Обновляю Following - перезагружаю данные с сервера');
      
      // ✅ ПРИНУДИТЕЛЬНО перезагружаем ВСЕ данные профиля с сервера
      try {
        // Сначала получаем актуальную статистику подписок
        const followStatsResponse = await api.get(`/users/${myId}/follow-stats/`);
        const stats = followStatsResponse?.stats || {};
        const actualFollowing = Number(stats.following ?? 0);
        const actualFollowers = Number(stats.followers ?? 0);
        
        console.log('📊 [МОЙ ПРОФИЛЬ] Актуальная статистика с сервера:', { actualFollowing, actualFollowers });
        
        // Обновляем состояние user
        setUser(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            following_count: actualFollowing,
            following: actualFollowing,
            followers_count: actualFollowers,
            followers: actualFollowers
          };
          console.log('🔄 [МОЙ ПРОФИЛЬ] Обновляю состояние user:', updated);
          return updated;
        });
        
        // ✅ Также обновляем currentUserProp если есть функция updateUser
        if (updateUser && typeof updateUser === 'function') {
          const updatedUserData = {
            ...user,
            following_count: actualFollowing,
            following: actualFollowing,
            followers_count: actualFollowers,
            followers: actualFollowers
          };
          console.log('🔄 [МОЙ ПРОФИЛЬ] Обновляю currentUserProp через updateUser');
          updateUser(updatedUserData);
        }
        
        // ✅ Дополнительно: перезагружаем весь профиль через loadProfileData
        // Но только если это действительно мой профиль (без id в URL)
        if (!id && loadProfileData) {
          console.log('🔄 [МОЙ ПРОФИЛЬ] Перезагружаю весь профиль через loadProfileData');
          setTimeout(() => {
            loadProfileData();
          }, 500); // Небольшая задержка, чтобы бэкенд успел обновить данные
        }
      } catch (error) {
        console.error('❌ [МОЙ ПРОФИЛЬ] Не удалось обновить follow-stats:', error);
        // Fallback: обновляем локально
        if (typeof detail.isFollowing === 'boolean') {
          setUser(prev => {
            if (!prev) return prev;
            const current = parseInt(prev.following_count ?? prev.following ?? 0, 10) || 0;
            const newCount = detail.isFollowing
              ? current + 1
              : Math.max(0, current - 1);
            console.log('🔄 [МОЙ ПРОФИЛЬ] Fallback обновление:', current, '→', newCount);
            return {
              ...prev,
              following_count: newCount,
              following: newCount
            };
          });
        }
      }
    };

    console.log('🎧 [МОЙ ПРОФИЛЬ] Регистрирую слушатель события followStatusChanged');
    window.addEventListener('followStatusChanged', handleMyFollowingChange);
    return () => {
      console.log('🧹 [МОЙ ПРОФИЛЬ] Удаляю слушатель события');
      window.removeEventListener('followStatusChanged', handleMyFollowingChange);
    };
  }, [isMyProfile, currentUserProp?.id, user?.id, profileUserId, updateUser, id, loadProfileData]);
  
  // ✅ ЭФФЕКТ ДЛЯ ИЗВЛЕЧЕНИЯ ЦВЕТОВ (запускается при изменении user или headerImageUrl)
  useEffect(() => {
    if (user && headerImageUrl) {
      extractColorsFromHeader();
    } else if (user && user.gridscan_color) {
      // Если нет header image, используем gridscan_color
      const color = user.gridscan_color;
      if (color && color !== 'null' && color !== 'undefined' && color.trim() !== '') {
        setGridScanColors({
          gridBgColor: color,
          linesColor: brightenColor(color, 0.2),
          scanColor: brightenColor(color, 0.3)
        });
      }
    }
  }, [user, headerImageUrl, extractColorsFromHeader]);
  
  // 🔥 Загрузка header image (только для своего профиля)
  const handleHeaderUpload = async (file) => {
    if (!file || !isMyProfile) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      alert(allowedTypes.includes(file.type) ? 'Файл слишком большой. Максимум 5MB' : 'Неподдерживаемый формат изображения');
      return;
    }
    
    setUploadingHeader(true);
    
    try {
      const formData = new FormData();
      formData.append('header_image', file);
      
      await api.patch('/users/me/header/', formData);
      await loadProfileData();
      
      alert('Header image успешно загружен!');
      
    } catch (error) {
      console.error('Ошибка загрузки header image:', error);
      alert(`Ошибка загрузки: ${error.message}`);
    } finally {
      setUploadingHeader(false);
      if (headerFileInputRef.current) {
        headerFileInputRef.current.value = '';
      }
    }
  };
  
  // 🔥 Удаление header image (только для своего профиля)
  const handleRemoveHeader = async () => {
    if (!isMyProfile || !window.confirm('Удалить header image?')) return;
    
    try {
      await api.delete('/users/me/header/delete/');
      await loadProfileData();
      
      alert('Header image удален!');
      
    } catch (error) {
      console.error('Ошибка удаления header:', error);
      alert(`Ошибка удаления: ${error.message}`);
    }
  };
  
  // 🔥 Загрузка аватара (только для своего профиля)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !isMyProfile) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      alert(allowedTypes.includes(file.type) ? 'Файл слишком большой. Максимум 10MB' : 'Неподдерживаемый формат изображения');
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/me/avatar/upload/', formData);
      
      if (response.success) {
        await loadProfileData();
        alert('Аватар успешно загружен!');
      } else {
        throw new Error(response.error || 'Ошибка загрузки аватара');
      }
      
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      alert(`Ошибка загрузки: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };
  
  // 🔥 Удаление аватара (только для своего профиля)
  const handleRemoveAvatar = async () => {
    if (!isMyProfile || !window.confirm('Удалить аватар?')) return;
    
    try {
      const response = await api.delete('/users/me/avatar/remove/');
      
      if (response.success) {
        await loadProfileData();
        alert('Аватар успешно удален!');
      } else {
        throw new Error(response.error || 'Ошибка удаления аватара');
      }
      
    } catch (error) {
      console.error('Ошибка удаления аватара:', error);
      alert(`Ошибка удаления: ${error.message}`);
    }
  };
  
  // 🔥 UI обработчики
  const handleHeaderUploadClick = () => {
    if (!isMyProfile) {
      alert('Вы можете загружать header только для своего профиля');
      return;
    }
    headerFileInputRef.current?.click();
  };
  
  const handleAvatarUploadClick = () => {
    if (!isMyProfile) {
      alert('Вы можете загружать аватар только в своем профиле');
      return;
    }
    avatarFileInputRef.current?.click();
  };
  
  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, []);
  
  const handleClickOutside = useCallback((event) => {
    if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
      setShowUserMenu(false);
    }
  }, []);
  
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);
  
  // 🔥 Loading screen
  if (isLoading) {
    return (
      <div className="loading-screen" style={{ backgroundColor: gridScanColors.gridBgColor }}>
        <div className="loading-content">
          <Shuffle
            text="Loading profile..."
            shuffleDirection="right"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={false}
            loop={true}
            style={{ 
              fontSize: '1.5rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#c084fc'
            }}
          />
        </div>
      </div>
    );
  }
  
  // 🔥 Ошибка загрузки профиля
  if (profileLoadError && !user) {
    return (
      <div className="profile-error">
        <div className="error-content">
          <Shuffle
            text="Profile not found"
            shuffleDirection="right"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.02}
            threshold={0.1}
            triggerOnce={true}
            style={{ 
              fontSize: '2rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#ffffff'
            }}
          />
          <button onClick={() => navigate('/')} className="go-back-btn">
            Go back to home
          </button>
        </div>
      </div>
    );
  }
  
  const currentUser = user || currentUserProp;
  
  if (!currentUser) {
    return (
      <div className="profile-error">
        <div className="error-content">
          <Shuffle
            text="User not found"
            shuffleDirection="right"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.02}
            threshold={0.1}
            triggerOnce={true}
            style={{ 
              fontSize: '2rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#ffffff'
            }}
          />
        </div>
      </div>
    );
  }
  
  // 🔥 ДЕБАГГИНГ РЕНДЕРА
  console.log('🎨 Render data:', {
    user: currentUser,
    headerImageUrl,
    avatarUrl,
    isMyProfile,
    extractingColor
  });
  
  const profileStats = {
    tracks: currentUser?.tracks_count ?? userTracks.length ?? 0,
    // Followers: только реальные данные, без фейковых значений
    followers: isMyProfile
      ? Number(myFollowStats.followers ?? 0)
      : Number(
          currentUser?.followers_count ??
          currentUser?.followers ??
          0
        ),
    // Following: пользователи, на которых подписан ЭТОТ профиль
    following: isMyProfile
      ? Number(myFollowStats.following ?? 0)
      : Number(
          currentUser?.following_count ??
          currentUser?.following ??
          0
        ),
    // Plays: только реальные прослушивания, без заглушек
    plays: Number(
      currentUser?.total_listens ??
      currentUser?.plays ??
      0
    )
  };
  
  // 🔍 ЛОГИРОВАНИЕ для отладки
  console.log('📊 [PROFILE STATS] Текущие значения:', {
    following: profileStats.following,
    followers: profileStats.followers,
    currentUserFollowing: currentUser?.following_count ?? currentUser?.following,
    currentUserFollowers: currentUser?.followers_count ?? currentUser?.followers,
    userFollowing: user?.following_count ?? user?.following,
    userFollowers: user?.followers_count ?? user?.followers,
    currentUserPropFollowing: currentUserProp?.following_count ?? currentUserProp?.following,
    currentUserPropFollowers: currentUserProp?.followers_count ?? currentUserProp?.followers
  });
  
  const displayTracks = userTracks.length > 0 ? userTracks : (trackData ? Object.values(trackData) : []);
  const trackCount = displayTracks.length;
  
  return (
    <div className="profile-page-wrapper">
      {/* 🔥 GridScan как фон */}
      <div className="gridscan-background">
        <GridScan 
          key={`${gridScanColors.gridBgColor}-${gridScanColors.linesColor}-${gridScanColors.scanColor}`}
          {...gridScanConfig}
        />
      </div>
      
      {/* Sidebar */}
      <Sidebar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlayPause={onPlayPause}
        onToggleLike={onToggleLike}
        likedTrackIds={likedTracks || []}
        tracksById={trackData || {}}
        playTrack={() => {}}
        currentTime={currentTime}
        user={currentUser}
        getAuthToken={getAuthToken}
      />
      
      {/* 🔥 Основной контейнер */}
      <div className="profile-page-container">
        {/* Header */}
        <header className="site-header glass-header">
          <nav className="sound-nav">
            <div className="nav-left">
              <button
                className="brand"
                onClick={() => navigate('/')}
              >
                <img src={logoMark} alt="Music platform logo" />
                <Shuffle
                  text="MUSIC"
                  shuffleDirection="right"
                  duration={0.35}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power3.out"
                  stagger={0.03}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  style={{ 
                    fontSize: '1.2rem',
                    marginLeft: '10px',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}
                />
              </button>
              
              <GooeyNav
                items={[
                  { label: 'Home', href: '#home' },
                  { label: 'Feed', href: '#feed' },
                  { label: 'Library', href: '#library' }
                ]}
                particleCount={12}
                particleDistances={[90, 20]}
                particleR={120}
                initialActiveIndex={0}
                animationTime={600}
                timeVariance={300}
                colors={[1, 2, 3, 4, 5, 6]}
                onNavigate={(item) => {
                  let page = 'home';
                  if (item.label === 'Feed') page = 'feed';
                  else if (item.label === 'Library') page = 'library';
                  navigate(`/?page=${page}`);
                }}
                className="profile-gooey-nav"
              />
            </div>

            <div className="nav-center" role="search">
              <div className="nav-search">
                <input
                  type="text"
                  placeholder="Search for tracks, artists, playlists, and more..."
                  aria-label="Search tracks"
                  className="nav-search-input"
                />
                <button type="button" aria-label="Search" className="nav-search-btn">
                  <IconSearch />
                </button>
              </div>
            </div>

            <div className="nav-right">
              <button className="nav-pill" type="button">
                <Shuffle
                  text="For Artists"
                  shuffleDirection="right"
                  duration={0.3}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power2.out"
                  stagger={0.01}
                  threshold={0.1}
                  triggerOnce={false}
                  triggerOnHover={true}
                  style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#ffffff'
                  }}
                />
              </button>
              
              <div className="icon-group">
                {[
                  { label: 'Upload', Icon: IconUpload },
                  { label: 'Notifications', Icon: IconBell },
                  { label: 'Messages', Icon: IconMessage }
                ].map(({ label, Icon }) => (
                  <button
                    key={label}
                    className="icon-button"
                    type="button"
                    aria-label={label}
                    onClick={() => {
                      if (label === 'Upload') {
                        navigate('/upload');
                      }
                    }}
                  >
                    <Icon />
                  </button>
                ))}
              </div>
              
              <div className="user-avatar-container" ref={userMenuRef}>
                <button
                  className="user-avatar-btn"
                  onClick={handleUserMenuToggle}
                  aria-label="User menu"
                >
                  <div className="user-avatar-circle">
                    {currentUserProp?.avatar ? (
                      <img src={currentUserProp.avatar} alt="User avatar" />
                    ) : (
                      <IconUserCircle />
                    )}
                  </div>
                </button>
                
                {showUserMenu && (
                  <div className="user-dropdown-menu">
                    <FloatingLinesDropdown
                      linesGradient={['#ff00ff', '#ff00cc', '#8456ff', '#00ccff', '#ff00ff']}
                      enabledWaves={['top', 'middle', 'bottom']}
                      lineCount={[8, 15, 22]}
                      lineDistance={[1.5, 0.8, 0.3]}
                      animationSpeed={1.5}
                      interactive={true}
                      opacity={1.0}
                      brightness={2.8}
                      showOverlay={false}
                    />
                    
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-avatar">
                        {currentUserProp?.avatar ? (
                          <img src={currentUserProp.avatar} alt="User avatar" />
                        ) : (
                          <IconUserCircle />
                        )}
                      </div>
                      <div className="user-dropdown-info">
                        <div className="user-dropdown-username">
                          <Shuffle
                            text={currentUserProp?.username || 'User'}
                            shuffleDirection="right"
                            duration={0.4}
                            animationMode="evenodd"
                            shuffleTimes={1}
                            ease="power2.out"
                            stagger={0.01}
                            threshold={0.1}
                            triggerOnce={false}
                            triggerOnHover={true}
                            style={{ 
                              fontSize: '1rem',
                              fontFamily: "'Press Start 2P', sans-serif",
                              color: '#ffffff'
                            }}
                          />
                        </div>
                        <div className="user-dropdown-email">
                          <Shuffle
                            text={currentUserProp?.email || 'user@example.com'}
                            shuffleDirection="left"
                            duration={0.3}
                            animationMode="random"
                            shuffleTimes={1}
                            ease="power2.out"
                            stagger={0.01}
                            threshold={0.1}
                            triggerOnce={false}
                            triggerOnHover={true}
                            style={{ 
                              fontSize: '0.8rem',
                              fontFamily: "'Press Start 2P', sans-serif",
                              color: '#94a3b8'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-dropdown-divider" />
                    
                    <div className="user-dropdown-items">
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                      >
                        <IconProfile />
                        <Shuffle
                          text="Profile"
                          shuffleDirection="right"
                          duration={0.3}
                          animationMode="evenodd"
                          shuffleTimes={1}
                          ease="power2.out"
                          stagger={0.01}
                          threshold={0.1}
                          triggerOnce={false}
                          triggerOnHover={true}
                          style={{ 
                            fontSize: '0.9rem',
                            fontFamily: "'Press Start 2P', sans-serif",
                            color: '#ffffff'
                          }}
                        />
                      </button>
                      
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/settings');
                        }}
                      >
                        <IconDots />
                        <Shuffle
                          text="Settings"
                          shuffleDirection="left"
                          duration={0.3}
                          animationMode="evenodd"
                          shuffleTimes={1}
                          ease="power2.out"
                          stagger={0.01}
                          threshold={0.1}
                          triggerOnce={false}
                          triggerOnHover={true}
                          style={{ 
                            fontSize: '0.9rem',
                            fontFamily: "'Press Start 2P', sans-serif",
                            color: '#ffffff'
                          }}
                        />
                      </button>
                      
                      <div className="user-dropdown-divider" />
                      
                      <button
                        className="user-dropdown-item logout-item"
                        onClick={() => {
                          if (onLogout) {
                            onLogout();
                          }
                          setShowUserMenu(false);
                          navigate('/');
                        }}
                      >
                        <IconLogout />
                        <Shuffle
                          text="Log Out"
                          shuffleDirection="up"
                          duration={0.3}
                          animationMode="evenodd"
                          shuffleTimes={1}
                          ease="power2.out"
                          stagger={0.01}
                          threshold={0.1}
                          triggerOnce={false}
                          triggerOnHover={true}
                          style={{ 
                            fontSize: '0.9rem',
                            fontFamily: "'Press Start 2P', sans-serif",
                            color: '#ff4757'
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </header>

        {/* 🔥 Основной контент */}
        <main className="profile-page-content">
          {/* Header image секция */}
          <section className="profile-header-image">
            {headerImageUrl ? (
              <img
                src={headerImageUrl}
                alt="Profile header"
                className="profile-header-bg"
                key={headerImageUrl}
                onLoad={() => {
                  console.log('✅ Header image loaded:', headerImageUrl);
                  if (!extractingColor) {
                    extractColorsFromHeader();
                  }
                }}
                onError={(e) => {
                  console.error('❌ Ошибка загрузки header image:', e);
                  // Если есть gridscan_color, используем его
                  if (user?.gridscan_color) {
                    const color = user.gridscan_color;
                    if (color && color !== 'null' && color !== 'undefined' && color.trim() !== '') {
                      setGridScanColors({
                        gridBgColor: color,
                        linesColor: brightenColor(color, 0.2),
                        scanColor: brightenColor(color, 0.3)
                      });
                    }
                  }
                }}
              />
            ) : (
              <div 
                className="profile-header-bg-empty"
                style={{ 
                  backgroundColor: gridScanColors.gridBgColor,
                  height: '400px'
                }}
              />
            )}

            {/* 🔥 Кнопки управления header (ТОЛЬКО для своего профиля) */}
            {isMyProfile && (
              <div className="header-controls">
                <button
                  className="gooey-btn upload-header-btn"
                  onClick={handleHeaderUploadClick}
                  disabled={uploadingHeader || extractingColor}
                >
                  {extractingColor ? 'Extracting colors...' : uploadingHeader ? 'Uploading...' : 'Upload header image'}
                </button>
                
                {headerImageUrl && (
                  <button
                    className="gooey-btn remove-header-btn"
                    onClick={handleRemoveHeader}
                    disabled={extractingColor}
                  >
                    Remove header
                  </button>
                )}
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              ref={headerFileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleHeaderUpload(file);
                }
              }}
            />

            <div className="profile-header-overlay">
              {/* 🔥 БЛОК АВАТАРА */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrapper">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={currentUser?.username}
                      className="profile-avatar-img"
                      onError={(e) => {
                        console.error('❌ Ошибка загрузки аватара:', e);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      <IconUserCircle />
                    </div>
                  )}
                  
                  {/* 🔥 Кнопка Upload поверх аватара (ТОЛЬКО для своего профиля) */}
                  {isMyProfile && (
                    <label className="avatar-upload-label">
                      <span className="avatar-upload-text">
                        {uploadingAvatar ? 'Uploading...' : 'Upload'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        ref={avatarFileInputRef}
                        onChange={handleAvatarUpload}
                        hidden
                        disabled={uploadingAvatar}
                      />
                    </label>
                  )}
                  
                  {/* 🔥 Кнопка удаления аватара (ТОЛЬКО для своего профиля) */}
                  {isMyProfile && avatarUrl && (
                    <button
                      className="avatar-remove-btn"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      title="Remove avatar"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {/* 🔥 Бейдж "You" для своего профиля */}
                {isMyProfile && (
                  <div className="profile-badge-you">
                    <span>you</span>
                  </div>
                )}
              </div>

              <div className="profile-header-text">
                <h1 className="profile-username">
                  {currentUser?.username || 'Engstrom'}
                </h1>
                <p className="profile-bio">
                  {currentUser?.bio || 'Electronic music producer • Berlin • Releases on Monstercat, NCS, and Spinnin\' Records'}
                </p>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number">{profileStats.tracks}</span>
                    <span className="stat-label">Tracks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{profileStats.followers.toLocaleString()}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{profileStats.following.toLocaleString()}</span>
                    <span className="stat-label">Following</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{profileStats.plays.toLocaleString()}</span>
                    <span className="stat-label">Plays</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Табы + кнопки действий профиля */}
          <div className="profile-tabs-row">
            <div className="profile-tabs-section">
              <GooeyNav
                items={[
                  { label: 'All' },
                  { label: 'Popular tracks' },
                  { label: 'Tracks' },
                  { label: 'Albums' },
                  { label: 'Playlists' },
                  { label: 'Repost' }
                ]}
                particleCount={8}
                particleDistances={[70, 15]}
                particleR={90}
                initialActiveIndex={0}
                animationTime={500}
                timeVariance={200}
                colors={[1, 2, 3, 4]}
                onNavigate={(item) => setActiveTab(item.label)}
                className="profile-gooey-tabs"
              />
            </div>

            {!isMyProfile && (
              <div className="profile-actions">
                <button
                  className={`follow-button ${isFollowing ? 'following' : ''} ${followLoading ? 'loading' : ''}`}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                </button>
              </div>
            )}
          </div>

          {/* Список треков */}
          <section className="profile-body">
            <div className="profile-section-header">
              <h2>{activeTab}</h2>
              <span className="track-count">
                {trackCount} tracks
              </span>
            </div>
            
            <div className="profile-tracks-list">
              {displayTracks.length > 0 ? (
                displayTracks.map(track => (
                  <div 
                    key={track.id} 
                    className="profile-track-row"
                    onClick={() => navigate(`/track/${track.id}`)}
                  >
                    <img
                      src={track.cover || track.cover_url || 'https://via.placeholder.com/64'}
                      className="track-cover"
                      alt={track.title}
                    />
                    <div className="track-info">
                      <div className="track-title">{track.title}</div>
                      <div className="track-artist">{track.artist || track.uploaded_by?.username}</div>
                    </div>
                    <div className="track-actions">
                      <button
                        className="like-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike && onToggleLike(track.id);
                        }}
                      >
                        <IconHeart filled={checkTrackLiked ? checkTrackLiked(track.id) : false} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No tracks yet.</p>
                  {isMyProfile && (
                    <button
                      className="upload-btn gooey-btn"
                      onClick={() => navigate('/upload')}
                    >
                      Upload your first track
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      
      {/* Player */}
      <GlassMusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        isLiked={checkTrackLiked ? checkTrackLiked(currentTrack) : false}
        onToggleLike={() => onToggleLike && onToggleLike(currentTrack)}
        volume={volume}
        onVolumeChange={onVolumeChange}
        onNext={onNext}
        onPrevious={onPrevious}
        loopEnabled={loopEnabled}
        onToggleLoop={onToggleLoop}
        isLoading={false}
        onTrackClick={(trackId) => navigate(`/track/${trackId}`)}
        showInFooter={true}
        trackInfo={trackData && trackData[currentTrack] ? trackData[currentTrack] : null}
        getAuthToken={getAuthToken}
      />
    </div>
  );
};

export default ProfilePage;