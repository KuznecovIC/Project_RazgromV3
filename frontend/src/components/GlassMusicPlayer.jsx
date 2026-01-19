import React, { useState, useEffect, useCallback, useRef } from 'react';
import Shuffle from './Shuffle';

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
// 🎯 КОМПОНЕНТ GlassMusicPlayer (ИСПРАВЛЕННЫЙ)
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
  const [showVolume, setShowVolume] = useState(false);
  const volumeRef = useRef(null);
  const volumeSliderRef = useRef(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [isSeeking, setIsSeeking] = useState(false);
  const [forceTrigger, setForceTrigger] = useState(0);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  
  // Проверяем ширину экрана для компактного режима
  useEffect(() => {
    const checkWidth = () => {
      setIsCompact(window.innerWidth < 768);
    };
    
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
    console.log('🔄 GlassMusicPlayer: Трек изменился, обновляем ключ', currentTrack);
    setPlayerKey(prev => prev + 1);
    setForceTrigger(prev => prev + 1);
  }, [currentTrack]);

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

  // 🔴 ТОЛЬКО управление лайками
  const handleLikeClick = () => {
    if (isLoading) return;
    
    const newLikedState = !localIsLiked;
    setLocalIsLiked(newLikedState);
    
    console.log('❤️ GlassMusicPlayer: Лайк трека', currentTrack, newLikedState);
    
    if (onToggleLike) {
      onToggleLike();
    }
  };

  // 🔴 ТОЛЬКО передача seek в App.js
  const handleSeek = (e) => {
    if (!onSeek || !duration || duration <= 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = percent * duration;
    
    console.log('🎯 GlassMusicPlayer: Seek to', {
      percent,
      seekTime: formatDuration(seekTime),
      duration: formatDuration(duration)
    });
    
    onSeek(seekTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const handleTrackTitleClick = () => {
    if (currentTrack && onTrackClick) {
      console.log('📍 GlassMusicPlayer: Клик по названию трека', currentTrack);
      onTrackClick(currentTrack);
    }
  };

  // 🔴 ПРАВИЛЬНАЯ функция play/pause
  const handlePlayPause = () => {
    console.log('⏯️ GlassMusicPlayer: Play/Pause нажато', {
      currentTrack,
      isPlaying,
      isLoading
    });
    
    if (isLoading) {
      console.log('⏳ GlassMusicPlayer: Трек загружается, ждем...');
      return;
    }
    
    if (!currentTrack) {
      console.warn('⚠️ GlassMusicPlayer: Нет текущего трека');
      return;
    }
    
    if (onPlayPause) {
      // 🔴 ВАЖНО: просто вызываем onPlayPause без параметров
      // App.js сам знает какой трек играть
      onPlayPause();
    }
  };

  // Если showInFooter = false, не рендерим
  if (!showInFooter) {
    console.log('👻 GlassMusicPlayer: showInFooter = false, скрываем');
    return null;
  }

  if (!currentTrack) {
    console.log('👻 GlassMusicPlayer: Нет currentTrack, скрываем');
    return null;
  }

  const track = trackInfo;

  console.log('🎵 GlassMusicPlayer render:', {
    currentTrack,
    isPlaying,
    isLoading,
    hasTrackInfo: !!track,
    trackTitle: track?.title,
    duration: formatDuration(duration),
    currentTime: formatDuration(currentTime)
  });

  if (!track) {
    console.log('🔄 GlassMusicPlayer: Трек загружается...');
    return (
      <div className="glass-player-footer">
        <div className="glass-player-container">
          <div className="glass-player-track">
            <div className="glass-player-info">
              <div className="glass-player-title">
                <Shuffle
                  key={`title-loading-${forceTrigger}`}
                  text="Loading track..."
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
                  colorFrom="white"
                  colorTo="white"
                  style={{ 
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    marginBottom: '2px',
                    lineHeight: '1.2',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="glass-player-controls">
            <div className="glass-control-buttons">
              <button 
                className="glass-control-btn" 
                disabled={true}
              >
                <IconPrevious />
              </button>
              
              <button 
                className="glass-control-btn glass-play-pause-btn" 
                disabled={true}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  cursor: 'not-allowed'
                }}
              >
                <IconPlay />
              </button>
              
              <button 
                className="glass-control-btn" 
                disabled={true}
              >
                <IconNext />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canSeek = duration > 0 && !isLoading;

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
            {!isCompact && (
              <Shuffle
                key={`artist-${currentTrack}-${forceTrigger}`}
                text={track.artist}
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
                colorFrom="rgba(255, 255, 255, 0.7)"
                colorTo="rgba(255, 255, 255, 0.7)"
                style={{ 
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: '500',
                  fontFamily: "'Press Start 2P', sans-serif"
                }}
              />
            )}
          </div>
        </div>

        {/* Controls - CENTER */}
        <div className="glass-player-controls">
          <div className="glass-control-buttons">
            <button 
              className="glass-control-btn" 
              onClick={onPrevious} 
              aria-label="Previous track"
              style={{ opacity: currentTrack ? 1 : 0.5 }}
              disabled={!currentTrack || isLoading}
            >
              <IconPrevious />
            </button>
            
            {/* 🔴 ВАЖНО: просто handlePlayPause без передачи данных */}
            <button 
              className="glass-control-btn glass-play-pause-btn" 
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
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
              aria-label="Next track"
              style={{ opacity: currentTrack ? 1 : 0.5 }}
              disabled={!currentTrack || isLoading}
            >
              <IconNext />
            </button>
          </div>

          {!isCompact && (
            <div className="glass-progress-container">
              <span className="glass-time">
                {formatDuration(currentTime)}
              </span>
              <div 
                className={`glass-progress-bar ${canSeek ? 'active' : 'inactive'}`}
                onClick={handleSeek}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                style={{
                  cursor: canSeek ? 'pointer' : 'not-allowed',
                  opacity: canSeek ? 1 : 0.5
                }}
                title={canSeek ? "Click to seek" : "Loading..."}
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
              <span className="glass-time">
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Volume, Like and Loop - RIGHT */}
        <div className="glass-player-volume">
          <div className="glass-control-group">
            <button 
              className={`glass-control-btn glass-loop-btn ${loopEnabled ? 'loop-active' : ''}`}
              onClick={onToggleLoop}
              aria-label={loopEnabled ? 'Выключить повтор' : 'Включить повтор'}
              disabled={isLoading}
              style={{
                color: loopEnabled ? '#8456ff' : 'white',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <IconRepeat active={loopEnabled} />
              {loopEnabled && (
                <div className="loop-active-indicator"></div>
              )}
            </button>
            
            <button 
              className={`glass-control-btn glass-like-btn ${localIsLiked ? 'liked' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={handleLikeClick}
              aria-label={localIsLiked ? 'Unlike track' : 'Like track'}
              disabled={isLoading}
              style={{
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <IconHeart filled={localIsLiked} />
            </button>
            
            <div 
              className="glass-volume-control"
              ref={volumeRef}
            >
              <button 
                className="glass-volume-btn" 
                onClick={() => setShowVolume(!showVolume)}
                onMouseEnter={() => setShowVolume(true)}
                aria-label="Volume"
                disabled={isLoading}
                style={{
                  opacity: isLoading ? 0.5 : 1
                }}
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
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      if (onVolumeChange) {
                        onVolumeChange(newVolume);
                      }
                    }}
                    className="glass-volume-slider-vertical"
                    aria-label="Volume slider"
                    style={{
                      '--volume-percent': `${volume * 100}%`
                    }}
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