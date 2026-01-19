// LibraryPage.jsx - ИСПРАВЛЕННЫЙ (с единой архитектурой)
import React, { useState, useMemo, useEffect } from 'react';
import Shuffle from './Shuffle';
import CompactTrackCard from './CompactTrackCard';
import GooeyNav from './GooeyNav';
import './LibraryPage.css';

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

// Компонент карточки пользователя
const UserCard = ({ user }) => {
  return (
    <div className="user-card">
      <div className="user-card-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.username} />
        ) : (
          <div className="user-card-avatar-fallback">
            <IconUser />
          </div>
        )}
      </div>
      <div className="user-card-info">
        <h4 className="user-card-username">{user.username}</h4>
        <p className="user-card-followers">{user.followers} followers</p>
      </div>
      <button className="user-card-follow-btn">Following</button>
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
    // Форматируем дату для старых записей
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }
};

// История трека с обновляемым временем
const HistoryTrackItem = ({ track, index, onTrackTitleClick }) => {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(track.playedAt));
  const [isTitleHovered, setIsTitleHovered] = useState(false);

  // Обновляем время при монтировании и при изменении track
  useEffect(() => {
    if (!track.playedAt) {
      setTimeAgo('Some time ago');
      return;
    }
    
    const updateTime = () => {
      setTimeAgo(formatTimeAgo(track.playedAt));
    };
    
    updateTime(); // Первоначальное обновление
    
    // Для "Just now" обновляем чаще
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
            className="history-track-artist"
            style={{
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontFamily: "'Press Start 2P', sans-serif"
            }}
          >
            {track.artist}
          </p>
        </div>
        <div className="history-time">{timeAgo}</div>
      </div>
    </div>
  );
};

// Функция для поиска треков по запросу
const searchTracks = (tracks, query) => {
  if (!query.trim()) return tracks;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return tracks.filter(track => {
    // Ищем в названии трека
    const titleMatch = track.title.toLowerCase().includes(lowerQuery);
    
    // Ищем в имени артиста
    const artistMatch = track.artist.toLowerCase().includes(lowerQuery);
    
    // Ищем по первым буквам слов
    const titleWords = track.title.toLowerCase().split(' ');
    const artistWords = track.artist.toLowerCase().split(' ');
    
    // Проверяем, начинается ли любое слово с поискового запроса
    const startsWithTitle = titleWords.some(word => word.startsWith(lowerQuery));
    const startsWithArtist = artistWords.some(word => word.startsWith(lowerQuery));
    
    // Проверяем на частичное совпадение в начале слов
    const partialMatch = titleWords.some(word => 
      word.length >= 3 && lowerQuery.length >= 2 && 
      word.substring(0, Math.min(word.length, lowerQuery.length)) === lowerQuery.substring(0, Math.min(word.length, lowerQuery.length))
    );
    
    return titleMatch || artistMatch || startsWithTitle || startsWithArtist || partialMatch;
  });
};

// Основной компонент LibraryPage (ИСПРАВЛЕННАЯ АРХИТЕКТУРА)
const LibraryPage = ({ 
  // 🎵 Воспроизведение
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  
  // ❤️ Лайки
  likedTrackIds = [], 
  onToggleLike,
  
  // 📦 Данные треков
  tracksById = {},
  recentTrackIds = [],
  
  // ⏰ Время и управление
  currentTime = 0,
  duration = 0,
  onSeek,
  
  // 🔗 Навигация
  onTrackTitleClick,
  
  // 📤 Загруженные треки
  uploadedTracks = [],
  isLoadingTracks = false,
  
  // 🔑 Сессия
  sessionToken
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedSearchQuery, setLikedSearchQuery] = useState('');
  const [historyTracks, setHistoryTracks] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ============================================
  // ✅ ВАЖНО: Все данные берём из пропсов
  // ============================================

  // ✅ ВСЕ ТРЕКИ из tracksById
  const allTracks = useMemo(() => {
    return Object.values(tracksById || {}).filter(track => 
      track && track.id && track.title
    ).sort((a, b) => b.id - a.id); // Сортируем по ID (новые сверху)
  }, [tracksById]);

  // ✅ ЛАЙКНУТЫЕ ТРЕКИ (из tracksById + likedTrackIds)
  const likedTracksData = useMemo(() => {
    if (!Array.isArray(likedTrackIds)) return [];
    return likedTrackIds
      .map(id => tracksById[id])
      .filter(Boolean)
      .sort((a, b) => b.id - a.id);
  }, [likedTrackIds, tracksById]);

  // ✅ НЕДАВНО ПРОИГРАННЫЕ ТРЕКИ (из recentTrackIds)
  const recentlyPlayedTracks = useMemo(() => {
    if (!Array.isArray(recentTrackIds)) return [];
    return recentTrackIds
      .map(id => tracksById[id])
      .filter(Boolean)
      .map(track => ({
        ...track,
        playedAt: new Date().toISOString(),
        playedAtMs: Date.now() - Math.floor(Math.random() * 1000000) // Для демо
      }));
  }, [recentTrackIds, tracksById]);

  // ✅ ЗАГРУЖЕННЫЕ ТРЕКИ ПОЛЬЗОВАТЕЛЯ
  const uploadedTracksData = useMemo(() => {
    return uploadedTracks.map(track => ({
      id: track.id || track.track_id,
      title: track.title || 'Без названия',
      artist: track.artist || 'Автор',
      cover: track.cover_url || track.cover || 'http://localhost:8000/static/default_cover.jpg',
      audio_url: track.audio_url || track.audio_file,
      duration: track.duration || 0,
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
    { label: 'Albums', href: '#albums' },
    { label: 'Stations', href: '#stations' },
    { label: 'Following', href: '#following' },
    { label: 'History', href: '#history' }
  ];

  // Тестовые данные для подписок
  const testFollowing = [
    {
      id: 1,
      username: 'axstraly',
      avatar: '',
      followers: '1.2k'
    },
    {
      id: 2,
      username: 'metalhead',
      avatar: '',
      followers: '845'
    },
    {
      id: 3,
      username: 'industrial_fan',
      avatar: '',
      followers: '2.1k'
    }
  ];

  // Загрузка истории прослушивания с бэкенда
  const fetchListeningHistory = async () => {
    if (!sessionToken) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/history/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setHistoryTracks(data.history);
      }
    } catch (error) {
      console.error('Ошибка при получении истории:', error);
      // Используем реальные данные из recentTrackIds
      setHistoryTracks(recentlyPlayedTracks);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Функция для получения недавних треков (сортированных)
  const recentTracksWithoutTime = useMemo(() => {
    const sorted = [...recentlyPlayedTracks].sort((a, b) => {
      const timeA = a.playedAtMs || 0;
      const timeB = b.playedAtMs || 0;
      return timeB - timeA; // Новые сверху
    });
    
    return sorted.map(track => {
      // Убираем временные метки для CompactTrackCard
      const { playedAt, playedAtMs, ...trackWithoutTime } = track;
      return trackWithoutTime;
    });
  }, [recentlyPlayedTracks, forceUpdate]);

  // Обновляем forceUpdate каждую секунду для обновления времени
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 1000); // Обновляем каждую секунду
    
    return () => clearInterval(interval);
  }, []);

  // Загружаем историю при изменении секции или токена
  useEffect(() => {
    if (activeSection === 'history' && sessionToken) {
      fetchListeningHistory();
    }
  }, [activeSection, sessionToken]);

  // Добавление трека в историю при прослушивании
  const addTrackToHistory = async (trackId) => {
    if (!sessionToken) return;
    
    try {
      const response = await fetch('/api/history/add/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          track_id: trackId,
          played_at: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Обновляем локальное состояние
        fetchListeningHistory();
      }
    } catch (error) {
      console.error('Ошибка при добавлении в историю:', error);
    }
  };

  // Обработчик навигации
  const handleNavNavigate = (item, index) => {
    const sectionMap = {
      'Overview': 'overview',
      'Likes': 'likes',
      'Playlists': 'playlists',
      'Albums': 'albums',
      'Stations': 'stations',
      'Following': 'following',
      'History': 'history'
    };
    
    setActiveSection(sectionMap[item.label] || 'overview');
  };

  // Обработчик воспроизведения с добавлением в историю
  const handlePlayWithHistory = (trackId) => {
    // Добавляем трек в историю (если есть токен)
    if (sessionToken) {
      addTrackToHistory(trackId);
    }
    // Вызываем оригинальный обработчик
    onPlayPause(trackId);
  };

  // Функция для обработки клика по названию трека
  const handleTrackTitleClick = (trackId) => {
    if (onTrackTitleClick) {
      onTrackTitleClick(trackId);
    }
  };

  // Рендеринг раздела Overview (главная страница)
  const renderOverview = () => {
    const filteredRecentTracks = searchTracks(recentTracksWithoutTime, searchQuery);
    
    return (
      <div className="library-overview-content">
        {/* Recently Played */}
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
                    onPlayPause={handlePlayWithHistory}
                    onToggleLike={onToggleLike}
                    isNew={index === 0}
                    onTrackTitleClick={handleTrackTitleClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <LibraryEmptyState message="No recently played tracks" />
          )}
        </div>

        <SectionDivider />

        {/* Liked Tracks */}
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
                    onPlayPause={handlePlayWithHistory}
                    onToggleLike={onToggleLike}
                    onTrackTitleClick={handleTrackTitleClick}
                  />
                ))}
              </div>
            </>
          ) : (
            <LibraryEmptyState message="No liked tracks yet" />
          )}
        </div>

        <SectionDivider />

        {/* Your Uploads */}
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
                    onPlayPause={handlePlayWithHistory}
                    onToggleLike={onToggleLike}
                    isNew={true}
                    onTrackTitleClick={handleTrackTitleClick}
                  />
                ))}
              </div>
            </div>
            <SectionDivider />
          </>
        )}

        {/* Playlists */}
        <div className="overview-section">
          <LibrarySectionHeader title="Playlists" showFilter={true} />
          <LibraryEmptyState message="No playlists yet" />
        </div>

        <SectionDivider />

        {/* Albums */}
        <div className="overview-section">
          <LibrarySectionHeader title="Albums" showFilter={true} />
          <LibraryEmptyState message="No albums yet" />
        </div>

        <SectionDivider />

        {/* Stations */}
        <div className="overview-section">
          <LibrarySectionHeader title="Liked Stations" />
          <LibraryEmptyState message="No stations liked yet" />
        </div>

        <SectionDivider />

        {/* Following */}
        <div className="overview-section">
          <LibrarySectionHeader title="Following" />
          {testFollowing.length > 0 ? (
            <div className="library-users-grid">
              {testFollowing.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <LibraryEmptyState message="Not following anyone yet" />
          )}
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
                        onPlayPause={handlePlayWithHistory}
                        onToggleLike={onToggleLike}
                        onTrackTitleClick={handleTrackTitleClick}
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

      case 'playlists':
        return (
          <div className="library-section-content">
            <LibrarySectionHeader title="Playlists" showFilter={true} />
            <LibraryEmptyState message="No playlists yet" />
          </div>
        );

      case 'albums':
        return (
          <div className="library-section-content">
            <LibrarySectionHeader title="Albums" showFilter={true} />
            <LibraryEmptyState message="No albums yet" />
          </div>
        );

      case 'stations':
        return (
          <div className="library-section-content">
            <LibrarySectionHeader title="Liked Stations" />
            <LibraryEmptyState message="No stations liked yet" />
          </div>
        );

      case 'following':
        return (
          <div className="library-section-content">
            <LibrarySectionHeader title="Following" />
            {testFollowing.length > 0 ? (
              <div className="library-users-grid">
                {testFollowing.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <LibraryEmptyState message="Not following anyone yet" />
            )}
          </div>
        );

      case 'history':
        const displayHistoryTracks = historyTracks.length > 0 ? historyTracks : recentlyPlayedTracks;
        
        return (
          <div className="library-section-content">
            <LibrarySectionHeader title="Listening History" />
            {isLoadingHistory ? (
              <div className="library-loading-state">
                <p>Loading history...</p>
              </div>
            ) : displayHistoryTracks.length > 0 ? (
              <>
                <div className="history-count">
                  {displayHistoryTracks.length} tracks in history
                  {currentTrack && (
                    <span className="history-currently-playing">
                      {" • "}Currently playing: {
                        allTracks.find(t => t.id === currentTrack)?.title || 'Unknown track'
                    }
                    </span>
                  )}
                </div>
                <div className="history-timeline">
                  {displayHistoryTracks.map((track, index) => (
                    <HistoryTrackItem 
                      key={`history-${track.id}-${track.playedAtMs || 0}-${index}`}
                      track={track}
                      index={index}
                      onTrackTitleClick={handleTrackTitleClick}
                    />
                  ))}
                </div>
              </>
            ) : (
              <LibraryEmptyState message="No listening history yet" />
            )}
          </div>
        );

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
          initialActiveIndex={0}
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