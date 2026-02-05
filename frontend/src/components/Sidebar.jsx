// Sidebar.jsx - ИСПРАВЛЕННЫЙ (кликабельные авторы)
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelSnow from './PixelSnow';
import Shuffle from './Shuffle';
import './Sidebar.css';

// ============================================
// 🎯 ИКОНКИ
// ============================================

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
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
      fill={filled ? "#8456ff" : "currentColor"}
      stroke={filled ? "#8456ff" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
  </svg>
);

const IconAnalytics = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
  </svg>
);

const IconStats = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 11V3H8v6H2v12h20V11h-6zm-6-6h4v14h-4V5zm-6 6h4v8H4v-8zm16 8h-4v-6h4v6z" fill="currentColor" />
  </svg>
);

const IconPromote = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
  </svg>
);

const IconClock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '12px', height: '12px' }}>
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor" />
  </svg>
);

const IconPlayCount = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '12px', height: '12px' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
  </svg>
);

// ============================================
// 🎯 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatPlayCount = (count) => {
  if (!count) return "0 plays";
  if (count < 1000) return `${count} plays`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K plays`;
  return `${(count / 1000000).toFixed(1)}M plays`;
};

// ============================================
// 🎯 КОМПОНЕНТ КАРТОЧКИ ТРЕКА
// ============================================

const SidebarTrackCard = React.memo(({ 
  track, 
  isPlaying, 
  onPlayClick,
  isLiked, 
  onLikeClick,
  isHovered,
  onTrackTitleClick,
  currentTime = 0,
  onArtistClick // ← ДОБАВЛЕНО: функция клика по автору
}) => {
  const durationSeconds = track.duration || 0;
  const isCurrentTrack = track.isCurrent;
  
  // Защита от NaN
  const progressPercent = isCurrentTrack && durationSeconds > 0 && currentTime >= 0
    ? Math.min(100, (currentTime / durationSeconds) * 100)
    : 0;

  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (onTrackTitleClick) {
      onTrackTitleClick(track.id);
    }
  };

  // Функция клика по автору (точно как в GlassMusicPlayer)
  const handleArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick) {
      onArtistClick(e, track);
    }
  };

  return (
    <div className="sidebar-track-card">
      <div className="sidebar-track-cover">
        <img 
          src={track.cover || 'http://localhost:8000/static/default_cover.jpg'} 
          alt={track.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'http://localhost:8000/static/default_cover.jpg';
          }}
        />
        
        {isHovered && (
          <button 
            className={`sidebar-play-button ${isPlaying ? 'playing' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlayClick();
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
        )}
        
        {isCurrentTrack && durationSeconds > 0 && (
          <div className="sidebar-track-progress-overlay">
            <div 
              className="sidebar-track-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
      
      <div className="sidebar-track-info">
        <div className="sidebar-track-header">
          <div 
            className="sidebar-track-title"
            onClick={handleTitleClick}
            style={{ 
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#8456ff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
          >
            {track.title}
          </div>
          
          <button 
            className={`sidebar-track-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onLikeClick();
            }}
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <IconHeart filled={isLiked} />
          </button>
        </div>
        
        {/* ИСПРАВЛЕННЫЙ БЛОК АВТОРА: КЛИКАБЕЛЬНЫЙ */}
        <div 
          className="sidebar-track-artist clickable-artist"
          onClick={handleArtistClick}
          title={track.uploaded_by?.username ? `Перейти в профиль ${track.uploaded_by.username}` : ''}
        >
          {track.uploaded_by?.username || track.artist}
        </div>
        
        <div className="sidebar-track-meta">
          <div className="sidebar-track-time-info">
            <span className="sidebar-track-duration">
              <IconClock /> {formatDuration(durationSeconds)}
            </span>
          </div>
          
          {track.play_count > 0 && (
            <span className="sidebar-track-plays">
              <IconPlayCount /> {formatPlayCount(track.play_count)}
            </span>
          )}
        </div>
        
        {isCurrentTrack && durationSeconds > 0 && (
          <div className="sidebar-track-progress-bar">
            <div 
              className="sidebar-track-progress-indicator"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================
// 🎯 ОСНОВНОЙ КОМПОНЕНТ SIDEBAR (ИСПРАВЛЕННЫЙ!)
// ============================================

const Sidebar = React.memo(({ 
  // 🎵 Воспроизведение
  currentTrack, 
  isPlaying, 
  onTogglePlayPause,
  
  // ❤️ Лайки
  onToggleLike,
  
  // 📦 Данные
  likedTrackIds = [],
  tracksById = {},
  
  // 🎯 Функции
  playTrack,
  currentTime = 0,
  
  // 👤 Пользователь
  user
}) => {
  const navigate = useNavigate(); // ← ДОБАВЛЕНО
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  // Вычисляем треки из пропсов
  const sidebarTracks = useMemo(() => {
    const tracks = likedTrackIds
      .map(id => {
        const track = tracksById[id];
        if (!track) return null;
        
        return {
          id: track.id,
          title: track.title || 'Без названия',
          artist: track.artist || 'Unknown artist',
          cover: track.cover || 'http://localhost:8000/static/default_cover.jpg',
          duration: track.duration || 0,
          play_count: track.play_count || 0,
          isCurrent: track.id === currentTrack,
          // ВАЖНО: копируем uploaded_by из исходного трека
          uploaded_by: track.uploaded_by || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.id - a.id);
    
    console.log('🎵 Sidebar tracks:', tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      uploaded_by: t.uploaded_by
    })));
    
    return tracks;
  }, [likedTrackIds, tracksById, currentTrack]);

  // Artist Tools
  const artistTools = useMemo(() => [
    { 
      id: 1, 
      label: "Upload", 
      icon: <IconUpload />, 
      action: () => navigate('/upload') 
    },
    { 
      id: 2, 
      label: "Analytics", 
      icon: <IconAnalytics />, 
      action: () => alert("Analytics dashboard coming soon!") 
    },
    { 
      id: 3, 
      label: "Stats", 
      icon: <IconStats />, 
      action: () => alert("Track statistics coming soon!") 
    },
    { 
      id: 4, 
      label: "Promote", 
      icon: <IconPromote />, 
      action: () => alert("Promotion tools coming soon!") 
    }
  ], [navigate]);

  // ✅ ФУНКЦИЯ ПЕРЕХОДА В ПРОФИЛЬ (1:1 из GlassMusicPlayer)
  const handleArtistClick = useCallback((e, track) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      console.error("❌ Sidebar: нет uploaded_by.id", track);
      return;
    }
    
    navigate(`/profile/${track.uploaded_by.id}`);
  }, [navigate]);

  // ✅ ЛОГИКА CLICK
  const handleTrackClick = useCallback((trackId) => {
    console.log('🎵 Sidebar: Клик по треку', trackId, {
      isCurrent: trackId === currentTrack,
      isPlaying,
      hasTogglePlayPause: !!onTogglePlayPause
    });
    
    const track = tracksById[trackId];
    if (!track) {
      console.error('❌ Sidebar: Трек не найден', trackId);
      return;
    }
    
    // ✅ ПРАВИЛЬНАЯ АРХИТЕКТУРА:
    // 🔁 тот же трек → toggle play/pause
    if (trackId === currentTrack) {
      console.log('⏯️ Sidebar: Переключение play/pause текущего трека');
      if (onTogglePlayPause) {
        onTogglePlayPause();
      }
      return;
    }
    
    // ▶️ новый трек
    console.log('▶️ Sidebar: Воспроизведение нового трека');
    if (playTrack) {
      playTrack(track);
    }
  }, [tracksById, currentTrack, isPlaying, playTrack, onTogglePlayPause]);

  const handleTrackLike = useCallback((trackId) => {
    console.log('❤️ Sidebar: Лайк трека', trackId);
    
    if (onToggleLike) {
      onToggleLike(trackId);
    }
  }, [onToggleLike]);

  const handleTitleClick = useCallback((trackId) => {
    console.log('🔗 Sidebar: Переход на страницу трека', trackId);
    navigate(`/track/${trackId}`);
  }, [navigate]);

  // Проверка лайка
  const isTrackLiked = useCallback((trackId) => {
    return Array.isArray(likedTrackIds) && likedTrackIds.includes(trackId);
  }, [likedTrackIds]);

  console.log('🎯 Sidebar статус:', {
    currentTrack,
    isPlaying,
    hasTogglePlayPause: !!onTogglePlayPause,
    likedTrackIdsCount: likedTrackIds.length,
    sidebarTracksCount: sidebarTracks.length
  });

  return (
    <div className="sidebar">
      <div className="pixel-snow-overlay">
        <PixelSnow 
          color="#ffffff"
          flakeSize={0.025}
          minFlakeSize={1.5}
          pixelResolution={270}
          speed={0.7}
          depthFade={6}
          farPlane={25}
          brightness={1.4}
          gamma={0.6}
          density={0.5}
          variant="snowflake"
          direction={125}
        />
      </div> 

      <div className="sidebar-content">
        {/* Artist Tools */}
        <div className="artist-tools-section">
          <div className="section-header">
            <h4 className="section-title">
              <Shuffle
                text="Artist Tools"
                tag="span"
                textAlign="left"
                className="artist-tools-shuffle"
                duration={0.35}
                maxDelay={0.1}
                ease="power3.out"
                threshold={0.1}
                shuffleDirection="right"
                shuffleTimes={3}
                animationMode="evenodd"
                stagger={0.02}
                colorFrom="#ffffff"
                colorTo="#ffffff"
                triggerOnce={false}
                triggerOnHover={true}
                style={{
                  fontSize: '1.2rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  textTransform: 'uppercase',
                  color: '#ffffff'
                }}
              />
            </h4>
          </div>
          
          <div className="artist-tools-grid">
            <div className="tools-icons-row">
              {artistTools.map(tool => (
                <div key={tool.id} className="tool-icon-wrapper">
                  <div 
                    className={`tool-icon-circle ${activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTool(tool.id);
                      tool.action();
                      setTimeout(() => setActiveTool(null), 800);
                    }}
                    title={tool.label}
                    style={{ 
                      marginRight: '5px',
                      marginLeft: '5px'
                    }}
                  >
                    {tool.icon}
                    {activeTool === tool.id && (
                      <div className="gooey-effect">
                        <div className="gooey-particle"></div>
                        <div className="gooey-particle"></div>
                        <div className="gooey-particle"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Liked Tracks */}
        <div className="liked-tracks-section">
          <div className="section-header">
            <h4 className="section-title">
              <Shuffle
                text="Liked Tracks"
                tag="span"
                textAlign="left"
                className="liked-tracks-shuffle"
                duration={0.35}
                maxDelay={0.1}
                ease="power3.out"
                threshold={0.1}
                shuffleDirection="right"
                shuffleTimes={3}
                animationMode="evenodd"
                stagger={0.02}
                colorFrom="#ffffff"
                colorTo="#ffffff"
                triggerOnce={false}
                triggerOnHover={true}
                style={{
                  fontSize: '1.2rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  textTransform: 'uppercase',
                  color: '#ffffff'
                }}
              />
            </h4>
            <span className="track-count">
              {sidebarTracks.length} {sidebarTracks.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>
          
          {sidebarTracks.length > 0 ? (
            <div className="liked-tracks-list">
              {sidebarTracks.map(track => {
                const isCurrent = track.id === currentTrack;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = isTrackLiked(track.id);
                
                return (
                  <div 
                    key={track.id}
                    className={`sidebar-track-wrapper ${isCurrent ? 'current-playing' : ''}`}
                    onMouseEnter={() => setHoveredTrackId(track.id)}
                    onMouseLeave={() => setHoveredTrackId(null)}
                    onClick={() => handleTrackClick(track.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <SidebarTrackCard
                      track={track}
                      isPlaying={isTrackPlaying}
                      onPlayClick={() => handleTrackClick(track.id)}
                      isLiked={isLiked}
                      onLikeClick={() => handleTrackLike(track.id)}
                      isHovered={hoveredTrackId === track.id}
                      onTrackTitleClick={handleTitleClick}
                      onArtistClick={handleArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ
                      currentTime={isCurrent ? currentTime : 0}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-heart-icon">
                <IconHeart />
              </div>
              <p className="empty-message">
                No liked tracks yet
              </p>
              <small className="empty-submessage">
                Like some tracks to see them here
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Sidebar;