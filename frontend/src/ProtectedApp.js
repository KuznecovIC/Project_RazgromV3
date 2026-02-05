import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from './context/UserContext';
import GridScan from './GridScan';
import Shuffle from './components/Shuffle';
import GooeyNav from './components/GooeyNav';
import GlassMusicPlayer from './components/GlassMusicPlayer';
import Sidebar from './components/Sidebar';
import FeedPage from './components/FeedPage';
import LibraryPage from './components/LibraryPage';
import TrackPage from './components/TrackPage'; 
import UploadPage from './components/UploadPage';
import FloatingLinesDropdown from './components/FloatingLinesDropdown';
import logoMark from './logo1.ico';
import './App.css';
import './components/Sidebar.css';

// Иконки (оставляем без изменений)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41zM19 3a2 2 0 012 2v4h-2V5H5v14h14v-4h2v4a2 2 0 01-2 2H5a2 01-2-2h14z"
      fill="currentColor"
    />
  </svg>
);

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
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 18h12l-1.3-2.2a6.8 6.8 0 0 1-.9-3.4V11a4.8 4.8 0 0 0-9.6 0v1.4a6.8 6.8 0 0 1-.9 3.4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const IconMessage = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8A2.5 2.5 0 0 1 18.5 17H7l-4 3V6.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
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

const IconUserCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const IconMore = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
  </svg>
);

const IconSpinner = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="spinner-icon">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

// =============== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ===============

const CompactTrackCard = ({ 
  track, 
  isPlaying, 
  onPlayPause, 
  isLiked, 
  onToggleLike, 
  isLoading = false, 
  isNew = false, 
  onTrackTitleClick,
  onArtistClick // ← ДОБАВЛЕНО: обработчик клика по автору
}) => {
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isArtistHovered, setIsArtistHovered] = useState(false);
  
  const getCoverUrl = useCallback((cover) => {
    if (!cover) return 'https://via.placeholder.com/300x300';
    
    if (cover.startsWith('http://') || cover.startsWith('https://')) {
      return cover;
    }
    
    if (cover.startsWith('/media/')) {
      return `http://localhost:8000${cover}`;
    }
    
    return 'https://via.placeholder.com/300x300';
  }, []);
  
  // ✅ Функция клика по автору (точно как в GlassMusicPlayer)
  const handleArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick && track?.uploaded_by?.id) {
      onArtistClick(e, track);
    }
  };
  
  return (
    <div className={`compact-track-card ${isPlaying ? 'playing' : ''}`}>
      <div className="compact-track-cover">
        <img 
          src={getCoverUrl(track.cover || track.cover_url)} 
          alt={track.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/300x300';
          }}
        />
        {isNew && <div className="new-track-badge">NEW</div>}
        <button
          className="compact-play-button"
          onClick={() => onPlayPause(track.id, track)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={isLoading}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
      </div>
      <div className="compact-track-info">
        <h4 
          className="compact-track-title"
          onClick={(e) => {
            e.stopPropagation();
            if (onTrackTitleClick) {
              onTrackTitleClick(track.id);
            }
          }}
          onMouseEnter={() => setIsTitleHovered(true)}
          onMouseLeave={() => setIsTitleHovered(false)}
          style={{ 
            cursor: 'pointer',
            color: isTitleHovered ? '#8456ff' : 'white',
            transition: 'color 0.2s ease',
            fontSize: '0.8rem',
            fontWeight: '700',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '4px',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.6em'
          }}
        >
          {track.title}
        </h4>
        {/* ✅ ИСПРАВЛЕННЫЙ АВТОР: КЛИКАБЕЛЬНЫЙ */}
        <p 
          className="compact-track-artist clickable-artist"
          onClick={handleArtistClick}
          onMouseEnter={() => setIsArtistHovered(true)}
          onMouseLeave={() => setIsArtistHovered(false)}
          style={{
            fontSize: '0.65rem',
            color: isArtistHovered ? '#8456ff' : 'rgba(255, 255, 255, 0.6)',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '12px',
            lineHeight: '1.3',
            minHeight: '1.3em',
            cursor: 'pointer',
            transition: 'color 0.2s ease'
          }}
        >
          {track.uploaded_by?.username || track.artist}
        </p>
        <div className="compact-track-actions">
          <button
            className={`compact-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(track.id);
            }}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: isLiked ? '#8456ff' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconHeart filled={isLiked} />
          </button>
          <button 
            className="compact-more-btn" 
            aria-label="More options"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconMore />
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, subtitle, isShuffleText = false }) => {
  return (
    <div className="section-header-soundcloud">
      <div className="section-title-row">
        <div className="section-title-wrapper">
          <div className="section-title">
            <Shuffle
              text={title}
              shuffleDirection="right"
              duration={0.4}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              style={{ 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'white',
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
          </div>
          {isShuffleText ? (
            <div className="section-subtitle-shuffle">
              <Shuffle
                text={subtitle}
                shuffleDirection="right"
                duration={0.4}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.02}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                respectReducedMotion={true}
                style={{ 
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.3px'
                }}
              />
            </div>
          ) : subtitle ? (
            <p className="section-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const GlowFilter = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      <filter id="glow-effect" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  </svg>
);

// ============================================
// 🎯 ProtectedApp (ИСПРАВЛЕННАЯ АРХИТЕКТУРА)
// ============================================
const ProtectedApp = ({ 
  user, 
  onLogout, 
  
  // 🎵 Воспроизведение
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  onTogglePlayPause,
  currentTime, 
  duration, 
  onSeek,
  volume = 0.7,
  onVolumeChange,
  onNext,
  onPrevious,
  loopEnabled = false,
  onToggleLoop,
  
  // ❤️ Лайки
  likedTrackIds = [],          
  onToggleLike,
  
  // 📦 Данные треков
  tracksById = {},             
  
  // ⏰ История воспроизведения
  recentTrackIds = [],
  
  // 🎯 Функции
  playTrack,                   
  
  // Прочие
  sessionToken,
  addTracks,
  isLoadingTrack = false,
  
  // ✅ ДОБАВЛЕНО: navigate от App.js
  navigate: parentNavigate 
}) => {
  const navigate = useNavigate(); // 🎯 Получаем navigate из useNavigate
  const location = useLocation();
  
  // ✅ Используем parentNavigate если он передан, иначе локальный navigate
  const actualNavigate = parentNavigate || navigate;
  
  // ✅ ИСПОЛЬЗУЕМ UserContext для синхронизации аватара
  const { user: globalUser, loading: userLoading, refreshUser } = useUser();
  const [sidebarKey, setSidebarKey] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  // ✅ Загруженные треки пользователя
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  // ✅ Используем пользователя из UserContext (если есть), иначе из пропсов
  const displayUser = globalUser || user;

  // ✅ Функция получения JWT токена (ТОЛЬКО JWT!)
  const getAuthToken = useCallback(() => {
    console.log('🔑 ProtectedApp: Получение JWT токена...');
    
    // Ищем токен в разных местах
    const token = 
      sessionToken || 
      localStorage.getItem('accessToken') || 
      localStorage.getItem('access') ||
      localStorage.getItem('token') ||
      localStorage.getItem('sessionToken');
    
    console.log('🔑 ProtectedApp: Токен:', token ? 'есть' : 'отсутствует');
    
    if (!token) {
      console.warn('⚠️ ProtectedApp: JWT токен не найден');
    }
    
    return token;
  }, [sessionToken]);

  // ✅ Загрузка треков пользователя из API
  useEffect(() => {
    console.log('🔵 ProtectedApp: Начинаю загрузку треков...');
    
    const token = getAuthToken();
    console.log('🔵 ProtectedApp: Токен из localStorage:', token ? 'есть' : 'отсутствует');
    
    if (!token) {
      console.warn('⚠️ ProtectedApp: Нет токена авторизации');
      return;
    }
    
    setIsLoadingTracks(true);
    
    // ✅ ИСПРАВЛЕНО: Правильный fetch с JWT
    fetch('http://localhost:8000/api/tracks/uploaded/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        console.log('🔵 ProtectedApp: Статус ответа:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('🔵 ProtectedApp: Получены данные треков:', data);
        
        if (data.success) {
          setUploadedTracks(data.tracks || []);
          console.log(`✅ ProtectedApp: Загружено ${data.tracks?.length || 0} треков`);
        } else {
          console.warn('⚠️ ProtectedApp: API вернул success: false', data);
          setUploadedTracks([]);
        }
      })
      .catch(err => {
        console.error('❌ ProtectedApp: Ошибка загрузки треков:', err);
        setUploadedTracks([]);
      })
      .finally(() => {
        setIsLoadingTracks(false);
      });
  }, [getAuthToken]);

  // ✅ Преобразуем tracksById в массив для отображения
  const allTracksArray = Object.values(tracksById || {}).filter(track => 
    track && track.id && track.title
  ).sort((a, b) => a.id - b.id);

  // Статические данные для демо (если нет tracksById)
  const tracksForYou = [
    {
      id: 1,
      title: "hard drive (slowed & muffled)",
      artist: "griffinilla",
      cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGF8gEyh_MA8=&rs=AOn4CLDjiyHGoELcWa2t37NenbmBQ-JlSw",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: "3:20",
      uploaded_by: { id: 1, username: "griffinilla" } // ← ДОБАВЛЕНО для демо
    },
    {
      id: 2,
      title: "Deutschland",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      duration: "5:22",
      uploaded_by: { id: 2, username: "Rammstein" } // ← ДОБАВЛЕНО для демо
    },
    {
      id: 3,
      title: "Sonne",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      duration: "4:05",
      uploaded_by: { id: 2, username: "Rammstein" } // ← ДОБАВЛЕНО для демо
    }
  ];

  // ✅ Используем треки из tracksById или демо-данные
  const displayTracks = allTracksArray.length > 0 
    ? allTracksArray.slice(0, 6).map(track => ({
        ...track,
        // ✅ ДОБАВЛЯЕМ uploaded_by если его нет в tracksById
        uploaded_by: track.uploaded_by || { id: track.user_id || 0, username: track.artist }
      }))
    : tracksForYou;

  // ✅ Загруженные треки пользователя для отображения
  const curatedTracks = uploadedTracks.length > 0 
    ? uploadedTracks.slice(0, 3).map(track => ({
        ...track,
        id: track.id || track.track_id,
        title: track.title || 'Без названия',
        artist: track.artist || displayUser?.username || 'Автор',
        cover: track.cover_url || track.cover || '',
        audio_url: track.audio_url || track.audio_file,
        uploaded_by: track.uploaded_by || { 
          id: track.uploaded_by_id || displayUser?.id || 0, 
          username: track.uploaded_by_username || displayUser?.username || track.artist 
        },
        isUserTrack: true
      }))
    : [
        {
          id: 4,
          title: "Electronic Dreams",
          artist: "Synthwave Collective",
          cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          duration: "4:15",
          uploaded_by: { id: 3, username: "Synthwave Collective" }, // ← ДОБАВЛЕНО
          isUserTrack: false
        },
        {
          id: 5,
          title: "Neon Lights",
          artist: "Cyberpunk DJ",
          cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          duration: "3:45",
          uploaded_by: { id: 4, username: "Cyberpunk DJ" }, // ← ДОБАВЛЕНО
          isUserTrack: false
        },
        {
          id: 6,
          title: "Midnight Drive",
          artist: "Retro Future",
          cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
          duration: "5:10",
          uploaded_by: { id: 5, username: "Retro Future" }, // ← ДОБАВЛЕНО
          isUserTrack: false
        }
      ];

  const primaryNav = [
    { label: 'Home', href: '#home' },
    { label: 'Feed', href: '#feed' },
    { label: 'Library', href: '#library' },
  ];

  const actionIcons = [
    { label: 'Upload', Icon: IconUpload },
    { label: 'Notifications', Icon: IconBell },
    { label: 'Messages', Icon: IconMessage }
  ];

  // ✅ ИСПРАВЛЕННАЯ функция для переключения лайка (ТОЛЬКО JWT!)
  const handleToggleLike = useCallback(async (trackId) => {
    const token = getAuthToken();
    
    if (!token) {
      alert('Войдите в систему, чтобы ставить лайки');
      return;
    }
    
    console.log('💖 ProtectedApp: Переключение лайка трека:', trackId, {
      currentlyLiked: likedTrackIds.includes(trackId),
      token: token ? 'есть' : 'нет'
    });
    
    const newLikedState = !likedTrackIds.includes(trackId);
    
    try {
      // ✅ ПРАВИЛЬНЫЙ fetch с JWT (БЕЗ CSRF!)
      const response = await fetch('http://localhost:8000/api/tracks/like/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ ТОЛЬКО JWT
        },
        body: JSON.stringify({
          track_id: trackId,
          liked: newLikedState
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ ProtectedApp: Лайк сохранен на сервере:', data);
        
        // Вызываем колбэк родительского компонента
        if (onToggleLike) {
          onToggleLike(trackId);
        }
        
        // Отправляем глобальное событие
        window.dispatchEvent(new CustomEvent('trackLikedFromApp', {
          detail: { 
            trackId: trackId, 
            liked: newLikedState,
            count: data.like_count,
            fromApp: true,
            user: displayUser?.username
          }
        }));
        
      } else {
        console.error('❌ ProtectedApp: Ошибка сервера:', data.error);
        
        if (data.error && data.error.includes('аутентификации')) {
          alert('Сессия истекла. Пожалуйста, войдите заново.');
          onLogout?.();
        } else {
          alert(data.error || 'Ошибка при сохранении лайка');
        }
      }
    } catch (error) {
      console.error('❌ ProtectedApp: Сетевая ошибка лайка трека:', error);
      alert('Сетевая ошибка при сохранении лайка');
    }
  }, [getAuthToken, likedTrackIds, onToggleLike, onLogout, displayUser]);

  // ✅ ФУНКЦИЯ ПЕРЕХОДА В ПРОФИЛЬ (1:1 из GlassMusicPlayer)
  const handleArtistClick = useCallback((e, track) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      console.error("❌ ProtectedApp: нет uploaded_by.id", track);
      return;
    }
    
    actualNavigate(`/profile/${track.uploaded_by.id}`);
  }, [actualNavigate]);

  // ✅ ИСПРАВЛЕННАЯ функция воспроизведения для CompactTrackCard
  const handlePlayPauseForTrackCard = useCallback((trackId, trackInfo = null) => {
    console.log('🎵 ProtectedApp: Воспроизведение трека через TrackCard', trackId, {
      currentTrack,
      isPlaying,
      hasTrackInfo: !!trackInfo
    });
    
    // Если это тот же трек, переключаем паузу
    if (trackId === currentTrack) {
      console.log('⏯️ ProtectedApp: Тот же трек, используем onTogglePlayPause');
      if (onTogglePlayPause) {
        onTogglePlayPause();
      }
      return;
    }
    
    // Иначе воспроизводим новый трек
    const trackData = trackInfo || tracksById[trackId];
    if (trackData && playTrack) {
      console.log('🎵 ProtectedApp: Запуск нового трека через playTrack');
      playTrack(trackData);
    }
  }, [currentTrack, playTrack, onTogglePlayPause, tracksById]);

  // ✅ Проверка лайка трека
  const isTrackLiked = useCallback((trackId) => {
    return Array.isArray(likedTrackIds) && likedTrackIds.includes(trackId);
  }, [likedTrackIds]);

  // ✅ Обработчик клика по названию трека
  const handleTrackTitleClick = useCallback((trackId) => {
    navigate(`/track/${trackId}`);
  }, [navigate]);

  // ✅ Простая навигация
  const handleNavNavigate = (item, index) => {
    console.log('ProtectedApp: Navigation clicked:', item.label);
    
    if (item.label === 'Upload') {
      actualNavigate('/upload'); // ✅ Используем actualNavigate
      return;
    }
    
    let page = 'home';
    if (item.label === 'Feed') {
      page = 'feed';
    } else if (item.label === 'Library') {
      page = 'library';
    }
    actualNavigate(`/?page=${page}`); // ✅ Используем actualNavigate
  };

  // ✅ Получаем текущую страницу из URL
  const currentPage = (() => {
    const params = new URLSearchParams(location.search);
    const pageParam = params.get('page');
    return pageParam === 'feed' || pageParam === 'library' ? pageParam : 'home';
  })();

  // ✅ Показывать ли сайдбар
  const showSidebar = !window.location.pathname.startsWith('/track/') && 
                     !window.location.pathname.startsWith('/upload/');

  // ✅ Получаем информацию о текущем треке
  const currentTrackInfo = currentTrack && tracksById[currentTrack] 
    ? tracksById[currentTrack] 
    : null;

  console.log('🎯 ProtectedApp статус:', {
    currentTrack,
    isPlaying,
    hasTogglePlayPause: !!onTogglePlayPause,
    allTracksCount: allTracksArray.length,
    likedTrackIdsCount: likedTrackIds.length,
    recentTrackIdsCount: recentTrackIds.length,
    uploadedTracksCount: uploadedTracks.length,
    isLoadingTracks,
    currentPage,
    showSidebar,
    hasGlobalUser: !!globalUser,
    userLoading,
    hasParentNavigate: !!parentNavigate,
    hasLocalNavigate: !!navigate
  });

  // ✅ Рендер секции с загруженными треками
  const renderCuratedSection = () => {
    if (isLoadingTracks) {
      return (
        <div className="loading-tracks-message">
          <IconSpinner />
          <p>Загружаем ваши треки...</p>
        </div>
      );
    }

    return (
      <div className="compact-tracks-grid">
        {curatedTracks.map(track => (
          <CompactTrackCard
            key={track.id}
            track={track}
            isPlaying={currentTrack === track.id && isPlaying}
            isLiked={isTrackLiked(track.id)}
            onPlayPause={handlePlayPauseForTrackCard}
            onToggleLike={handleToggleLike}
            onTrackTitleClick={handleTrackTitleClick}
            onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
            isNew={track.isUserTrack}
            isLoading={isLoadingTrack}
          />
        ))}
      </div>
    );
  };

  // ✅ Обработчик закрытия меню пользователя при клике снаружи
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ Обработчик выхода из системы
  const handleLogoutAction = useCallback(() => {
    if (onLogout) {
      onLogout();
    }
    setShowUserMenu(false);
    actualNavigate('/'); // ✅ Используем actualNavigate
  }, [onLogout, actualNavigate]);

  // ✅ Функция получения URL аватара
  const getAvatarUrl = () => {
    if (displayUser?.avatar) {
      // Если это полный URL
      if (displayUser.avatar.startsWith('http')) {
        return displayUser.avatar;
      }
      // Если это относительный путь
      return `http://localhost:8000${displayUser.avatar}`;
    }
    return null;
  };

  return (
    <div className="app" id="top">
      <GlowFilter />
      <GridScan
        className="background-gridscan"
        sensitivity={0.65}
        lineThickness={1}
        linesColor="#ffffff"
        gridScale={0.12}
        scanColor="#FF9FFC"
        scanOpacity={0.45}
        enablePost={true}
        bloomIntensity={0.8}
        chromaticAberration={0.001}
        noiseIntensity={0.012}
      />
      
      <div className="page-shell">
        <header className="site-header">
          <nav className="sound-nav">
            <div className="nav-left">
              <a className="brand" href="#top">
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
                  respectReducedMotion={true}
                  style={{ 
                    fontSize: '1.2rem',
                    marginLeft: '10px',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}
                />
              </a>
              
              <GooeyNav
                items={primaryNav}
                particleCount={12}
                particleDistances={[90, 20]}
                particleR={120}
                initialActiveIndex={currentPage === 'home' ? 0 : currentPage === 'feed' ? 1 : 2}
                activeIndex={currentPage === 'home' ? 0 : currentPage === 'feed' ? 1 : 2}
                animationTime={600}
                timeVariance={300}
                colors={[1, 2, 3, 4, 5, 6]}
                onNavigate={handleNavNavigate}
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
              <button className="nav-pill" type="button">For Artists</button>
              
              <div className="icon-group">
                {actionIcons.map(({ label, Icon }) => (
                  <button
                    key={label}
                    className="icon-button"
                    type="button"
                    aria-label={label}
                    onClick={() => {
                      if (label === 'Upload') {
                        actualNavigate('/upload'); // ✅ Используем actualNavigate
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
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                >
                  <div className="user-avatar-circle">
                    {userLoading ? (
                      <IconSpinner />
                    ) : getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()}
                        className="user-avatar-img"
                        alt="avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
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
                        {getAvatarUrl() ? (
                          <img
                            src={getAvatarUrl()}
                            className="dropdown-avatar-img"
                            alt=""
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconUserCircle />
                        )}
                      </div>
                      <div className="user-dropdown-info">
                        <div className="user-dropdown-username">
                          {displayUser?.username || 'User'}
                        </div>
                        <div className="user-dropdown-email">
                          {displayUser?.email || 'user@example.com'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-dropdown-divider" />
                    
                    <div className="user-dropdown-items">
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowUserMenu(false);
                          actualNavigate('/profile'); // ✅ Используем actualNavigate
                        }}
                      >
                        <IconProfile />
                        <span>Profile</span>
                      </button>
                      
                      <button
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowUserMenu(false);
                          actualNavigate('/settings'); // ✅ Используем actualNavigate
                        }}
                      >
                        <IconDots />
                        <span>Settings</span>
                      </button>
                      
                      <div className="user-dropdown-divider" />
                      
                      <button
                        className="user-dropdown-item logout-item"
                        onClick={handleLogoutAction}
                      >
                        <IconLogout />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </header>

        <main className="landing">
          <Routes>
            <Route
              path="/"
              element={
                currentPage === 'home' ? (
                  <>
                    <section className="soundcloud-section first-section" id="made-for-you">
                      <SectionHeader
                        title="Made for you"
                        subtitle="Curated by SoundCloud"
                        isShuffleText={true}
                      />
                      <div className="compact-tracks-grid">
                        {displayTracks.map(track => (
                          <CompactTrackCard
                            key={track.id}
                            track={track}
                            isPlaying={currentTrack === track.id && isPlaying}
                            isLiked={isTrackLiked(track.id)}
                            onPlayPause={handlePlayPauseForTrackCard}
                            onToggleLike={handleToggleLike}
                            onTrackTitleClick={handleTrackTitleClick}
                            onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
                            isLoading={isLoadingTrack}
                          />
                        ))}
                      </div>
                    </section>

                    <section className="soundcloud-section" id="discover-stations">
                      <SectionHeader
                        title={uploadedTracks.length > 0 ? "Your Uploaded Tracks" : "Discover with Stations"}
                        subtitle={uploadedTracks.length > 0 ? "Your music collection" : "Curated by SoundCloud"}
                        isShuffleText={true}
                      />
                      {renderCuratedSection()}
                    </section>

                    <section className="soundcloud-section" id="artists-watch">
                      <SectionHeader
                        title="Artists to watch out for"
                        subtitle="Curated by SoundCloud"
                        isShuffleText={true}
                      />
                      <div className="compact-tracks-grid">
                        {tracksForYou.map(track => (
                          <CompactTrackCard
                            key={track.id}
                            track={track}
                            isPlaying={currentTrack === track.id && isPlaying}
                            isLiked={isTrackLiked(track.id)}
                            onPlayPause={handlePlayPauseForTrackCard}
                            onToggleLike={handleToggleLike}
                            onTrackTitleClick={handleTrackTitleClick}
                            onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
                            isLoading={isLoadingTrack}
                          />
                        ))}
                      </div>
                    </section>
                  </>
                ) : currentPage === 'feed' ? (
                  <FeedPage
                    // 🎵 Воспроизведение
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPauseForTrackCard}
                    
                    // ❤️ Лайки
                    likedTrackIds={likedTrackIds}
                    onToggleLike={handleToggleLike}
                    
                    // 📦 Данные треков
                    tracksById={tracksById}
                    recentTrackIds={recentTrackIds}
                    
                    // ⏰ Время и управление
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={onSeek}
                    
                    // 🔗 Навигация
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
                    
                    // 📤 Загруженные треки
                    uploadedTracks={uploadedTracks}
                    isLoadingTracks={isLoadingTracks}
                    
                    // ⏳ Статус загрузки трека
                    isLoadingTrack={isLoadingTrack}
                    
                    // 🔑 Авторизация
                    getAuthToken={getAuthToken}
                  />
                ) : currentPage === 'library' ? (
                  <LibraryPage
                    // 🎵 Воспроизведение
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPauseForTrackCard}
                    
                    // ❤️ Лайки
                    likedTrackIds={likedTrackIds}
                    onToggleLike={handleToggleLike}
                    
                    // 📦 Данные треков
                    tracksById={tracksById}
                    recentTrackIds={recentTrackIds}
                    
                    // ⏰ Время и управление
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={onSeek}
                    
                    // 🔗 Навигация
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
                    
                    // 📤 Загруженные треки
                    uploadedTracks={uploadedTracks}
                    isLoadingTracks={isLoadingTracks}
                    
                    // ⏳ Статус загрузки трека
                    isLoadingTrack={isLoadingTrack}
                    
                    // 🔑 Сессия
                    sessionToken={sessionToken}
                    
                    // 🔑 Авторизация
                    getAuthToken={getAuthToken}
                  />
                ) : null
              }
            />
            
            <Route
              path="/track/:trackId"
              element={
                <TrackPage
                  user={displayUser}
                  sessionToken={sessionToken}
                  onLogout={onLogout}
                  
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  onPlayPause={onPlayPause}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={onSeek}
                  volume={volume}
                  onVolumeChange={onVolumeChange}
                  onNext={onNext}
                  onPrevious={onPrevious}
                  loopEnabled={loopEnabled}
                  onToggleLoop={onToggleLoop}
                  
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTrackIds}
                  checkTrackLiked={isTrackLiked}
                  
                  trackData={tracksById}
                  uploadedTracks={uploadedTracks}
                  
                  // 🔑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Передаем только функцию JWT токена
                  getAuthToken={getAuthToken}
                />
              }
            />
            
            <Route
              path="/upload"
              element={
                <UploadPage
                  user={displayUser}
                  sessionToken={sessionToken}
                  onUploadSuccess={(trackId) => {
                    if (trackId) {
                      setTimeout(() => {
                        navigate(`/track/${trackId}`);
                      }, 1500);
                    }
                  }}
                  getAuthToken={getAuthToken}
                />
              }
            />
          </Routes>
        </main>
      </div>

      {/* 🎯 GlassMusicPlayer */}
      {currentTrack && (
        <GlassMusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={() => {
            // Используем togglePlayPause для текущего трека
            if (onTogglePlayPause) {
              onTogglePlayPause();
            } else if (onPlayPause) {
              onPlayPause();
            }
          }}
          onNext={onNext}
          onPrevious={onPrevious}
          volume={volume}
          onVolumeChange={onVolumeChange}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          isLiked={isTrackLiked(currentTrack)}
          onToggleLike={() => handleToggleLike(currentTrack)}
          loopEnabled={loopEnabled}
          onToggleLoop={onToggleLoop}
          onTrackClick={handleTrackTitleClick}
          trackInfo={tracksById[currentTrack]} // ✅ Важно передать полный объект
          isLoading={isLoadingTrack}
          
          // 🔑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Передаем только функцию JWT токена
          getAuthToken={getAuthToken}
          
          // 🎯 ДОБАВЛЕНО: Передаем navigate для кликабельности артиста
          navigate={actualNavigate} // ✅ Используем actualNavigate
        />
      )}

      {/* 🎯 Sidebar */}
      {showSidebar && (
        <div className="sidebar open" key={sidebarKey}>
          <Sidebar
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlayPause={onTogglePlayPause}
            onToggleLike={handleToggleLike}
            onTrackTitleClick={handleTrackTitleClick}
            currentTime={currentTime}
            likedTrackIds={likedTrackIds}
            tracksById={tracksById}
            playTrack={playTrack}
            user={displayUser}
            isLoadingTrack={isLoadingTrack}
            
            // 🔑 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Передаем только функцию JWT токена
            getAuthToken={getAuthToken}
            
            // 🎯 ПЕРЕДАЕМ navigate ДЛЯ КЛИКАБЕЛЬНОСТИ АВТОРА
            navigate={actualNavigate} // ✅ Используем actualNavigate
          />
        </div>
      )}
    </div>
  );
};

export default ProtectedApp;