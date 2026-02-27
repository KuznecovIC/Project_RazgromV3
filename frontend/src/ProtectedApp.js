import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useUser } from './context/UserContext';
import { useSocial } from './context/SocialContext';
import GridScan from './GridScan';
import Shuffle from './components/Shuffle';
import GooeyNav from './components/GooeyNav';
import GlassMusicPlayer from './components/GlassMusicPlayer';
import Sidebar from './components/Sidebar';
import FeedPage from './components/FeedPage';
import LibraryPage from './components/LibraryPage';
import ProfilePage from './components/ProfilePage';
import ArtistStudioHub from './components/ArtistStudioHub';
import StudioUserListPage from './components/StudioUserListPage';
import StudioTracksPage from './components/StudioTracksPage';
import StudioPlaylistsPage from './components/StudioPlaylistsPage';
import StudioPlaylistsHubPage from './components/StudioPlaylistsHubPage';
import StudioStatsPage from './components/StudioStatsPage';
import FloatingLinesDropdown from './components/FloatingLinesDropdown';
import SearchHub from './components/SearchHub';
import MessageHub from './components/MessageHub';
// ✅ ИМПОРТ АДМИНКИ
import AdminMenu from './components/AdminMenu';
// ✅ ИМПОРТ СТРАНИЦЫ АДМИНИСТРИРОВАНИЯ ТРЕКОВ
import AdminTracksPage from './components/AdminTracksPage';
// ✅ ИМПОРТ СТРАНИЦЫ АДМИНИСТРИРОВАНИЯ ПЛЕЙЛИСТОВ
import AdminPlaylistsPage from './components/AdminPlaylistsPage';
// ✅ ИМПОРТ СТРАНИЦЫ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (АДМИНКА) - ИСПРАВЛЕННЫЙ ПУТЬ
import AdminUsersPage from './components/AdminUsersPage';
// 🚫 ИМПОРТ ЭКРАНА БАНА
import BannedScreen from './components/BannedScreen';
// ✅ ИМПОРТ СТРАНИЦЫ ЖАЛОБЫ
import ReportUserPage from './components/ReportUserPage';
// ✅ ИМПОРТ СТРАНИЦЫ АДМИНКИ РЕПОРТОВ
import AdminReportsPage from './components/AdminReportsPage';
// 🔥 НОВЫЙ ИМПОРТ: страница настроек
import SettingsPage from './components/SettingsPage';
// ✅ ИМПОРТ API FETCH
import { apiFetch } from './api/apiFetch';
import logoMark from './logo1.ico';
import './App.css';
import './components/Sidebar.css';

// ✅ Добавляем API_URL для прямых fetch запросов
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// =============== ВСЕ ИКОНКИ ===============

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

// ✅ ИКОНКА АДМИНКИ (щит)
const IconAdmin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 16h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
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

const IconHome = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor" />
  </svg>
);

const IconFeed = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4h4v4H4zm0 6h4v4H4zm0 6h4v4H4zm6-12h10v4H10zm0 6h10v4H10zm0 6h10v4H10z" fill="currentColor" />
  </svg>
);

const IconLibrary = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" fill="currentColor" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor" />
  </svg>
);

const IconPrevious = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 18V6l8.5 6L6 18zm10 0V6h2v12h-2z" fill="currentColor" />
  </svg>
);

const IconVolume = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor" />
  </svg>
);

const IconLoop = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" fill="currentColor" />
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
  onArtistClick
}) => {
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isArtistHovered, setIsArtistHovered] = useState(false);
  
  const getCoverUrl = useCallback((cover) => {
    if (!cover) return null;
    
    if (cover.startsWith('http://') || cover.startsWith('https://')) {
      return cover;
    }
    
    if (cover.startsWith('/media/')) {
      return `http://localhost:8000${cover}`;
    }
    
    return null;
  }, []);
  
  const handleArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick && track?.uploaded_by?.id) {
      onArtistClick(e, track);
    }
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };
  
  return (
    <div className={`compact-track-card ${isPlaying ? 'playing' : ''}`}>
      <div className="compact-track-cover">
        {track.cover || track.cover_url ? (
          <img 
            src={getCoverUrl(track.cover || track.cover_url)} 
            alt={track.title}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('cover-fallback-active');
            }}
          />
        ) : (
          <div className="compact-cover-fallback">
            <span>🎵</span>
          </div>
        )}
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
// 🎯 ProtectedApp (С ПЕРСИСТЕНТНОСТЬЮ RECENTLY PLAYED)
// ============================================
const ProtectedApp = ({ 
  user: propUser, 
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
  
  // 📦 Данные треков
  tracksById = {},             
  
  // ⏰ История воспроизведения
  recentTrackIds: propRecentTrackIds,
  history = [],
  
  // 🎯 Функции
  playTrack,                   
  addTracks,
  
  // Прочие
  isLoadingTrack = false,
  
  // ✅ navigate от App.js
  navigate: parentNavigate,
  
  // 🔥 Функция записи прослушивания
  onRecordPlay,
  
  // 🔥 Полный объект текущего трека
  currentTrackFull,
  
  // ✅ Функция получения токена
  getAuthToken,
  
  // 🔥 НОВЫЕ ПРОПСЫ ДЛЯ ОЧЕРЕДИ ПЛЕЙЛИСТА
  setPlaybackQueue,
  playQueueIds
}) => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Используем useLocation для реактивности
  
  // ✅ Определяем роуты (используем location.pathname для реактивности)
  const isProfileRoute =
    location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const isStudioRoute =
    location.pathname === '/studio' || location.pathname.startsWith('/studio/');
  const isMessageRoute = location.pathname.startsWith('/messagehub');
  const isStudioPlaylistsRoute = location.pathname.startsWith('/studio/playlists');
  const isPlaylistPage = location.pathname.startsWith('/playlist/'); // для будущих публичных плейлистов
  // ✅ ФЛАГ АДМИН-РОУТОВ
  const isAdminRoute = location.pathname.startsWith('/admin');
  // ✅ ФЛАГ СТРАНИЦЫ ЖАЛОБЫ
  const isReportRoute = location.pathname.startsWith('/report/user');
  // ✅ ФЛАГ СТРАНИЦЫ НАСТРОЕК
  const isSettingsRoute = location.pathname.startsWith('/settings');
  
  const actualNavigate = parentNavigate || navigate;
  
  // 🔥 ВАЖНО: Используем user из контекста
  const { user: contextUser, loading: userLoading, refreshUser } = useUser();
  
  // 🔥 ВАЖНО: Используем SocialContext с функциями для плейлистов
  const { 
    toggleLike,
    isLiked,
    likedTrackIds,
    toggleFollow,
    toggleRepost,
    isFollowing,
    isReposted,
    // 🔥 ДОБАВЛЯЕМ ФУНКЦИИ ДЛЯ ПЛЕЙЛИСТОВ
    updatePlaylistLike,
    updatePlaylistRepost,
    playlistLikes,
    playlistLikeCounts,
    playlistReposts,
    playlistRepostCounts,
    togglePlaylistLike,
    togglePlaylistRepost
  } = useSocial();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  
  // ✅ Состояние для поиска в навбаре
  const [navSearch, setNavSearch] = useState('');

  // =============== СОСТОЯНИЯ ДЛЯ ПАГИНАЦИИ ===============
  const PAGE_SIZE = 6;
  const [madePage, setMadePage] = useState(0);
  const [discoverPage, setDiscoverPage] = useState(0);
  const [artistsPage, setArtistsPage] = useState(0);
  const [recentPage, setRecentPage] = useState(0); // ✅ Добавлено для "Recently played"
  // =======================================================

  // 🔥 2.1: СОСТОЯНИЯ ДЛЯ ПЛЕЙЛИСТОВ ПОЛЬЗОВАТЕЛЯ
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // ✅ Состояние "какой плейлист сейчас играет"
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);

  // 🔥 НОВЫЕ СОСТОЯНИЯ ДЛЯ AI РЕКОМЕНДАЦИЙ
  const [madeForYouAi, setMadeForYouAi] = useState([]);
  const [madeForYouAiLoading, setMadeForYouAiLoading] = useState(false);
  const [madeForYouAiErr, setMadeForYouAiErr] = useState('');

  // 🔥 НОВЫЕ СОСТОЯНИЯ ДЛЯ РЕКОМЕНДОВАННЫХ ПЛЕЙЛИСТОВ
  const [recommendedPlaylists, setRecommendedPlaylists] = useState([]);
  const [recPlaylistsLoading, setRecPlaylistsLoading] = useState(false);

  // 🔥 НОВЫЕ СОСТОЯНИЯ ДЛЯ ТРЕКОВ ОТ ПОДПИСОК
  const [followingTracks, setFollowingTracks] = useState([]);
  const [followingTracksLoading, setFollowingTracksLoading] = useState(false);

  // 🔥 СТАБИЛЬНАЯ ИСТОРИЯ (чтобы Recently played не пропадал)
  const [recentlyPlayedStable, setRecentlyPlayedStable] = useState([]);

  // =============== ПЕРСИСТЕНТНОСТЬ RECENTLY PLAYED ===============
  // ✅ СИНХРОНИЗИРОВАННЫЙ КЛЮЧ С App.js
  const getRecentKey = (userId) => `rg_recent:v1:${userId || 'anon'}`;
  
  // 🔥 refs для предотвращения гонки эффектов
  const recentHydratedRef = useRef(false);
  const lastHydratedUserIdRef = useRef(null);

  // 🔥 Инициализация recentTrackIds из localStorage с поддержкой пропсов
  const [recentTrackIds, setRecentTrackIds] = useState(() => {
    try {
      // Если пропсы пришли - используем их
      if (propRecentTrackIds && Array.isArray(propRecentTrackIds) && propRecentTrackIds.length > 0) {
        return propRecentTrackIds;
      }
      
      // Иначе грузим из localStorage
      const userId = contextUser?.id || propUser?.id;
      const raw = localStorage.getItem(getRecentKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return propRecentTrackIds && Array.isArray(propRecentTrackIds) ? propRecentTrackIds : [];
    }
  });

  // ✅ A) Сначала — гидрация/миграция (ставь ВЫШЕ сохранения)
  useEffect(() => {
    const userId = contextUser?.id || propUser?.id;
    if (!userId) return;

    // чтобы не гидрировать повторно того же пользователя
    if (lastHydratedUserIdRef.current === userId) return;
    lastHydratedUserIdRef.current = userId;

    try {
      const userKey = getRecentKey(userId);
      const rawUser = localStorage.getItem(userKey);

      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (Array.isArray(parsed)) {
          setRecentTrackIds(parsed);
        }
      } else {
        // если у тебя раньше сохранилось в anon — мигрируем в userKey
        const rawAnon = localStorage.getItem(getRecentKey(null));
        const parsedAnon = rawAnon ? JSON.parse(rawAnon) : [];
        if (Array.isArray(parsedAnon) && parsedAnon.length > 0) {
          setRecentTrackIds(parsedAnon);
          localStorage.setItem(userKey, JSON.stringify(parsedAnon));
          localStorage.removeItem(getRecentKey(null));
        }
      }
    } catch {}

    // ✅ только после попытки загрузки разрешаем сохранение
    recentHydratedRef.current = true;
  }, [contextUser?.id, propUser?.id]);

  // ✅ B) Потом — сохранение (только после гидрации)
  useEffect(() => {
    const userId = contextUser?.id || propUser?.id;
    if (!userId) return;

    // ❗ не даём затереть сохранённое пустым до гидрации
    if (!recentHydratedRef.current) return;

    try {
      localStorage.setItem(getRecentKey(userId), JSON.stringify(recentTrackIds || []));
    } catch {}
  }, [recentTrackIds, contextUser?.id, propUser?.id]);

  // 🔥 Синхронизация с пропсами (если родитель обновил)
  useEffect(() => {
    if (propRecentTrackIds && Array.isArray(propRecentTrackIds) && propRecentTrackIds.length > 0) {
      setRecentTrackIds(propRecentTrackIds);
    }
  }, [propRecentTrackIds]);

  // ====== LOCAL STATS (Hours on site / Hours listening) ======
  const getTodayKey = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const readDailyMap = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch {
      return {};
    }
  };

  const writeDailyMap = (key, map) => {
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  };

  const addSecondsToday = (storageKey, secondsToAdd) => {
    if (!statsUserId) return;
    const key = `${storageKey}_${statsUserId}`;
    const map = readDailyMap(key);
    const day = getTodayKey();
    map[day] = (Number(map[day] || 0) + Number(secondsToAdd || 0));
    writeDailyMap(key, map);
  };

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная проверка загрузки пользователя
  const displayUser = contextUser || propUser;
  const statsUserId = displayUser?.id;
  const shouldShowLoader = userLoading;
  const shouldRedirect = !userLoading && !displayUser;
  const shouldRenderApp = !shouldShowLoader && !shouldRedirect;

  // ✅ Функция получения JWT токена
  const getAuthTokenInternal = useCallback(() => {
    if (getAuthToken) {
      return getAuthToken();
    }
    
    const token = 
      localStorage.getItem('access') || 
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token');
    
    return token;
  }, [getAuthToken]);

  // ⏱️ TIME ON SITE (только когда вкладка видимая)
  useEffect(() => {
    if (!statsUserId) return;

    let last = Date.now();
    let ticking = true;

    const tick = () => {
      if (!ticking) return;
      const now = Date.now();
      const deltaSec = Math.max(0, Math.floor((now - last) / 1000));
      if (deltaSec > 0 && document.visibilityState === 'visible') {
        addSecondsToday('rg_site_seconds', deltaSec);
      }
      last = now;
    };

    const interval = setInterval(tick, 1000);

    const onVisibility = () => {
      // чтобы не накапливать огромный delta после возврата
      last = Date.now();
    };

    window.addEventListener('visibilitychange', onVisibility);

    return () => {
      ticking = false;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [statsUserId]);

  // 🎧 LISTENING TIME (когда isPlaying)
  useEffect(() => {
    if (!statsUserId) return;
    if (!isPlaying) return;

    const interval = setInterval(() => {
      addSecondsToday('rg_listen_seconds', 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [statsUserId, isPlaying]);

  // ✅ Загрузка треков пользователя из API
  useEffect(() => {
    if (shouldRedirect || shouldShowLoader) {
      return;
    }
    
    const token = getAuthTokenInternal();
    
    if (!token) {
      return;
    }
    
    setIsLoadingTracks(true);
    
    // ✅ ИСПРАВЛЕНИЕ: правильный endpoint
    fetch('/api/my-tracks/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setUploadedTracks(data.tracks || []);
        } else {
          setUploadedTracks([]);
        }
      })
      .catch(() => {
        setUploadedTracks([]);
      })
      .finally(() => {
        setIsLoadingTracks(false);
      });
  }, [getAuthTokenInternal, shouldRedirect, shouldShowLoader]);

  // 🔥 2.1: ЗАГРУЗКА ПЛЕЙЛИСТОВ ПОЛЬЗОВАТЕЛЯ - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРЯМЫМ FETCH
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        if (!displayUser?.id) {
          console.log('❌ ProtectedApp: Нет ID пользователя для загрузки плейлистов');
          return;
        }
        
        setIsLoadingPlaylists(true);
        
        // 🔥 Получаем токен из localStorage
        const token = 
          localStorage.getItem('access') ||
          localStorage.getItem('access_token') ||
          localStorage.getItem('token');
        
        console.log('🔑 ProtectedApp: Токен для загрузки плейлистов:', token ? 'есть' : 'нет');
        
        // 🔥 Делаем прямой fetch с токеном
        const url = `${API_URL}/api/users/${displayUser.id}/playlists/`;
        console.log('📤 ProtectedApp: Запрос плейлистов:', url);
        
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // 🔥 Отладка: смотрим что пришло
        console.log('📥 ProtectedApp: Ответ от сервера (плейлисты):', data);
        
        const pls = data?.playlists || [];
        console.log(`✅ ProtectedApp: Загружено ${pls.length} плейлистов`);
        
        setUserPlaylists(pls);

        // ✅ засекаем статусы/счётчики в SocialContext
        pls.forEach((p) => {
          if (typeof updatePlaylistLike === 'function') {
            updatePlaylistLike(p.id, !!p.is_liked, Number(p.likes_count || 0));
          }
          if (typeof updatePlaylistRepost === 'function') {
            updatePlaylistRepost(p.id, !!p.is_reposted, Number(p.repost_count || p.reposts_count || 0));
          }
        });

      } catch (e) {
        console.error('❌ ProtectedApp: playlists load error', e);
        setUserPlaylists([]);
      } finally {
        setIsLoadingPlaylists(false);
      }
    };

    loadPlaylists();
  }, [displayUser?.id, updatePlaylistLike, updatePlaylistRepost]);

  // 🔥 ФУНКЦИЯ ЗАГРУЗКИ AI РЕКОМЕНДАЦИЙ
  const fetchMadeForYouAi = useCallback(async () => {
    try {
      setMadeForYouAiErr('');
      setMadeForYouAiLoading(true);

      const res = await apiFetch('/api/recommendations/made-for-you/?limit=12');
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.detail || 'Не удалось загрузить AI рекомендации');

      setMadeForYouAi(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setMadeForYouAiErr(e?.message || 'Ошибка AI рекомендаций');
      setMadeForYouAi([]);
    } finally {
      setMadeForYouAiLoading(false);
    }
  }, []);

  // 🔥 ФУНКЦИЯ ЗАГРУЗКИ РЕКОМЕНДОВАННЫХ ПЛЕЙЛИСТОВ
  const fetchRecommendedPlaylists = useCallback(async () => {
    try {
      setRecPlaylistsLoading(true);
      const res = await apiFetch('/api/recommendations/playlists-for-you/?limit=12');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось загрузить плейлисты');
      setRecommendedPlaylists(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setRecommendedPlaylists([]);
    } finally {
      setRecPlaylistsLoading(false);
    }
  }, []);

  // 🔥 ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ ОТ ПОДПИСОК
  const fetchFollowingTracks = useCallback(async () => {
    try {
      setFollowingTracksLoading(true);
      const res = await apiFetch('/api/recommendations/following-tracks/?limit=12');
      const data = await res.json().catch(() => ({}));
      setFollowingTracks(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setFollowingTracks([]);
    } finally {
      setFollowingTracksLoading(false);
    }
  }, []);

  // 🔥 ВЫЗЫВАЕМ ЗАГРУЗКУ AI РЕКОМЕНДАЦИЙ ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    if (!shouldRenderApp) return;
    fetchMadeForYouAi();
    fetchRecommendedPlaylists(); // ✅ Загружаем рекомендованные плейлисты
    fetchFollowingTracks();      // ✅ Загружаем треки от подписок
  }, [fetchMadeForYouAi, fetchRecommendedPlaylists, fetchFollowingTracks, shouldRenderApp]);

  // ✅ ИСПРАВЛЕННЫЕ функции Follow/Repost (ЧЕРЕЗ КОНТЕКСТ)
  const handleToggleFollow = useCallback(async () => {
    const authorId = currentTrackFull?.uploaded_by?.id;
    if (!authorId) {
      return;
    }
    
    const success = await toggleFollow(authorId);
    if (!success) {
      alert('Не удалось изменить подписку');
    }
  }, [currentTrackFull, toggleFollow]);

  const handleToggleRepost = useCallback(async () => {
    const trackId = currentTrackFull?.id;
    if (!trackId) {
      return;
    }
    
    const success = await toggleRepost(trackId);
    if (!success) {
      alert('Не удалось изменить репост');
    }
  }, [currentTrackFull, toggleRepost]);

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: handlePlayPauseForTrackCard
  const handlePlayPauseForTrackCard = useCallback((trackId, trackInfo = null) => {
    // ✅ если trackId не передали — просто пауза/продолжить текущий трек
    if (!trackId) {
      if (onTogglePlayPause) {
        onTogglePlayPause(); // используем onTogglePlayPause, который реально ставит на паузу
      }
      return;
    }

    // ✅ если кликнули по тому же треку — тоже toggle
    if (currentTrack === trackId) {
      if (onTogglePlayPause) {
        onTogglePlayPause();
      }
      return;
    }

    // ✅ иначе запускаем новый трек
    const trackData = trackInfo || tracksById[trackId];
    if (trackData && playTrack) {
      playTrack(trackData);
    }
  }, [currentTrack, playTrack, onTogglePlayPause, tracksById]);

  // 🔥 2.2: ХЭНДЛЕР PLAY/PAUSE ДЛЯ ПЛЕЙЛИСТА - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const playPausePlaylist = async (playlist) => {
    try {
      if (!playlist?.id) return;

      // ✅ если этот плейлист уже активен — просто toggle play/pause
      if (playingPlaylistId === playlist.id && Array.isArray(playQueueIds) && playQueueIds.length > 0) {
        console.log('⏯️ ProtectedApp: Тот же плейлист, toggle play/pause');
        if (onTogglePlayPause) onTogglePlayPause();
        return;
      }
      
      console.log('▶️ ProtectedApp: Воспроизведение плейлиста', playlist.id, playlist.title);
      
      // 🔥 Получаем токен из localStorage
      const token = 
        localStorage.getItem('access') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('token');
      
      // 🔥 Делаем прямой fetch с токеном для загрузки треков плейлиста
      const url = `${API_URL}/api/playlists/${playlist.id}/`;
      console.log('📤 ProtectedApp: Запрос треков плейлиста:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('📥 ProtectedApp: Данные плейлиста с сервера:', data);
      
      const items = data?.items || [];
      const tracks = items.map((it) => it.track).filter(Boolean);

      if (!tracks.length) {
        console.log('⚠️ ProtectedApp: В плейлисте нет треков');
        return;
      }

      console.log(`✅ ProtectedApp: Загружено ${tracks.length} треков из плейлиста`);

      // очередь в App.js (плейлист режим)
      if (typeof setPlaybackQueue === 'function') {
        setPlaybackQueue(tracks.map((t) => t.id));
      }

      // ✅ запоминаем активный плейлист
      setPlayingPlaylistId(playlist.id);

      // включаем первый трек
      playTrack(tracks[0]);

    } catch (e) {
      console.error('❌ playPausePlaylist error', e);
    }
  };

  // ✅ ВЫЧИСЛЕНИЕ "RECENTLY PLAYED" (как в LibraryPage)
  const recentlyPlayedTracks = React.useMemo(() => {
    if (!Array.isArray(recentTrackIds)) return [];

    const seen = new Set();
    const uniqueIdsMostRecentFirst = [];

    for (let i = recentTrackIds.length - 1; i >= 0; i--) {
      const id = recentTrackIds[i];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      uniqueIdsMostRecentFirst.push(id);
    }

    return uniqueIdsMostRecentFirst
      .map((id) => {
        const t = tracksById?.[id];
        if (!t) return null;
        return {
          ...t,
          uploaded_by: t.uploaded_by || { id: t.user_id || 0, username: t.artist },
        };
      })
      .filter(Boolean);
  }, [recentTrackIds, tracksById]);

  // 🔥 СОХРАНЯЕМ ПОСЛЕДНЕЕ НЕПУСТОЕ ЗНАЧЕНИЕ RECENTLY PLAYED
  useEffect(() => {
    if (recentlyPlayedTracks && recentlyPlayedTracks.length > 0) {
      setRecentlyPlayedStable(recentlyPlayedTracks);
    }
  }, [recentlyPlayedTracks]);

  // 🔥 ЛОГ ДЛЯ ОТЛАДКИ (можно удалить после исправления)
  useEffect(() => {
    console.log('recentTrackIds changed:', recentTrackIds);
  }, [recentTrackIds]);

  const allTracksArray = Object.values(tracksById || {}).filter(track => 
    track && track.id && track.title
  ).sort((a, b) => a.id - b.id);

  const tracksForYou = [
    {
      id: 1,
      title: "hard drive (slowed & muffled)",
      artist: "griffinilla",
      cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGF8gEyh_MA8=&rs=AOn4CLDjiyHGoELcWa2t37NenbmBQ-JlSw",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      duration: "3:20",
      uploaded_by: { id: 1, username: "griffinilla" }
    },
    {
      id: 2,
      title: "Deutschland",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      duration: "5:22",
      uploaded_by: { id: 2, username: "Rammstein" }
    },
    {
      id: 3,
      title: "Sonne",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      duration: "4:05",
      uploaded_by: { id: 2, username: "Rammstein" }
    }
  ];

  const displayTracks = allTracksArray.length > 0 
    ? allTracksArray.map(track => ({
        ...track,
        uploaded_by: track.uploaded_by || { id: track.user_id || 0, username: track.artist }
      }))
    : tracksForYou;

  const primaryNav = [
    { label: 'Home', href: '#home' },
    { label: 'Feed', href: '#feed' },
    { label: 'Library', href: '#library' },
  ];

  // ✅ Определяем isAdmin для всего компонента
  const isAdmin = !!(displayUser?.is_admin || displayUser?.is_staff || displayUser?.is_superuser);

  // ✅ Условные actionIcons (меняем колокольчик на админку если админ)
  const actionIcons = [
    { label: 'Upload', Icon: IconUpload },
    { label: isAdmin ? 'Admin' : 'Notifications', Icon: isAdmin ? IconAdmin : IconBell },
    { label: 'Messages', Icon: IconMessage }
  ];

  const handleArtistClick = useCallback((e, track) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      return;
    }
    
    actualNavigate(`/profile/${track.uploaded_by.id}`);
  }, [actualNavigate]);

  const handleTrackTitleClick = useCallback((trackId) => {
    actualNavigate(`/track/${trackId}`);
  }, [actualNavigate]);

  const handleNavNavigate = (item, index) => {
    if (item.label === 'Upload') {
      actualNavigate('/upload');
      return;
    }
    
    let page = 'home';
    if (item.label === 'Feed') {
      page = 'feed';
    } else if (item.label === 'Library') {
      page = 'library';
    }
    actualNavigate(`/?page=${page}`);
  };

  const currentPage = (() => {
    const params = new URLSearchParams(location.search);
    const pageParam = params.get('page');
    return pageParam === 'feed' || pageParam === 'library' ? pageParam : 'home';
  })();

  // ✅ ИСПРАВЛЕНО: Убрано !isSettingsRoute, чтобы сайдбар показывался на /settings
  const showSidebar =
    !location.pathname.startsWith('/track/') &&
    !location.pathname.startsWith('/studio');

  const currentTrackInfo = currentTrack && tracksById[currentTrack] 
    ? tracksById[currentTrack] 
    : null;

  // =============== ФУНКЦИЯ РЕНДЕРА ПАГИНИРОВАННОЙ СЕТКИ ===============
  const renderPagedGrid = (tracks, page, setPage) => {
    const totalPages = Math.ceil((tracks?.length || 0) / PAGE_SIZE);
    const safePage = Math.min(page, Math.max(totalPages - 1, 0));
    const start = safePage * PAGE_SIZE;
    const visible = (tracks || []).slice(start, start + PAGE_SIZE);
    const canPrev = safePage > 0;
    const canNext = safePage < totalPages - 1;

    return (
      <div className="compact-grid-wrapper">
        {totalPages > 1 && (
          <button
            type="button"
            className={`compact-grid-arrow left ${canPrev ? '' : 'disabled'}`}
            onClick={() => canPrev && setPage(safePage - 1)}
            aria-label="Previous tracks"
          >
            <IconNext />
          </button>
        )}

        <div className="compact-tracks-grid">
          {visible.map(track => (
            <CompactTrackCard
              key={track.id}
              track={track}
              isPlaying={currentTrack === track.id && isPlaying}
              isLiked={isLiked(track.id)}
              onPlayPause={handlePlayPauseForTrackCard}
              onToggleLike={toggleLike}
              onTrackTitleClick={handleTrackTitleClick}
              onArtistClick={handleArtistClick}
              isLoading={isLoadingTrack}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <button
            type="button"
            className={`compact-grid-arrow right ${canNext ? '' : 'disabled'}`}
            onClick={() => canNext && setPage(safePage + 1)}
            aria-label="Next tracks"
          >
            <IconNext />
          </button>
        )}
      </div>
    );
  };
  // ====================================================================

  // 🔥 2.3: ФУНКЦИЯ РЕНДЕРА ПЛЕЙЛИСТОВ (НОВАЯ ВЕРСИЯ С PLAY/PAUSE)
  const renderPlaylistsSection = () => {
    const playlistsToShow = recommendedPlaylists.length ? recommendedPlaylists : userPlaylists;
    const isLoading = recPlaylistsLoading || isLoadingPlaylists;

    if (isLoading) {
      return (
        <div className="loading-tracks-message">
          <IconSpinner />
          <p>Loading playlists...</p>
        </div>
      );
    }

    if (playlistsToShow.length === 0) {
      return (
        <div className="uploaded-tracks-empty">
          <p>No playlists yet</p>
          <button 
            className="upload-first-btn"
            onClick={() => actualNavigate('/studio/playlists/create')}
          >
            Create your first playlist
          </button>
        </div>
      );
    }

    return (
      <div className="uploaded-tracks-carousel">
        {playlistsToShow.map((pl) => {
          const cover = pl.cover_url || pl.cover || '/default-cover.png';
          const isLiked = !!playlistLikes?.[pl.id];
          const isReposted = !!playlistReposts?.[pl.id];
          const isThisPlaylistPlaying = playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0;

          const likeCount =
            (playlistLikeCounts?.[pl.id] ?? pl.likes_count ?? pl.like_count ?? 0);

          const repostCount =
            (playlistRepostCounts?.[pl.id] ?? pl.repost_count ?? pl.reposts_count ?? 0);

          const trackCount = pl.track_count ?? (pl.tracks?.length ?? 0);

          return (
            <div key={pl.id} className="compact-playlist-card">
              <div className="playlist-image-container">
                <img
                  className="playlist-image"
                  src={cover}
                  alt={pl.title}
                  onError={(e) => (e.currentTarget.style.opacity = 0.25)}
                />

                <div className="playlist-play-overlay">
                  {/* ✅ Кнопка Play/Pause с правильной иконкой */}
                  <button
                    className="playlist-play-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPausePlaylist(pl);
                    }}
                    title={isThisPlaylistPlaying && isPlaying ? "Pause playlist" : "Play playlist"}
                  >
                    {isThisPlaylistPlaying && isPlaying ? <IconPause /> : <IconPlay />}
                  </button>
                </div>
              </div>

              <div className="playlist-info">
                <div
                  className="playlist-title"
                  onClick={() => actualNavigate(`/playlist/${pl.id}`)}
                  title={pl.title}
                >
                  {pl.title}
                </div>

                <div className="playlist-meta">{trackCount} tracks</div>

                <div className="playlist-actions">
                  <button
                    className={`playlist-like-button ${isLiked ? "liked" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaylistLike(pl.id);
                    }}
                    title="Like"
                  >
                    <IconHeart filled={isLiked} />
                    <span className="playlist-action-count">{likeCount}</span>
                  </button>

                  <button
                    className={`playlist-repost-button ${isReposted ? "reposted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaylistRepost(pl.id);
                    }}
                    title="Repost"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 7h11v3l4-4-4-4v3H6a4 4 0 0 0-4 4v3h2V9a2 2 0 0 1 2-2zm10 10H6v-3l-4 4 4 4v-3h12a4 4 0 0 0 4-4v-3h-2v3a2 2 0 0 1-2 2z" />
                    </svg>
                    <span className="playlist-action-count">{repostCount}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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

  const handleLogoutAction = useCallback(() => {
    if (onLogout) {
      onLogout();
    }
    setShowUserMenu(false);
    actualNavigate('/');
  }, [onLogout, actualNavigate]);

  const getAvatarUrl = () => {
    if (displayUser?.avatar) {
      if (displayUser.avatar.startsWith('http')) {
        return displayUser.avatar;
      }
      return `http://localhost:8000${displayUser.avatar}`;
    }
    return null;
  };

  const isBackendDefaultImage = (url) => {
    if (!url || typeof url !== 'string') return false;
    return (
      url.includes('/static/default_avatar') ||
      url.includes('/static/default_cover') ||
      url.includes('default_avatar') ||
      url.includes('default_cover')
    );
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  const handleProfileClick = useCallback(() => {
    actualNavigate('/profile');
    setShowUserMenu(false);
  }, [actualNavigate]);

  // ✅ ИСПРАВЛЕНО: Убрано isSettingsRoute, чтобы GridScan показывался на /settings
  const shouldHideGlobalGrid = 
    isProfileRoute || 
    isStudioPlaylistsRoute || 
    isPlaylistPage ||
    isAdminRoute ||
    isReportRoute;

  // ==================== 🚫 ЗАЩИТА ОТ БАНА ====================
  const banInfo = displayUser?.ban;
  
  // ✅ Эффект для редиректа на /banned если пользователь забанен
  useEffect(() => {
    if (banInfo?.is_banned && location.pathname !== '/banned') {
      console.log(`🚫 User ${displayUser?.username} is banned. Redirecting to /banned`);
      actualNavigate('/banned', { replace: true });
    }
  }, [banInfo?.is_banned, location.pathname, actualNavigate, displayUser?.username]);

  // ✅ Если пользователь забанен и не на странице /banned - ничего не рендерим
  if (banInfo?.is_banned && location.pathname !== '/banned') {
    return null;
  }

  // ✅ Если пользователь на /banned - показываем BannedScreen
  if (location.pathname === '/banned') {
    return <BannedScreen ban={banInfo} />;
  }
  // ============================================================

  return (
    <>
      {shouldShowLoader && (
        <div className="loading-screen">
          <GridScan
            className="background-gridscan"
            sensitivity={0.65}
            lineThickness={1}
            linesColor="#ffffff"
            gridScale={0.12}
            scanColor="#8456ff"
            scanOpacity={0.45}
          />
          <div className="loading-content">
            <IconSpinner />
            <Shuffle
              text="Loading user data..."
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
                fontSize: '1rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: '#c084fc',
                marginTop: '20px'
              }}
            />
          </div>
        </div>
      )}
      
      {shouldRedirect && <Navigate to="/login" replace />}
      
      {shouldRenderApp && (
        // ✅ Добавляем классы для разных типов страниц
        <div 
          className={`app ${isMessageRoute ? 'app--message' : ''} ${isStudioRoute ? 'app--studio' : ''} ${isAdminRoute ? 'app--admin' : ''} ${isReportRoute ? 'app--report' : ''} ${isSettingsRoute ? 'app--settings' : ''}`} 
          id="top"
        >
          <GlowFilter />
          
          {/* ✅ Глобальный GridScan НЕ показываем на страницах:
               - профиля
               - студийного редактора плейлистов
               - публичных страниц плейлистов (для будущего)
               - сообщений (messagehub)
               - админки
               - страницы жалобы
               - страницы настроек
          */}
          {!shouldHideGlobalGrid && !isMessageRoute && (
            <GridScan
              className="background-gridscan"
              sensitivity={0.7}
              lineThickness={isStudioRoute ? 1.8 : 1}
              linesColor={isStudioRoute ? "#c084fc" : "#ffffff"}
              gridScale={isStudioRoute ? 0.10 : 0.12}
              scanColor={isStudioRoute ? "#8456ff" : "#FF9FFC"}
              scanOpacity={isStudioRoute ? 0.95 : 0.45}
              enablePost={true}
              bloomIntensity={isStudioRoute ? 1.35 : 0.8}
              chromaticAberration={isStudioRoute ? 0.0022 : 0.001}
              noiseIntensity={isStudioRoute ? 0.02 : 0.012}
              scanGlow={isStudioRoute ? 0.9 : 0.5}
              scanSoftness={isStudioRoute ? 2.6 : 2}
            />
          )}
          
          <div className="page-shell">
            {/* ✅ Скрываем верхнюю навигацию на админке */}
            {!isAdminRoute && (
              <header className="site-header">
                <nav className="sound-nav">
                  <div className="nav-left">
                    {/* ✅ ИСПРАВЛЕННЫЙ ЛОГОТИП: ведет на главную без #top */}
                    <Link to="/" className="brand">
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
                    </Link>
                    
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
                        value={navSearch}
                        onChange={(e) => setNavSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const q = (navSearch || '').trim();
                            if (q) actualNavigate(`/search?q=${encodeURIComponent(q)}&type=all`);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        aria-label="Search" 
                        className="nav-search-btn"
                        onClick={() => {
                          const q = (navSearch || '').trim();
                          if (q) actualNavigate(`/search?q=${encodeURIComponent(q)}&type=all`);
                        }}
                      >
                        <IconSearch />
                      </button>
                    </div>
                  </div>

                  <div className="nav-right">
                    {/* ✅ For Artists с Shuffle и переходом в студию */}
                    <button 
                      className="nav-pill" 
                      type="button"
                      onClick={() => actualNavigate('/studio')}
                    >
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
                          color: '#ffffff',
                        }}
                      />
                    </button>
                    
                    <div className="icon-group">
                      {actionIcons.map(({ label, Icon }) => (
                        <button
                          key={label}
                          className="icon-button"
                          type="button"
                          aria-label={label}
                          onClick={() => {
                            if (label === 'Upload') {
                              actualNavigate('/upload');
                              return;
                            }
                            if (label === 'Admin') {
                              actualNavigate('/admin');
                              return;
                            }
                            if (label === 'Messages') {
                              actualNavigate('/messagehub');
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
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        aria-label="User menu"
                      >
                        <div className="user-avatar-circle">
                          {/* ✅ Аватар fallback как в TrackPage */}
                          {getAvatarUrl() && !isBackendDefaultImage(getAvatarUrl()) ? (
                            <img
                              src={getAvatarUrl()}
                              alt={displayUser?.username || 'User'}
                              className="user-avatar-image"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <IconUserCircle />
                          )}
                        </div>
                      </button>
                      
                      {showUserMenu && (
                        <div className="user-dropdown-menu">
                          {/* ✅ Чисто фиолетовый градиент (без циана) */}
                          <FloatingLinesDropdown
                            linesGradient={['#ff2dff', '#b84bff', '#9f4dff', '#8456ff', '#ff9ffc']}
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
                              {getAvatarUrl() && !isBackendDefaultImage(getAvatarUrl()) ? (
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
                                <div className="dropdown-avatar-fallback">
                                  {getInitials(displayUser?.username)}
                                </div>
                              )}
                            </div>
                            <div className="user-dropdown-info">
                              {/* ✅ username и email с Shuffle как в TrackPage */}
                              <div className="user-dropdown-username">
                                <Shuffle
                                  text={displayUser?.username || 'User'}
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
                                    color: '#ffffff',
                                  }}
                                />
                              </div>
                              <div className="user-dropdown-email">
                                <Shuffle
                                  text={displayUser?.email || 'user@example.com'}
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
                                    color: '#94a3b8',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="user-dropdown-divider" />
                          
                          <div className="user-dropdown-items">
                            <button
                              className="user-dropdown-item"
                              onClick={handleProfileClick}
                            >
                              <IconProfile />
                              <span>Profile</span>
                            </button>
                            
                            <button
                              className="user-dropdown-item"
                              onClick={() => {
                                setShowUserMenu(false);
                                actualNavigate('/settings');
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
            )}

            <main className="landing">
              <Routes>
                {/* ✅ НОВЫЙ РОУТ ДЛЯ СТРАНИЦЫ НАСТРОЕК */}
                <Route path="/settings" element={<SettingsPage />} />
                
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
                          {/* 🔥 ИСПОЛЬЗУЕМ AI РЕКОМЕНДАЦИИ, ЕСЛИ ОНИ ЕСТЬ */}
                          {madeForYouAiLoading ? (
                            <div className="loading-tracks-message">
                              <IconSpinner />
                              <p>AI подбирает для вас треки...</p>
                            </div>
                          ) : (
                            renderPagedGrid(
                              madeForYouAi.length ? madeForYouAi : displayTracks, 
                              madePage, 
                              setMadePage
                            )
                          )}
                        </section>

                        {/* ✅ СЕКЦИЯ RECENTLY PLAYED (с использованием стабильной истории) */}
                        <section className="soundcloud-section" id="recently-played">
                          <SectionHeader
                            title="Recently played"
                            subtitle="Your recent listens"
                            isShuffleText={true}
                          />
                          {recentlyPlayedStable.length > 0
                            ? renderPagedGrid(recentlyPlayedStable, recentPage, setRecentPage)
                            : (
                              <div style={{ opacity: 0.65, fontFamily: "'Press Start 2P', sans-serif", fontSize: '0.8rem' }}>
                                Пока пусто — включи пару треков и тут появится история.
                              </div>
                            )
                          }
                        </section>

                        {/* ✅ СЕКЦИЯ FROM ARTISTS YOU FOLLOW (вместо Discover with Stations) */}
                        <section className="soundcloud-section" id="following-tracks">
                          <SectionHeader
                            title="FROM ARTISTS YOU FOLLOW"
                            subtitle="Fresh picks from your subscriptions"
                            isShuffleText={true}
                          />
                          {followingTracksLoading ? (
                            <div style={{ opacity: 0.7, fontFamily: "'Press Start 2P', sans-serif", fontSize: '0.8rem' }}>
                              Loading…
                            </div>
                          ) : (
                            followingTracks.length > 0
                              ? renderPagedGrid(followingTracks, 0, () => {})
                              : (
                                <div style={{ opacity: 0.65, fontFamily: "'Press Start 2P', sans-serif", fontSize: '0.8rem' }}>
                                  Нет подписок — подпишись на артистов, и тут появятся треки.
                                </div>
                              )
                          )}
                        </section>

                        {/* 🔥 СЕКЦИЯ ПЛЕЙЛИСТОВ (рекомендованные) */}
                        <section className="soundcloud-section" id="playlists-section">
                          <SectionHeader
                            title="PLAYLISTS"
                            subtitle="recommended for you"
                            isShuffleText={true}
                          />
                          {renderPlaylistsSection()}
                        </section>
                      </>
                    ) : currentPage === 'feed' ? (
                      <FeedPage
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPauseForTrackCard}
                        playTrack={playTrack}
                        addTracks={addTracks}
                        likedTrackIds={likedTrackIds}
                        onToggleLike={toggleLike}
                        onToggleRepost={toggleRepost}
                        isReposted={isReposted}
                        tracksById={tracksById}
                        recentTrackIds={recentTrackIds}
                        history={history}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={onSeek}
                        onTrackTitleClick={handleTrackTitleClick}
                        onArtistClick={handleArtistClick}
                        uploadedTracks={uploadedTracks}
                        isLoadingTracks={isLoadingTracks}
                        isLoadingTrack={isLoadingTrack}
                        getAuthToken={getAuthTokenInternal}
                        setPlaybackQueue={setPlaybackQueue}
                        playQueueIds={playQueueIds}
                      />
                    ) : currentPage === 'library' ? (
                      <LibraryPage
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPauseForTrackCard}
                        playTrack={playTrack}
                        addTracks={addTracks}
                        likedTrackIds={likedTrackIds}
                        onToggleLike={toggleLike}
                        tracksById={tracksById}
                        recentTrackIds={recentTrackIds}
                        history={history}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={onSeek}
                        onTrackTitleClick={handleTrackTitleClick}
                        onArtistClick={handleArtistClick}
                        uploadedTracks={uploadedTracks}
                        isLoadingTracks={isLoadingTracks}
                        isLoadingTrack={isLoadingTrack}
                        getAuthToken={getAuthTokenInternal}
                        setPlaybackQueue={setPlaybackQueue}
                        playQueueIds={playQueueIds}
                      />
                    ) : null
                  }
                />
                
                <Route
                  path="/feed"
                  element={
                    <FeedPage
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPauseForTrackCard}
                      playTrack={playTrack}
                      addTracks={addTracks}
                      likedTrackIds={likedTrackIds}
                      onToggleLike={toggleLike}
                      onToggleRepost={toggleRepost}
                      isReposted={isReposted}
                      tracksById={tracksById}
                      recentTrackIds={recentTrackIds}
                      history={history}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeek}
                      onTrackTitleClick={handleTrackTitleClick}
                      onArtistClick={handleArtistClick}
                      uploadedTracks={uploadedTracks}
                      isLoadingTracks={isLoadingTracks}
                      isLoadingTrack={isLoadingTrack}
                      getAuthToken={getAuthTokenInternal}
                      setPlaybackQueue={setPlaybackQueue}
                      playQueueIds={playQueueIds}
                    />
                  }
                />
                
                <Route
                  path="/library"
                  element={
                    <LibraryPage
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPauseForTrackCard}
                      playTrack={playTrack}
                      addTracks={addTracks}
                      likedTrackIds={likedTrackIds}
                      onToggleLike={toggleLike}
                      tracksById={tracksById}
                      recentTrackIds={recentTrackIds}
                      history={history}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeek}
                      onTrackTitleClick={handleTrackTitleClick}
                      onArtistClick={handleArtistClick}
                      uploadedTracks={uploadedTracks}
                      isLoadingTracks={isLoadingTracks}
                      isLoadingTrack={isLoadingTrack}
                      getAuthToken={getAuthTokenInternal}
                      setPlaybackQueue={setPlaybackQueue}
                      playQueueIds={playQueueIds}
                    />
                  }
                />

                {/* 🎯 СТУДИЙНЫЕ РОУТЫ */}
                <Route
                  path="/studio"
                  element={
                    <ArtistStudioHub
                      user={displayUser}
                      uploadedTracks={uploadedTracks}
                      isLoadingTracks={isLoadingTracks}
                    />
                  }
                />

                {/* ✅ НОВЫЙ РОУТ ДЛЯ СТАТИСТИКИ */}
                <Route
                  path="/studio/stats"
                  element={<StudioStatsPage user={displayUser} />}
                />

                {/* Реальные страницы для студии */}
                <Route
                  path="/studio/followers"
                  element={
                    <StudioUserListPage
                      title="Followers"
                      endpoint={displayUser?.id ? `/api/users/${displayUser.id}/followers/` : null}
                      extract={(data) => data?.followers || []}
                      excludeUserId={displayUser?.id}
                    />
                  }
                />

                <Route
                  path="/studio/following"
                  element={
                    <StudioUserListPage
                      title="Following"
                      endpoint={displayUser?.id ? `/api/users/${displayUser.id}/following/` : null}
                      extract={(data) => data?.following || []}
                      excludeUserId={displayUser?.id}
                    />
                  }
                />

                <Route
                  path="/studio/likes"
                  element={
                    <StudioUserListPage
                      title="Likes"
                      endpoint={displayUser?.id ? `/api/users/${displayUser.id}/likes/users/` : null}
                      extract={(data) => data?.users || []}
                      excludeUserId={displayUser?.id}
                    />
                  }
                />

                <Route
                  path="/studio/reposts"
                  element={
                    <StudioUserListPage
                      title="Reposts"
                      endpoint={displayUser?.id ? `/api/users/${displayUser.id}/reposts/users/` : null}
                      extract={(data) => data?.users || []}
                      excludeUserId={displayUser?.id}
                    />
                  }
                />

                <Route
                  path="/studio/comments"
                  element={
                    <StudioUserListPage
                      title="Comments"
                      endpoint={displayUser?.id ? `/api/users/${displayUser.id}/comments/users/` : null}
                      extract={(data) => data?.users || []}
                      excludeUserId={displayUser?.id}
                    />
                  }
                />

                <Route
                  path="/studio/tracks"
                  element={<StudioTracksPage tracks={uploadedTracks} isLoading={isLoadingTracks} />}
                />

                {/* ✅ НОВЫЕ РОУТЫ ДЛЯ ПЛЕЙЛИСТОВ */}
                <Route
                  path="/studio/playlists"
                  element={<StudioPlaylistsHubPage user={displayUser} />}
                />

                <Route
                  path="/studio/playlists/create"
                  element={
                    <StudioPlaylistsPage
                      user={displayUser}
                      playTrack={playTrack}
                      addTracks={addTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeek}
                      getAuthToken={getAuthTokenInternal}
                    />
                  }
                />

                <Route
                  path="/studio/playlists/:id"
                  element={
                    <StudioPlaylistsPage
                      user={displayUser}
                      playTrack={playTrack}
                      addTracks={addTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeek}
                      getAuthToken={getAuthTokenInternal}
                    />
                  }
                />
                
                <Route path="/studio/albums" element={<div style={{ padding: 24 }}>Albums (скоро)</div>} />
                
                {/* ✅ РОУТ ДЛЯ MESSAGEHUB */}
                <Route
                  path="/messagehub"
                  element={
                    <MessageHub
                      user={displayUser}
                      getAuthToken={getAuthTokenInternal}
                      navigate={actualNavigate}
                    />
                  }
                />
                
                <Route
                  path="/profile/:id"
                  element={
                    <ProfilePage
                      user={displayUser}
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
                      onToggleLike={toggleLike}
                      likedTracks={likedTrackIds}
                      checkTrackLiked={isLiked}
                      trackData={tracksById}
                      playTrack={playTrack}
                      getAuthToken={getAuthTokenInternal}
                      setPlaybackQueue={setPlaybackQueue}
                      playQueueIds={playQueueIds}
                    />
                  }
                />
                
                <Route
                  path="/profile"
                  element={
                    <ProfilePage
                      user={displayUser}
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
                      onToggleLike={toggleLike}
                      likedTracks={likedTrackIds}
                      checkTrackLiked={isLiked}
                      trackData={tracksById}
                      playTrack={playTrack}
                      getAuthToken={getAuthTokenInternal}
                      setPlaybackQueue={setPlaybackQueue}
                      playQueueIds={playQueueIds}
                    />
                  }
                />

                {/* 🎯 АДМИНСКИЕ РОУТЫ */}
                <Route
                  path="/admin"
                  element={
                    isAdmin ? <AdminMenu /> : <Navigate to="/?page=home" replace />
                  }
                />

                <Route 
                  path="/admin/tracks" 
                  element={
                    isAdmin ? (
                      <AdminTracksPage
                        playTrack={playTrack}
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        onPlayPause={onTogglePlayPause}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={onSeek}
                      />
                    ) : (
                      <Navigate to="/?page=home" replace />
                    )
                  } 
                />

                {/* ✅ НОВЫЙ РОУТ ДЛЯ АДМИНИСТРИРОВАНИЯ ПЛЕЙЛИСТОВ */}
                <Route 
                  path="/admin/playlists" 
                  element={
                    isAdmin ? (
                      <AdminPlaylistsPage />
                    ) : (
                      <Navigate to="/?page=home" replace />
                    )
                  } 
                />
                
                {/* ✅ НОВЫЙ РОУТ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ - ИСПРАВЛЕННЫЙ ПУТЬ */}
                <Route 
                  path="/admin/users" 
                  element={
                    isAdmin ? (
                      <AdminUsersPage />
                    ) : (
                      <Navigate to="/?page=home" replace />
                    )
                  } 
                />
                
                {/* ✅ ОБНОВЛЕННЫЙ РОУТ ДЛЯ АДМИНКИ РЕПОРТОВ */}
                <Route 
                  path="/admin/reports" 
                  element={
                    isAdmin ? (
                      <AdminReportsPage />
                    ) : (
                      <Navigate to="/?page=home" replace />
                    )
                  } 
                />

                {/* ✅ РОУТ ДЛЯ СТРАНИЦЫ ЖАЛОБЫ */}
                <Route
                  path="/report/user/:id"
                  element={<ReportUserPage />}
                />

                {/* 🎯 Маршрут для страницы трека */}
                <Route
                  path="/track/:trackId"
                  element={
                    <div>Track Page Component</div> // Здесь должен быть ваш компонент TrackPage
                  }
                />

                {/* ✅ Роут для страницы поиска - с правильными пропсами */}
                <Route
                  path="/search"
                  element={
                    <SearchHub
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playTrack={playTrack}
                      onPlayPause={handlePlayPauseForTrackCard}
                      onSeek={onSeek}
                      currentTime={currentTime}
                      duration={duration}
                      onTrackTitleClick={handleTrackTitleClick}
                      onArtistClick={handleArtistClick}
                    />
                  }
                />

                {/* ✅ РЕДИРЕКТ ДЛЯ ВСЕХ НЕСУЩЕСТВУЮЩИХ ПУТЕЙ */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>

          {/* 🎵 Плеер НЕ показываем на студийных страницах, на странице сообщений, на админке, на странице жалобы */}
          {/* ✅ ИСПРАВЛЕНО: Убрано !isSettingsRoute, чтобы плеер показывался на /settings */}
          {!isAdminRoute && !isStudioRoute && !isMessageRoute && !isReportRoute && currentTrack && (
            <GlassMusicPlayer
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayPause={() => {
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
              isLiked={isLiked(currentTrack)}
              onToggleLike={() => toggleLike(currentTrack)}
              isFollowing={isFollowing(currentTrackFull?.uploaded_by?.id)}
              onToggleFollow={handleToggleFollow}
              isReposted={isReposted(currentTrack)}
              onToggleRepost={handleToggleRepost}
              loopEnabled={loopEnabled}
              onToggleLoop={onToggleLoop}
              onTrackClick={handleTrackTitleClick}
              trackInfo={tracksById[currentTrack] || currentTrackFull}
              isLoading={isLoadingTrack}
              getAuthToken={getAuthTokenInternal}
              navigate={actualNavigate}
              onRecordPlay={onRecordPlay}
            />
          )}

          {/* 📌 Сайдбар НЕ показываем на студийных страницах, на странице сообщений, на админке, на странице жалобы */}
          {/* ✅ ИСПРАВЛЕНО: Убрано !isSettingsRoute, чтобы сайдбар показывался на /settings */}
          {showSidebar && !isMessageRoute && !isAdminRoute && !isReportRoute && (
            <div className="sidebar open">
              <Sidebar
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onTogglePlayPause={onTogglePlayPause}
                playTrack={playTrack}
                currentTime={currentTime}
                user={displayUser}
                getAuthToken={getAuthTokenInternal}
                navigate={actualNavigate}
                history={history}
                // ✅ Добавляем пропсы для очереди плейлистов
                setPlaybackQueue={setPlaybackQueue}
                playQueueIds={playQueueIds}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ProtectedApp;