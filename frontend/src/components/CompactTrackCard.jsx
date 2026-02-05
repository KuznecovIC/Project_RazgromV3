import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

const IconMore = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
  </svg>
);

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
  const navigate = useNavigate();
  
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
  
  // ✅ ФУНКЦИЯ ПЕРЕХОДА В ПРОФИЛЬ (1:1 из GlassMusicPlayer)
  const handleArtistClick = useCallback((e) => {
    e.stopPropagation();
    
    if (!track?.uploaded_by?.id) {
      console.error("❌ CompactTrackCard: нет uploaded_by.id", track);
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
  
  console.log('🔍 CompactTrackCard:', {
    trackId: track.id,
    hasUploadedBy: !!track.uploaded_by,
    uploadedById: track.uploaded_by?.id,
    hasOnArtistClick: !!onArtistClick
  });
  
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
          onClick={handleActualArtistClick}
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

export default CompactTrackCard;