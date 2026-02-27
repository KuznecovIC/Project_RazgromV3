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
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';

// Иконки (исправленный IconLogout)
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

// 🔥 ИСПРАВЛЕННЫЙ IconLogout (без ошибки arc flag)
const IconLogout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M10 17l1.4-1.4-2.6-2.6H20v-2H8.8l2.6-2.6L10 7l-5 5 5 5z"
      fill="currentColor"
    />
    <path
      d="M4 4h8v2H6v12h6v2H4V4z"
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
      fill={filled ? "#ff4757" : "currentColor"}
      stroke={filled ? "#ff4757" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);

const IconPause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="share-icon">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

const IconMore = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor"/>
  </svg>
);

const IconComment = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
    <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
  </svg>
);

// 🔥 Иконки для плейлистов
const IconHeartOutline = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z"
      fill="currentColor"
    />
  </svg>
);

const IconHeartFilled = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="#8456ff"
    />
  </svg>
);

const IconRepostOutline = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
      fill="currentColor"
    />
  </svg>
);

const IconRepostFilled = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path
      d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
      fill="#8456ff"
    />
  </svg>
);

// 🗑️ Иконка мусорки для удаления треков
const IconTrash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="currentColor" />
    <path d="M7 9h2v10H7V9zm4 0h2v10h-2V9zm4 0h2v10h-2V9z" fill="currentColor" />
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
    
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      if ((r > 230 && g > 230 && b > 230) || (r < 30 && g < 30 && b < 30)) {
        continue;
      }
      
      const quantized = `${Math.floor(r / 16) * 16},${Math.floor(g / 16) * 16},${Math.floor(b / 16) * 16}`;
      
      if (colorMap.has(quantized)) {
        colorMap.set(quantized, colorMap.get(quantized) + 1);
      } else {
        colorMap.set(quantized, 1);
      }
    }
    
    let maxCount = 0;
    let dominantColor = '#003196';
    
    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = color.split(',').map(Number);
        dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
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

// 🔥 Waveform функция (ВАЖНО: не удалять!)
const getWaveformData = (trackOrTrackId) => {
  // Если передали ID трека
  if (typeof trackOrTrackId === 'number' || typeof trackOrTrackId === 'string') {
    return null;
  }
  
  // Если передали объект трека
  if (trackOrTrackId && typeof trackOrTrackId === 'object') {
    const fromTrack = 
      trackOrTrackId.waveform ||
      trackOrTrackId.waveform_data ||
      trackOrTrackId.waveform_array;
    
    if (Array.isArray(fromTrack) && fromTrack.length > 0) {
      return fromTrack.map(val => {
        const num = Number(val);
        return isNaN(num) ? 30 : Math.max(10, Math.min(100, num));
      });
    }
    
    return null;
  }
  
  return null;
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
    
    if (token) {
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
  playTrack,
  volume,
  onVolumeChange,
  onNext,
  onPrevious,
  loopEnabled,
  onToggleLoop,
  trackData,
  onRecordPlay,
  updateUser,
  setPlaybackQueue,
  playQueueIds
}) => {
  const navigate = useNavigate();
  const { id: rawId } = useParams(); // Извлекаем ID из URL
  
  // 🔥 Добавляем ref для currentUserProp (чтобы не зависеть от объекта в эффектах)
  const currentUserPropRef = useRef(currentUserProp);
  useEffect(() => {
    currentUserPropRef.current = currentUserProp;
  }, [currentUserProp]);
  
  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: защита от undefined
  const id = rawId && rawId !== 'undefined' ? rawId : null;
  
  // ✅ ИСПОЛЬЗУЕМ SocialContext - ВСЕ НУЖНЫЕ ФУНКЦИИ
  const {
    // ✅ треки
    toggleLike,
    toggleRepost,
    toggleFollow,
    isLiked,
    isReposted,
    isFollowing: isFollowingContext,
    getLikeCount,
    getRepostCount,
    getFollowerCount,
    setFollowStatus,
    followsLoaded,
    reposts,
    likedTrackIds,
    loadMyReposts,

    // ✅ плейлисты
    togglePlaylistLike,
    togglePlaylistRepost,
    isPlaylistLiked,
    isPlaylistReposted,
    getPlaylistLikeCount,
    getPlaylistRepostCount,
    playlistLikes,      // 🔥 объект { [id]: true/false }
    playlistReposts,    // 🔥 объект { [id]: true/false }
  } = useSocial();
  
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
  // ✅ Плейлист как очередь (как в LibraryPage)
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);
  const [playlistQueueCache, setPlaylistQueueCache] = useState({});
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // ✅ Presence статуса (online/afk/offline/dnd/sleep)
  const [profilePresence, setProfilePresence] = useState('offline');
  
  const [userTracks, setUserTracks] = useState([]);
  const [extractingColor, setExtractingColor] = useState(false);
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [userReposts, setUserReposts] = useState([]);
  const [loadingReposts, setLoadingReposts] = useState(false);
  
  // 🔥 НОВОЕ: лайкнутые треки пользователя (публичные)
  const [userLikedTracks, setUserLikedTracks] = useState([]);
  const [userLikedPlaylists, setUserLikedPlaylists] = useState([]);
  
  // 🔥 НОВОЕ: репостнутые плейлисты пользователя (публичные)
  const [userRepostedPlaylists, setUserRepostedPlaylists] = useState([]);
  const [loadingRepostedPlaylists, setLoadingRepostedPlaylists] = useState(false);
  
  const [loadingLikes, setLoadingLikes] = useState(false);
  
  // 🔥 НОВОЕ: локальный кэш "дотянутых" треков для All
  const [allExtraTracks, setAllExtraTracks] = useState([]);
  
  // 🔥 НОВОЕ: кэш "дотянутых" плейлистов для Repost
  const [repostExtraPlaylists, setRepostExtraPlaylists] = useState([]);
  
  // 🔥 НОВОЕ: плейлисты автора
  const [userPlaylists, setUserPlaylists] = useState([]);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editCountryError, setEditCountryError] = useState('');
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // 🔥 Waveform-кеш
  const waveformsByIdRef = useRef({});
  const [waveformsVersion, setWaveformsVersion] = useState(0);
  
  // 🔥 Флаги для предотвращения повторных запросов
  const isFetchingWaveformsRef = useRef(false);
  const fetchedTrackIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(false);
  
  const userMenuRef = useRef(null);
  const headerFileInputRef = useRef(null);
  const avatarFileInputRef = useRef(null);

  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ИЗОБРАЖЕНИЙ
  const getImageUrl = useCallback((imageValue) => {
    if (!imageValue || 
        imageValue === 'null' || 
        imageValue === 'undefined' ||
        imageValue.trim() === '') {
      return null;
    }
    
    if (imageValue.startsWith('/') && !imageValue.startsWith('//')) {
      return `http://localhost:8000${imageValue}`;
    }
    
    return imageValue;
  }, []);
  
  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ HEADER IMAGE
  const getHeaderImageUrl = useCallback((usr) => {
    if (!usr) return null;
    
    const headerValue = 
      usr.header_image ||
      usr.header_image_url ||
      usr.header ||
      null;
    
    return getImageUrl(headerValue);
  }, [getImageUrl]);
  
  // 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ АВАТАРА
  const getAvatarUrl = useCallback((usr) => {
    if (!usr) return null;
    
    const avatarValue = 
      usr.avatar ||
      usr.avatar_url ||
      usr.profile_image ||
      null;
    
    return getImageUrl(avatarValue);
  }, [getImageUrl]);

  const profileUserId = useMemo(() => {
    return id || currentUserProp?.id;
  }, [id, currentUserProp?.id]);

  // ✅ URLs для шапки и аватарки (без падений)
  const headerImageUrl = useMemo(() => {
    return getHeaderImageUrl(user || currentUserProp);
  }, [getHeaderImageUrl, user, currentUserProp]);

  const avatarUrl = useMemo(() => {
    return getAvatarUrl(user || currentUserProp);
  }, [getAvatarUrl, user, currentUserProp]);

  // ✅ Конфиг для GridScan (переменная нужна ниже в JSX)
  const gridScanConfig = useMemo(() => ({
    gridBgColor: gridScanColors.gridBgColor,
    linesColor: gridScanColors.linesColor,
    scanColor: gridScanColors.scanColor,
    gridBgOpacity: 0.55,
    scanOpacity: 0.6,
    gridScale: 0.12,
    scanGlow: 1.2,
    bloomIntensity: 0.5
  }), [gridScanColors]);

  // ✅ Подгружаем presence профиля (как в MessageHub)
  const loadProfilePresence = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const res = await apiFetch(`/api/users/${profileUserId}/presence/`);
      if (!res.ok) {
        setProfilePresence('offline');
        return;
      }
      const data = await res.json();

      // нормализуем значения (на всякий)
      const raw = (data?.presence || 'offline').toString().toLowerCase();
      const normalized =
        raw === 'do_not_disturb' ? 'dnd' :
        raw === 'sleeping' ? 'sleep' :
        raw;

      setProfilePresence(normalized);
    } catch {
      setProfilePresence('offline');
    }
  }, [profileUserId]);
  
  // ✅ ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ
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
        console.log(`🔍 Загружаем чужой профиль по ID: ${id}`);
        profileData = await api.get(`/users/${id}/`);
      } else {
        console.log('🔍 Загружаем свой профиль');
        profileData = await api.get('/users/me/');
        
        if (profileData.user) {
          setEditBio(profileData.user.bio || '');
          setEditCountry(profileData.user.country || '');
        }
      }
      
      const userData = profileData.user || profileData;
      
      if (userData) {
        setUser(userData);
        
        // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Синхронизируем SocialContext с сервером
        if (userData.id) {
          const followFromServer =
            typeof userData.is_following === 'boolean'
              ? userData.is_following
              : (typeof userData.is_followed_by_me === 'boolean' ? userData.is_followed_by_me : null);

          if (followFromServer !== null) {
            console.log('✅ ProfilePage: Синхронизируем follow-статус из сервера:', {
              userId: userData.id,
              followStatus: followFromServer
            });
            
            setFollowStatus(
              userData.id,
              followFromServer,
              userData.followers_count ?? 0
            );
          }
        }
        
        if (!id && updateUser && typeof updateUser === 'function') {
          updateUser(userData);
        }
      }

      // Загрузка треков пользователя
      try {
        let tracksEndpoint;
        
        if (id) {
          tracksEndpoint = `/users/${id}/tracks/`;
        } else {
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
        
        // Сбрасываем кэш waveform при загрузке новых треков
        fetchedTrackIdsRef.current = new Set();
        
      } catch (trackError) {
        console.log('⚠️ Не удалось загрузить треки:', trackError);
        setUserTracks([]);
      }
      
    } catch (error) {
      console.error('❌ Ошибка загрузки профиля:', error);
      setProfileLoadError(error.message || 'Profile not found');
      
      // 🔥 ИСПРАВЛЕНИЕ: используем ref вместо currentUserProp
      if (!id && currentUserPropRef.current) {
        setUser(currentUserPropRef.current);
      }
    } finally {
      setIsLoading(false);
      console.log('✅ Загрузка профиля завершена');
    }
  }, [id, profileUserId, updateUser, setFollowStatus]);

  // ✅ 🔥 ИСПРАВЛЕННЫЙ ЭФФЕКТ: ЗАГРУЗКА ДАННЫХ ПРИ СМЕНЕ ID (зависим только от profileUserId)
  useEffect(() => {
    console.log(`🎯 ProfilePage эффект: profileUserId = ${profileUserId}`);
    
    if (!profileUserId) {
      setIsLoading(false);
      return;
    }
    
    // Сбрасываем флаг начальной загрузки при смене пользователя
    isInitialLoadRef.current = false;
    
    // Загружаем данные профиля
    loadProfileData();
    
    return () => {
      console.log('🧹 Cleanup effect для профиля', profileUserId);
    };
  }, [profileUserId, loadProfileData]);

  // ✅ Presence: обновляем только статус кружочка
  useEffect(() => {
    if (!profileUserId) return;
    loadProfilePresence();
    const t = setInterval(loadProfilePresence, 30000);
    return () => clearInterval(t);
  }, [profileUserId, loadProfilePresence]);

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

  // ✅ ФУНКЦИЯ ЗАГРУЗКИ РЕПОСТОВ (ПУБЛИЧНАЯ)
  const loadUserReposts = useCallback(async () => {
    if (!profileUserId) return;
    
    setLoadingReposts(true);
    
    try {
      const response = await apiFetch(`/api/users/${profileUserId}/reposts/`);
      
      if (response.ok) {
        const data = await response.json();
        setUserReposts(data.reposts || []);
      } else {
        setUserReposts([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки репостов:', error);
      setUserReposts([]);
    } finally {
      setLoadingReposts(false);
    }
  }, [profileUserId]);

  // 🔥 НОВОЕ: ЗАГРУЗКА ЛАЙКНУТЫХ ТРЕКОВ ПОЛЬЗОВАТЕЛЯ (ПУБЛИЧНАЯ)
  const loadUserLikedTracks = useCallback(async () => {
    if (!profileUserId) return;
    
    setLoadingLikes(true);
    
    try {
      const response = await apiFetch(`/api/users/${profileUserId}/liked-tracks/`);
      
      if (response.ok) {
        const data = await response.json();
        // Поддерживаем разные форматы ответа
        const tracks = data.liked_tracks || data.tracks || [];
        setUserLikedTracks(tracks);
      } else {
        setUserLikedTracks([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки лайкнутых треков:', error);
      setUserLikedTracks([]);
    } finally {
      setLoadingLikes(false);
    }
  }, [profileUserId]);

  // 🔥 НОВОЕ: ЗАГРУЗКА ЛАЙКНУТЫХ ПЛЕЙЛИСТОВ (публичная)
  const loadUserLikedPlaylists = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const response = await apiFetch(`/api/users/${profileUserId}/liked-playlists/`);
      if (response.ok) {
        const data = await response.json();
        const playlists = data.playlists || data.liked_playlists || [];
        setUserLikedPlaylists(playlists);
      } else {
        setUserLikedPlaylists([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки лайкнутых плейлистов:', error);
      setUserLikedPlaylists([]);
    }
  }, [profileUserId]);

  // 🔥 НОВОЕ: ЗАГРУЗКА РЕПОСТНУТЫХ ПЛЕЙЛИСТОВ (публичная)
  const loadUserRepostedPlaylists = useCallback(async () => {
    if (!profileUserId) return;

    setLoadingRepostedPlaylists(true);
    try {
      const response = await apiFetch(`/api/users/${profileUserId}/reposted-playlists/`);
      if (response.ok) {
        const data = await response.json();
        const playlists = data.playlists || data.reposted_playlists || [];
        setUserRepostedPlaylists(playlists);
      } else {
        setUserRepostedPlaylists([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки репостнутых плейлистов:', error);
      setUserRepostedPlaylists([]);
    } finally {
      setLoadingRepostedPlaylists(false);
    }
  }, [profileUserId]);

  // 🔥 НОВОЕ: ЗАГРУЗКА ПЛЕЙЛИСТОВ АВТОРА
  const loadUserPlaylists = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const response = await apiFetch(`/api/users/${profileUserId}/playlists/`);
      if (response.ok) {
        const data = await response.json();
        const playlists = data.playlists || data.results || [];
        setUserPlaylists(Array.isArray(playlists) ? playlists : []);
      } else {
        setUserPlaylists([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки плейлистов автора:', error);
      setUserPlaylists([]);
    }
  }, [profileUserId]);

  
  // ✅ ОБРАБОТЧИК ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
  const handleTabChange = useCallback((item) => {
    setActiveTab(item.label);
    
    if (item.label === 'Repost') {
      loadUserReposts();
      loadUserRepostedPlaylists(); // ✅ Загружаем и репостнутые плейлисты
    }

    if (item.label === 'Playlists') {
      loadUserPlaylists();
    }
  }, [loadUserReposts, loadUserRepostedPlaylists, loadUserPlaylists]);
  
  // 🔥 ЭФФЕКТ: Загружаем репосты и лайки при загрузке профиля
  useEffect(() => {
    if (profileUserId) {
      loadUserReposts();
      loadUserLikedTracks();
      loadUserLikedPlaylists();
      loadUserRepostedPlaylists(); // ✅ добавили загрузку репостнутых плейлистов
      loadUserPlaylists();
    }
  }, [profileUserId, loadUserReposts, loadUserLikedTracks, loadUserLikedPlaylists, loadUserRepostedPlaylists, loadUserPlaylists]);

  // ✅ 🔥 ИСПРАВЛЕННЫЙ ЭФФЕКТ: загружать репосты при переключении на вкладку "Repost" (без проверки isMyProfile)
  useEffect(() => {
    if (activeTab === 'Repost') {
      loadUserReposts();
    }
  }, [activeTab, loadUserReposts]);

  // 🔥 🔥 🔥 НОВЫЙ ЭФФЕКТ: дотягиваем недостающие плейлисты для вкладки Repost
  useEffect(() => {
    // важно: это нужно только на МОЁМ профиле и только во вкладке Repost
    if (!isMyProfile) return;
    if (activeTab !== 'Repost') return;

    const repostedIds = Object.keys(playlistReposts || {})
      .map((x) => Number(x))
      .filter((id) => id && (playlistReposts?.[id] ?? false));

    if (repostedIds.length === 0) return;

    const haveIds = new Set([
      ...(userRepostedPlaylists || []).map(p => p?.id).filter(Boolean),
      ...(repostExtraPlaylists || []).map(p => p?.id).filter(Boolean),
    ]);

    const needIds = repostedIds.filter((id) => !haveIds.has(id));
    if (needIds.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        for (const id of needIds) {
          const resp = await apiFetch(`/api/playlists/${id}/`);
          if (!resp.ok) continue;

          const data = await resp.json();
          const playlist = data.playlist || data;
          if (!playlist?.id) continue;

          if (!cancelled) {
            setRepostExtraPlaylists((prev) => {
              if (prev.some(p => p?.id === playlist.id)) return prev;
              return [...prev, playlist];
            });
          }
        }
      } catch (e) {
        console.warn('ProfilePage: cannot fetch missing repost playlists', e);
      }
    })();

    return () => { cancelled = true; };
  }, [isMyProfile, activeTab, playlistReposts, userRepostedPlaylists, repostExtraPlaylists]);

  // 🔥 ВЫЧИСЛЯЕМ ПЛЕЙЛИСТЫ ДЛЯ ВКЛАДКИ REPOST (через SocialContext)
  const repostTabPlaylists = useMemo(() => {
    // база: что пришло с сервера + то, что мы дотянули сами
    const merged = new Map();
    [...(userRepostedPlaylists || []), ...(repostExtraPlaylists || [])].forEach((p) => {
      if (p?.id) merged.set(p.id, p);
    });

    // если это МОЙ профиль — фильтруем по живому SocialContext
    if (isMyProfile) {
      return Array.from(merged.values()).filter((p) => p?.id && (playlistReposts?.[p.id] ?? false));
    }

    // чужой профиль: сервер уже дал репостнутые — просто показываем
    return Array.from(merged.values());
  }, [userRepostedPlaylists, repostExtraPlaylists, isMyProfile, playlistReposts]);

  // 🔥 Waveform для треков в профиле (фолбэк)
  const generateWaveformData = useCallback(() => {
    return Array(60).fill().map((_, i) => {
      const baseHeight = 30 + Math.sin(i * 0.3) * 20;
      const randomFactor = 10 + Math.random() * 15;
      return baseHeight + randomFactor;
    });
  }, []);
  
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
  
  // 🔥 Загрузка реальной Waveform‑данных для треков профиля
  const loadWaveformForTrack = useCallback(
    async (trackId) => {
      if (fetchedTrackIdsRef.current.has(trackId)) {
        return waveformsByIdRef.current[trackId] || null;
      }
      
      if (isFetchingWaveformsRef.current) {
        return null;
      }
      
      isFetchingWaveformsRef.current = true;
      fetchedTrackIdsRef.current.add(trackId);
      
      try {
        const resp = await apiFetch(`/api/track/${trackId}/waveform/`);
        if (!resp.ok) {
          return null;
        }
        const data = await resp.json();
        const wf = data?.waveform ?? [];
        
        waveformsByIdRef.current[trackId] = wf;
        setWaveformsVersion(v => v + 1);
        
        return wf;
      } catch (e) {
        console.error('⚠️ Waveform load error', trackId, e);
        return null;
      } finally {
        isFetchingWaveformsRef.current = false;
      }
    },
    []
  );
  
  // ✅ ИСПРАВЛЕННЫЙ ЭФФЕКТ: подгружаем waveform для ВСЕХ треков (uploads + reposts + likes)
  useEffect(() => {
    const fetchWaveformsForAllTracks = async () => {
      // 1. Собираем все возможные треки
      const uploaded = userTracks.length > 0 ? userTracks : (trackData ? Object.values(trackData) : []);
      const combinedRaw = [...uploaded, ...(userReposts || []), ...(userLikedTracks || []), ...(allExtraTracks || [])];

      // 2. Убираем дубликаты по ID
      const seen = new Set();
      const combined = [];
      for (const t of combinedRaw) {
        if (!t?.id) continue;
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        combined.push(t);
      }

      if (combined.length === 0) return;

      // 3. Отбираем треки без waveform и без запроса в процессе
      const tracksWithoutWaveform = combined.filter(track => {
        const trackId = track?.id;
        if (!trackId) return false;

        const hasWaveform = waveformsByIdRef.current[trackId];
        const wasFetched = fetchedTrackIdsRef.current.has(trackId);

        return !hasWaveform && !wasFetched;
      });

      if (tracksWithoutWaveform.length === 0) {
        return;
      }

      // 4. Грузим waveform (первые 15 для производительности)
      const toFetch = tracksWithoutWaveform.slice(0, 15);
      for (const track of toFetch) {
        await loadWaveformForTrack(track.id);
      }
    };
    
    const timer = setTimeout(() => {
      fetchWaveformsForAllTracks();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [
    userTracks.length, 
    userReposts.length, 
    userLikedTracks.length, 
    allExtraTracks.length,
    waveformsVersion, 
    trackData, 
    loadWaveformForTrack
  ]);

  const displayTracks = userTracks.length > 0 ? userTracks : (trackData ? Object.values(trackData) : []);
  
  // 🔥 All треки: показываем только где СЕЙЧАС true и лайк и репост (из SocialContext)
  const allActivityTracks = useMemo(() => {
    const merged = new Map();

    // 1) то, что пришло с сервера (стартовая база)
    [...(userLikedTracks || []), ...(userReposts || []), ...(allExtraTracks || [])].forEach((t) => {
      if (t?.id) merged.set(t.id, t);
    });

    // 2) если мы лайк+репост сделали прямо сейчас — статусы есть в SocialContext,
    //    но объекта трека может не быть в списках -> пробуем взять из trackData
    (likedTrackIds || []).forEach((id) => {
      if (!id) return;
      if (!(reposts?.[id] ?? false)) return;

      if (!merged.has(id)) {
        const fromMap = trackData?.[id] || trackData?.[String(id)];
        if (fromMap) merged.set(id, fromMap);
      }
    });

    // 3) финальный фильтр: показываем только где СЕЙЧАС true и лайк и репост
    return Array.from(merged.values()).filter((t) => {
      if (!t?.id) return false;
      return isLiked(t.id) && isReposted(t.id);
    });
  }, [
    userLikedTracks,
    userReposts,
    allExtraTracks,
    likedTrackIds,
    reposts,
    trackData,
    isLiked,
    isReposted
  ]);

  // 🔥 Плейлисты для All: показываем только те, где сейчас true и лайк и репост (из SocialContext)
  const allActivityPlaylists = useMemo(() => {
    const merged = new Map();

    [...(userLikedPlaylists || []), ...(userRepostedPlaylists || [])].forEach((p) => {
      if (p?.id) merged.set(p.id, p);
    });

    return Array.from(merged.values()).filter((p) => {
      if (!p?.id) return false;
      return isPlaylistLiked(p.id) && isPlaylistReposted(p.id);
    });
    // ✅ ВАЖНО: зависим от playlistLikes/playlistReposts, чтобы обновлялось мгновенно
  }, [userLikedPlaylists, userRepostedPlaylists, playlistLikes, playlistReposts, isPlaylistLiked, isPlaylistReposted]);

  
  const sortedForPopular = useMemo(() => {
    if (activeTab !== 'Popular tracks') return displayTracks;

    const authorPlayMap = {};
    displayTracks.forEach((t) => {
      const authorId = t.uploaded_by?.id || t.user?.id;
      if (authorId) {
        authorPlayMap[authorId] = (authorPlayMap[authorId] || 0) + (t.play_count || 0);
      }
    });

    const tracksCopy = [...displayTracks];
    tracksCopy.sort((a, b) => {
      const aAuthorId = a.uploaded_by?.id || a.user?.id;
      const bAuthorId = b.uploaded_by?.id || b.user?.id;
      const aAuthorPlays = authorPlayMap[aAuthorId] ?? 0;
      const bAuthorPlays = authorPlayMap[bAuthorId] ?? 0;

      if (bAuthorPlays !== aAuthorPlays) {
        return bAuthorPlays - aAuthorPlays;
      }
      return (b.play_count ?? 0) - (a.play_count ?? 0);
    });

    return tracksCopy;
  }, [displayTracks, activeTab]);
  
  // 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ #2: правильное отображение вкладок
  const tracksToShow = (() => {
    if (activeTab === 'Popular tracks') return sortedForPopular;
    if (activeTab === 'All')            return allActivityTracks;   // ✅ ТОЛЬКО активность (лайки + репосты)
    if (activeTab === 'Tracks')         return displayTracks;       // ✅ Только загруженные треки
    if (activeTab === 'Repost')         return userReposts;         // ✅ Только репосты
    return displayTracks; // fallback
  })();
  
  const trackCount = tracksToShow.length;
  
  // ✅ ФУНКЦИЯ ДЛЯ ПЕРЕКЛЮЧЕНИЯ FOLLOW
  const handleFollowToggle = useCallback(async () => {
    if (followLoading) return;

    const targetUserId = user?.id || currentUserProp?.id;
    if (!targetUserId) return;
    if (isMyProfile) return;

    setFollowLoading(true);

    try {
      const success = await toggleFollow(targetUserId);
      
      if (!success) {
        alert('Error changing follow status');
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка подписки:', error);
      alert('Network error when changing follow status');
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isMyProfile, user?.id, currentUserProp?.id, toggleFollow]);
  
  
  useEffect(() => {
    if (user && headerImageUrl) {
      extractColorsFromHeader();
    } else if (user && user.gridscan_color) {
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
      alert(allowedTypes.includes(file.type) ? 'File is too large. Maximum 5MB' : 'Unsupported image format');
      return;
    }
    
    setUploadingHeader(true);
    
    try {
      const formData = new FormData();
      formData.append('header_image', file);
      
      await api.patch('/users/me/header/', formData);
      await loadProfileData();
      
      alert('Header image uploaded successfully!');
      
    } catch (error) {
      console.error('Ошибка загрузки header image:', error);
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploadingHeader(false);
      if (headerFileInputRef.current) {
        headerFileInputRef.current.value = '';
      }
    }
  };
  
  const handleRemoveHeader = async () => {
    if (!isMyProfile || !window.confirm('Delete header image?')) return;
    
    try {
      await api.delete('/users/me/header/delete/');
      await loadProfileData();
      
      alert('Header image deleted!');
      
    } catch (error) {
      console.error('Ошибка удаления header:', error);
      alert(`Delete error: ${error.message}`);
    }
  };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !isMyProfile) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;
    
    if (!allowedTypes.includes(file.type) || file.size > maxSize) {
      alert(allowedTypes.includes(file.type) ? 'File is too large. Maximum 10MB' : 'Unsupported image format');
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/me/avatar/upload/', formData);
      
      if (response.success) {
        await loadProfileData();
        alert('Avatar uploaded successfully!');
      } else {
        throw new Error(response.error || 'Avatar upload error');
      }
      
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      alert(`Upload error: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!isMyProfile || !window.confirm('Delete avatar?')) return;
    
    try {
      const response = await api.delete('/users/me/avatar/remove/');
      
      if (response.success) {
        await loadProfileData();
        alert('Avatar deleted successfully!');
      } else {
        throw new Error(response.error || 'Avatar delete error');
      }
      
    } catch (error) {
      console.error('Ошибка удаления аватара:', error);
      alert(`Delete error: ${error.message}`);
    }
  };
  
  const handleHeaderUploadClick = () => {
    if (!isMyProfile) {
      alert('You can only upload header for your own profile');
      return;
    }
    headerFileInputRef.current?.click();
  };
  
  const handleAvatarUploadClick = () => {
    if (!isMyProfile) {
      alert('You can only upload avatar in your own profile');
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

  // 🔥 ЭФФЕКТ: дотягиваем недостающие треки для All
  useEffect(() => {
    if (!isMyProfile) return;
    if (activeTab !== 'All') return;

    const mergedIds = new Set([
      ...(userLikedTracks || []).map(t => t?.id).filter(Boolean),
      ...(userReposts || []).map(t => t?.id).filter(Boolean),
      ...(allExtraTracks || []).map(t => t?.id).filter(Boolean),
    ]);

    const needIds = (likedTrackIds || [])
      .filter((id) => id && (reposts?.[id] ?? false))
      .filter((id) => !mergedIds.has(id));

    if (needIds.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        // тянем по одному, чтобы не сломать бэк
        for (const id of needIds) {
          const resp = await apiFetch(`/api/tracks/${id}/`);
          if (!resp.ok) continue;
          const data = await resp.json();
          const track = data.track || data; // на всякий случай
          if (!track?.id) continue;

          if (!cancelled) {
            setAllExtraTracks(prev => {
              if (prev.some(t => t?.id === track.id)) return prev;
              return [...prev, track];
            });
          }
        }
      } catch (e) {
        console.warn('ProfilePage: cannot fetch missing all tracks', e);
      }
    })();

    return () => { cancelled = true; };
  }, [
    isMyProfile,
    activeTab,
    likedTrackIds,
    reposts,
    userLikedTracks,
    userReposts,
    allExtraTracks
  ]);

  // 🗑️ ОБРАБОТЧИК УДАЛЕНИЯ ТРЕКА
  const handleDeleteMyTrack = useCallback(async (trackId) => {
    if (!window.confirm('Удалить трек навсегда?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/track/${trackId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        alert('Не удалось удалить трек: ' + text);
        return;
      }

      // ✅ убираем из списка сразу (без перезагрузки)
      setUserTracks(prev => prev.filter(t => t.id !== trackId));

      // ✅ поправим счетчик в шапке локально
      setUser(prev => {
        if (!prev) return prev;
        const nextCount = Math.max(0, (prev.tracks_count ?? 0) - 1);
        return { ...prev, tracks_count: nextCount };
      });

    } catch (e) {
      alert('Ошибка удаления: ' + (e?.message || e));
    }
  }, []);

  // ==================== ОБРАБОТЧИКИ ДЛЯ ТРЕКОВ ====================
  const handleWaveformClick = useCallback(
    (e, track) => {
      e.stopPropagation();
      const trackId = track.id;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      
      if (trackId === currentTrack) {
        if (onSeek && duration) {
          const safePercent = Math.min(percent, 0.999);
          const newTime = Math.min(safePercent * duration, duration - 0.05);
          onSeek(newTime);
        }
      } else {
        if (typeof playTrack === 'function') {
          playTrack(track);
          
          setTimeout(() => {
            if (onSeek && duration) {
              const safePercent = Math.min(percent, 0.999);
              const newTime = Math.min(safePercent * duration, duration - 0.05);
              onSeek(newTime);
            }
          }, 100);
        } else {
          window.dispatchEvent(new CustomEvent('playTrackRequest', {
            detail: {
              trackId,
              track,
              source: 'profile_waveform',
              seekToPercent: percent
            }
          }));
        }
      }
    },
    [currentTrack, onSeek, playTrack, duration]
  );
  
  const handleTrackPlayPause = useCallback((trackId, track) => {
    console.log('🎵 ProfilePage: Клик по play/pause', { trackId, track });
    
    if (trackId === currentTrack) {
      if (onPlayPause) {
        onPlayPause();
      } else {
        console.error('❌ onPlayPause не передан');
      }
    } else {
      if (typeof playTrack === 'function') {
        playTrack(track);
      } else {
        window.dispatchEvent(new CustomEvent('playTrackRequest', {
          detail: {
            trackId,
            track,
            source: 'profile_play_button'
          }
        }));
      }
    }
  }, [currentTrack, onPlayPause, playTrack]);
  
  const handleTrackTitleClick = useCallback((trackId, e) => {
    e.stopPropagation();
    navigate(`/track/${trackId}`);
  }, [navigate]);
  
  const handleArtistClick = useCallback((e, track) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id && !track?.artistId) {
      console.error("❌ ProfilePage: нет uploaded_by.id или artistId", track);
      return;
    }
    
    const artistId = track.uploaded_by?.id || track.artistId;
    navigate(`/profile/${artistId}`);
  }, [navigate]);

  // 🔥 ОБНОВЛЕННАЯ СТАТИСТИКА ПРОФИЛЯ
  const profileStats = useMemo(() => {
    const userId = user?.id || currentUserProp?.id;
    
    return {
      tracks: user?.tracks_count ?? userTracks.length ?? 0,
      plays: userTracks.reduce((sum, t) => sum + (Number(t.play_count) || 0), 0),
      followers: getFollowerCount(userId) ?? 
                 user?.followers_count ?? 
                 user?.followers ?? 
                 0,
      following: user?.following_count ?? 
                 user?.following ?? 
                 0
    };
  }, [user, currentUserProp, userTracks, getFollowerCount]);

  // 🔥 ПРОВЕРЯЕМ followsLoaded ПЕРЕД isFollowing
  const isFollowingArtist = useMemo(() => {
    if (!followsLoaded || !user?.id) {
      return null;
    }
    return isFollowingContext(user.id);
  }, [followsLoaded, user?.id, isFollowingContext]);

  // 🔥 РЕНДЕР УНИФИЦИРОВАННОЙ КАРТОЧКИ ТРЕКА
  const renderTrackCard = (track, isRepost = false) => {
    // ✅ ИСПОЛЬЗУЕМ SocialContext
    const isTrackLiked = isLiked(track.id);
    const isTrackReposted = isReposted(track.id) || isRepost;
    const isCurrent = track.id === currentTrack;
    const isTrackPlaying = isCurrent && isPlaying;
    
    // 🗑️ Проверка: можно ли удалить этот трек (только свои, не репосты)
    const canDeleteThisTrack = isMyProfile && !isRepost && (
      track?.uploaded_by?.id ? track.uploaded_by.id === profileUserId : true
    );
    
    // =============== 🔥 WAVEFORM ИЗ КЕША ===============
    const trackId = track?.id;
    const cachedWaveform =
      trackId && waveformsByIdRef.current ? waveformsByIdRef.current[trackId] : null;

    const waveformData =
      (Array.isArray(cachedWaveform) && cachedWaveform.length > 0
        ? cachedWaveform
        : (getWaveformData(track) || generateWaveformData()));
    
    // ✅ Прогресс только для текущего трека
    const progressForThisTrack = isCurrent && duration > 0
      ? Math.min(1, Math.max(0, currentTime / duration))
      : 0;
    
    // ✅ чтобы толстые палочки не "вылезали" за контейнер на очень длинных waveform
    const maxBarsForUI = 180;
    const waveformBarsForUI = waveformData.length > maxBarsForUI
      ? waveformData.filter((_, i) => i % Math.ceil(waveformData.length / maxBarsForUI) === 0)
      : waveformData;
    
    const playedBarsCount = Math.floor(progressForThisTrack * waveformBarsForUI.length);
    
    // ✅ Используем SocialContext для счетчиков
    const likesCount = getLikeCount(track.id);
    const repostsCount = getRepostCount(track.id);
    const playsCount = track.plays ?? track.play_count ?? track.stats?.plays ?? 0;
    const commentsCount = track.comment_count ?? track.comments_count ?? 0;
    
    return (
      <div 
        key={track.id} 
        className="unified-track-card"
        onMouseEnter={() => setHoveredTrackId(track.id)}
        onMouseLeave={() => setHoveredTrackId(null)}
      >
        {/* Обложка и кнопка play */}
        <div className="unified-track-cover">
          <img
            src={track.cover || track.cover_url || 'https://via.placeholder.com/64'}
            alt={track.title}
          />
          
          <button
            className="unified-track-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleTrackPlayPause(track.id, track);
            }}
            aria-label={isTrackPlaying ? 'Pause' : 'Play'}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.7)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              transition: 'all 0.2s ease',
              opacity: hoveredTrackId === track.id ? 1 : 0
            }}
          >
            {isTrackPlaying ? <IconPause /> : <IconPlay />}
          </button>
        </div>
        
        {/* Информация о треке */}
        <div className="unified-track-info">
          <div 
            className="unified-track-title"
            onClick={(e) => handleTrackTitleClick(track.id, e)}
            style={{
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#8456ff'}
            onMouseLeave={(e) => e.target.style.color = 'white'}
          >
            {track.title}
          </div>
          
          <div 
            className="unified-track-artist"
            onClick={(e) => handleArtistClick(e, track)}
            title={`Go to ${track.uploaded_by?.username || track.artist}'s profile`}
            style={{
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#c084fc'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}
          >
            {track.uploaded_by?.username || track.artist}
          </div>
        </div>
        
        {/* Waveform */}
        <div className="unified-track-waveform" style={{ flex: 1, margin: '0 10px' }}>
          <div
            className="profile-waveform sh-waveform-container"
            onMouseDown={(e) => handleWaveformClick(e, track)}
            title="Click to seek"
            role="button"
            tabIndex={0}
            aria-label="Waveform seek"
          >
            <div
              className="sh-waveform-progress"
              style={{ width: `${progressForThisTrack * 100}%` }}
            />

            <div className="sh-waveform-inner">
              {waveformBarsForUI.map((height, index) => {
                const isPlayed = index < playedBarsCount;
                return (
                  <div
                    key={index}
                    className={`sh-waveform-bar ${isPlayed ? 'played' : ''}`}
                    style={{ '--height': `${Math.max(6, Math.min(100, Number(height) || 0))}%` }}
                  />
                );
              })}
            </div>

            {/* Лазер позиции (только для текущего трека) */}
            {isCurrent && (
              <div
                className="sh-waveform-laser"
                style={{ left: `${progressForThisTrack * 100}%` }}
              />
            )}
          </div>
        </div>
        
        {/* Кнопки действий */}
        <div className="unified-track-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button
            className="like-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(track.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: isTrackLiked ? '#ff4757' : 'rgba(255, 255, 255, 0.7)'
            }}
            title={isTrackLiked ? 'Unlike' : 'Like'}
          >
            <IconHeart filled={isTrackLiked} />
          </button>
          <span className="like-count-mini" style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: '20px'
          }}>
            {likesCount?.toLocaleString() || 0}
          </span>

          <button
            className={`repost-button-mini ${isTrackReposted ? 'reposted' : ''}`}
            onClick={async (e) => {
              e.stopPropagation();
              if (syncInProgress) return;

              const wasReposted = isTrackReposted;
              const ok = await toggleRepost(track.id);

              // ✅ Сразу обновляем список в профиле (без перезагрузки)
              if (ok && isMyProfile) {
                if (wasReposted) {
                  // Удаляем трек из списка репостов
                  setUserReposts(prev => (prev || []).filter(t => t?.id !== track.id));
                } else {
                  // Добавляем трек в начало списка репостов
                  setUserReposts(prev => {
                    const arr = prev || [];
                    if (arr.some(t => t?.id === track.id)) return arr;
                    return [track, ...arr];
                  });
                }
              }
            }}
            disabled={syncInProgress}
            title={isTrackReposted ? 'Remove repost' : 'Repost'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: isTrackReposted ? '#8456ff' : 'rgba(255, 255, 255, 0.7)'
            }}
          >
            <IconShare />
          </button>
          <span className="repost-count-mini" style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.7)',
            minWidth: '20px'
          }}>
            {repostsCount?.toLocaleString() || 0}
          </span>

          <button
            className="more-button-mini"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('openTrackMenu', {
                detail: {
                  trackId: track.id,
                  track: track,
                  position: {
                    x: e.clientX,
                    y: e.clientY
                  }
                }
              }));
            }}
            title="More actions"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            <IconMore />
          </button>

          <div className="track-stat plays-stat" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <IconEye />
            <span>
              {playsCount?.toLocaleString() || 0}
            </span>
          </div>

          <div className="track-stat comments-stat" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <IconComment />
            <span>
              {commentsCount?.toLocaleString() || 0}
            </span>
          </div>

          {/* 🗑️ Кнопка удаления трека (только для своих) */}
          {canDeleteThisTrack && (
            <button
              className="track-delete-inline"
              title="Удалить трек"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMyTrack(track.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              <IconTrash />
            </button>
          )}
        </div>
      </div>
    );
  };

  // 🔥 МИНИ-КАРТОЧКА ПЛЕЙЛИСТА (для вкладки All и Playlists)
  // ✅ Функция: получить очередь треков плейлиста (ids) с бэка (как в LibraryPage)
  const fetchPlaylistQueueIds = async (playlistId) => {
    if (!playlistId) return [];
    if (playlistQueueCache[playlistId]?.length) {
      return playlistQueueCache[playlistId];
    }
    try {
      const r = await apiFetch(`/api/playlists/${playlistId}/`);
      if (!r.ok) return [];
      const d = await r.json();

      const items = d?.items || d?.playlist?.items || [];
      const tracks = items
        .map((it) => it?.track || it)
        .filter(Boolean);

      const ids = tracks.map((t) => t?.id).filter((x) => x != null);

      setPlaylistQueueCache((prev) => ({ ...prev, [playlistId]: ids }));
      return ids;
    } catch (e) {
      console.error('ProfilePage: fetchPlaylistQueueIds error', e);
      return [];
    }
  };

  // ✅ Play/Pause плейлиста: ставим очередь и запускаем первый трек
  const handlePlaylistPlayPause = async (pl) => {
    if (!pl?.id) return;

    // если уже этот плейлист активен — просто toggle play/pause
    if (playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0) {
      onPlayPause?.(); // toggle
      return;
    }

    const ids = await fetchPlaylistQueueIds(pl.id);
    if (!ids.length) return;

    if (typeof setPlaybackQueue === 'function') {
      setPlaybackQueue(ids);
    }

    setPlayingPlaylistId(pl.id);

    // запускаем первый трек
    if (typeof playTrack === 'function' && ids[0]) {
      const track = trackData?.[ids[0]];
      if (track) {
        playTrack(track);
      }
    }
  };

  // ✅ Карточка плейлиста (как в LibraryPage) — для вкладки All и Playlists
  const renderPlaylistCard = (pl) => {
    if (!pl?.id) return null;

    const isThisPlaylistPlaying =
      playingPlaylistId === pl.id &&
      Array.isArray(playQueueIds) &&
      playQueueIds.length > 0;

    const cover = pl.cover_url || pl.cover || '/default-cover.jpg';
    const title = pl.title || 'Untitled playlist';
    const tracksCount = pl.track_count ?? pl.tracks_count ?? 0;

    return (
      <div key={`pl-${pl.id}`} className="library-playlist-row">
        <div className="library-playlist-left">
          <div
            className="playlist-cover-wrap"
            onClick={() => navigate(`/playlist/${pl.id}`)}
            title="Open playlist"
          >
            <img className="library-playlist-cover" src={cover} alt={title} />

            <button
              className="playlist-cover-play"
              onClick={(e) => {
                e.stopPropagation();
                handlePlaylistPlayPause(pl);
              }}
              aria-label={isThisPlaylistPlaying && isPlaying ? 'Pause playlist' : 'Play playlist'}
            >
              {isThisPlaylistPlaying && isPlaying ? <IconPause /> : <IconPlay />}
            </button>
          </div>

          <div className="library-playlist-meta">
            <div
              className="library-playlist-title clickable"
              onClick={() => navigate(`/playlist/${pl.id}`)}
              title="Open playlist"
            >
              {title}
            </div>
            <div className="library-playlist-sub">
              {tracksCount} tracks
            </div>
          </div>
        </div>

        <div className="playlist-actions">
          <button
            className={`pl-action-btn ${isPlaylistLiked?.(pl.id) ? 'active' : ''}`}
            onClick={() => togglePlaylistLike?.(pl.id)}
            title="Like"
          >
            {isPlaylistLiked?.(pl.id) ? <IconHeartFilled /> : <IconHeartOutline />}
            <span>{getPlaylistLikeCount?.(pl.id) ?? pl.likes_count ?? 0}</span>
          </button>

          <button
            className={`pl-action-btn ${isPlaylistReposted?.(pl.id) ? 'active' : ''}`}
            onClick={() => togglePlaylistRepost?.(pl.id)}
            title="Repost"
          >
            {isPlaylistReposted?.(pl.id) ? <IconRepostFilled /> : <IconRepostOutline />}
            <span>{getPlaylistRepostCount?.(pl.id) ?? pl.repost_count ?? pl.reposts_count ?? 0}</span>
          </button>
        </div>
      </div>
    );
  };

  
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
  
  return (
    <div className="profile-page-wrapper">
      <div className="gridscan-background">
        <GridScan 
          key={`${gridScanColors.gridBgColor}-${gridScanColors.linesColor}-${gridScanColors.scanColor}`}
          {...gridScanConfig}
        />
      </div>
      
      <div className="profile-app-layout">
        <div className="profile-sidebar-container">
          <Sidebar
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayPause={onPlayPause}
            playTrack={playTrack}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            user={currentUserProp}
            getAuthToken={getAuthToken}
            navigate={navigate}
            reposts={reposts}
            loadMyReposts={loadMyReposts}
          />
        </div>
        
        <div className="profile-content-container">
          <header className="site-header glass-header">
            <nav className="sound-nav">
              <div className="nav-left">
                <button
                  className="brand"
                  onClick={() => navigate('/')}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
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
                          return;
                        }
                        if (label === 'Messages') {
                          navigate('/messagehub');
                          return;
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

          <main className="profile-page-content">
            <section className="profile-header-image">
              {headerImageUrl ? (
                <img
                  src={headerImageUrl}
                  alt="Profile header"
                  className="profile-header-bg"
                  key={headerImageUrl}
                  onLoad={() => {
                    if (!extractingColor) {
                      extractColorsFromHeader();
                    }
                  }}
                  onError={(e) => {
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

              {/* ✅ КНОПКА REPORT ДЛЯ ЧУЖИХ ПРОФИЛЕЙ */}
              {!isMyProfile && currentUserProp && profileUserId && (
                <div className="header-controls">
                  <button
                    className="gooey-btn report-user-btn"
                    onClick={() => navigate(`/report/user/${profileUserId}`)}
                    title="Пожаловаться на пользователя"
                  >
                    Report
                  </button>
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

              {isMyProfile && (
                <div className="edit-about-controls">
                  <button
                    className="gooey-btn edit-about-btn"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit About
                  </button>
                </div>
              )}

              <div className="profile-header-overlay">
                {/* ✅ ИСПРАВЛЕННАЯ ОБОЛОЧКА АВАТАРКИ */}
                <div className="profile-avatar-shell">
                  <div className="profile-avatar-wrapper">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={currentUser?.username}
                        className="profile-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        <IconUserCircle />
                      </div>
                    )}

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

                  {/* ✅ Кружок статуса ВНЕ wrapper — теперь его ничего не перекроет */}
                  <span 
                    className={`profile-presence ${profilePresence}`} 
                    title={profilePresence}
                  />
                </div>

                <div className="profile-header-text">
                  {/* ✅ ЗАГОЛОВОК С АДМИН-БЕЙДЖЕМ */}
                  <h1 className="profile-username">
                    <span className="profile-username-text">
                      {currentUser?.username || 'Engstrom'}
                    </span>

                    {(currentUser?.is_admin || currentUser?.is_staff || currentUser?.is_superuser) && (
                      <span className="profile-admin-badge" title="Администратор">
                        <span className="profile-admin-crown">👑</span>
                        ADMIN
                      </span>
                    )}
                  </h1>
                  
                  <p className="profile-bio">
                    {currentUser?.bio || 'Electronic music producer • Berlin • Releases on Monstercat, NCS, and Spinnin\' Records'}
                  </p>
                  
                  {currentUser?.country && (
                    <p className="profile-country">
                      <strong>Country:</strong> {currentUser.country}
                    </p>
                  )}

                  <div className="profile-stats">
                    <div className="stat-item">
                      <span className="stat-number">{profileStats.tracks}</span>
                      <span className="stat-label">Tracks</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-number">{profileStats.plays.toLocaleString()}</span>
                      <span className="stat-label">Plays</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-number">{profileStats.followers.toLocaleString()}</span>
                      <span className="stat-label">Followers</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-number">{profileStats.following.toLocaleString()}</span>
                      <span className="stat-label">Following</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 🔥 СЕКЦИЯ С ТАБАМИ И КНОПКОЙ FOLLOW */}
            <div className="profile-tabs-row">
              <div className="profile-tabs-section">
                <GooeyNav
                  items={[
                    { label: 'All' },
                    { label: 'Popular tracks' },
                    { label: 'Tracks' },
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
                  onNavigate={handleTabChange}
                  className="profile-gooey-tabs"
                />
              </div>
              
              {!isMyProfile && currentUserProp?.id && user?.id && (
                <div className="nav-follow-container">
                  <button
                    className={`nav-follow-btn ${
                      !followsLoaded ? 'loading' : 
                      isFollowingArtist ? 'following' : ''
                    } ${followLoading ? 'loading' : ''}`}
                    onClick={handleFollowToggle}
                    disabled={!followsLoaded || followLoading}
                  >
                    {!followsLoaded 
                      ? '...' 
                      : followLoading 
                        ? '...' 
                        : (isFollowingArtist ? 'Following' : 'Follow')}
                  </button>
                </div>
              )}
              
              <div className="profile-actions">
                {/* Дополнительные кнопки действий */}
              </div>
            </div>

            {activeTab === 'Repost' ? (
              <section className="reposts-section">
                <div className="profile-section-header">
                  <h2>Reposts</h2>
                  <span className="track-count">
                    {userReposts.length} tracks, {repostTabPlaylists.length} playlists
                  </span>
                </div>
                
                {/* 🔥 НОВОЕ: Репостнутые плейлисты (с фильтрацией по SocialContext) */}
                {loadingRepostedPlaylists ? (
                  <div className="loading-playlists">
                    <p>Loading reposted playlists...</p>
                  </div>
                ) : repostTabPlaylists.length > 0 && (
                  <div className="profile-playlists-section">
                    <div className="profile-playlists-header">
                      <span>Reposted playlists</span>
                      <span className="profile-playlists-count">{repostTabPlaylists.length}</span>
                    </div>

                    <div className="library-playlists-list profile-playlists-list">
                      {repostTabPlaylists.map((pl) => renderPlaylistCard(pl))}
                    </div>
                  </div>
                )}

                {/* 🔥 Репостнутые треки */}
                {loadingReposts ? (
                  <div className="loading-reposts">
                    <p>Loading reposted tracks...</p>
                  </div>
                ) : userReposts.length === 0 ? (
                  <p className="empty-state">
                    {isMyProfile ? "You haven't reposted any tracks yet." : "User hasn't reposted any tracks yet."}
                  </p>
                ) : (
                  <div className="profile-tracks-list">
                    {userReposts.map(track => renderTrackCard(track, true))}
                  </div>
                )}
              </section>
            ) : (
              <section className="profile-body">
                <div className="profile-section-header">
                  <h2>{activeTab}</h2>

                  <span className="track-count">
                    {activeTab === 'Playlists'
                      ? `${userPlaylists.length} playlists`
                      : `${trackCount} tracks`}
                  </span>
                </div>

                {/* ✅ Вкладка Playlists (только плейлисты автора) */}
                {activeTab === 'Playlists' ? (
                  <div className="profile-playlists-section">
                    {userPlaylists.length > 0 ? (
                      <div className="library-playlists-list profile-playlists-list">
                        {userPlaylists.map((pl) => renderPlaylistCard(pl))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>No playlists yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ✅ Остальные вкладки — треки как раньше */
                  <div className="profile-tracks-list">
                    {tracksToShow.length > 0 ? (
                      <>
                        {tracksToShow.map(track => renderTrackCard(track, false))}

                        {/* ✅ Плейлисты в All (лайк+репост пересечение) */}
                        {activeTab === 'All' && allActivityPlaylists.length > 0 && (
                          <div className="profile-playlists-section">
                            <div className="profile-playlists-header">
                              <span>Playlists</span>
                              <span className="profile-playlists-count">{allActivityPlaylists.length}</span>
                            </div>

                            <div className="library-playlists-list profile-playlists-list">
                              {allActivityPlaylists.map((pl) => renderPlaylistCard(pl))}
                            </div>
                          </div>
                        )}
                      </>
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
                )}
              </section>
            )}
          </main>
        </div>
      </div>
      
      {/* Модальное окно «Edit About» */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content-glass" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit About</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-bio" className="form-label">
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  rows={6}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="form-textarea"
                  placeholder="Tell the world about yourself..."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-country" className="form-label">
                  Country
                </label>
                <input
                  id="edit-country"
                  type="text"
                  value={editCountry}
                  placeholder="e.g., United States, Germany"
                  onChange={e => {
                    const val = e.target.value;
                    setEditCountry(val);

                    if (val && !/^[A-Za-z\s-]+$/.test(val)) {
                      setEditCountryError(
                        'Country may contain only English letters, spaces and hyphens'
                      );
                    } else {
                      setEditCountryError('');
                    }
                  }}
                  className={`form-input ${editCountryError ? 'error' : ''}`}
                />
                
                {editCountryError && (
                  <div className="error-message">
                    ⚠️ {editCountryError}
                  </div>
                )}
                
                <div className="form-hint">
                  Country may contain only English letters, spaces, and hyphens.
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn save"
                disabled={!!editCountryError}
                onClick={async () => {
                  if (editCountryError) {
                    alert(editCountryError);
                    return;
                  }

                  try {
                    const token = getAuthToken();
                    if (!token) {
                      alert('Authorization required');
                      return;
                    }
                    const resp = await fetch('http://localhost:8000/api/users/me/', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        bio: editBio,
                        country: editCountry
                      })
                    });
                    const data = await resp.json();
                    if (!resp.ok) {
                      throw new Error(data.error || 'Profile update error');
                    }
                    
                    if (data.user && updateUser) {
                      updateUser(data.user);
                    }
                    
                    await loadProfileData();
                    setIsEditModalOpen(false);
                    alert('Profile updated successfully');
                  } catch (err) {
                    console.error('Ошибка сохранения профиля:', err);
                    alert(err.message);
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      <GlassMusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        isLiked={isLiked(currentTrack)}
        onToggleLike={() => {
          if (currentTrack) {
            toggleLike(currentTrack);
          }
        }}
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