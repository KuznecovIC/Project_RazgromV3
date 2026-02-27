// frontend/src/pages/LibraryPage.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Shuffle from '../components/Shuffle';
import CompactTrackCard from '../components/CompactTrackCard';
import GooeyNav from '../components/GooeyNav';
import './LibraryPage.css';

// ИМПОРТЫ ДЛЯ РЕАЛЬНЫХ ПОДПИСОК И API
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';

// Иконки
const IconAll = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="currentColor" />
  </svg>
);

const IconCreated = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor" />
  </svg>
);

const IconLiked = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M4.5 21c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const IconHistory = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ✅ ИКОНКА: Иконка лайка (сердечко) - Filled версия
const IconHeartFilled = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

// ✅ ИКОНКА: Иконка лайка (сердечко) - Outline версия
const IconHeartOutline = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

// ✅ ИКОНКА: Иконка репоста - Filled версия
const IconRepostFilled = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
  </svg>
);

// ✅ ИКОНКА: Иконка репоста - Outline версия
const IconRepostOutline = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
  </svg>
);

// ✅ ИКОНКА: Иконка шера (репост) - старая для совместимости
const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="share-icon">
    <path
      d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
      fill="currentColor"
    />
  </svg>
);

// ✅ ИКОНКА: Play
const IconPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);

// ✅ ИКОНКА: Pause
const IconPause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
  </svg>
);

// Компонент заголовка секции с поиском
const LibrarySectionHeader = ({ title, showFilter = false, onFilterChange, showSearch = false, onSearchChange, searchPlaceholder = "Search..." }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
    <div className="library-section-header">
      <div className="library-title-row">
        <div className="library-title-wrapper">
          <h2 className="library-section-title">{title}</h2>
        </div>
        {showFilter && (
          <div className="library-filter-buttons">
            <button 
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterClick('all')}
            >
              <IconAll />
              <span>All</span>
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'created' ? 'active' : ''}`}
              onClick={() => handleFilterClick('created')}
            >
              <IconCreated />
              <span>Created</span>
            </button>
            <button 
              className={`filter-btn ${activeFilter === 'liked' ? 'active' : ''}`}
              onClick={() => handleFilterClick('liked')}
            >
              <IconLiked />
              <span>Liked</span>
            </button>
          </div>
        )}
      </div>
      
      {showSearch && (
        <div className="library-search-container">
          <div className="library-search-wrapper">
            <IconSearch />
            <input
              type="text"
              className="library-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search tracks"
            />
            {searchQuery && (
              <button 
                className="library-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  onSearchChange?.('');
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="library-search-hint">
              Searching for: <span className="search-query">{searchQuery}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Компонент для пустого состояния
const LibraryEmptyState = ({ message }) => {
  return (
    <div className="library-empty-state">
      <p className="empty-message">{message}</p>
    </div>
  );
};

// Компонент-разделитель
const SectionDivider = () => (
  <div className="library-section-divider"></div>
);

// Функция для форматирования времени
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Some time ago';
  
  const now = Date.now();
  const playedAt = new Date(timestamp).getTime();
  const diffMs = now - playedAt;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }
};

// История трека с обновляемым временем и кликабельным автором
const HistoryTrackItem = ({ track, index, onTrackTitleClick, onArtistClick }) => {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(track.playedAt));
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isArtistHovered, setIsArtistHovered] = useState(false);
  const navigate = useNavigate();

  const handleArtistClick = (e) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      console.error("❌ LibraryPage: нет uploaded_by.id", track);
      return;
    }
    
    navigate(`/profile/${track.uploaded_by.id}`);
  };

  const handleActualArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick && track?.uploaded_by?.id) {
      onArtistClick(e, track);
    } else {
      handleArtistClick(e);
    }
  };

  useEffect(() => {
    if (!track.playedAt) {
      setTimeAgo('Some time ago');
      return;
    }
    
    const updateTime = () => {
      setTimeAgo(formatTimeAgo(track.playedAt));
    };
    
    updateTime();
    
    const intervalMs = track.playedAtMs && (Date.now() - track.playedAtMs < 60000) ? 10000 : 60000;
    const interval = setInterval(updateTime, intervalMs);
    
    return () => clearInterval(interval);
  }, [track.playedAt, track.playedAtMs]);

  return (
    <div className="history-item">
      <div className="history-track">
        <img src={track.cover} alt={track.title} className="history-track-cover" />
        <div className="history-track-info">
          <h5 
            className="history-track-title"
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
              fontSize: '0.9rem',
              fontFamily: "'Press Start 2P', sans-serif",
              marginBottom: '4px',
              fontWeight: '700'
            }}
          >
            {track.title}
          </h5>
          <p 
            className="history-track-artist clickable-artist"
            onClick={handleActualArtistClick}
            onMouseEnter={() => setIsArtistHovered(true)}
            onMouseLeave={() => setIsArtistHovered(false)}
            style={{
              fontSize: '0.8rem',
              color: isArtistHovered ? '#8456ff' : 'rgba(255, 255, 255, 0.7)',
              fontFamily: "'Press Start 2P', sans-serif",
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
          >
            {track.uploaded_by?.username || track.artist}
          </p>
        </div>
        <div className="history-time">{timeAgo}</div>
      </div>
    </div>
  );
};

// ✅ КОМПОНЕНТ: Карточка трека в истории
const HistoryTrackCard = ({
  track,
  isPlaying,
  onPlayPause,
  liked,
  onLike,
  reposted,
  onRepost,
  playedAtLabel,
  onOpenTrack,
  onOpenArtist,
  playCount = 1
}) => {
  const cover = track?.cover || track?.cover_url || track?.image || null;

  return (
    <div className="history-track-card">
      <div className="history-cover" onClick={onPlayPause} role="button" tabIndex={0}>
        {cover ? (
          <img className="history-cover-img" src={cover} alt={track?.title || "track"} />
        ) : (
          <div className="history-cover-fallback" />
        )}

        <div className="history-cover-overlay">
          <button
            type="button"
            className="history-play-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlayPause?.();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
        </div>
      </div>

      <div className="history-info">
        <div className="history-title-row">
          <button
            type="button"
            className="history-title history-link"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenTrack?.();
            }}
            title={track?.title || ""}
          >
            {track?.title || "Untitled"}
          </button>
          
          <div className="history-played-at">
            {playedAtLabel}
            {playCount > 1 && (
              <span className="play-count-badge">
                {playCount} plays
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="history-artist history-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenArtist?.();
          }}
          title={track?.artist || track?.uploaded_by?.username || ""}
        >
          {track?.artist || track?.uploaded_by?.username || "Unknown"}
        </button>

        <div className="history-actions">
          <button
            type="button"
            className={`history-action-btn ${liked ? "is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLike?.();
            }}
            aria-label={liked ? "Unlike" : "Like"}
          >
            {liked ? <IconHeartFilled /> : <IconHeartOutline />}
          </button>

          <button
            type="button"
            className={`history-action-btn ${reposted ? "is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRepost?.();
            }}
            aria-label={reposted ? "Undo repost" : "Repost"}
          >
            {reposted ? <IconRepostFilled /> : <IconRepostOutline />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Функция для поиска треков по запросу
const searchTracks = (tracks, query) => {
  if (!query.trim()) return tracks;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return tracks.filter(track => {
    const titleMatch = track.title.toLowerCase().includes(lowerQuery);
    const artistMatch = track.artist.toLowerCase().includes(lowerQuery);
    const titleWords = track.title.toLowerCase().split(' ');
    const artistWords = track.artist.toLowerCase().split(' ');
    const startsWithTitle = titleWords.some(word => word.startsWith(lowerQuery));
    const startsWithArtist = artistWords.some(word => word.startsWith(lowerQuery));
    const partialMatch = titleWords.some(word => 
      word.length >= 3 && lowerQuery.length >= 2 && 
      word.substring(0, Math.min(word.length, lowerQuery.length)) === lowerQuery.substring(0, Math.min(word.length, lowerQuery.length))
    );
    
    return titleMatch || artistMatch || startsWithTitle || startsWithArtist || partialMatch;
  });
};

// КОМПОНЕНТ КАРТОЧКИ ПОЛЬЗОВАТЕЛЯ - ВЕРТИКАЛЬНАЯ С ПРЕФИКСОМ lib-
const UserCard = ({ user, onOpenProfile, onToggle }) => {
  const followersCount = user?.followers_count ?? 0;
  const avatarUrl =
    user?.avatar || user?.avatar_url || user?.profile_image || user?.image || null;
  const isFollowingUser = !!user?.__isFollowing;

  return (
    <div className="lib-user-card lib-user-card--vertical" role="group">
      <button
        type="button"
        className="lib-user-card-avatar-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenProfile?.();
        }}
        aria-label={`Open ${user?.username || "user"} profile`}
      >
        <div className="lib-user-card-avatar lib-user-card-avatar--xl">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.username || "user"} />
          ) : (
            <div className="lib-user-card-avatar-fallback">
              <IconUser />
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        className="lib-user-card-name-btn lib-user-card-name-btn--center"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenProfile?.();
        }}
      >
        <h4 className="lib-user-card-username lib-user-card-username--center">
          {user?.username || "Unknown"}
        </h4>
      </button>

      <p className="lib-user-card-followers lib-user-card-followers--center">
        {followersCount.toLocaleString()} followers
      </p>

      <button
        type="button"
        className={`lib-user-card-follow-under lib-user-card-follow-under--xl ${
          isFollowingUser ? "is-following" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle?.();
        }}
      >
        {isFollowingUser ? "Following" : "Follow"}
      </button>
    </div>
  );
};

// Основной компонент LibraryPage
const LibraryPage = ({ 
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  likedTrackIds = [], 
  onToggleLike,
  tracksById = {},
  recentTrackIds = [],
  currentTime = 0,
  duration = 0,
  onSeek,
  onTrackTitleClick,
  onArtistClick,
  uploadedTracks = [],
  isLoadingTracks = false,
  history = [],
  sessionToken,
  me,
  setPlaybackQueue,
  playQueueIds = []
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState('overview');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedSearchQuery, setLikedSearchQuery] = useState('');
  
  // ✅ Состояния для плейлистов
  const [playlistFilter, setPlaylistFilter] = useState('all');
  const [createdPlaylists, setCreatedPlaylists] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  
  // ✅ Состояния для очереди плейлистов
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);
  const [playlistQueueCache, setPlaylistQueueCache] = useState({});
  
  // ✅ Добавляем методы для лайков/репостов плейлистов
  const {
    reposts,
    toggleRepost,
    toggleFollow,
    isFollowing,
    followsLoaded,
    refreshFollows,
    togglePlaylistLike,
    togglePlaylistRepost,
    isPlaylistLiked,
    isPlaylistReposted,
    getPlaylistLikeCount,
    getPlaylistRepostCount,
    setPlaylistLikeStatus,
    setPlaylistRepostStatus,
  } = useSocial();

  const [meId, setMeId] = useState(null);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);

  // 🔥 Логируем смену секции один раз, а не при каждом рендере
  useEffect(() => {
    console.log('🎯 LibraryPage: секция изменена на:', activeSection);
  }, [activeSection]);

  // 🔥 Читаем tab из URL при загрузке
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    console.log('📋 LibraryPage: tab из URL:', tabFromUrl);
    
    if (tabFromUrl) {
      const sectionMap = {
        'likes': 'likes',
        'playlists': 'playlists',
        'following': 'following',
        'history': 'history'
      };
      
      if (sectionMap[tabFromUrl]) {
        setActiveSection(sectionMap[tabFromUrl]);
      }
    }
  }, [searchParams]);

  // Обновляем URL при изменении activeSection
  useEffect(() => {
    const sectionToTabMap = {
      'likes': 'likes',
      'playlists': 'playlists',
      'following': 'following',
      'history': 'history'
    };
    
    const currentTab = searchParams.get('tab');
    const newTab = sectionToTabMap[activeSection];
    
    if (newTab && currentTab !== newTab && activeSection !== 'overview') {
      navigate(`/library?tab=${newTab}`, { replace: true });
    }
  }, [activeSection, navigate, searchParams]);

  // ФУНКЦИЯ: Получение публичного профиля пользователя
  const fetchPublicUser = async (userId) => {
    try {
      const r = await apiFetch(`/api/users/${userId}/`);
      if (!r.ok) return null;
      const d = await r.json();
      return d?.user || d || null;
    } catch (e) {
      console.error('LibraryPage: fetchPublicUser error', e);
      return null;
    }
  };

  // ЭФФЕКТ: Загружаем meId (кто я)
  useEffect(() => {
    let mounted = true;

    const loadMe = async () => {
      try {
        const resp = await apiFetch('/api/users/me/');
        if (!resp.ok) return;
        const data = await resp.json();
        if (mounted) setMeId(data?.user?.id || data?.id || null);
      } catch (e) {
        console.error('LibraryPage: loadMe error', e);
      }
    };

    loadMe();
    return () => { mounted = false; };
  }, []);

  // ✅ ЭФФЕКТ: Загрузка плейлистов (ИСПРАВЛЕНО - убрана зависимость isPlaylistReposted)
  useEffect(() => {
    if (!meId) return;

    const loadPlaylists = async () => {
      setIsLoadingPlaylists(true);
      try {
        // 1) Created playlists
        const r1 = await apiFetch(`/api/users/${meId}/playlists/`);
        let created = [];
        if (r1.ok) {
          const d1 = await r1.json();
          created = d1?.playlists || d1 || [];
        }

        // 2) Liked playlists
        const r2 = await apiFetch(`/api/users/${meId}/liked-playlists/`);
        let liked = [];
        if (r2.ok) {
          const d2 = await r2.json();
          liked = d2?.playlists || d2 || [];
        }

        // ✅ засеиваем счетчики и статусы плейлистов в SocialContext
        [...(created || []), ...(liked || [])].forEach(pl => {
          if (!pl?.id) return;

          if (pl.likes_count !== undefined) {
            const likedByMe = (liked || []).some(x => x?.id === pl.id);
            setPlaylistLikeStatus?.(pl.id, likedByMe, pl.likes_count);
          }

          if (pl.repost_count !== undefined || pl.reposts_count !== undefined) {
            const cnt = pl.repost_count ?? pl.reposts_count;
            
            // 🔥 ИСПРАВЛЕНО: НЕ затираем false. Берём статус из API (is_reposted) если есть,
            // иначе оставляем то, что уже знает SocialContext из localStorage
            const repostedByMe =
              (pl.is_reposted === true) ? true : (isPlaylistReposted?.(pl.id) ?? false);

            setPlaylistRepostStatus?.(pl.id, repostedByMe, cnt);
          }
        });

        setCreatedPlaylists(Array.isArray(created) ? created : []);
        setLikedPlaylists(Array.isArray(liked) ? liked : []);
      } catch (e) {
        console.error('LibraryPage: loadPlaylists error', e);
        setCreatedPlaylists([]);
        setLikedPlaylists([]);
      } finally {
        setIsLoadingPlaylists(false);
      }
    };

    loadPlaylists();
  }, [meId, setPlaylistLikeStatus, setPlaylistRepostStatus]); // ✅ Убрана isPlaylistReposted из зависимостей

  // ФУНКЦИЯ: Загрузка моих подписок
  const loadFollowingUsers = async () => {
    if (!meId) return;

    setIsLoadingFollowing(true);
    try {
      const resp = await apiFetch(`/api/users/${meId}/following/?per_page=50`);
      const data = await resp.json();

      const baseList = data?.following || [];
      const hydrated = await Promise.all(
        baseList.map(u => fetchPublicUser(u.id))
      );

      setFollowingUsers(hydrated.filter(Boolean));
    } catch (e) {
      console.error('LibraryPage: loadFollowingUsers error', e);
      setFollowingUsers([]);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  // ЭФФЕКТ: Загрузка подписок при переходе в секцию following
  useEffect(() => {
    if (activeSection !== 'following' && activeSection !== 'overview') return;
    loadFollowingUsers();
    refreshFollows?.();
  }, [activeSection, meId, refreshFollows]);

  // ВЫЧИСЛЕНИЕ: ID авторов, с которыми взаимодействовал пользователь
  const interactedArtistIds = useMemo(() => {
    const ids = new Set();

    (likedTrackIds || []).forEach(trackId => {
      const track = tracksById?.[trackId];
      const authorId = track?.uploaded_by?.id;
      if (authorId) ids.add(authorId);
    });

    Object.keys(reposts || {}).forEach(trackId => {
      if (!reposts[trackId]) return;
      const track = tracksById?.[Number(trackId)];
      const authorId = track?.uploaded_by?.id;
      if (authorId) ids.add(authorId);
    });

    if (meId) ids.delete(meId);

    return Array.from(ids);
  }, [likedTrackIds, reposts, tracksById, meId]);

  // ЭФФЕКТ: Загрузка рекомендованных пользователей
  useEffect(() => {
    let mounted = true;

    const loadRecommended = async () => {
      if (!followsLoaded) return;

      try {
        const hydrated = await Promise.all(
          interactedArtistIds.map(id => fetchPublicUser(id))
        );

        const filtered = hydrated
          .filter(Boolean)
          .filter(u => !isFollowing(u.id))
          .slice(0, 12);

        if (mounted) setRecommendedUsers(filtered);
      } catch (e) {
        console.error('LibraryPage: loadRecommended error', e);
      }
    };

    loadRecommended();
    return () => { mounted = false; };
  }, [interactedArtistIds, followsLoaded, isFollowing]);

  // ============================================
  // ✅ Все данные из пропсов
  // ============================================

  // ✅ ВСЕ ТРЕКИ из tracksById
  const allTracks = useMemo(() => {
    return Object.values(tracksById || {}).filter(track => 
      track && track.id && track.title
    ).sort((a, b) => b.id - a.id).map(track => ({
      ...track,
      uploaded_by: track.uploaded_by || { id: track.user_id || 0, username: track.artist }
    }));
  }, [tracksById]);

  // ✅ ЛАЙКНУТЫЕ ТРЕКИ
  const likedTracksData = useMemo(() => {
    if (!Array.isArray(likedTrackIds)) return [];
    return likedTrackIds
      .map(id => tracksById[id])
      .filter(Boolean)
      .map(track => ({
        ...track,
        uploaded_by: track.uploaded_by || { id: track.user_id || 0, username: track.artist }
      }))
      .sort((a, b) => b.id - a.id);
  }, [likedTrackIds, tracksById]);

  // ✅ НЕДАВНО ПРОИГРАННЫЕ ТРЕКИ
  const recentlyPlayedTracks = useMemo(() => {
    if (!Array.isArray(recentTrackIds)) return [];

    const seen = new Set();
    const uniqueIdsMostRecentFirst = [];

    for (let i = recentTrackIds.length - 1; i >= 0; i--) {
      const id = recentTrackIds[i];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      uniqueIdsMostRecentFirst.push(id);
    }

    const now = Date.now();

    return uniqueIdsMostRecentFirst
      .map((id, idx) => {
        const track = tracksById[id];
        if (!track) return null;

        return {
          ...track,
          playedAt: new Date(now - idx * 1000).toISOString(),
          playedAtMs: now - idx * 1000,
          uploaded_by: track.uploaded_by || { id: track.user_id || 0, username: track.artist }
        };
      })
      .filter(Boolean);
  }, [recentTrackIds, tracksById]);

  // ✅ ИСТОРИЯ ПРОСЛУШИВАНИЙ (из пропсов App.js)
  const historyTracksFromApp = useMemo(() => {
    if (!Array.isArray(history)) return [];
    if (history.length === 0) return [];

    const processed = history
      .map((h) => {
        const trackId = h.track_id ?? h.trackId ?? h.track ?? h?.track?.id;
        const playedAt = h.played_at ?? h.playedAt;

        if (!trackId) return null;

        const base = tracksById?.[trackId];
        if (!base) return null;

        return {
          ...base,
          playedAt: playedAt || new Date().toISOString(),
          playedAtMs: playedAt ? new Date(playedAt).getTime() : Date.now(),
          uploaded_by: base.uploaded_by || { 
            id: base.user_id || 0, 
            username: base.artist || 'Unknown Artist'
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.playedAtMs || 0) - (a.playedAtMs || 0));

    const map = new Map();
    for (const item of processed) {
      const key = item?.id;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, { ...item, playCount: 1 });
      } else {
        const prev = map.get(key);
        map.set(key, { 
          ...prev, 
          playCount: (prev.playCount || 1) + 1,
          playedAtMs: Math.max(prev.playedAtMs || 0, item.playedAtMs || 0),
          playedAt: prev.playedAtMs > item.playedAtMs ? prev.playedAt : item.playedAt
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => (b.playedAtMs || 0) - (a.playedAtMs || 0));
  }, [history, tracksById]);

  // ✅ ЗАГРУЖЕННЫЕ ТРЕКИ ПОЛЬЗОВАТЕЛЯ
  const uploadedTracksData = useMemo(() => {
    return uploadedTracks.map(track => ({
      id: track.id || track.track_id,
      title: track.title || 'Без названия',
      artist: track.artist || 'Автор',
      cover: track.cover_url || track.cover || 'http://localhost:8000/static/default_cover.jpg',
      audio_url: track.audio_url || track.audio_file,
      duration: track.duration || 0,
      uploaded_by: track.uploaded_by || { 
        id: track.uploaded_by_id || 0, 
        username: track.uploaded_by_username || track.artist 
      },
      isUserTrack: true
    }));
  }, [uploadedTracks]);

  // Фильтруем лайкнутые треки по поисковому запросу
  const filteredLikedTracks = useMemo(() => {
    return searchTracks(likedTracksData, likedSearchQuery);
  }, [likedTracksData, likedSearchQuery]);

  // Навигация для Library
  const libraryNav = [
    { label: 'Overview', href: '#overview' },
    { label: 'Likes', href: '#likes' },
    { label: 'Playlists', href: '#playlists' },
    { label: 'Following', href: '#following' },
    { label: 'History', href: '#history' }
  ];

  // Функция для получения недавних треков (сортированных)
  const recentTracksWithoutTime = useMemo(() => {
    const sorted = [...recentlyPlayedTracks].sort((a, b) => {
      const timeA = a.playedAtMs || 0;
      const timeB = b.playedAtMs || 0;
      return timeB - timeA;
    });
    
    return sorted.map(track => {
      const { playedAt, playedAtMs, ...trackWithoutTime } = track;
      return trackWithoutTime;
    });
  }, [recentlyPlayedTracks, forceUpdate]);

  // Обновляем forceUpdate каждую секунду для обновления времени
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Обработчик навигации
  const handleNavNavigate = (item, index) => {
    const sectionMap = {
      'Overview': 'overview',
      'Likes': 'likes',
      'Playlists': 'playlists',
      'Following': 'following',
      'History': 'history'
    };
    
    setActiveSection(sectionMap[item.label] || 'overview');
  };

  // Обработчик воспроизведения
  const handlePlay = (trackId) => {
    onPlayPause(trackId);
  };

  // Функция для обработки клика по названию трека
  const handleTrackTitleClick = (trackId) => {
    if (onTrackTitleClick) {
      onTrackTitleClick(trackId);
    }
  };

  // ФУНКЦИЯ: Обработчик подписки/отписки
  const handleFollowToggle = async (userId, isCurrentlyFollowing) => {
    await toggleFollow(userId, !isCurrentlyFollowing);
    refreshFollows?.();
    loadFollowingUsers();
  };

  // Обработчик репоста
  const handleRepost = async (trackId) => {
    try {
      console.log('📤 LibraryPage: toggleRepost', trackId);
      await toggleRepost(trackId);
    } catch (error) {
      console.error('❌ LibraryPage: ошибка репоста', error);
    }
  };

  // ✅ Функция для получения очереди треков плейлиста (ids) с бэка
  const fetchPlaylistQueueIds = async (playlistId) => {
    // Проверяем кэш
    if (playlistQueueCache[playlistId]?.length) {
      console.log('✅ LibraryPage: используем кэш для плейлиста', playlistId);
      return playlistQueueCache[playlistId];
    }

    try {
      console.log('📤 LibraryPage: загрузка треков плейлиста', playlistId);
      const r = await apiFetch(`/api/playlists/${playlistId}/`);
      if (!r.ok) {
        console.error('❌ LibraryPage: ошибка загрузки плейлиста', r.status);
        return [];
      }
      
      const d = await r.json();
      const items = d?.items || d?.playlist?.items || [];
      const tracks = items
        .map((it) => it?.track || it)
        .filter(Boolean);

      const ids = tracks.map((t) => t.id).filter((x) => x != null);
      
      // Сохраняем в кэш
      setPlaylistQueueCache((prev) => ({ ...prev, [playlistId]: ids }));
      console.log(`✅ LibraryPage: загружено ${ids.length} треков для плейлиста`, playlistId);
      
      return ids;
    } catch (e) {
      console.error('❌ LibraryPage: fetchPlaylistQueueIds error', e);
      return [];
    }
  };

  // ✅ Обработчик play/pause для плейлиста как очередь
  const handlePlaylistPlayPause = async (pl) => {
    if (!pl?.id) return;

    console.log('▶️ LibraryPage: воспроизведение плейлиста', pl.id, pl.title);

    // если уже этот плейлист активен — просто pause/resume
    if (playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0) {
      console.log('⏯️ LibraryPage: тот же плейлист, toggle play/pause');
      onPlayPause?.(); // toggle play/pause (без id)
      return;
    }

    const ids = await fetchPlaylistQueueIds(pl.id);
    if (!ids.length) {
      console.log('⚠️ LibraryPage: в плейлисте нет треков');
      return;
    }

    // ставим очередь в App.js
    if (typeof setPlaybackQueue === 'function') {
      setPlaybackQueue(ids);
    }

    setPlayingPlaylistId(pl.id);

    // запускаем первый трек (передаем id первого трека)
    console.log('▶️ LibraryPage: запускаем первый трек', ids[0]);
    onPlayPause?.(ids[0]);
  };

  // ✅ Функция для получения всех плейлистов (объединение без дублей)
  const getAllPlaylists = useMemo(() => {
    const map = new Map();
    [...createdPlaylists, ...likedPlaylists].forEach((p) => {
      if (p?.id != null) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [createdPlaylists, likedPlaylists]);

  // ✅ Функция для получения плейлистов по фильтру
  const getPlaylistsToShow = () => {
    if (playlistFilter === 'created') return createdPlaylists;

    if (playlistFilter === 'liked') {
      // ✅ Фильтруем "на лету" по статусу лайка из SocialContext
      return getAllPlaylists.filter(p => p?.id != null && isPlaylistLiked?.(p.id));
    }

    // all: возвращаем все плейлисты
    return getAllPlaylists;
  };

  // ✅ Рендеринг секции плейлистов
  const renderPlaylistsSection = () => {
    const list = getPlaylistsToShow();

    return (
      <div className="library-section-content">
        <LibrarySectionHeader
          title="Playlists"
          showFilter={true}
          onFilterChange={setPlaylistFilter}
        />

        {isLoadingPlaylists ? (
          <LibraryEmptyState message="Loading playlists..." />
        ) : list.length === 0 ? (
          <LibraryEmptyState message="No playlists yet" />
        ) : (
          <div className="library-playlists-list">
            {list.map((pl) => {
              const isThisPlaylistPlaying = playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0;
              
              return (
                <div key={pl.id} className="library-playlist-row">
                  <div className="library-playlist-left">
                    <div
                      className="playlist-cover-wrap"
                      onClick={() => navigate(`/playlist/${pl.id}`)}
                      title="Open playlist"
                    >
                      <img
                        className="library-playlist-cover"
                        src={pl.cover_url || pl.cover || '/default-cover.jpg'}
                        alt={pl.title}
                      />
                      <button
                        className="playlist-cover-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaylistPlayPause(pl);
                        }}
                        aria-label={isThisPlaylistPlaying && isPlaying ? "Pause playlist" : "Play playlist"}
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
                        {pl.title}
                      </div>

                      <div className="library-playlist-sub">
                        {(pl.track_count ?? pl.tracks_count ?? 0)} tracks
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
            })}
          </div>
        )}
      </div>
    );
  };

  // Рендеринг раздела Overview
  const renderOverview = () => {
    const filteredRecentTracks = searchTracks(recentTracksWithoutTime, searchQuery);
    const overviewPlaylists = getPlaylistsToShow();
    
    return (
      <div className="library-overview-content">
        <div className="overview-section">
          <LibrarySectionHeader 
            title="Recently Played" 
            showSearch={true}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search in recently played..."
          />
          {recentTracksWithoutTime.length > 0 ? (
            <>
              <div className="library-search-results-info">
                {searchQuery && (
                  <div className="search-results-count">
                    Found {filteredRecentTracks.length} tracks for "<span className="search-query">{searchQuery}</span>"
                  </div>
                )}
              </div>
              <div className="library-tracks-grid">
                {filteredRecentTracks.slice(0, 6).map((track, index) => (
                  <CompactTrackCard
                    key={`recent-${track.id}-${index}`}
                    track={track}
                    isPlaying={currentTrack === track.id && isPlaying}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlayPause={() => handlePlay(track.id)}
                    onToggleLike={onToggleLike}
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={onArtistClick}
                    isNew={index === 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <LibraryEmptyState message="No recently played tracks" />
          )}
        </div>

        <SectionDivider />

        <div className="overview-section">
          <LibrarySectionHeader title="Liked Tracks" />
          {likedTracksData.length > 0 ? (
            <>
              <div className="liked-tracks-count">
                {likedTracksData.length} liked tracks
              </div>
              <div className="library-tracks-grid">
                {likedTracksData.slice(0, 6).map(track => (
                  <CompactTrackCard
                    key={`like-${track.id}`}
                    track={track}
                    isPlaying={currentTrack === track.id && isPlaying}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlayPause={() => handlePlay(track.id)}
                    onToggleLike={onToggleLike}
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={onArtistClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <LibraryEmptyState message="No liked tracks yet" />
          )}
        </div>

        <SectionDivider />

        {uploadedTracksData.length > 0 && (
          <>
            <div className="overview-section">
              <LibrarySectionHeader title="Your Uploads" />
              <div className="uploaded-tracks-count">
                {uploadedTracksData.length} uploaded tracks
              </div>
              <div className="library-tracks-grid">
                {uploadedTracksData.slice(0, 6).map(track => (
                  <CompactTrackCard
                    key={`upload-${track.id}`}
                    track={track}
                    isPlaying={currentTrack === track.id && isPlaying}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlayPause={() => handlePlay(track.id)}
                    onToggleLike={onToggleLike}
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={onArtistClick}
                    isNew={true}
                  />
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        <div className="overview-section">
          <div className="library-header">
            <h2 className="library-section-title">Playlists</h2>
            <div className="playlist-filter">
              <button 
                onClick={() => setPlaylistFilter('all')} 
                className={playlistFilter === 'all' ? 'active' : ''}
              >
                All
              </button>
              <button 
                onClick={() => setPlaylistFilter('created')} 
                className={playlistFilter === 'created' ? 'active' : ''}
              >
                Created
              </button>
              <button 
                onClick={() => setPlaylistFilter('liked')} 
                className={playlistFilter === 'liked' ? 'active' : ''}
              >
                Liked
              </button>
            </div>
          </div>
          {isLoadingPlaylists ? (
            <LibraryEmptyState message="Loading playlists..." />
          ) : overviewPlaylists.length > 0 ? (
            <div className="library-playlists-grid">
              {overviewPlaylists.slice(0, 6).map(pl => (
                <div
                  key={pl.id}
                  className="library-playlist-card"
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                >
                  <img
                    src={pl.cover_url || pl.cover || '/default-cover.jpg'}
                    alt={pl.title}
                  />
                  <div className="playlist-title">{pl.title}</div>
                </div>
              ))}
            </div>
          ) : (
            <LibraryEmptyState message="No playlists yet" />
          )}
        </div>

        <SectionDivider />

        <div className="overview-section">
          <LibrarySectionHeader title="Following" />

          {isLoadingFollowing ? (
            <LibraryEmptyState message="Loading following..." />
          ) : followingUsers.length > 0 ? (
            <div className="library-users-grid">
              {followingUsers.slice(0, 6).map(user => {
                const followingNow = followsLoaded ? isFollowing(user.id) : false;
                return (
                  <UserCard
                    key={`overview-following-${user.id}`}
                    user={{ ...user, __isFollowing: followingNow }}
                    onOpenProfile={() => navigate(`/profile/${user.id}`)}
                    onToggle={() => handleFollowToggle(user.id, followingNow)}
                  />
                );
              })}
            </div>
          ) : (
            <LibraryEmptyState message="Not following anyone yet" />
          )}
        </div>
      </div>
    );
  };

  // Рендеринг раздела лайков
  const renderLikesSection = () => {
    return (
      <div className="library-section-content">
        <LibrarySectionHeader 
          title="Liked Tracks" 
          showSearch={true}
          onSearchChange={setLikedSearchQuery}
          searchPlaceholder="Search in liked tracks..."
        />
        
        {likedTracksData.length > 0 ? (
          <>
            <div className="liked-tracks-header">
              <div className="liked-tracks-count">
                {filteredLikedTracks.length} of {likedTracksData.length} liked tracks
                {likedSearchQuery && (
                  <span className="search-filtered">
                    {" "}filtered by "<span className="search-query">{likedSearchQuery}</span>"
                  </span>
                )}
              </div>
              
              {likedSearchQuery && filteredLikedTracks.length === 0 && (
                <div className="no-search-results">
                  <p>No liked tracks found for "<span className="search-query">{likedSearchQuery}</span>"</p>
                  <p className="search-suggestions">
                    Try searching by title or artist name...
                  </p>
                </div>
              )}
            </div>
            
            {filteredLikedTracks.length > 0 ? (
              <div className="library-tracks-grid">
                {filteredLikedTracks.map(track => (
                  <CompactTrackCard
                    key={`like-${track.id}`}
                    track={track}
                    isPlaying={currentTrack === track.id && isPlaying}
                    isLiked={likedTrackIds.includes(track.id)}
                    onPlayPause={() => handlePlay(track.id)}
                    onToggleLike={onToggleLike}
                    onTrackTitleClick={handleTrackTitleClick}
                    onArtistClick={onArtistClick}
                  />
                ))}
              </div>
            ) : !likedSearchQuery ? (
              <LibraryEmptyState message="No liked tracks yet" />
            ) : null}
          </>
        ) : (
          <LibraryEmptyState message="No liked tracks yet" />
        )}
      </div>
    );
  };

  // Рендеринг раздела following
  const renderFollowingSection = () => {
    return (
      <div className="library-section-content">
        <div className="library-section-header">
          <div className="library-title-wrapper">
            <h2 className="library-section-title">Following</h2>
          </div>
        </div>

        <div style={{ marginBottom: 40 }}>
          <h3 className="library-following-block-title">Recommended artists</h3>
          {recommendedUsers.length > 0 ? (
            <div className="library-users-grid">
              {recommendedUsers.map(user => {
                const followingNow = followsLoaded ? isFollowing(user.id) : false;
                return (
                  <UserCard
                    key={`rec-${user.id}`}
                    user={{ ...user, __isFollowing: followingNow }}
                    onOpenProfile={() => navigate(`/profile/${user.id}`)}
                    onToggle={() => handleFollowToggle(user.id, followingNow)}
                  />
                );
              })}
            </div>
          ) : (
            <LibraryEmptyState message="No recommendations yet" />
          )}
        </div>

        <SectionDivider />

        <div style={{ marginTop: 40 }}>
          <h3 className="library-following-block-title">You follow</h3>

          {isLoadingFollowing ? (
            <div className="library-loading-state"><p>Loading following...</p></div>
          ) : followingUsers.length > 0 ? (
            <div className="library-users-grid">
              {followingUsers.map(user => {
                const followingNow = followsLoaded ? isFollowing(user.id) : false;
                return (
                  <UserCard
                    key={`fol-${user.id}`}
                    user={{ ...user, __isFollowing: followingNow }}
                    onOpenProfile={() => navigate(`/profile/${user.id}`)}
                    onToggle={() => handleFollowToggle(user.id, followingNow)}
                  />
                );
              })}
            </div>
          ) : (
            <LibraryEmptyState message="Not following anyone yet" />
          )}
        </div>
      </div>
    );
  };

  // Рендеринг раздела истории
  const renderHistorySection = () => {
    const displayHistoryTracks = historyTracksFromApp.length > 0
      ? historyTracksFromApp
      : recentlyPlayedTracks;
    
    if (!displayHistoryTracks || displayHistoryTracks.length === 0) {
      return (
        <div className="library-section-content">
          <LibrarySectionHeader title="History" />
          <LibraryEmptyState message="No listening history yet. Play some tracks for 30+ seconds to build your history!" />
        </div>
      );
    }

    return (
      <div className="library-section-content">
        <LibrarySectionHeader title="History" />

        <div className="history-tracks-list">
          {displayHistoryTracks.map((track) => {
            const trackId = track.id;
            const liked = likedTrackIds?.includes(trackId);
            const reposted = !!reposts?.[trackId];
            const isThisPlaying = currentTrack === trackId && isPlaying;
            
            const artistId = track?.artistId || track?.uploaded_by?.id || 
                           track?.uploaded_by_id || track?.user_id;

            const playedAtLabel = track.playedAt
              ? new Date(track.playedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : null;

            return (
              <HistoryTrackCard
                key={`hist-${trackId}-${track.playedAt || ""}`}
                track={track}
                isPlaying={isThisPlaying}
                onPlayPause={() => handlePlay(trackId)}
                liked={liked}
                onLike={() => onToggleLike?.(trackId)}
                reposted={reposted}
                onRepost={() => handleRepost(trackId)}
                playedAtLabel={playedAtLabel}
                playCount={track.playCount || 1}
                onOpenTrack={() => navigate(`/track/${trackId}`)}
                onOpenArtist={() => {
                  if (artistId) {
                    navigate(`/profile/${artistId}`);
                  } else {
                    console.warn('❌ LibraryPage: не найден artistId для трека', trackId);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Рендеринг активной секции
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'likes':
        return renderLikesSection();
      case 'playlists':
        return renderPlaylistsSection();
      case 'following':
        return renderFollowingSection();
      case 'history':
        return renderHistorySection();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="library-page">
      <div className="library-navigation">
        <GooeyNav
          items={libraryNav}
          particleCount={8}
          particleDistances={[70, 15]}
          particleR={90}
          initialActiveIndex={libraryNav.findIndex(item => {
            const sectionMap = {
              'Overview': 'overview',
              'Likes': 'likes',
              'Playlists': 'playlists',
              'Following': 'following',
              'History': 'history'
            };
            return sectionMap[item.label] === activeSection;
          })}
          animationTime={500}
          timeVariance={200}
          colors={[1, 2, 3, 4, 5, 6]}
          onNavigate={handleNavNavigate}
        />
      </div>

      <div className="library-content">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default LibraryPage;