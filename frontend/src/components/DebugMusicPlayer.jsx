import React, { useState, useEffect } from 'react';
import './DebugMusicPlayer.css';

const DebugMusicPlayer = ({ 
  currentTrack, 
  isPlaying, 
  onPlayPause,
  onNext,
  onPrevious,
  currentTime = 0,
  duration = 0,
  isLiked,
  onToggleLike
}) => {
  const [volume, setVolume] = useState(0.7);

  console.log('🎵 DebugMusicPlayer rendering with:', {
    currentTrack,
    isPlaying,
    isLiked,
    currentTime,
    duration
  });

  if (!currentTrack) {
    console.log('❌ DebugMusicPlayer: currentTrack is falsy');
    return null;
  }

  const trackData = {
    1: {
      title: "hard drive (slowed & muffled)",
      artist: "griffinilla",
      cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg"
    },
    2: {
      title: "Deutschland",
      artist: "Rammstein", 
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg"
    },
    3: {
      title: "Sonne", 
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg"
    }
  };

  const track = trackData[currentTrack] || trackData[1];

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="debug-music-player">
      <div className="debug-player-content">
        <div className="debug-track-info">
          <img src={track.cover} alt={track.title} className="debug-cover" />
          <div className="debug-track-details">
            <div className="debug-track-title">{track.title}</div>
            <div className="debug-track-artist">{track.artist}</div>
          </div>
          <button 
            className={`debug-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={onToggleLike}
          >
            {isLiked ? '❤️' : '🤍'}
          </button>
        </div>

        <div className="debug-controls">
          <button className="debug-control-btn" onClick={onPrevious}>
            ⏮️
          </button>
          <button 
            className="debug-play-btn"
            onClick={() => onPlayPause(currentTrack)}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button className="debug-control-btn" onClick={onNext}>
            ⏭️
          </button>
        </div>

        <div className="debug-progress">
          <div className="debug-time">{formatTime(currentTime)}</div>
          <div className="debug-progress-bar">
            <div 
              className="debug-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="debug-time">{formatTime(duration)}</div>
        </div>

        <div className="debug-volume">
          <button className="debug-volume-btn">
            🔊
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="debug-volume-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default DebugMusicPlayer;