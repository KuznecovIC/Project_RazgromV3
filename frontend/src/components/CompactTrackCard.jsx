import React, { useState } from 'react';
import './CompactTrackCard.css';

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
  isPlaying = false, 
  isLiked = false, 
  onPlayPause, 
  onToggleLike,
  onTrackTitleClick,
  isNew = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onPlayPause) {
      onPlayPause(track.id);
    }
  };
  
  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike(track.id);
    }
  };
  
  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (onTrackTitleClick) {
      onTrackTitleClick(track.id);
    }
  };
  
  return (
    <div 
      className={`compact-track-card ${className} ${isNew ? 'new-track' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="track-image-container">
        <img 
          src={track.cover} 
          alt={track.title} 
          className="track-image"
        />
        {isNew && (
          <div className="new-badge">NEW</div>
        )}
        <div className={`play-overlay ${isHovered ? 'visible' : ''}`}>
          <button 
            className="play-button"
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
        </div>
      </div>
      
      <div className="track-info">
        <h5 
          className="track-title"
          onClick={handleTitleClick}
          style={{ 
            cursor: 'pointer',
            color: isHovered ? '#8456ff' : 'white',
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
          className="track-artist"
          style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '8px'
          }}
        >
          {track.artist}
        </p>
        
        <div className="track-actions">
          <button 
            className={`like-button ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeClick}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <IconHeart filled={isLiked} />
          </button>
          
          <div className="track-duration">
            <span style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
              fontFamily: "'Press Start 2P', sans-serif"
            }}>
              {track.duration}
            </span>
          </div>
          
          <button 
            className="more-button"
            onClick={(e) => {
              e.stopPropagation();
              // Открыть меню действий
            }}
            aria-label="More options"
          >
            <IconMore />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompactTrackCard;