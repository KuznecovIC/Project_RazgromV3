// FeedPage.jsx - ИСПРАВЛЕННЫЙ (кликабельные авторы)
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from '../components/Shuffle';
import './FeedPage.css';

const IconRepost = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M5 5h14v3h2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4h2V5zm14 14H5v-3H3v3c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2v3zm0-8l-4-4v3H9v-3l-4 4 4 4v-3h6v3l4-4z"
      fill="currentColor"
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

const IconLink = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z"
      fill="currentColor"
    />
  </svg>
);

const IconMore = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
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

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const waveformCache = {};

const generateWaveformHeights = async (trackId) => {
  if (waveformCache[trackId]) {
    return waveformCache[trackId];
  }
  
  try {
    const response = await fetch(`/api/tracks/${trackId}/waveform/`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.waveform && data.waveform.length > 0) {
        waveformCache[trackId] = data.waveform;
        return data.waveform;
      }
    }
  } catch (error) {
    console.warn(`Не удалось загрузить waveform с сервера:`, error);
  }
  
  const waveforms = {
    1: Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15),
    2: Array(60).fill().map((_, i) => 30 + Math.sin(i * 0.15) * 50 + Math.random() * 12),
    3: Array(60).fill().map((_, i) => 40 + Math.cos(i * 0.08) * 35 + Math.random() * 18)
  };
  
  const data = waveforms[trackId] || waveforms[1];
  waveformCache[trackId] = data;
  
  return data;
};

const WaveformVisualizer = ({ 
  trackId, 
  progress = 0, 
  isPlaying = false,
  onSeek,
  duration = 0,
  onWaveformClick
}) => {
  const [barHeights, setBarHeights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  
  useEffect(() => {
    const loadWaveform = async () => {
      setIsLoading(true);
      try {
        const heights = await generateWaveformHeights(trackId);
        setBarHeights(heights);
      } catch (error) {
        console.error('Ошибка при загрузке waveform:', error);
        setBarHeights(Array(60).fill().map(() => 30 + Math.random() * 70));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWaveform();
  }, [trackId]);
  
  const handleWaveformClick = (e) => {
    if (!duration || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percentage * duration;
    
    console.log(`Клик по waveform: ${percentage.toFixed(2)}%, время: ${seekTime.toFixed(2)}с`);
    
    // Вызываем специальную функцию для клика по вейвформу
    if (onWaveformClick) {
      onWaveformClick(trackId, seekTime);
    } else if (onSeek) {
      // Старая логика для обратной совместимости
      onSeek(seekTime);
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
      {isHovering && (
        <div 
          className="waveform-hover-overlay" 
          style={{ 
            width: `${hoverPosition}%`,
            borderRadius: '5px 0 0 5px'
          }}
        />
      )}
      
      <div 
        className="waveform-progress-overlay" 
        style={{ 
          width: `${currentProgress}%`,
          borderRadius: '5px 0 0 5px',
          opacity: isPlaying ? 0.7 : 0.4,
        }}
      />
      
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

const FeedTrackCard = ({ 
  track, 
  user, 
  isPlaying, 
  onPlayPause, 
  isLiked, 
  onToggleLike,
  progress = 0,
  onSeek,
  onWaveformClick,
  duration = 0,
  onTrackTitleClick,
  onArtistClick // ← ДОБАВЛЕНО: обработчик клика по автору
}) => {
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isArtistHovered, setIsArtistHovered] = useState(false);
  const navigate = useNavigate();
  
  // ✅ ФУНКЦИЯ ПЕРЕХОДА В ПРОФИЛЬ (1:1 из GlassMusicPlayer)
  const handleArtistClick = useCallback((e) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      console.error("❌ FeedPage: нет uploaded_by.id", track);
      return;
    }
    
    navigate(`/profile/${track.uploaded_by.id}`);
  }, [navigate, track]);
  
  // ✅ Если onArtistClick передан, используем его (для обратной совместимости)
  const handleActualArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick && track?.uploaded_by?.id) {
      onArtistClick(e, track);
    } else {
      handleArtistClick(e);
    }
  };
  
  return (
    <div className={`feed-track-card glass-card ${isPlaying ? 'playing' : ''}`}>
      <div className="feed-track-header">
        <div className="user-avatar">
          <div className="avatar-circle glass-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="avatar-initials">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="user-info">
          <div className="username-row">
            <span className="username">{user.username}</span>
            <span className="user-action">posted a track</span>
          </div>
          <div className="post-time">Posted {user.postedTime}</div>
        </div>
      </div>
      
      <div className="feed-track-content">
        <div className="track-card-left">
          <div className="track-cover glass-cover">
            <img src={track.cover} alt={track.title} />
            <button 
              className="play-button glass-play-btn"
              onClick={() => onPlayPause(track.id)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>
            
            {progress > 0 && (
              <div className="track-cover-progress">
                <div 
                  className="track-cover-progress-bar" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="track-card-right">
          <div className="track-waveform-container glass-waveform">
            <WaveformVisualizer 
              trackId={track.id} 
              progress={progress} 
              isPlaying={isPlaying}
              onSeek={onSeek}
              onWaveformClick={onWaveformClick}
              duration={duration}
            />
          </div>
          
          <div className="track-info">
            <h3 
              className="track-title"
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
                fontSize: '1.2rem',
                fontFamily: "'Press Start 2P', sans-serif",
                marginBottom: '8px',
                fontWeight: '700',
                lineHeight: '1.3'
              }}
            >
              {track.title}
            </h3>
            {/* ✅ ИСПРАВЛЕННЫЙ АВТОР: КЛИКАБЕЛЬНЫЙ */}
            <p 
              className="track-artist clickable-artist"
              onClick={handleActualArtistClick}
              onMouseEnter={() => setIsArtistHovered(true)}
              onMouseLeave={() => setIsArtistHovered(false)}
              style={{
                fontSize: '0.95rem',
                color: isArtistHovered ? '#8456ff' : 'rgba(255, 255, 255, 0.7)',
                fontFamily: "'Press Start 2P', sans-serif",
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
            >
              {track.uploaded_by?.username || track.artist}
            </p>
            <div 
              className="track-duration"
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: "'Press Start 2P', sans-serif"
              }}
            >
              <span className="duration-value">{track.duration}</span>
            </div>
          </div>
          
          <div className="track-actions">
            <button 
              className={`action-btn like-btn glass-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => onToggleLike(track.id)}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <IconHeart filled={isLiked} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            
            <button className="action-btn glass-btn" aria-label="Copy link">
              <IconLink />
              <span>Copy link</span>
            </button>
            
            <button className="action-btn more-btn glass-btn" aria-label="More options">
              <IconMore />
              <span>More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeedPage = ({ 
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
  onArtistClick, // ← ДОБАВЛЕНО: обработчик клика по автору
  
  // 📤 Загруженные треки
  uploadedTracks = [],
  isLoadingTracks = false
}) => {
  const [showReposts, setShowReposts] = useState(false);
  
  // ✅ ВАЖНО: Все данные берём из пропсов
  const feedData = useMemo(() => {
    // Используем треки из tracksById
    const allTracks = Object.values(tracksById || {}).filter(track => 
      track && track.id && track.title
    );
    
    // Берём последние 5 треков для фида
    const recentTracks = allTracks
      .sort((a, b) => b.id - a.id) // Сортируем по ID (новые сверху)
      .slice(0, 5);
    
    // Формируем фид с пользователями
    return recentTracks.map((track, index) => ({
      user: {
        id: index + 1,
        username: track.artist || 'User',
        avatar: '',
        postedTime: `${index + 1} days ago` // Демо-время
      },
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.cover || 'http://localhost:8000/static/default_cover.jpg',
        audioUrl: track.audio_url || '',
        duration: track.duration ? formatTime(track.duration) : '0:00',
        durationSeconds: track.duration || 0,
        // ✅ ДОБАВЛЯЕМ uploaded_by из исходного трека
        uploaded_by: track.uploaded_by || { 
          id: track.user_id || 0, 
          username: track.artist 
        }
      }
    }));
  }, [tracksById]);
  
  const getProgressForTrack = (trackId) => {
    if (currentTrack === trackId && duration > 0) {
      const progress = (currentTime / duration) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    return 0;
  };
  
  // Функция для обработки клика на вейвформ - трек сразу играет
  const handleWaveformClick = useCallback((trackId, seekTime) => {
    console.log(`Клик по вейвформу трека ${trackId}, время: ${seekTime} секунд`);
    
    // Устанавливаем время
    if (onSeek) {
      onSeek(seekTime);
    }
    
    // Запускаем трек
    if (currentTrack !== trackId) {
      // Если это другой трек, включаем его с небольшой задержкой
      setTimeout(() => {
        onPlayPause(trackId);
      }, 50);
    } else if (!isPlaying) {
      // Если это текущий трек, но он на паузе, включаем
      setTimeout(() => {
        onPlayPause(trackId);
      }, 50);
    }
    // Если трек уже играет, ничего не делаем - он продолжит с новой позиции
  }, [currentTrack, isPlaying, onPlayPause, onSeek]);
  
  console.log('🎯 FeedPage статус:', {
    feedDataCount: feedData.length,
    currentTrack,
    isPlaying,
    hasArtistClickHandler: !!onArtistClick
  });
  
  return (
    <div className="feed-page">
      <div className="feed-header glass-header">
        <div className="feed-title-container">
          <h1 className="feed-title">
            <Shuffle
              text="Hear the latest posts from the people you're following:"
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
                fontSize: '1.3rem',
                fontWeight: '700',
                color: 'white',
                fontFamily: "'Monocraft', monospace",
                letterSpacing: '0.3px',
                lineHeight: '1.4'
              }}
            />
          </h1>
        </div>
        
        <button 
          className={`reposts-toggle glass-btn ${showReposts ? 'active' : ''}`}
          onClick={() => setShowReposts(!showReposts)}
          aria-label={showReposts ? 'Show all posts' : 'Show reposts'}
        >
          <IconRepost />
          <span>Reposts</span>
        </button>
      </div>
      
      <div className="feed-content">
        {feedData.map((item) => {
          const isCurrentTrack = currentTrack === item.track.id;
          const progress = getProgressForTrack(item.track.id);
          const isLiked = likedTrackIds.includes(item.track.id); // ✅ Используем likedTrackIds
          
          return (
            <FeedTrackCard
              key={`${item.user.id}-${item.track.id}`}
              track={item.track}
              user={item.user}
              isPlaying={isCurrentTrack && isPlaying}
              onPlayPause={onPlayPause}
              isLiked={isLiked}
              onToggleLike={onToggleLike}
              progress={progress}
              onSeek={onSeek}
              onWaveformClick={handleWaveformClick}
              duration={isCurrentTrack ? duration : item.track.durationSeconds}
              onTrackTitleClick={onTrackTitleClick}
              onArtistClick={onArtistClick} // ← ПЕРЕДАЕМ ФУНКЦИЮ!
            />
          );
        })}
        
        {feedData.length === 0 && (
          <div className="feed-empty-state">
            <div className="empty-state-icon">
              <IconHeart />
            </div>
            <p className="empty-state-message">No tracks yet</p>
            <p className="empty-state-submessage">
              Upload your first track or follow other users to see their posts here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPage;