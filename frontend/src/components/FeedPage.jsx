// FeedPage.jsx - ИСПРАВЛЕННЫЙ С РЕАЛЬНОЙ ЗАГРУЗКОЙ FEED И ЖИВЫМИ СЧЁТЧИКАМИ
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from '../components/Shuffle';
import { useSocial } from '../context/SocialContext'; // ✅ ИМПОРТ SOCIAL CONTEXT
import './FeedPage.css';

// ✅ ХЕЛПЕР ДЛЯ ОТСЕИВАНИЯ ДЕФОЛТНЫХ КАРТИНОК
const isBackendDefaultImage = (url) => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('/static/default_avatar') ||
    url.includes('/static/default_cover') ||
    url.includes('default_avatar') ||
    url.includes('default_cover')
  );
};

const IconRepost = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M5 5h14v3h2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4h2V5zm14 14H5v-3H3v3c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v3zm0-8l-4-4v3H9v-3l-4 4 4 4v-3h6v3l4-4z"
      fill={filled ? "#8456ff" : "currentColor"}
    />
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

// ✅ ИКОНКИ ДЛЯ PLAY/PAUSE
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

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// 🔥 УНИВЕРСАЛЬНАЯ ФУНКЦИЯ API-ЗАПРОСОВ
const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('access');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`http://localhost:8000${url}`, {
    ...options,
    headers
  });
};

// 🔥 КЕШ WAVEFORM ДАННЫХ
const waveformCache = new Map();

// 🔥 ФУНКЦИЯ ЗАГРУЗКИ РЕАЛЬНЫХ WAVEFORM ДАННЫХ
const loadWaveformForTrack = async (trackId) => {
  if (waveformCache.has(trackId)) {
    return waveformCache.get(trackId);
  }
  
  try {
    const response = await apiFetch(`/api/track/${trackId}/waveform/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const waveformData = data?.waveform || data?.data || [];
    
    if (waveformData.length > 0) {
      const normalizedData = waveformData.map(value => {
        const normalized = Math.min(100, Math.max(0, value));
        return normalized;
      });
      
      waveformCache.set(trackId, normalizedData);
      return normalizedData;
    } else {
      throw new Error('No waveform data');
    }
  } catch (error) {
    console.warn(`⚠️ Не удалось загрузить waveform для трека ${trackId}:`, error);
    const realisticWaveform = generateRealisticWaveform(trackId);
    waveformCache.set(trackId, realisticWaveform);
    return realisticWaveform;
  }
};

// 🔥 ГЕНЕРАЦИЯ РЕАЛИСТИЧНОЙ WAVEFORM
const generateRealisticWaveform = (trackId) => {
  const seed = trackId * 123456789;
  const pseudoRandom = (index) => {
    const x = Math.sin(seed + index * 0.1) * 10000;
    return x - Math.floor(x);
  };
  
  const bars = 60;
  const waveform = [];
  
  for (let i = 0; i < bars; i++) {
    const basePattern = Math.sin(i * 0.3) * 0.5 + Math.cos(i * 0.07) * 0.3;
    const randomVariation = pseudoRandom(i) * 0.4;
    const height = 30 + (basePattern + randomVariation) * 40;
    const clampedHeight = Math.max(10, Math.min(95, height));
    waveform.push(clampedHeight);
  }
  
  return waveform;
};

// 🔥 ПАРСИНГ ДЛИТЕЛЬНОСТИ
const parseDurationToSeconds = (duration) => {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string') {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

// 🔥 WAVEFORM VISUALIZER
const WaveformVisualizer = ({ 
  trackId, 
  progress = 0, 
  isPlaying = false,
  onSeek,
  duration = 0,
  onWaveformClick,
  waveformData = null
}) => {
  const [barHeights, setBarHeights] = useState(waveformData || []);
  const [isLoading, setIsLoading] = useState(!waveformData);
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  
  useEffect(() => {
    if (waveformData && waveformData.length > 0) {
      setBarHeights(waveformData);
      setIsLoading(false);
      return;
    }
    
    const loadWaveform = async () => {
      setIsLoading(true);
      try {
        const data = await loadWaveformForTrack(trackId);
        setBarHeights(data);
      } catch (error) {
        console.error('❌ Ошибка загрузки waveform:', error);
        setBarHeights(generateRealisticWaveform(trackId));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWaveform();
  }, [trackId, waveformData]);
  
  const handleWaveformClick = (e) => {
    if (!duration || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percentage * duration;
    
    if (onWaveformClick) {
      onWaveformClick(trackId, seekTime, percentage);
    }
  };
  
  const handleMouseMove = (e) => {
    if (!containerRef.current || !duration) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setHoverPosition(percentage * 100);
  };
  
  if (isLoading) {
    return (
      <div className="waveform-container" ref={containerRef}>
        <div className="waveform-loading">
          <div className="loading-bars">
            {Array(30).fill(0).map((_, i) => (
              <div 
                key={i}
                className="waveform-bar loading"
                style={{
                  '--height': `${30 + Math.sin(i * 0.2) * 40}%`,
                  animationDelay: `${i * 0.03}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const currentProgress = duration > 0 ? progress : 0;
  
  return (
    <div 
      className="waveform-container" 
      ref={containerRef}
      onClick={handleWaveformClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverPosition(0);
      }}
      style={{ cursor: 'pointer' }}
    >
      {currentProgress > 0 && (
        <div 
          className="waveform-progress-overlay" 
          style={{ 
            width: `${currentProgress}%`,
            borderRadius: '5px 0 0 5px',
            opacity: isPlaying ? 0.7 : 0.4,
          }}
        />
      )}
      
      {isHovering && (
        <div 
          className="waveform-hover-overlay" 
          style={{ 
            width: `${hoverPosition}%`,
            borderRadius: '5px 0 0 5px'
          }}
        />
      )}
      
      <div className="waveform">
        {barHeights.map((height, i) => {
          const barPosition = (i / barHeights.length) * 100;
          const isPlayed = barPosition <= currentProgress;
          const isHovered = isHovering && barPosition <= hoverPosition;
          
          let barClass = 'waveform-bar';
          if (isPlayed) barClass += ' filled';
          if (isHovered) barClass += ' hovered';
          
          return (
            <div 
              key={i}
              className={barClass}
              style={{
                '--height': `${height}%`,
              }}
              data-index={i}
              data-position={barPosition}
            />
          );
        })}
      </div>
      
      {isHovering && duration > 0 && (
        <div 
          className="waveform-time-tooltip"
          style={{ 
            left: `${hoverPosition}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {formatTime((hoverPosition / 100) * duration)}
        </div>
      )}
    </div>
  );
};

// ============================================
// 🎯 ОСНОВНОЙ КОМПОНЕНТ FEED PAGE
// ============================================
const FeedPage = ({ 
  // 🎵 Плеер
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  playTrack,
  addTracks,
  
  // ❤️ Лайки
  likedTrackIds = [], 
  onToggleLike,
  
  // 🔁 Репосты
  onToggleRepost,
  isReposted,
  
  // 📦 Данные
  tracksById = {},
  recentTrackIds = [],
  history = [],
  
  // ⏱️ Время
  currentTime = 0,
  duration = 0,
  onSeek,
  
  // 🖱️ Клики
  onTrackTitleClick,
  onArtistClick,
  
  // 📤 Мои треки
  uploadedTracks = [],
  isLoadingTracks = false,
  isLoadingTrack = false,
  
  // 🔑 Токен
  getAuthToken,
  
  // 🔥 Дополнительные
  waveformDataById = {},
  
  // ✅ НОВЫЕ ПРОПСЫ ДЛЯ ОЧЕРЕДИ ПЛЕЙЛИСТОВ
  setPlaybackQueue,
  playQueueIds = []
}) => {
  const navigate = useNavigate();
  
  // ✅ ПОДКЛЮЧАЕМ SOCIAL CONTEXT ДЛЯ ЖИВЫХ СЧЁТЧИКОВ
  const { 
    getLikeCount, 
    getRepostCount,
    isPlaylistLiked,
    isPlaylistReposted,
    getPlaylistLikeCount,
    getPlaylistRepostCount,
    togglePlaylistLike,
    togglePlaylistRepost,
    setPlaylistLikeStatus,
    setPlaylistRepostStatus
  } = useSocial();
  
  // ========== 5.1 СОСТОЯНИЯ ДЛЯ FEED ==========
  const [feedTracks, setFeedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ========== 🎵 НОВЫЕ СОСТОЯНИЯ ДЛЯ ПЛЕЙЛИСТОВ ==========
  const [feedPlaylists, setFeedPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistsError, setPlaylistsError] = useState(null);
  
  // ✅ СОСТОЯНИЯ ДЛЯ ОЧЕРЕДИ ПЛЕЙЛИСТОВ
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);
  const [playlistQueueCache, setPlaylistQueueCache] = useState({});
  
  // ========== 5.2 ЗАГРУЗКА ФИДА ==========
  useEffect(() => {
    const loadFeed = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAuthToken?.();
        const res = await fetch('/api/feed/', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // ✅ Нормализуем ответ в массив
        const list = Array.isArray(data) ? data : (data?.results || []);
        
        // ✅ НОРМАЛИЗУЕМ URL КАРТИНОК - УБИРАЕМ ДЕФОЛТНЫЕ
        const normalizedList = list.map(item => {
          // Нормализуем cover
          let cover = null;
          if (item.cover_url && !isBackendDefaultImage(item.cover_url)) {
            cover = item.cover_url;
          } else if (item.cover && !isBackendDefaultImage(item.cover)) {
            cover = item.cover;
          }
          
          // Нормализуем avatar
          let avatar = null;
          if (item.uploaded_by?.avatar_url && !isBackendDefaultImage(item.uploaded_by.avatar_url)) {
            avatar = item.uploaded_by.avatar_url;
          } else if (item.author_avatar && !isBackendDefaultImage(item.author_avatar)) {
            avatar = item.author_avatar;
          }
          
          return {
            ...item,
            cover_url: cover,
            cover: cover,
            author_avatar: avatar,
            uploaded_by: item.uploaded_by ? {
              ...item.uploaded_by,
              avatar_url: avatar
            } : null
          };
        });
        
        if (addTracks && Array.isArray(normalizedList)) {
          addTracks(normalizedList);
        }

        setFeedTracks(normalizedList);
      } catch (e) {
        console.error('❌ Ошибка загрузки фида:', e);
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
    
    // ✅ Загрузка плейлистов
    const loadFeedPlaylists = async () => {
      try {
        setLoadingPlaylists(true);
        setPlaylistsError(null);

        const token = getAuthToken?.();
        const res = await fetch('/api/feed/playlists/', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.results || []);
        
        // Нормализуем данные плейлистов
        const normalizedList = list.map(item => ({
          ...item,
          cover_url: item.cover_url || item.cover || '/default-cover.jpg',
          track_count: item.track_count || item.tracks?.length || 0
        }));

        setFeedPlaylists(normalizedList);
      } catch (e) {
        console.error('❌ Ошибка загрузки плейлистов:', e);
        setPlaylistsError(String(e.message || e));
        setFeedPlaylists([]);
      } finally {
        setLoadingPlaylists(false);
      }
    };

    loadFeedPlaylists();
  }, [addTracks, getAuthToken]);
  
  // ========== ИНИЦИАЛИЗАЦИЯ СЧЁТЧИКОВ ПЛЕЙЛИСТОВ ==========
  useEffect(() => {
    if (!feedPlaylists?.length) return;

    feedPlaylists.forEach(pl => {
      if (!pl?.id) return;
      
      // Инициализируем лайки
      if (pl.likes_count !== undefined) {
        setPlaylistLikeStatus?.(pl.id, false, pl.likes_count);
      }
      
      // Инициализируем репосты (пробуем оба поля)
      const repostCount = pl.repost_count ?? pl.reposts_count;
      if (repostCount !== undefined) {
        setPlaylistRepostStatus?.(pl.id, false, repostCount);
      }
    });
  }, [feedPlaylists, setPlaylistLikeStatus, setPlaylistRepostStatus]);

  // ========== 5.3 ОБРАБОТЧИК PLAY ==========
  const handlePlay = useCallback((trackId, trackData = null) => {
    if (playTrack) {
      const trackToPlay = trackData || feedTracks.find(t => t.id === trackId);
      if (trackToPlay) {
        playTrack(trackToPlay);
      }
    } else if (onPlayPause) {
      onPlayPause(trackId);
    }

    setFeedTracks(prev =>
      prev.map(t => (t.id === trackId ? { ...t, is_new: false } : t))
    );
  }, [playTrack, onPlayPause, feedTracks]);

  // ========== ОБРАБОТЧИК ЛАЙКА ==========
  const handleToggleLike = useCallback(async (trackId, e) => {
    e.stopPropagation();
    if (onToggleLike) {
      await onToggleLike(trackId);
    }
  }, [onToggleLike]);
  
  // ========== ОБРАБОТЧИК РЕПОСТА ==========
  const handleToggleRepost = useCallback(async (trackId, e) => {
    e.stopPropagation();
    if (onToggleRepost) {
      await onToggleRepost(trackId);
    }
  }, [onToggleRepost]);

  // ========== ОБРАБОТЧИКИ ДЛЯ ПЛЕЙЛИСТОВ ==========
  const handlePlaylistLike = useCallback(async (playlistId, e) => {
    e.stopPropagation();
    await togglePlaylistLike?.(playlistId);
  }, [togglePlaylistLike]);

  const handlePlaylistRepost = useCallback(async (playlistId, e) => {
    e.stopPropagation();
    await togglePlaylistRepost?.(playlistId);
  }, [togglePlaylistRepost]);

  // ✅ Функция для получения очереди треков плейлиста (ids) с бэка
  const fetchPlaylistQueueIds = useCallback(async (playlistId) => {
    if (!playlistId) return [];
    
    // Проверяем кэш
    if (playlistQueueCache[playlistId]?.length) {
      console.log('✅ FeedPage: используем кэш для плейлиста', playlistId);
      return playlistQueueCache[playlistId];
    }

    try {
      console.log('📤 FeedPage: загрузка треков плейлиста', playlistId);
      const token = getAuthToken?.();
      const res = await fetch(`/api/playlists/${playlistId}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        console.error('❌ FeedPage: ошибка загрузки плейлиста', res.status);
        return [];
      }
      
      const data = await res.json();
      const items = data?.items || data?.playlist?.items || [];
      const tracks = items
        .map((it) => it?.track || it)
        .filter(Boolean);

      const ids = tracks.map((t) => t.id).filter((x) => x != null);
      
      // Сохраняем в кэш
      setPlaylistQueueCache((prev) => ({ ...prev, [playlistId]: ids }));
      console.log(`✅ FeedPage: загружено ${ids.length} треков для плейлиста`, playlistId);
      
      return ids;
    } catch (e) {
      console.error('❌ FeedPage: fetchPlaylistQueueIds error', e);
      return [];
    }
  }, [getAuthToken, playlistQueueCache]);

  // ✅ Обработчик play/pause для плейлиста как очередь
  const handlePlaylistPlayPause = useCallback(async (pl, e) => {
    e?.stopPropagation?.();

    if (!pl?.id) return;

    console.log('▶️ FeedPage: воспроизведение плейлиста', pl.id, pl.title);

    // если уже этот плейлист активен — просто pause/resume
    if (playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0) {
      console.log('⏯️ FeedPage: тот же плейлист, toggle play/pause');
      onPlayPause?.(); // toggle play/pause (без id)
      return;
    }

    const ids = await fetchPlaylistQueueIds(pl.id);
    if (!ids.length) {
      console.log('⚠️ FeedPage: в плейлисте нет треков');
      return;
    }

    // ставим очередь в App.js
    if (typeof setPlaybackQueue === 'function') {
      setPlaybackQueue(ids);
    }

    setPlayingPlaylistId(pl.id);

    // запускаем первый трек (передаем id первого трека)
    console.log('▶️ FeedPage: запускаем первый трек', ids[0]);
    onPlayPause?.(ids[0]);
  }, [fetchPlaylistQueueIds, onPlayPause, playQueueIds, playingPlaylistId, setPlaybackQueue]);

  // ========== WAVEFORM ЛОГИКА ==========
  const [trackWaveforms, setTrackWaveforms] = useState({});
  const [trackProgresses, setTrackProgresses] = useState({});
  
  useEffect(() => {
    const loadWaveforms = async () => {
      const waveforms = {};
      
      if (waveformDataById && Object.keys(waveformDataById).length > 0) {
        setTrackWaveforms(waveformDataById);
        return;
      }
      
      for (const track of feedTracks) {
        if (!trackWaveforms[track.id] && track.id) {
          try {
            const data = await loadWaveformForTrack(track.id);
            waveforms[track.id] = data;
          } catch (error) {
            console.warn(`⚠️ Не удалось загрузить waveform для ${track.id}:`, error);
            waveforms[track.id] = generateRealisticWaveform(track.id);
          }
        }
      }
      
      if (Object.keys(waveforms).length > 0) {
        setTrackWaveforms(prev => ({ ...prev, ...waveforms }));
      }
    };
    
    if (feedTracks.length > 0) {
      loadWaveforms();
    }
  }, [feedTracks, waveformDataById]);
  
  const getProgressForTrack = useCallback((trackId, trackDuration) => {
    if (currentTrack === trackId && duration > 0) {
      return (currentTime / duration) * 100;
    }
    return trackProgresses[trackId] || 0;
  }, [currentTrack, currentTime, duration, trackProgresses]);
  
  const handleWaveformClick = useCallback((trackId, seekTime, percentage) => {
    setTrackProgresses(prev => ({
      ...prev,
      [trackId]: percentage * 100
    }));
    
    if (onSeek) {
      onSeek(seekTime);
    }
    
    const track = feedTracks.find(t => t.id === trackId);
    if (!track) return;
    
    if (currentTrack !== trackId) {
      handlePlay(trackId, track);
      setTimeout(() => {
        if (onSeek) onSeek(seekTime);
      }, 100);
    } else if (!isPlaying) {
      handlePlay(trackId, track);
    }
  }, [currentTrack, isPlaying, onSeek, feedTracks, handlePlay]);
  
  useEffect(() => {
    if (!currentTrack) return;
    
    const track = feedTracks.find(t => t.id === currentTrack);
    if (!track || !duration) return;
    
    const progress = (currentTime / duration) * 100;
    setTrackProgresses(prev => ({
      ...prev,
      [currentTrack]: progress
    }));
  }, [currentTrack, currentTime, duration, feedTracks]);

  // ========== ПОЛУЧЕНИЕ ИНИЦИАЛОВ ДЛЯ АВАТАРА ==========
  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  // ========== 🎵 РЕНДЕР КАРТОЧЕК ПЛЕЙЛИСТОВ ==========
  const renderFeedPlaylists = () => {
    if (loadingPlaylists) {
      return (
        <div className="feed-playlists-loading">
          <IconSpinner />
          <p>Загрузка плейлистов...</p>
        </div>
      );
    }

    if (playlistsError) return null;
    if (!feedPlaylists?.length) return null;

    return (
      <div className="feed-playlists-section">
        <h2 className="feed-subtitle">Playlists</h2>

        <div className="feed-playlists-list">
          {feedPlaylists.slice(0, 8).map(pl => {
            const isLiked = isPlaylistLiked?.(pl.id) ?? false;
            const isReposted = isPlaylistReposted?.(pl.id) ?? false;
            const isThisPlaylistPlaying = playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0;
            
            // Получаем счётчики (приоритет: контекст > данные из API)
            const likeCount = getPlaylistLikeCount?.(pl.id) ?? pl.likes_count ?? 0;
            const repostCount = getPlaylistRepostCount?.(pl.id) ?? pl.repost_count ?? pl.reposts_count ?? 0;
            
            const authorName = pl.created_by?.username || 'Unknown';
            const trackCount = pl.track_count ?? pl.tracks?.length ?? 0;
            
            return (
              <div key={pl.id} className={`feed-playlist-card ${pl.is_new ? 'is-new' : ''}`}>
                {/* Cover с play overlay */}
                <div
                  className="feed-pl-cover-wrap"
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  title="Открыть плейлист"
                >
                  <img
                    className="feed-pl-cover"
                    src={pl.cover_url || pl.cover || '/default-cover.jpg'}
                    alt={pl.title}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = '/default-cover.jpg';
                    }}
                  />
                  {/* ✅ Кнопка Play теперь вызывает handlePlaylistPlayPause, а не navigate */}
                  <button
                    className="feed-pl-play"
                    onClick={(e) => handlePlaylistPlayPause(pl, e)}
                    aria-label={isThisPlaylistPlaying && isPlaying ? "Pause playlist" : "Play playlist"}
                  >
                    {isThisPlaylistPlaying && isPlaying ? <IconPause /> : <IconPlay />}
                  </button>
                  {pl.is_new && <div className="feed-pl-badge">NEW</div>}
                </div>

                {/* Метаданные */}
                <div className="feed-pl-meta">
                  <div
                    className="feed-pl-title"
                    onClick={() => navigate(`/playlist/${pl.id}`)}
                  >
                    {pl.title || 'Untitled Playlist'}
                  </div>

                  <div className="feed-pl-sub">
                    {authorName} • {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="feed-pl-actions">
                  <button
                    className={`feed-pl-btn ${isLiked ? 'active' : ''}`}
                    onClick={(e) => handlePlaylistLike(pl.id, e)}
                    title="Лайкнуть плейлист"
                  >
                    <IconHeart filled={isLiked} />
                    <span>{likeCount}</span>
                  </button>

                  <button
                    className={`feed-pl-btn ${isReposted ? 'active' : ''}`}
                    onClick={(e) => handlePlaylistRepost(pl.id, e)}
                    title="Репостнуть плейлист"
                  >
                    <IconRepost filled={isReposted} />
                    <span>{repostCount}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ========== 6. РЕНДЕР КАРТОЧЕК ТРЕКОВ ==========
  const renderFeedTracks = () => {
    if (loading) {
      return (
        <div className="feed-loading">
          <IconSpinner />
          <p>Загрузка ленты...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="feed-error">
          <p>❌ Ошибка загрузки: {error}</p>
          <button onClick={() => window.location.reload()}>Повторить</button>
        </div>
      );
    }

    if (feedTracks.length === 0) {
      return (
        <div className="feed-empty-state">
          <div className="empty-state-icon">
            <IconHeart />
          </div>
          <p className="empty-state-message">Ваша лента пуста</p>
          <p className="empty-state-submessage">
            Подпишитесь на других пользователей, чтобы видеть их треки здесь
          </p>
        </div>
      );
    }

    return (
      <div className="feed-container">
        {feedTracks.map(track => {
          const isCurrentTrack = currentTrack === track.id;
          const progress = getProgressForTrack(track.id, track.duration_seconds || 0);
          const isLiked = likedTrackIds?.includes(track.id);
          const isRepostedTrack = typeof isReposted === 'function' ? isReposted(track.id) : false;
          const waveformData = trackWaveforms[track.id];
          const trackDuration = isCurrentTrack ? duration : (track.duration_seconds || 0);
          const username = track.author_username || track.uploaded_by?.username || track.artist || 'Unknown';
          const hasAvatar = track.author_avatar || track.uploaded_by?.avatar_url;
          
          // ✅ ПОЛУЧАЕМ ЖИВЫЕ СЧЁТЧИКИ ИЗ CONTEXT
          const likeCount = typeof getLikeCount === 'function' 
            ? getLikeCount(track.id) 
            : (track.like_count || 0);
          
          const repostCount = typeof getRepostCount === 'function' 
            ? getRepostCount(track.id) 
            : (track.repost_count || 0);
          
          return (
            <div key={track.id} className="feed-card">
              {/* NEW badge */}
              {track.is_new && <div className="feed-badge-new">NEW</div>}

              {/* Header: avatar + author */}
              <div className="feed-card-header">
                <div className="feed-author">
                  {/* ✅ АВАТАР - БЕЗ 404, ИНИЦИАЛЫ ВМЕСТО ДЕФОЛТНОЙ КАРТИНКИ */}
                  <div className="feed-avatar-container">
                    {hasAvatar && !isBackendDefaultImage(hasAvatar) ? (
                      <img
                        className="feed-avatar"
                        src={track.author_avatar || track.uploaded_by?.avatar_url}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.classList.add('avatar-fallback');
                        }}
                      />
                    ) : null}
                    <div className="feed-avatar-fallback" style={{
                      display: (!hasAvatar || isBackendDefaultImage(hasAvatar)) ? 'flex' : 'none'
                    }}>
                      {getInitials(username)}
                    </div>
                  </div>
                  
                  <div className="feed-author-meta">
                    <div
                      className="feed-author-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        const userId = track.uploaded_by?.id || track.user_id;
                        if (userId) {
                          navigate(`/profile/${userId}`);
                        } else if (onArtistClick) {
                          onArtistClick(e, track);
                        }
                      }}
                    >
                      {username}
                    </div>
                    <div className="feed-time">
                      {track.created_at ? new Date(track.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body: cover + title + stats + waveform */}
              <div
                className="feed-card-body"
                onClick={() => handlePlay(track.id, track)}
                role="button"
                tabIndex={0}
              >
                <div className="feed-cover-wrap">
                  {/* ✅ ОБЛОЖКА - БЕЗ 404, ПЛЕЙСХОЛДЕР ВМЕСТО ДЕФОЛТНОЙ КАРТИНКИ */}
                  {(track.cover_url || track.cover) && !isBackendDefaultImage(track.cover_url || track.cover) ? (
                    <img
                      className="feed-cover"
                      src={track.cover_url || track.cover}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.classList.add('cover-fallback');
                      }}
                    />
                  ) : (
                    <div className="feed-cover-fallback">
                      <span>🎵</span>
                    </div>
                  )}
                  <div className="feed-cover-overlay">
                    <span className="feed-play-hint">
                      {isCurrentTrack && isPlaying ? '⏸' : '▶'}
                    </span>
                  </div>
                </div>

                <div className="feed-info">
                  <div 
                    className="feed-title"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTrackTitleClick) {
                        onTrackTitleClick(track.id);
                      } else {
                        navigate(`/track/${track.id}`);
                      }
                    }}
                  >
                    {track.title || 'Untitled'}
                  </div>
                  <div className="feed-subtitle">
                    {track.artist || track.uploaded_by?.username || ''}
                  </div>

                  <div className="feed-stats">
                    {/* ✅ ЛАЙК - КЛИКАБЕЛЬНЫЙ + ЖИВОЙ СЧЁТЧИК ИЗ CONTEXT */}
                    <div 
                      className={`feed-stat ${isLiked ? 'liked' : ''}`} 
                      onClick={(e) => handleToggleLike(track.id, e)}
                    >
                      <IconHeart filled={isLiked} />
                      <span>{likeCount}</span>
                    </div>
                    
                    {/* ✅ РЕПОСТ - КЛИКАБЕЛЬНЫЙ + ЖИВОЙ СЧЁТЧИК ИЗ CONTEXT */}
                    <div 
                      className={`feed-stat ${isRepostedTrack ? 'reposted' : ''}`}
                      onClick={(e) => handleToggleRepost(track.id, e)}
                    >
                      <IconRepost filled={isRepostedTrack} />
                      <span>{repostCount}</span>
                    </div>
                    
                    <div className="feed-stat">
                      <span>👁</span>
                      <span>{track.play_count || 0}</span>
                    </div>
                    <div className="feed-stat">
                      <span>💬</span>
                      <span>{track.comment_count || 0}</span>
                    </div>
                  </div>

                  {/* Waveform под счётчиками */}
                  <div className="feed-waveform-wrapper">
                    <WaveformVisualizer 
                      trackId={track.id}
                      progress={progress}
                      isPlaying={isCurrentTrack && isPlaying}
                      onSeek={onSeek}
                      onWaveformClick={(trackId, seekTime, percentage) => {
                        handleWaveformClick(trackId, seekTime, percentage);
                      }}
                      duration={trackDuration}
                      waveformData={waveformData}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  console.log('🎯 FeedPage статус:', {
    feedTracksCount: feedTracks.length,
    feedPlaylistsCount: feedPlaylists.length,
    loading,
    error,
    currentTrack,
    isPlaying,
    playingPlaylistId,
    waveformsLoaded: Object.keys(trackWaveforms).length
  });

  return (
    <div className="feed-page">
      <div className="feed-header glass-header">
        <div className="feed-title-container">
          <h1 className="feed-title">
            <Shuffle
              text="Лента новостей"
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
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'white',
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.3px',
                lineHeight: '1.4'
              }}
            />
          </h1>
        </div>
      </div>
      
      <div className="feed-content">
        {/* ✅ СЕКЦИЯ ПЛЕЙЛИСТОВ - перед треками */}
        {renderFeedPlaylists()}
        
        {/* ✅ СЕКЦИЯ ТРЕКОВ */}
        {renderFeedTracks()}
      </div>
    </div>
  );
};

export default FeedPage;