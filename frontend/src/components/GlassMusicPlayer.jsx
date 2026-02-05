import React, { useState, useEffect, useCallback, useRef } from 'react';
import Shuffle from './Shuffle';
import { useNavigate } from 'react-router-dom';

// Иконки (оставить как есть)
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

const IconPrevious = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6h-2v12h2zm-3.5 6L6 18V6z" fill="currentColor" />
  </svg>
);

const IconVolume = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor" />
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

const IconRepeat = ({ active = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'all 0.3s ease' }}>
    <path 
      d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"
      fill={active ? "#8456ff" : "currentColor"}
      stroke={active ? "#8456ff" : "currentColor"}
      strokeWidth="0.5"
    />
    {active && (
      <circle 
        cx="12" 
        cy="12" 
        r="3" 
        fill="#8456ff"
        style={{ opacity: 0.3 }}
      />
    )}
  </svg>
);

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// ============================================
// 🎯 GlassMusicPlayer - ПРОСТАЯ И ПРАВИЛЬНАЯ ВЕРСИЯ
// ============================================
const GlassMusicPlayer = ({ 
  currentTrack, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious, 
  volume, 
  onVolumeChange,
  currentTime,
  duration,
  onSeek,
  isLiked,
  onToggleLike,
  isLoading = false,
  loopEnabled = false,
  onToggleLoop = () => {},
  onTrackClick,
  showInFooter = true,
  trackInfo = null
}) => {
  const navigate = useNavigate();
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [isSeeking, setIsSeeking] = useState(false);
  const [forceTrigger, setForceTrigger] = useState(0);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isArtistHovered, setIsArtistHovered] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // 🔥 ВАЖНО: Валидация входных данных
  useEffect(() => {
    if (!trackInfo) {
      console.warn('⚠️ GlassMusicPlayer: trackInfo не передан');
      return;
    }
    
    // Проверяем, есть ли uploaded_by
    const hasUploadedBy = !!trackInfo.uploaded_by;
    const uploadedById = trackInfo.uploaded_by?.id;
    const hasArtistString = typeof trackInfo.artist === 'string';
    
    console.log('🔍 GlassMusicPlayer: Проверка данных трека', {
      trackId: trackInfo.id,
      hasUploadedBy,
      uploadedById,
      hasArtistString,
      // Если нет uploaded_by, но есть artist строка - ЭТО ОШИБКА БЭКЕНДА
      isBackendError: !hasUploadedBy && hasArtistString
    });
    
    // Если нет uploaded_by - это ошибка бэкенда
    if (!hasUploadedBy && hasArtistString) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Бэкенд не отдает uploaded_by!');
      console.error('❌ Трек содержит только строку artist:', trackInfo.artist);
      console.error('❌ Это значит, что API endpoint использует неправильный сериализатор');
    }
  }, [trackInfo]);

  // Проверяем ширину экрана
  useEffect(() => {
    const checkWidth = () => setIsCompact(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Синхронизируем локальное состояние с пропсом
  useEffect(() => {
    setLocalIsLiked(isLiked);
  }, [isLiked]);

  // При смене трека обновляем ключ
  useEffect(() => {
    setPlayerKey(prev => prev + 1);
    setForceTrigger(prev => prev + 1);
  }, [currentTrack, trackInfo]);

  const handleClickOutside = (event) => {
    if (volumeRef.current && !volumeRef.current.contains(event.target)) {
      setShowVolume(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateVolumeSliderPosition = useCallback(() => {
    const slider = volumeSliderRef.current;
    if (slider) {
      const percent = volume * 100;
      slider.style.setProperty('--volume-percent', `${percent}%`);
    }
  }, [volume]);

  useEffect(() => {
    updateVolumeSliderPosition();
  }, [volume, updateVolumeSliderPosition]);

  // 🔴 Управление лайками
  const handleLikeClick = () => {
    if (isLoading) return;
    const newLikedState = !localIsLiked;
    setLocalIsLiked(newLikedState);
    if (onToggleLike) onToggleLike();
  };

  // 🔴 Передача seek в App.js
  const handleSeek = (e) => {
    if (!onSeek || !duration || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(percent * duration);
  };

  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekEnd = () => setIsSeeking(false);

  const handleTrackTitleClick = () => {
    if (currentTrack && onTrackClick) {
      onTrackClick(currentTrack);
    }
  };

  // ✅ ПРАВИЛЬНАЯ функция для перехода на профиль артиста
  const handleArtistClick = (e) => {
    e.stopPropagation();
    
    if (!trackInfo) {
      console.error('❌ GlassMusicPlayer: Нет информации о треке');
      return;
    }
    
    // 🔥 ЕДИНСТВЕННЫЙ ПРАВИЛЬНЫЙ СПОСОБ: используем uploaded_by.id
    const artistId = trackInfo.uploaded_by?.id;
    
    if (!artistId) {
      console.error('❌ GlassMusicPlayer: Нет uploaded_by.id в треке!', {
        trackInfo,
        uploaded_by: trackInfo.uploaded_by,
        // Это ошибка бэкенда - должен быть uploaded_by
        isBackendError: true
      });
      
      // Показываем пользователю понятную ошибку
      const artistName = trackInfo.artist || 'Unknown';
      alert(`Ошибка: невозможно перейти к профилю артиста "${artistName}"\n\nПожалуйста, сообщите об ошибке разработчику.`);
      return;
    }
    
    // 🔥 ПРАВИЛЬНЫЙ ПЕРЕХОД
    console.log('✅ GlassMusicPlayer: Переход на профиль', `/profile/${artistId}`);
    navigate(`/profile/${artistId}`);
  };

  // 🔴 ПРАВИЛЬНАЯ функция play/pause
  const handlePlayPause = () => {
    if (isLoading || !currentTrack) return;
    if (onPlayPause) onPlayPause();
  };

  // Если showInFooter = false, не рендерим
  if (!showInFooter) return null;
  if (!currentTrack) return null;

  // Используем trackInfo если есть, иначе создаем минимальный объект
  const track = trackInfo || { 
    id: currentTrack, 
    title: 'Loading...', 
    artist: 'Unknown artist' 
  };

  // 🔥 ПРАВИЛЬНОЕ ПОЛУЧЕНИЕ ИМЕНИ АРТИСТА
  const getArtistDisplayName = () => {
    if (!track.artist) return 'Unknown artist';
    
    // ПРИОРИТЕТ 1: username из uploaded_by
    if (track.uploaded_by?.username) {
      return track.uploaded_by.username;
    }
    
    // ПРИОРИТЕТ 2: artist как строка (если бэкенд еще не исправлен)
    if (typeof track.artist === 'string') {
      return track.artist;
    }
    
    // ПРИОРИТЕТ 3: artist как объект
    if (typeof track.artist === 'object' && track.artist !== null) {
      return track.artist.username || track.artist.name || 'Unknown artist';
    }
    
    return 'Unknown artist';
  };

  // 🔥 ПРАВИЛЬНОЕ ПОЛУЧЕНИЕ ID АРТИСТА
  const getArtistId = () => {
    // ЕДИНСТВЕННЫЙ ПРАВИЛЬНЫЙ ИСТОЧНИК: uploaded_by.id
    return track.uploaded_by?.id || null;
  };

  const artistDisplayName = getArtistDisplayName();
  const artistId = getArtistId();
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canSeek = duration > 0 && !isLoading;

  if (!track || !track.title || track.title === 'Loading...') {
    return (
      <div className="glass-player-footer">
        <div className="glass-player-container">
          <div className="glass-player-track">
            <div className="glass-player-info">
              <div className="glass-player-title">
                Loading track...
              </div>
            </div>
          </div>
          
          <div className="glass-player-controls">
            <div className="glass-control-buttons">
              <button className="glass-control-btn" disabled={true}>
                <IconPrevious />
              </button>
              <button className="glass-control-btn glass-play-pause-btn" disabled={true}>
                <IconPlay />
              </button>
              <button className="glass-control-btn" disabled={true}>
                <IconNext />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-player-footer" key={`player-${playerKey}`}>
      <div className="glass-player-container">
        {/* Track Info - LEFT */}
        <div className="glass-player-track">
          {track.cover && (
            <img 
              src={track.cover} 
              alt={track.title} 
              className="glass-player-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'http://localhost:8000/static/default_cover.jpg';
              }}
            />
          )}
          <div className="glass-player-info">
            <div 
              className={`glass-player-title ${isTitleHovered ? 'hovered' : ''}`}
              onClick={handleTrackTitleClick}
              onMouseEnter={() => setIsTitleHovered(true)}
              onMouseLeave={() => setIsTitleHovered(false)}
              style={{ 
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                color: isTitleHovered ? '#8456ff' : 'white'
              }}
            >
              {isCompact ? (
                <div style={{ 
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  marginBottom: '2px',
                  lineHeight: '1.2',
                  fontFamily: "'Press Start 2P', sans-serif",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px'
                }}>
                  {track.title}
                </div>
              ) : (
                <Shuffle
                  key={`title-${currentTrack}-${forceTrigger}`}
                  text={track.title}
                  shuffleDirection="up"
                  duration={0.3}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power3.out"
                  stagger={0.01}
                  threshold={0}
                  triggerOnce={false}
                  triggerOnHover={true}
                  respectReducedMotion={false}
                  rootMargin="0px"
                  tag="div"
                  colorFrom={isTitleHovered ? "#8456ff" : "white"}
                  colorTo={isTitleHovered ? "#8456ff" : "white"}
                  style={{ 
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    marginBottom: '2px',
                    lineHeight: '1.2',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}
                />
              )}
            </div>
            {!isCompact && artistDisplayName && (
              <div 
                className="glass-player-artist"
                onClick={handleArtistClick}
                onMouseEnter={() => setIsArtistHovered(true)}
                onMouseLeave={() => setIsArtistHovered(false)}
                style={{ 
                  cursor: artistId ? 'pointer' : 'not-allowed',
                  transition: 'color 0.2s ease',
                  color: isArtistHovered ? '#c084fc' : 'rgba(255, 255, 255, 0.7)',
                  position: 'relative',
                  display: 'inline-block',
                  opacity: artistId ? 1 : 0.5
                }}
                title={artistId ? 
                  `Перейти в профиль ${artistDisplayName}` : 
                  `Невозможно перейти (нет ID артиста)`
                }
              >
                <Shuffle
                  key={`artist-${currentTrack}-${forceTrigger}`}
                  text={artistDisplayName}
                  shuffleDirection="down"
                  duration={0.25}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power3.out"
                  stagger={0.005}
                  threshold={0}
                  triggerOnce={false}
                  triggerOnHover={true}
                  respectReducedMotion={false}
                  rootMargin="0px"
                  tag="div"
                  colorFrom={isArtistHovered ? "#c084fc" : "rgba(255, 255, 255, 0.7)"}
                  colorTo={isArtistHovered ? "#c084fc" : "rgba(255, 255, 255, 0.7)"}
                  style={{ 
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    fontFamily: "'Press Start 2P', sans-serif",
                    display: 'inline-block'
                  }}
                />
                {isArtistHovered && artistId && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    width: '100%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #c084fc, transparent)',
                    animation: 'underline-glow 1.5s infinite'
                  }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controls - CENTER */}
        <div className="glass-player-controls">
          <div className="glass-control-buttons">
            <button 
              className="glass-control-btn" 
              onClick={onPrevious} 
              disabled={!currentTrack || isLoading}
            >
              <IconPrevious />
            </button>
            
            <button 
              className="glass-control-btn glass-play-pause-btn" 
              onClick={handlePlayPause}
              disabled={isLoading}
              style={{ 
                background: isLoading 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : isPlaying 
                    ? 'linear-gradient(135deg, #ff6b6b, #ffd93d)' 
                    : 'linear-gradient(135deg, #ff9ffc, #8456ff)',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? (
                <div className="loading-spinner-small"></div>
              ) : isPlaying ? (
                <IconPause />
              ) : (
                <IconPlay />
              )}
            </button>
            
            <button 
              className="glass-control-btn" 
              onClick={onNext} 
              disabled={!currentTrack || isLoading}
            >
              <IconNext />
            </button>
          </div>

          {!isCompact && (
            <div className="glass-progress-container">
              <span className="glass-time">{formatDuration(currentTime)}</span>
              <div 
                className={`glass-progress-bar ${canSeek ? 'active' : 'inactive'}`}
                onClick={handleSeek}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                style={{
                  cursor: canSeek ? 'pointer' : 'not-allowed',
                  opacity: canSeek ? 1 : 0.5
                }}
              >
                <div 
                  className="glass-progress-fill" 
                  style={{ 
                    width: `${progressPercent}%`,
                    transition: isSeeking ? 'none' : 'width 0.1s ease'
                  }}
                />
                {isLoading && (
                  <div className="loading-progress-indicator">
                    <div className="loading-wave"></div>
                  </div>
                )}
              </div>
              <span className="glass-time">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Volume, Like and Loop - RIGHT */}
        <div className="glass-player-volume">
          <div className="glass-control-group">
            <button 
              className={`glass-control-btn glass-loop-btn ${loopEnabled ? 'loop-active' : ''}`}
              onClick={onToggleLoop}
              disabled={isLoading}
              style={{
                color: loopEnabled ? '#8456ff' : 'white',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <IconRepeat active={loopEnabled} />
            </button>
            
            <button 
              className={`glass-control-btn glass-like-btn ${localIsLiked ? 'liked' : ''}`}
              onClick={handleLikeClick}
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            >
              <IconHeart filled={localIsLiked} />
            </button>
            
            <div className="glass-volume-control" ref={volumeRef}>
              <button 
                className="glass-volume-btn" 
                onClick={() => setShowVolume(!showVolume)}
                onMouseEnter={() => setShowVolume(true)}
                disabled={isLoading}
                style={{ opacity: isLoading ? 0.5 : 1 }}
              >
                <IconVolume />
              </button>
              {showVolume && (
                <div 
                  className="glass-volume-slider-container"
                  onMouseEnter={() => setShowVolume(true)}
                  onMouseLeave={() => setShowVolume(false)}
                >
                  <input
                    ref={volumeSliderRef}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
                    className="glass-volume-slider-vertical"
                    style={{ '--volume-percent': `${volume * 100}%` }}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassMusicPlayer;