// frontend/src/components/PlaylistPage.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GridScan from '../GridScan';
import Shuffle from './Shuffle';
import GooeyNav from './GooeyNav';
import GlassMusicPlayer from './GlassMusicPlayer';
import FloatingLinesDropdown from './FloatingLinesDropdown';
import logoMark from '../logo1.ico';
import { apiFetch } from '../api/apiFetch';
import './TrackPage.css';
import { useSocial } from '../context/SocialContext';

// API URL для построения абсолютных путей к изображениям
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Иконки
const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
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

const IconUserCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5" stroke="currentColor" strokeWidth="2" fill="none" />
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
      d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41zM19 3a2 2 0 012 2v4h-2V5H5v14h14v-4h2v4a2 2 0 01-2 2H5a2 01-2-2h14z"
      fill="currentColor"
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

const IconHeart = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'heart-icon' : ''}>
    <path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
      fill={filled ? "#ff6b9d" : "currentColor"}
      stroke={filled ? "#ff6b9d" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconRepost = ({ active = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={active ? 'repost-icon' : ''}>
    <path 
      d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" 
      fill={active ? "#8456ff" : "currentColor"}
    />
  </svg>
);

const IconCommentMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
      fill="currentColor"
    />
  </svg>
);

const IconPlayCountMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="play-icon">
    <path
      d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1 14V8l7 4-7 4Z"
      fill="currentColor"
    />
  </svg>
);

const IconClockMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 11.2 4.2 2.5-.8 1.3L11 14V7h2v6.2Z"
      fill="currentColor"
    />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="share-icon">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

const IconPrev = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 6h2v12h-2zm-3.5 6l-8.5 6V6z" fill="currentColor" />
  </svg>
);

// Форматтеры
const formatPlaysNumber = (count) => {
  const n = Number(count || 0);
  if (!n) return '0';
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
};

const formatDurationCompact = (value) => {
  if (typeof value === 'string' && value.includes(':')) return value;
  const s = Number(value || 0);
  if (!s || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const PlaylistPage = ({
  currentTime,
  duration,
  currentTrack,
  isPlaying,
  onPlayPause,
  onToggleLike,
  volume,
  onVolumeChange,
  onNext,
  onPrevious,
  loopEnabled,
  onToggleLoop,
  trackData = {},
  checkTrackLiked,
  getAuthToken,
  onSeek,
  playTrack,
  addTracks,
  // 🔥 ДОБАВЛЕНЫ НОВЫЕ ПРОПСЫ
  setPlaybackQueue,
  playQueueIds,
  // ✅ Добавлен setCurrentTrackId
  setCurrentTrackId,
  user,
  onLogout,
}) => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  
  // 🔥 РЕФ ДЛЯ ФЛАГА ИНИЦИАЛИЗАЦИИ ПЛЕЙЛИСТА
  const didInitPlaylistRef = useRef(false);
  
  // SocialContext
  const {
    toggleFollow,
    isFollowing,
    getFollowerCount,
    toggleLike: toggleLikeGlobal,
    toggleRepost: toggleRepostGlobal,
    isLiked: isLikedGlobal,
    isReposted: isRepostedGlobal,
    getRepostCount,
    likeCounts,
    getLikeCount,
    // Функции для плейлистов
    togglePlaylistLike,
    togglePlaylistRepost,
    getPlaylistLikeState,
    getPlaylistRepostState,
    updatePlaylistLike,
    updatePlaylistRepost,
    // Функция для инициализации счётчиков
    seedTrackCounts
  } = useSocial();

  const [playlist, setPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Дефолтные цвета (HEX, валидные для THREE.Color)
  const [gridScanColor, setGridScanColor] = useState('#8456ff');   // фиолетовый "лазер"
  const [gridLinesColor, setGridLinesColor] = useState('#cbd5e1'); // светлые линии
  const [backgroundColor, setBackgroundColor] = useState('radial-gradient(circle at 30% 20%, rgba(120,90,255,0.25) 0%, rgba(10,10,20,0.95) 60%)');
  
  // currentTrack в App.js = это ID, не объект
  const currentTrackFull = useMemo(() => {
    if (currentTrack == null) return null;

    // tracksById может быть с ключами как number или string
    return (
      trackData?.[currentTrack] ||
      trackData?.[String(currentTrack)] ||
      null
    );
  }, [currentTrack, trackData]);
  
  // Получаем объект трека из items по currentTrack ID
  const currentTrackFromItems = useMemo(() => {
    if (currentTrack == null) return null;
    return Array.isArray(items)
      ? items.find(t => String(t?.id) === String(currentTrack))
      : null;
  }, [items, currentTrack]);

  // что показываем в UI/подвале (приоритет: активный в плейлисте -> глобальный объект -> найденный по ID)
  const displayTrack = useMemo(() => {
    return activeTrack || currentTrackFull || currentTrackFromItems || null;
  }, [activeTrack, currentTrackFull, currentTrackFromItems]);

  // Нормализованный трек для плеера (с cover и audio_url)
  const playerTrack = useMemo(() => {
    if (!displayTrack) return null;

    // Определяем обложку (пробуем разные варианты)
    let cover = 
      displayTrack.cover_url ||
      (typeof displayTrack.cover === 'string' ? displayTrack.cover : null) ||
      displayTrack.cover?.url ||
      displayTrack.cover ||
      `${API_URL}/static/default_cover.jpg`;

    // Определяем аудио файл
    let audio_url =
      displayTrack.audio_url ||
      displayTrack.audio_file ||
      displayTrack.audio ||
      displayTrack.audioFile ||
      '';

    return {
      ...displayTrack,
      cover,
      audio_url,
    };
  }, [displayTrack]);

  // Заголовок плейлиста = текущий трек, если он из этого плейлиста
  const isCurrentTrackFromThisPlaylist = useMemo(() => {
    const curId = playerTrack?.id ?? currentTrack;
    if (curId == null) return false;

    return Array.isArray(items) && items.some(t => String(t?.id) === String(curId));
  }, [items, playerTrack, currentTrack]);

  const playlistHeaderTitle = useMemo(() => {
    if (isCurrentTrackFromThisPlaylist && playerTrack?.title) return playerTrack.title;
    return playlist?.title || 'Playlist';
  }, [isCurrentTrackFromThisPlaylist, playerTrack, playlist]);
  
  // Users who liked/reposted
  const [usersWhoLiked, setUsersWhoLiked] = useState([]);
  const [usersWhoReposted, setUsersWhoReposted] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Playlists from user
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const primaryNav = useMemo(() => ([
    { label: 'Home' },
    { label: 'Feed' },
    { label: 'Library' },
  ]), []);

  const handleNavNavigate = useCallback((item) => {
    let page = 'home';
    if (item.label === 'Feed') page = 'feed';
    if (item.label === 'Library') page = 'library';
    navigate(`/?page=${page}`);
  }, [navigate]);

  const getAuthTokenForPage = useCallback(() => {
    return (getAuthToken && getAuthToken()) ||
           localStorage.getItem('access') ||
           localStorage.getItem('accessToken') ||
           localStorage.getItem('token');
  }, [getAuthToken]);

  // Вспомогательная функция для получения обложки
  const getCoverForColor = (t) =>
    t?.cover_url || t?.cover || t?.cover?.url || t?.coverUrl || null;

  // Улучшенный анализ цвета (как в StudioPlaylistsPage)
  const analyzeImageColor = useCallback((imageUrl) => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    const rgbToHsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      const s = max === 0 ? 0 : d / max;
      const v = max;
      return { h, s, v };
    };

    const hsvToRgb = (h, s, v) => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0, g = 0, b = 0;
      if (h < 60) [r, g, b] = [c, x, 0];
      else if (h < 120) [r, g, b] = [x, c, 0];
      else if (h < 180) [r, g, b] = [0, c, x];
      else if (h < 240) [r, g, b] = [0, x, c];
      else if (h < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
      };
    };

    const toHex = (r, g, b) => {
      const h = (n) => n.toString(16).padStart(2, '0');
      return `#${h(r)}${h(g)}${h(b)}`;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const w = (canvas.width = 96);
        const h = (canvas.height = 96);
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);

        const bucket = new Map();

        // квантование 16 уровней -> лучше группирует
        const add = (r, g, b) => {
          const rQ = r >> 4;
          const gQ = g >> 4;
          const bQ = b >> 4;
          const key = (rQ << 8) | (gQ << 4) | bQ;
          bucket.set(key, (bucket.get(key) || 0) + 1);
        };

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 220) continue;

          // жестко выкидываем почти черный/белый
          if (r < 20 && g < 20 && b < 20) continue;
          if (r > 245 && g > 245 && b > 245) continue;

          add(r, g, b);
        }

        if (!bucket.size) return;

        // выбираем не "самый частый", а "самый жирный по насыщенности/яркости"
        let bestKey = null;
        let bestScore = -1;

        for (const [k, count] of bucket.entries()) {
          const rQ = (k >> 8) & 15;
          const gQ = (k >> 4) & 15;
          const bQ = k & 15;

          const r = rQ * 16 + 8;
          const g = gQ * 16 + 8;
          const b = bQ * 16 + 8;

          const { s, v } = rgbToHsv(r, g, b);

          // score: частота * насыщенность * яркость
          const score = count * (0.6 + s * 1.7) * (0.25 + v * 0.75);

          if (score > bestScore) {
            bestScore = score;
            bestKey = k;
          }
        }

        const rQ = (bestKey >> 8) & 15;
        const gQ = (bestKey >> 4) & 15;
        const bQ = bestKey & 15;

        const domR = rQ * 16 + 8;
        const domG = gQ * 16 + 8;
        const domB = bQ * 16 + 8;

        // сохраняем тон, просто "поднимаем" яркость
        const { h: H, s: S, v: V } = rgbToHsv(domR, domG, domB);

        const scanRGB  = hsvToRgb(H, Math.min(1, S * 1.05), Math.min(1, V * 1.15 + 0.06));
        const linesRGB = hsvToRgb(H, Math.min(1, S * 1.10), Math.min(1, V * 1.30 + 0.10));

        // важно: отдаём HEX (самый стабильный формат для GridScan)
        setGridScanColor(toHex(scanRGB.r, scanRGB.g, scanRGB.b));
        setGridLinesColor(toHex(linesRGB.r, linesRGB.g, linesRGB.b));

        const bg = `radial-gradient(1200px 700px at 50% 30%,
          rgba(${domR}, ${domG}, ${domB}, 0.34) 0%,
          rgba(11, 10, 25, 0.92) 55%,
          rgba(8, 7, 18, 0.96) 100%
        )`;
        setBackgroundColor(bg);
      } catch (e) {
        console.warn('🎨 PlaylistPage: dominant failed', e);
      }
    };

    img.onerror = () => console.warn('🎨 PlaylistPage: image load failed', imageUrl);
  }, []);

  // Загрузка waveform
  const fetchWaveform = useCallback(async (trackId) => {
    try {
      const resp = await apiFetch(`/api/track/${trackId}/waveform/`);
      if (!resp.ok) return setWaveformData([]);
      const data = await resp.json();
      setWaveformData(Array.isArray(data.waveform) ? data.waveform : []);
    } catch {
      setWaveformData([]);
    }
  }, []);

  // Загрузка пользователей, кто лайкнул/репостнул ПЛЕЙЛИСТ
  const loadPlaylistUsersData = useCallback(async (id) => {
    if (!id) return;
    
    setLoadingUsers(true);
    
    try {
      const likesResponse = await apiFetch(`/api/playlists/${id}/likes/users/`);
      if (likesResponse.ok) {
        const likesData = await likesResponse.json();
        setUsersWhoLiked(likesData.users || []);
      }
      
      const repostsResponse = await apiFetch(`/api/playlists/${id}/reposts/users/`);
      if (repostsResponse.ok) {
        const repostsData = await repostsResponse.json();
        setUsersWhoReposted(repostsData.users || []);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователей плейлиста:', error);
      setUsersWhoLiked([]);
      setUsersWhoReposted([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Слушаем события лайка/репоста плейлиста для обновления списков пользователей
  useEffect(() => {
    if (!playlistId) return;

    const onPlaylistLiked = (e) => {
      const id = e?.detail?.playlistId;
      if (id == null) return;
      if (String(id) !== String(playlistId)) return;

      loadPlaylistUsersData(playlistId);
    };

    const onPlaylistReposted = (e) => {
      const id = e?.detail?.playlistId;
      if (id == null) return;
      if (String(id) !== String(playlistId)) return;

      loadPlaylistUsersData(playlistId);
    };

    window.addEventListener('playlistLiked', onPlaylistLiked);
    window.addEventListener('playlistReposted', onPlaylistReposted);

    return () => {
      window.removeEventListener('playlistLiked', onPlaylistLiked);
      window.removeEventListener('playlistReposted', onPlaylistReposted);
    };
  }, [playlistId, loadPlaylistUsersData]);

  // Загрузка плейлистов пользователя
  const loadUserPlaylists = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoadingPlaylists(true);
    
    try {
      const response = await apiFetch(`/api/users/${userId}/playlists/`);
      if (response.ok) {
        const data = await response.json();
        setUserPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки плейлистов пользователя:', error);
      setUserPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  // Загрузка плейлиста
  const fetchPlaylist = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await apiFetch(`/api/playlists/${playlistId}/`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      const pl = data.playlist || data;
      const its = Array.isArray(data.items) ? data.items : [];
      const tracks = its.map(x => x.track).filter(Boolean);

      setPlaylist(pl);
      setItems(tracks);

      // Засеиваем базовые счётчики, чтобы toggle не работал от 0
      tracks.forEach(t => {
        seedTrackCounts?.(t.id, t.like_count, t.repost_count);
      });

      const first = tracks[0] || null;
      setActiveTrack(first);

      const cover1 = getCoverForColor(first);
      if (cover1) analyzeImageColor(cover1);
      if (first?.id) {
        fetchWaveform(first.id);
      }
      
      loadPlaylistUsersData(playlistId);
      
      if (pl?.created_by?.id) {
        loadUserPlaylists(pl.created_by.id);
      }
    } catch (e) {
      console.error('❌ PlaylistPage load:', e);
      setPlaylist(null);
      setItems([]);
      setActiveTrack(null);
      setWaveformData([]);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, analyzeImageColor, fetchWaveform, loadPlaylistUsersData, loadUserPlaylists, seedTrackCounts]);

  useEffect(() => { 
    // 🔥 СБРАСЫВАЕМ ФЛАГ ПРИ СМЕНЕ ПЛЕЙЛИСТА
    didInitPlaylistRef.current = false;
    fetchPlaylist(); 
  }, [fetchPlaylist]);

  // Синхронизация с глобальным плеером
  useEffect(() => {
    if (!currentTrack || !items.length) return;
    const found = items.find(t => String(t?.id) === String(currentTrack));
    if (found) {
      setActiveTrack(found);
      const cover2 = getCoverForColor(found);
      if (cover2) analyzeImageColor(cover2);
      fetchWaveform(found.id);
    }
  }, [currentTrack, items, analyzeImageColor, fetchWaveform]);

  // ✅ ИСПРАВЛЕННЫЙ ХУК: При загрузке плейлиста — выбрать верхний трек ТОЛЬКО ОДИН РАЗ
  useEffect(() => {
    if (!items.length) return;

    const first = items[0];

    // 🔥 КЛЮЧЕВОЙ ФИКС: не переинициализировать плейлист на каждый рендер
    if (didInitPlaylistRef.current) {
      console.log('🔄 PlaylistPage: Плейлист уже инициализирован, пропускаем повторную установку');
      return;
    }

    console.log('🎵 PlaylistPage: Первичная инициализация плейлиста');
    didInitPlaylistRef.current = true;

    // локально для UI
    if (!activeTrack) {
      setActiveTrack(first);
      fetchWaveform(first.id);
    }

    // засеиваем треки в App (чтобы playNext работал по очереди)
    if (typeof addTracks === 'function') addTracks(items);

    // очередь плейлиста (сверху вниз)
    if (typeof setPlaybackQueue === 'function') {
      const queueIds = items.map(t => t.id);
      setPlaybackQueue(queueIds);
      console.log('📋 PlaylistPage: Установлена очередь плейлиста:', queueIds);
    }

    // ✅ выставляем текущий трек в App ТОЛЬКО один раз
    if (typeof setCurrentTrackId === 'function') {
      setCurrentTrackId(first.id);
      console.log('🎵 PlaylistPage: Установлен глобальный currentTrackId', first.id, first.title);
    }
  }, [items, activeTrack, addTracks, setCurrentTrackId, fetchWaveform, setPlaybackQueue]); // ✅ Зависимости остаются, но флаг блокирует повтор

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Воспроизведение трека из списка с установкой очереди
  const playTrackFromList = useCallback((track) => {
    if (!track) return;
    
    const cover3 = getCoverForColor(track);
    if (cover3) analyzeImageColor(cover3);
    fetchWaveform(track.id);
    setActiveTrack(track);
    
    // ✅ Устанавливаем очередь плейлиста (сверху вниз)
    if (typeof setPlaybackQueue === 'function') {
      const queueIds = items.map(t => t.id);
      setPlaybackQueue(queueIds);
      console.log('📋 PlaylistPage: Установлена очередь плейлиста:', queueIds);
    }
    
    if (typeof addTracks === 'function') addTracks(items);
    if (typeof playTrack === 'function') playTrack(track);
  }, [items, addTracks, playTrack, analyzeImageColor, fetchWaveform, setPlaybackQueue]);

  // Навигация по плейлисту
  const playPreviousTrack = useCallback(() => {
    if (!items.length || !activeTrack) return;
    const currentIndex = items.findIndex(t => String(t.id) === String(activeTrack.id));
    if (currentIndex > 0) {
      playTrackFromList(items[currentIndex - 1]);
    }
  }, [items, activeTrack, playTrackFromList]);

  const playNextTrack = useCallback(() => {
    if (!items.length || !activeTrack) return;
    const currentIndex = items.findIndex(t => String(t.id) === String(activeTrack.id));
    if (currentIndex < items.length - 1) {
      playTrackFromList(items[currentIndex + 1]);
    }
  }, [items, activeTrack, playTrackFromList]);

  // 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ: Воспроизведение всего плейлиста (большая кнопка)
  const playWholePlaylist = useCallback(() => {
    if (!items.length) return;

    // если текущий трек уже из этого плейлиста — просто play/pause
    if (isCurrentTrackFromThisPlaylist && typeof onPlayPause === 'function') {
      onPlayPause();
      return;
    }

    // иначе — запускаем плейлист (с activeTrack, а если его нет — с первого)
    const first = items[0];
    const toPlay = activeTrack || first;

    // Устанавливаем очередь плейлиста (сверху вниз)
    if (typeof setPlaybackQueue === 'function') {
      const queueIds = items.map(t => t.id);
      setPlaybackQueue(queueIds);
      console.log('📋 PlaylistPage: Установлена очередь плейлиста:', queueIds);
    }

    // (необязательно, но полезно) засеять треки в App
    if (typeof addTracks === 'function') addTracks(items);

    // чтобы UI “выбрался” сразу (waveform + подсветка)
    setActiveTrack(toPlay);
    if (toPlay?.id) fetchWaveform(toPlay.id);

    // старт воспроизведения в App (это выставит currentTrack -> подвал оживёт)
    if (typeof playTrack === 'function') playTrack(toPlay);
  }, [
    items,
    activeTrack,
    isCurrentTrackFromThisPlaylist,
    onPlayPause,
    setPlaybackQueue,
    addTracks,
    playTrack,
    fetchWaveform
  ]);

  // Сохранение копии плейлиста
  const doSaveCopy = useCallback(async () => {
    try {
      const resp = await apiFetch(`/api/playlists/${playlistId}/save/`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      navigate('/?page=studio');
    } catch (e) {
      console.error('❌ save copy:', e);
      alert(`Save error: ${e.message || e}`);
    }
  }, [playlistId, navigate]);

  // Форматирование длительности
  const totalDuration = useMemo(() => {
    return items.reduce((acc, t) => acc + (typeof t.duration_seconds === 'number' ? t.duration_seconds : 0), 0);
  }, [items]);

  // Прогресс для waveform
  const isActiveTrackPlaying = String(currentTrack) === String(activeTrack?.id) && isPlaying;
  
  const displayCurrentTime = useMemo(() => {
    if (!activeTrack) return 0;
    if (String(currentTrack) === String(activeTrack.id)) {
      return currentTime;
    }
    return 0;
  }, [currentTrack, activeTrack, currentTime]);

  const displayDuration = useMemo(() => {
    if (!activeTrack) return 0;
    if (String(currentTrack) === String(activeTrack.id) && duration > 0) {
      return duration;
    }
    return activeTrack.duration_seconds || 0;
  }, [currentTrack, activeTrack, duration]);

  const progress = displayDuration > 0 ? displayCurrentTime / displayDuration : 0;
  
  const playedBarsCount = useMemo(() => {
    if (!waveformData.length) return 0;
    if (progress >= 1) return waveformData.length;
    return Math.min(waveformData.length, Math.floor(progress * waveformData.length));
  }, [progress, waveformData.length]);

  // Клик по waveform
  const handleBarClick = useCallback((index) => {
    if (!displayDuration || !waveformData.length || !onSeek || !activeTrack) return;
    
    const percent = index / waveformData.length;
    const newTime = percent * displayDuration;
    
    if (String(currentTrack) !== String(activeTrack.id)) {
      playTrackFromList(activeTrack);
      setTimeout(() => onSeek(newTime), 100);
    } else {
      onSeek(newTime);
    }
  }, [displayDuration, waveformData.length, onSeek, activeTrack, currentTrack, playTrackFromList]);

  // Проверка лайка текущего трека только через глобальный контекст
  const isCurrentTrackLiked = useMemo(() => {
    const id = playerTrack?.id ?? currentTrack;
    if (id == null) return false;
    return isLikedGlobal?.(id) || false;
  }, [playerTrack, currentTrack, isLikedGlobal]);

  // Получаем состояние лайка/репоста плейлиста из SocialContext
  const playlistLikeState = useMemo(() => {
    if (!playlist?.id) return { liked: false, count: 0 };
    return getPlaylistLikeState(playlist.id);
  }, [playlist?.id, getPlaylistLikeState]);

  const playlistRepostState = useMemo(() => {
    if (!playlist?.id) return { reposted: false, count: 0 };
    return getPlaylistRepostState(playlist.id);
  }, [playlist?.id, getPlaylistRepostState]);

  // Меню пользователя
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <GridScan
          className="background-gridscan"
          sensitivity={0.65}
          lineThickness={1}
          linesColor={gridLinesColor}
          gridScale={0.12}
          scanColor={gridScanColor}
          scanOpacity={0.45}
        />
        <div className="loading-content">
          <Shuffle
            text="Loading playlist..."
            shuffleDirection="right"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={false}
            loop={true}
            style={{ fontSize: '1.5rem', fontFamily: "'Press Start 2P', sans-serif", color: '#c084fc' }}
          />
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="track-not-found">
        <Shuffle
          text="Playlist not found"
          shuffleDirection="right"
          duration={0.5}
          animationMode="evenodd"
          shuffleTimes={2}
          ease="power3.out"
          stagger={0.02}
          threshold={0.1}
          triggerOnce={true}
          style={{ fontSize: '2rem', fontFamily: "'Press Start 2P', sans-serif", color: '#ffffff' }}
        />
        <button onClick={() => navigate('/')}>
          <Shuffle
            text="Go home"
            shuffleDirection="left"
            duration={0.3}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power2.out"
            stagger={0.01}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            style={{ fontSize: '1rem', fontFamily: "'Press Start 2P', sans-serif", color: '#8456ff' }}
          />
        </button>
      </div>
    );
  }

  const cover = activeTrack?.cover_url || activeTrack?.cover || playlist.cover_url || '';

  return (
    <div className="track-page playlist-page" style={{ background: backgroundColor }}>
      <GridScan
        className="background-gridscan"
        sensitivity={0.65}
        lineThickness={1}
        linesColor={gridLinesColor}
        gridScale={0.12}
        scanColor={gridScanColor}
        scanOpacity={0.25}
      />

      {/* HEADER */}
      <header className="site-header">
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
              items={primaryNav}
              particleCount={12}
              particleDistances={[90, 20]}
              particleR={120}
              initialActiveIndex={0}
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
            <button className="nav-pill" type="button" onClick={() => navigate('/?page=studio')}>
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
                onClick={() => setShowUserMenu(prev => !prev)}
                aria-label="User menu"
              >
                <div className="user-avatar-circle">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username}
                      className="user-avatar-image"
                    />
                  ) : (
                    <IconUserCircle />
                  )}
                </div>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <FloatingLinesDropdown className="dropdownLinesBg" />
                  
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username}
                          className="user-dropdown-avatar-image"
                        />
                      ) : (
                        <IconUserCircle />
                      )}
                    </div>
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-username">
                        <Shuffle
                          text={user?.username || 'User'}
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
                          text={user?.email || 'user@example.com'}
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
                  
                  <div className="user-dropdown-divider"></div>
                  
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
                    
                    <div className="user-dropdown-divider"></div>
                    
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

      <main className="track-page-content">
        <div className="track-hero">
          <div className="track-title-wrapper">
            <div className="track-title-main">
              <Shuffle
                key={playlistHeaderTitle}
                text={playlistHeaderTitle}
                shuffleDirection="right"
                duration={0.8}
                animationMode="evenodd"
                shuffleTimes={2}
                ease="power4.out"
                stagger={0.05}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                style={{ fontSize: '2.4rem', fontFamily: "'Press Start 2P', sans-serif", color: '#ffffff', textTransform: 'uppercase' }}
              />
            </div>

            <div className="track-artist-main">
              <span 
                className="track-author-link"
                onClick={() => navigate(`/profile/${playlist.created_by?.id || playlist.created_by_id || ''}`)}
              >
                <Shuffle
                  text={playlist.created_by?.username ? `@${playlist.created_by.username}` : '—'}
                  shuffleDirection="left"
                  duration={0.6}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power3.out"
                  stagger={0.03}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  style={{ fontSize: '1.1rem', fontFamily: "'Press Start 2P', sans-serif", color: '#c084fc' }}
                />
              </span>
            </div>
          </div>

          <div className="track-hero-grid">
            <div className="track-hero-left">
              <div className="track-waveform-section">
                <div className="waveform-container-large">
                  <div className="waveform-inner">
                    {waveformData.map((height, index) => {
                      const isPlayed = index < playedBarsCount;
                      return (
                        <div
                          key={index}
                          className={`waveform-bar-large ${isPlayed ? 'played' : ''}`}
                          style={{ '--height': `${height}%`, '--index': index }}
                          onClick={() => handleBarClick(index)}
                        />
                      );
                    })}
                    <div className="waveform-laser" style={{ left: `${progress * 100}%` }} />
                  </div>
                  <div className="waveform-progress" style={{ width: `${progress * 100}%` }} />
                </div>

                <div className="waveform-controls">
                  {/* 🔥 ИСПРАВЛЕННАЯ КНОПКА PLAY/PAUSE */}
                  <button className="play-button-large" onClick={playWholePlaylist}>
                    {isActiveTrackPlaying ? <IconPause /> : <IconPlay />}
                  </button>

                  <div className="player-controls-row">
                    <button 
                      className="player-nav-btn" 
                      onClick={playPreviousTrack}
                      disabled={!activeTrack || items.findIndex(t => String(t.id) === String(activeTrack.id)) <= 0}
                    >
                      <IconPrev />
                    </button>
                    
                    <div className="time-display">
                      <span className="current-time">{formatTime(displayCurrentTime)}</span>
                      <span className="time-separator">/</span>
                      <span className="total-duration">{formatTime(displayDuration)}</span>
                    </div>
                    
                    <button 
                      className="player-nav-btn" 
                      onClick={playNextTrack}
                      disabled={!activeTrack || items.findIndex(t => String(t.id) === String(activeTrack.id)) >= items.length - 1}
                    >
                      <IconNext />
                    </button>
                  </div>
                </div>
              </div>

              {/* СТАТИСТИКА + КНОПКИ ВНУТРИ ОДНОЙ ПЛАШКИ */}
              <div className="track-stats-hero">
                {/* 3 tracks */}
                <div className="stat-item">
                  <IconPlayCountMini />
                  <span>{items.length} tracks</span>
                </div>

                {/* 7:42 */}
                <div className="stat-item">
                  <IconClockMini />
                  <span>{formatTime(totalDuration)}</span>
                </div>

                {/* actions внутри этой рамки */}
                <div className="playlistMetaActionsInside">
                  <button
                    className={`playlistActionBtnInside ${playlistLikeState.liked ? 'liked' : ''}`}
                    onClick={() => togglePlaylistLike(playlist.id)}
                    title="Like Playlist"
                    type="button"
                  >
                    <IconHeart filled={playlistLikeState.liked} />
                    <span>{playlistLikeState.count}</span>
                  </button>

                  <button
                    className={`playlistActionBtnInside ${playlistRepostState.reposted ? 'reposted' : ''}`}
                    onClick={() => togglePlaylistRepost(playlist.id)}
                    title="Repost Playlist"
                    type="button"
                  >
                    <IconRepost active={playlistRepostState.reposted} />
                    <span>{playlistRepostState.count}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="track-hero-right">
              <div className="track-cover-large">
                {cover ? <img src={cover} alt="cover" /> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="track-body">
          <div className="track-body-left">
            {/* Карточка автора плейлиста */}
            {playlist?.created_by && (
              <div className="artist-info-section">
                <div className="track-artist">
                  <div className="artist-avatar">
                    <img 
                      src={playlist.created_by.avatar_url || '/default-avatar.png'} 
                      alt={playlist.created_by.username}
                      className="artist-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="artist-details">
                    <h4
                      className="track-author-link"
                      onClick={() => navigate(`/profile/${playlist.created_by.id}`)}
                    >
                      {playlist.created_by.username}
                    </h4>
                    <div className="artist-stats">
                      <span>{getFollowerCount(playlist.created_by.id) || 0} followers</span>
                    </div>
                  </div>
                  <div className="artist-actions">
                    <button
                      className={`follow-button ${isFollowing(playlist.created_by.id) ? 'following' : ''}`}
                      onClick={() => toggleFollow(playlist.created_by.id)}
                      disabled={!getAuthTokenForPage()}
                    >
                      {isFollowing(playlist.created_by.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Список треков */}
            <div className="comments-section">
              <div className="albums-header">
                <h3>
                  <Shuffle
                    text="Tracks"
                    shuffleDirection="right"
                    duration={0.4}
                    animationMode="evenodd"
                    shuffleTimes={1}
                    ease="power2.out"
                    stagger={0.02}
                    threshold={0.1}
                    triggerOnce={true}
                    style={{ fontSize: '1.4rem', fontFamily: "'Press Start 2P', sans-serif", color: '#fff' }}
                  />
                </h3>
              </div>

              <div className="morefrom-grid">
                {items.map((t, idx) => {
                  const isThisPlaying = String(currentTrack) === String(t.id) && isPlaying;
                  
                  // ✅ ИСПРАВЛЕНО: Используем isLikedGlobal/isRepostedGlobal из контекста
                  const isLiked = isLikedGlobal?.(t.id) ?? false;
                  const isReposted = isRepostedGlobal?.(t.id) ?? false;
                  
                  // Счётчики всегда из контекста, с fallback на данные из пропсов
                  const likeCount = (getLikeCount?.(t.id) ?? likeCounts?.[t.id] ?? t.like_count) || 0;
                  const repostCount = (getRepostCount?.(t.id) ?? t.repost_count) || 0;
                  
                  return (
                    <div
                      key={t.id}
                      className="morefrom-card"
                      onClick={() => playTrackFromList(t)}
                    >
                      <div className="morefrom-cover">
                        <img 
                          src={t.cover_url || '/default-cover.png'} 
                          alt={t.title}
                          onError={(e) => {
                            e.currentTarget.src = '/default-cover.png';
                          }}
                        />
                        <button
                          className={`morefrom-play-button ${isThisPlaying ? 'playing' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isThisPlaying) {
                              onPlayPause?.();
                            } else {
                              playTrackFromList(t);
                            }
                          }}
                          aria-label={isThisPlaying ? 'Pause' : 'Play'}
                        >
                          {isThisPlaying ? <IconPause /> : <IconPlay />}
                        </button>
                      </div>
                      <div className="morefrom-info">
                        <div 
                          className="morefrom-title"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/track/${t.id}`);
                          }}
                        >
                          {t.title || 'Untitled'}
                        </div>
                        <div
                          className="morefrom-artist track-author-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (t.uploaded_by?.id) navigate(`/profile/${t.uploaded_by.id}`);
                          }}
                        >
                          {t.uploaded_by?.username || 'unknown'}
                        </div>
                        <div className="morefrom-meta">
                          <span className="morefrom-meta-item">
                            <IconClockMini /> {formatDurationCompact(t.duration_seconds)}
                          </span>
                          <span className="morefrom-meta-item">
                            <IconPlayCountMini /> {formatPlaysNumber(t.play_count)}
                          </span>
                          <span className="morefrom-meta-item">
                            <IconCommentMini /> {t.comment_count || 0}
                          </span>
                        </div>
                      </div>
                      <div className="morefrom-actions">
                        <div className="morefrom-action-group">
                          <button
                            className={`morefrom-like-btn ${isLiked ? 'liked' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ✅ ИСПРАВЛЕНО: Используем глобальный toggleLikeGlobal
                              toggleLikeGlobal(t.id);
                            }}
                          >
                            <IconHeart filled={isLiked} />
                          </button>
                          <span className="morefrom-action-count">{likeCount}</span>
                        </div>
                        <div className="morefrom-action-group">
                          <button
                            className={`morefrom-repost-btn ${isReposted ? 'reposted' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ✅ ИСПРАВЛЕНО: Используем глобальный toggleRepostGlobal
                              toggleRepostGlobal(t.id);
                            }}
                          >
                            <IconRepost active={isReposted} />
                          </button>
                          <span className="morefrom-action-count">{repostCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="track-body-right">
            {/* Users who liked playlist */}
            <div className="users-section">
              <h3>Liked by ({usersWhoLiked.length})</h3>
              {loadingUsers ? (
                <div className="loading-users"><p>Loading users...</p></div>
              ) : usersWhoLiked.length === 0 ? (
                <div className="no-users"><p>No users have liked this playlist yet</p></div>
              ) : (
                <div className="users-grid">
                  {usersWhoLiked.map(userItem => (
                    <div 
                      key={userItem.id || userItem.username} 
                      className="user-card"
                      onClick={() => navigate(`/profile/${userItem.id}`)}
                      title={userItem.username}
                    >
                      <div className="user-avatar">
                        {(userItem.avatar_url || userItem.avatar) ? (
                          <img 
                            src={userItem.avatar_url || userItem.avatar} 
                            alt={userItem.username}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconUserCircle />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Users who reposted playlist */}
            <div className="users-section">
              <h3>Reposted by ({usersWhoReposted.length})</h3>
              {loadingUsers ? (
                <div className="loading-users"><p>Loading users...</p></div>
              ) : usersWhoReposted.length === 0 ? (
                <div className="no-users"><p>No users have reposted this playlist yet</p></div>
              ) : (
                <div className="users-grid">
                  {usersWhoReposted.map(userItem => (
                    <div 
                      key={userItem.id || userItem.username} 
                      className="user-card"
                      onClick={() => navigate(`/profile/${userItem.id}`)}
                      title={userItem.username}
                    >
                      <div className="user-avatar">
                        {(userItem.avatar_url || userItem.avatar) ? (
                          <img 
                            src={userItem.avatar_url || userItem.avatar} 
                            alt={userItem.username}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <IconUserCircle />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* More playlists from this user — с кликабельными фиолетовыми названиями */}
            {/* 🔥 ИСПРАВЛЕНО: добавлен класс ppMorePlaylists для изоляции стилей */}
            <div className="playlists-section ppMorePlaylists">
              <h3>More playlists from {playlist?.created_by?.username || 'user'}</h3>
              {loadingPlaylists ? (
                <div className="loading-users"><p>Loading playlists...</p></div>
              ) : userPlaylists.length === 0 ? (
                <div className="no-users"><p>No other playlists yet</p></div>
              ) : (
                <div className="playlists-grid">
                  {userPlaylists.map(pl => (
                    <div
                      key={pl.id}
                      className="pp-morepl-card"
                    >
                      <img 
                        src={pl.cover_url || '/default-cover.png'} 
                        alt={pl.title}
                        onClick={() => navigate(`/playlist/${pl.id}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="pp-morepl-info">
                        <div
                          className="pp-morepl-title clickable-playlist"
                          onClick={() => navigate(`/playlist/${pl.id}`)}
                        >
                          {pl.title}
                        </div>
                        <div className="pp-morepl-author">
                          {pl.track_count || 0} tracks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer player */}
      <GlassMusicPlayer
        currentTrack={playerTrack}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        isLiked={isCurrentTrackLiked}
        onToggleLike={() => {
          const id = playerTrack?.id ?? currentTrack;
          if (id != null) {
            toggleLikeGlobal(id);
          }
        }}
        volume={volume}
        onVolumeChange={onVolumeChange}
        onNext={playNextTrack}
        onPrevious={playPreviousTrack}
        loopEnabled={loopEnabled}
        onToggleLoop={onToggleLoop}
        onTrackClick={(t) => {
          const id = typeof t === 'object' ? (t?.id ?? t?.track_id) : t;
          if (id != null) navigate(`/track/${id}`);
        }}
        trackInfo={playerTrack}
        getAuthToken={getAuthTokenForPage}
      />
    </div>
  );
};

export default PlaylistPage;