// frontend/src/components/Sidebar.jsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocial } from '../context/SocialContext';
import { apiFetch } from '../api/apiFetch';
import PixelSnow from './PixelSnow';
import Shuffle from './Shuffle';
import './Sidebar.css';

export const validateAudioDuration = (track) => {
  let durationSeconds = 0;
  
  if (track.duration_seconds && typeof track.duration_seconds === 'number') {
    durationSeconds = track.duration_seconds;
  }
  else if (track.duration && typeof track.duration === 'string') {
    const parts = track.duration.split(':');
    if (parts.length === 2) {
      const [minutes, seconds] = parts.map(Number);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        durationSeconds = minutes * 60 + seconds;
      }
    }
  }
  else if (track.duration && typeof track.duration === 'number') {
    durationSeconds = track.duration;
  }
  
  const isValid = durationSeconds > 0 && !isNaN(durationSeconds);
  
  return isValid ? durationSeconds : 0;
};

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

// 🎯 НОВАЯ ИКОНКА: Playlists
const IconPlaylists = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" fill="currentColor" />
  </svg>
);

// 🎯 НОВАЯ ИКОНКА: Artist Hub
const IconHub = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l9 7v11h-6v-6H9v6H3V10l9-7z" fill="currentColor" />
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

// 👁️ Просмотры (как в ProfilePage)
const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      fill="currentColor"
    />
  </svg>
);

// 💬 Комментарии (как в ProfilePage)
const IconComment = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
      fill="currentColor"
    />
  </svg>
);

// 🔁 IconShare для репостов
const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="share-icon" style={{ width: '16px', height: '16px' }}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

// ✅ Иконка подписчиков (followers)
const IconFollowers = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '14px', height: '14px' }}>
    <path
      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5z"
      fill="currentColor"
    />
  </svg>
);

// ✅ Иконка подписок (following)
const IconFollowing = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '14px', height: '14px' }}>
    <path
      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      fill="currentColor"
    />
  </svg>
);

const IconFollow = ({ following = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'all 0.3s ease', width: '16px', height: '16px' }}>
    {following ? (
      <path
        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
        fill="#8456ff"
        stroke="#8456ff"
        strokeWidth="0.5"
      />
    ) : (
      <path
        d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
      />
    )}
  </svg>
);

const IconViewAll = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
  </svg>
);

// ============================================
// 🎯 ИКОНКИ ДЛЯ ПЛЕЙЛИСТОВ
// ============================================

const IconPlaylistHeart = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
    <path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
      fill={filled ? "#8456ff" : "currentColor"}
      stroke={filled ? "#8456ff" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconPlaylistShare = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
    <path 
      d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" 
      fill={filled ? "#8456ff" : "currentColor"}
    />
  </svg>
);

// ============================================
// 🎯 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0 || isNaN(seconds) || typeof seconds !== 'number') {
    return "0:00";
  }
  
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

const getTrackCoverUrl = (track) => {
  if (track.cover_url) {
    return track.cover_url;
  }
  
  if (track.cover && typeof track.cover === 'string' && track.cover.startsWith('http')) {
    return track.cover;
  }
  
  if (track.cover && typeof track.cover === 'string' && track.cover.startsWith('/media/')) {
    return `http://localhost:8000${track.cover}`;
  }
  
  if (track.cover && typeof track.cover === 'string') {
    const cleanPath = track.cover.startsWith('/') ? track.cover : `/${track.cover}`;
    return `http://localhost:8000${cleanPath}`;
  }
  
  return 'http://localhost:8000/static/default_cover.jpg';
};

// ============================================
// 🎯 КОМПОНЕНТ КАРТОЧКИ ПЛЕЙЛИСТА
// ============================================

const SidebarPlaylistCard = React.memo(({
  playlist,
  onOpen,
  onPlayPause,
  isActive = false,
  onToggleLike,
  onToggleRepost,
  liked,
  reposted,
  likeCount = 0,
  repostCount = 0,
}) => {
  const cover = playlist.cover_url || playlist.cover || 'http://localhost:8000/static/default_cover.jpg';

  return (
    <div className="sidebar-playlist-card">
      <div className="sidebar-playlist-left">
        <div className="sidebar-playlist-cover-wrap" onClick={onOpen} title="Open playlist">
          <img className="sidebar-playlist-cover" src={cover} alt={playlist.title} />
          <button
            className="sidebar-playlist-cover-play"
            onClick={(e) => onPlayPause?.(e)}
            aria-label={isActive ? "Pause playlist" : "Play playlist"}
          >
            {isActive ? '⏸' : '▶'}
          </button>
        </div>

        <div className="sidebar-playlist-meta">
          <div className="sidebar-playlist-title clickable-playlist" onClick={onOpen}>
            {playlist.title}
          </div>
          <div className="sidebar-playlist-sub">
            {(playlist.track_count ?? playlist.tracks_count ?? 0)} tracks
          </div>
        </div>
      </div>

      <div className="sidebar-playlist-actions">
        <button
          className={`sidebar-pl-action ${liked ? 'active' : ''}`}
          onClick={onToggleLike}
          title="Like"
        >
          <IconPlaylistHeart filled={liked} />
          <span>{likeCount}</span>
        </button>

        <button
          className={`sidebar-pl-action ${reposted ? 'active' : ''}`}
          onClick={onToggleRepost}
          title="Share"
        >
          <IconPlaylistShare filled={reposted} />
          <span>{repostCount}</span>
        </button>
      </div>
    </div>
  );
});

// ============================================
// 🎯 КОМПОНЕНТ КАРТОЧКИ АРТИСТА
// ============================================

const SidebarArtistCard = React.memo(({
  artist,
  isFollowing,
  onFollowToggle,
  onClick,
  followsLoaded,
  isSelf = false,
  followersCount = 0,
  followingCount = 0
}) => {
  return (
    <div className="sidebar-artist-card">
      <div
        className="sidebar-artist-info"
        onClick={onClick}
      >
        <div className="sidebar-artist-avatar">
          {artist.avatar ? (
            <img 
              src={artist.avatar} 
              alt={artist.username} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'http://localhost:8000/static/default_cover.jpg';
              }}
            />
          ) : (
            <div className="sidebar-artist-avatar-fallback">
              {artist.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="sidebar-artist-text">
          <span className="sidebar-artist-name">
            {artist.username}
          </span>
          
          <div className="sidebar-artist-stats">
            <div className="sidebar-artist-stat">
              <IconFollowers />
              <span>{Number(followersCount || 0).toLocaleString()}</span>
            </div>
            <div className="sidebar-artist-stat">
              <IconFollowing />
              <span>{Number(followingCount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {!isSelf && (
        <button
          className={`sidebar-follow-purple ${!followsLoaded ? 'loading' : isFollowing ? 'following' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!followsLoaded) return;
            onFollowToggle(artist.id);
          }}
          disabled={!followsLoaded}
        >
          {!followsLoaded ? '...' : (isFollowing ? 'Following' : 'Follow')}
        </button>
      )}
    </div>
  );
});

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
  onArtistClick,
  isFollowing,
  isReposted,
  repostCount,
  onFollowToggle,
  onRepostToggle,
  followsLoaded,
  likeCount = 0,
  commentCount = 0,
  currentUserId
}) => {
  const coverUrl = getTrackCoverUrl(track);
  
  const durationSeconds = track.duration_seconds || track.duration || 0;
  const validDurationSeconds = typeof durationSeconds === 'number' && durationSeconds > 0 
    ? durationSeconds 
    : 0;
  
  const isCurrentTrack = track.isCurrent;
  const progressPercent = isCurrentTrack && validDurationSeconds > 0 && currentTime >= 0
    ? Math.min(100, (currentTime / validDurationSeconds) * 100)
    : 0;

  const likesCount = typeof likeCount === 'number' ? likeCount : 0;
  const commentsCount = typeof commentCount === 'number' ? commentCount : 0;
  const viewsCount = typeof track.play_count === 'number' ? track.play_count : Number(track.play_count) || 0;
  const repostsCount = typeof repostCount === 'number' ? repostCount : 0;

  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (onTrackTitleClick) {
      onTrackTitleClick(track.id);
    }
  };

  const handleArtistClick = (e) => {
    e.stopPropagation();
    if (onArtistClick) {
      onArtistClick(e, track);
    }
  };

  const authorId = track.uploaded_by?.id;

  return (
    <div className="sidebar-track-card">
      <div className="sidebar-track-cover">
        <img 
          src={coverUrl}
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
        
        {isCurrentTrack && validDurationSeconds > 0 && (
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
              <IconClock /> {formatDuration(validDurationSeconds)}
            </span>
          </div>
        </div>
        
        {isCurrentTrack && validDurationSeconds > 0 && (
          <div className="sidebar-track-progress-bar">
            <div 
              className="sidebar-track-progress-indicator"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div className="sidebar-track-actions">
          <div className="sidebar-action-group">
            <button
              className={`sidebar-like-btn ${isLiked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onLikeClick();
              }}
              aria-label={isLiked ? 'Unlike track' : 'Like track'}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <IconHeart filled={isLiked} />
            </button>
            <span className="sidebar-action-count">{likesCount.toLocaleString()}</span>
          </div>

          <div className="sidebar-action-group">
            <button
              className={`sidebar-repost-btn ${isReposted ? 'reposted' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onRepostToggle(track.id);
              }}
              title={isReposted ? 'Отменить репост' : 'Репостнуть'}
              aria-label={isReposted ? 'Unrepost' : 'Repost'}
            >
              <IconShare />
            </button>
            <span className="sidebar-action-count">{repostsCount.toLocaleString()}</span>
          </div>

          <div className="sidebar-stat">
            <IconEye />
            <span className="sidebar-action-count">{viewsCount.toLocaleString()}</span>
          </div>

          <div className="sidebar-stat">
            <IconComment />
            <span className="sidebar-action-count">{commentsCount.toLocaleString()}</span>
          </div>

          {authorId && authorId !== currentUserId && (
            <button
              className={`sidebar-follow-btn ${!followsLoaded ? 'loading' : isFollowing ? 'following' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!followsLoaded) return;
                onFollowToggle(authorId);
              }}
              disabled={!followsLoaded}
              title={followsLoaded ? (isFollowing ? 'Отписаться' : 'Подписаться') : 'Загрузка...'}
              aria-label={followsLoaded ? (isFollowing ? 'Unfollow' : 'Follow') : 'Loading'}
            >
              {!followsLoaded ? <span>...</span> : <IconFollow following={isFollowing} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================
// 🎯 ОСНОВНОЙ КОМПОНЕНТ SIDEBAR
// ============================================

const Sidebar = React.memo(({ 
  currentTrack, 
  isPlaying, 
  onTogglePlayPause,
  playTrack,
  currentTime = 0,
  user,
  getAuthToken,
  navigate: parentNavigate,
  history = [],
  setPlaybackQueue,
  playQueueIds = []
}) => {
  const navigate = useNavigate();
  const actualNavigate = parentNavigate || navigate;
  
  const {
    likedTrackIds,
    tracksById,
    reposts,
    repostCounts,
    toggleLike,
    toggleRepost,
    toggleFollow,
    isLiked: isTrackLiked,
    isReposted,
    isFollowing,
    getRepostCount,
    followsLoaded,
    likeCounts,
    getLikeCount,
    followerCounts,
    followingCounts,
    
    togglePlaylistLike,
    togglePlaylistRepost,
    isPlaylistLiked,
    isPlaylistReposted,
    getPlaylistLikeCount,
    getPlaylistRepostCount,
    setPlaylistLikeStatus,
    setPlaylistRepostStatus,
    followUnfollowUser,
  } = useSocial();
  
  const [hoveredTrackId, setHoveredTrackId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  
  // ✅ Ключ для localStorage
  const likedPlaylistsStorageKey = useMemo(() => {
    return user?.id ? `likedPlaylists:${user.id}` : 'likedPlaylists:guest';
  }, [user?.id]);

  // ✅ Состояние для лайкнутых плейлистов с загрузкой из localStorage
  const [likedPlaylists, setLikedPlaylists] = useState(() => {
    try {
      const key = user?.id ? `likedPlaylists:${user.id}` : 'likedPlaylists:guest';
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // ✅ СОСТОЯНИЯ ДЛЯ ОЧЕРЕДИ ПЛЕЙЛИСТОВ
  const [playingPlaylistId, setPlayingPlaylistId] = useState(null);
  const [playlistQueueCache, setPlaylistQueueCache] = useState({});

  const MAX_TRACKS_TO_SHOW = 3;
  const MAX_ARTISTS_TO_SHOW = 3;
  const MAX_HISTORY_TO_SHOW = 3;
  const MAX_PLAYLISTS_TO_SHOW = 3;

  // ✅ Автосохранение likedPlaylists в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(likedPlaylistsStorageKey, JSON.stringify(likedPlaylists));
    } catch (_) {}
  }, [likedPlaylists, likedPlaylistsStorageKey]);

  // ✅ ВСЕГДА синхронизируем liked playlists с сервера (а не только localStorage)
  useEffect(() => {
    if (!user?.id) return;

    const loadLikedPlaylistsFromServer = async () => {
      try {
        const resp = await apiFetch(`/api/users/${user.id}/liked-playlists/`);
        if (!resp.ok) return;

        const data = await resp.json();
        const serverPlaylists = Array.isArray(data.playlists) ? data.playlists : [];

        setLikedPlaylists(serverPlaylists);
        localStorage.setItem(likedPlaylistsStorageKey, JSON.stringify(serverPlaylists));
        
        // ✅ Обновляем статусы в SocialContext
        serverPlaylists.forEach((pl) => {
          if (!pl?.id) return;
          const count = pl.likes_count ?? 0;
          setPlaylistLikeStatus?.(pl.id, true, count);
        });
      } catch (e) {
        console.warn('Sidebar: load liked playlists error', e);
      }
    };

    loadLikedPlaylistsFromServer();
  }, [user?.id, likedPlaylistsStorageKey, setPlaylistLikeStatus]);

  // ✅ Загрузка репостнутых плейлистов с сервера и восстановление статусов
  useEffect(() => {
    if (!user?.id) return;

    const loadRepostedPlaylistsFromServer = async () => {
      try {
        const resp = await apiFetch(`/api/users/${user.id}/reposted-playlists/`);
        if (!resp.ok) return;

        const data = await resp.json();
        const serverReposts = Array.isArray(data.playlists) ? data.playlists : [];

        // ✅ насильно восстанавливаем repost-статус в SocialContext
        serverReposts.forEach((pl) => {
          if (!pl?.id) return;
          const count = pl.reposts_count ?? pl.repost_count ?? 0;
          setPlaylistRepostStatus?.(pl.id, true, count);
        });
      } catch (e) {
        console.warn('Sidebar: load reposted playlists error', e);
      }
    };

    loadRepostedPlaylistsFromServer();
  }, [user?.id, setPlaylistRepostStatus]);

  const sidebarTracks = useMemo(() => {
    const tracks = (likedTrackIds || [])
      .map(id => {
        const track = tracksById?.[id];
        if (!track) return null;
        
        const validatedDuration = validateAudioDuration(track);
        
        return {
          id: track.id,
          title: track.title || 'Без названия',
          artist: track.artist || 'Unknown artist',
          cover: getTrackCoverUrl(track),
          cover_url: track.cover_url,
          duration: validatedDuration,
          duration_seconds: validatedDuration,
          play_count: track.play_count || 0,
          like_count: track.like_count ?? 0,
          comment_count: track.comment_count ?? track.comments_count ?? 0,
          isCurrent: track.id === currentTrack,
          uploaded_by: track.uploaded_by || null,
          repost_count: getRepostCount(track.id) || track.repost_count || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.id - a.id);
    
    return tracks;
  }, [likedTrackIds, tracksById, currentTrack, getRepostCount]);

  const interactedArtists = useMemo(() => {
    const map = new Map();
    const myId = user?.id;

    (likedTrackIds || []).forEach(trackId => {
      const track = tracksById?.[trackId];
      const author = track?.uploaded_by;
      if (author?.id && author.id !== myId) {
        const authorWithCounts = {
          ...author,
          followers_count: followerCounts?.[Number(author.id)] ?? author.followers_count ?? 0,
          following_count: followingCounts?.[Number(author.id)] ?? author.following_count ?? 0
        };
        map.set(author.id, authorWithCounts);
      }
    });

    Object.keys(reposts || {}).forEach(trackId => {
      if (reposts[trackId]) {
        const track = tracksById?.[Number(trackId)];
        const author = track?.uploaded_by;
        if (author?.id && author.id !== myId) {
          const authorWithCounts = {
            ...author,
            followers_count: followerCounts?.[Number(author.id)] ?? author.followers_count ?? 0,
            following_count: followingCounts?.[Number(author.id)] ?? author.following_count ?? 0
          };
          map.set(author.id, authorWithCounts);
        }
      }
    });

    return Array.from(map.values());
  }, [likedTrackIds, reposts, tracksById, user?.id, followerCounts, followingCounts]);

  const sidebarHistoryTracks = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];

    const processed = history
      .map((h) => {
        const trackId = h?.track_id ?? h?.trackId ?? h?.track ?? h?.track?.id;
        const playedAt = h?.played_at ?? h?.playedAt;

        if (!trackId) return null;

        const base = tracksById?.[trackId];
        if (!base) return null;

        const validatedDuration = validateAudioDuration(base);

        return {
          id: base.id,
          title: base.title || 'Без названия',
          artist: base.artist || 'Unknown artist',
          cover: getTrackCoverUrl(base),
          cover_url: base.cover_url,
          duration: validatedDuration,
          duration_seconds: validatedDuration,
          play_count: base.play_count || 0,
          like_count: base.like_count ?? 0,
          comment_count: base.comment_count ?? base.comments_count ?? 0,
          uploaded_by: base.uploaded_by || { id: base.user_id || 0, username: base.artist },
          playedAt: playedAt || new Date().toISOString(),
          playedAtMs: playedAt ? new Date(playedAt).getTime() : Date.now(),
          repost_count: getRepostCount(base.id) || base.repost_count || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.playedAtMs || 0) - (a.playedAtMs || 0));

    const seen = new Set();
    const unique = [];
    for (const t of processed) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
    }

    return unique;
  }, [history, tracksById, getRepostCount]);

  const historyTracksToShow = useMemo(
    () => sidebarHistoryTracks.slice(0, MAX_HISTORY_TO_SHOW),
    [sidebarHistoryTracks]
  );

  const shouldShowHistoryViewAllButton = useMemo(
    () => sidebarHistoryTracks.length > MAX_HISTORY_TO_SHOW,
    [sidebarHistoryTracks.length]
  );

  const totalFollowingArtists = interactedArtists.length;
  const artistsToShow = interactedArtists.slice(0, MAX_ARTISTS_TO_SHOW);

  const extraArtistsCount = Math.max(0, totalFollowingArtists - MAX_ARTISTS_TO_SHOW);
  const shouldShowArtistsViewAllButton = extraArtistsCount > 0;
  
  const tracksToShow = useMemo(() => 
    sidebarTracks.slice(0, MAX_TRACKS_TO_SHOW), 
    [sidebarTracks]
  );
  
  const extraTracksCount = Math.max(0, sidebarTracks.length - MAX_TRACKS_TO_SHOW);
  const shouldShowViewAllButton = extraTracksCount > 0;

  const playlistsToShow = useMemo(() => 
    likedPlaylists.slice(0, MAX_PLAYLISTS_TO_SHOW),
    [likedPlaylists]
  );
  
  const extraPlaylistsCount = Math.max(0, likedPlaylists.length - MAX_PLAYLISTS_TO_SHOW);
  const shouldShowPlaylistsViewAllButton = extraPlaylistsCount > 0;

  // 🎯 ИСПРАВЛЕНО: ровно 4 иконки с правильными роутами
  const artistTools = useMemo(() => [
    {
      id: 1,
      label: "Upload",
      icon: <IconUpload />,
      action: () => actualNavigate('/upload')
    },
    {
      id: 2,
      label: "Playlists",
      icon: <IconPlaylists />,
      action: () => actualNavigate('/studio/playlists')
    },
    {
      id: 3,
      label: "Analytics",
      icon: <IconAnalytics />,
      action: () => actualNavigate('/studio/stats')
    },
    {
      id: 4,
      label: "Artist Hub",
      icon: <IconHub />,
      action: () => actualNavigate('/studio')
    }
  ], [actualNavigate]);

  // ✅ Подписка на глобальное событие 'liked' для синхронизации с другими страницами
  useEffect(() => {
    const onLiked = async (ev) => {
      const d = ev?.detail;
      if (d?.type !== 'playlist') return;

      const playlistId = d.playlistId;
      if (!playlistId) return;

      // если анлайк — убрать из списка
      if (d.liked === false) {
        setLikedPlaylists(prev => prev.filter(p => p?.id !== playlistId));
        return;
      }

      // если лайк — добавить в список (если его ещё нет)
      setLikedPlaylists(prev => {
        if (prev.some(p => p?.id === playlistId)) return prev;
        return prev; // добавим после fetch
      });

      try {
        const r = await apiFetch(`/api/playlists/${playlistId}/`);
        if (!r.ok) return;
        const data = await r.json();
        const pl = data?.playlist || data;

        if (!pl?.id) return;

        setLikedPlaylists(prev => {
          if (prev.some(p => p?.id === pl.id)) return prev;
          return [pl, ...prev];
        });
      } catch (_) {}
    };

    window.addEventListener('liked', onLiked);
    return () => window.removeEventListener('liked', onLiked);
  }, []); // пустой массив зависимостей, т.к. apiFetch стабилен

  const handleArtistClick = useCallback((e, track) => {
    e.stopPropagation();
    if (!track?.uploaded_by?.id) return;
    actualNavigate(`/profile/${track.uploaded_by.id}`);
  }, [actualNavigate]);

  const handleTrackClick = useCallback((trackId) => {
    const track = tracksById?.[trackId];
    if (!track) return;
    
    const trackForPlayer = {
      ...track,
      duration_seconds: track.duration_seconds || track.duration || 0,
      uploaded_by: track.uploaded_by || { id: 0, username: 'Unknown' }
    };
    
    if (trackId === currentTrack) {
      if (onTogglePlayPause) {
        onTogglePlayPause();
      }
      return;
    }
    
    if (playTrack) {
      playTrack(trackForPlayer);
    }
  }, [tracksById, currentTrack, playTrack, onTogglePlayPause]);

  const handleTitleClick = useCallback((trackId) => {
    actualNavigate(`/track/${trackId}`);
  }, [actualNavigate]);

  const handleViewAllClick = useCallback(() => {
    actualNavigate('/library?tab=likes');
  }, [actualNavigate]);

  const handleViewAllArtistsClick = useCallback(() => {
    actualNavigate('/library?tab=following');
  }, [actualNavigate]);

  const handleViewAllHistoryClick = useCallback(() => {
    actualNavigate('/library?tab=history');
  }, [actualNavigate]);

  const handleViewAllPlaylistsClick = useCallback(() => {
    actualNavigate('/library?tab=playlists');
  }, [actualNavigate]);

  // ✅ Функция для получения треков плейлиста (ids + объекты)
  const fetchPlaylistTracks = useCallback(async (playlistId) => {
    if (!playlistId) return { ids: [], tracks: [] };
    
    // Проверяем кэш
    if (playlistQueueCache[playlistId]?.ids?.length) {
      console.log('✅ Sidebar: используем кэш для плейлиста', playlistId);
      return playlistQueueCache[playlistId];
    }

    try {
      console.log('📤 Sidebar: загрузка треков плейлиста', playlistId);
      const token = getAuthToken?.();
      const res = await fetch(`/api/playlists/${playlistId}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        console.error('❌ Sidebar: ошибка загрузки плейлиста', res.status);
        return { ids: [], tracks: [] };
      }

      const data = await res.json();
      const items = data?.items || data?.playlist?.items || [];
      const tracks = items.map(it => it?.track || it).filter(Boolean);
      const ids = tracks.map(t => t.id).filter(x => x != null);

      const payload = { ids, tracks };
      
      // Сохраняем в кэш
      setPlaylistQueueCache(prev => ({ ...prev, [playlistId]: payload }));
      console.log(`✅ Sidebar: загружено ${ids.length} треков для плейлиста`, playlistId);
      
      return payload;
    } catch (e) {
      console.error('❌ Sidebar: fetchPlaylistTracks error', e);
      return { ids: [], tracks: [] };
    }
  }, [getAuthToken, playlistQueueCache]);

  const normalizeTrackForPlayer = useCallback((t) => {
    if (!t) return null;
    return {
      ...t,
      duration_seconds: t.duration_seconds || t.duration || 0,
      uploaded_by: t.uploaded_by || { id: 0, username: 'Unknown' }
    };
  }, []);

  // ✅ Обработчик ▶/⏸ на плейлисте
  const handlePlaylistPlayPause = useCallback(async (pl, e) => {
    e?.stopPropagation?.();
    if (!pl?.id) return;

    console.log('▶️ Sidebar: воспроизведение плейлиста', pl.id, pl.title);

    // если этот плейлист уже активен — просто toggle play/pause
    if (playingPlaylistId === pl.id && Array.isArray(playQueueIds) && playQueueIds.length > 0) {
      console.log('⏯️ Sidebar: тот же плейлист, toggle play/pause');
      onTogglePlayPause?.();
      return;
    }

    const { ids, tracks } = await fetchPlaylistTracks(pl.id);
    if (!ids.length || !tracks.length) {
      console.log('⚠️ Sidebar: в плейлисте нет треков');
      return;
    }

    // ставим очередь в App.js (плейлист-режим)
    if (typeof setPlaybackQueue === 'function') {
      setPlaybackQueue(ids);
    }

    // запоминаем активный плейлист (чтобы рисовать ⏸)
    setPlayingPlaylistId(pl.id);

    // запускаем первый трек (как в handleTrackClick)
    const first = normalizeTrackForPlayer(tracks[0]);
    if (first && playTrack) {
      playTrack(first);
    }
  }, [
    fetchPlaylistTracks,
    normalizeTrackForPlayer,
    onTogglePlayPause,
    playQueueIds,
    playTrack,
    playingPlaylistId,
    setPlaybackQueue
  ]);

  // ✅ Обработчик лайка плейлиста с оптимистичным обновлением списка
  const handleTogglePlaylistLike = useCallback(async (pl, e) => {
    e?.stopPropagation?.();
    if (!pl?.id) return;

    const wasLiked = isPlaylistLiked?.(pl.id) ?? false;

    // 1) мгновенно меняем список, чтобы плейлист пропал/появился без перезагрузки
    setLikedPlaylists(prev => {
      if (wasLiked) {
        // если был лайкнут — убираем из списка
        return prev.filter(p => p?.id !== pl.id);
      } else {
        // если не был лайкнут — добавляем в начало (если ещё нет)
        if (prev.some(p => p?.id === pl.id)) return prev;
        return [pl, ...prev];
      }
    });

    // 2) дергаем SocialContext (он уже делает оптимистичное обновление для иконки/счётчика)
    await togglePlaylistLike?.(pl.id);
  }, [isPlaylistLiked, togglePlaylistLike]);

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

        {interactedArtists.length > 0 && (
          <div className="sidebar-liked-artists-section">
            <div className="section-header sidebar-liked-header">
              <h4 className="section-title">
                <Shuffle
                  text="Following"
                  tag="span"
                  textAlign="left"
                  className="liked-artists-shuffle"
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

              <div className="sidebar-liked-meta">
                <span className="track-count">
                  {totalFollowingArtists} {totalFollowingArtists === 1 ? 'artist' : 'artists'}
                </span>

                {shouldShowArtistsViewAllButton && (
                  <div className="sidebar-view-all-wrap">
                    <button
                      className="sidebar-view-all-btn"
                      onClick={handleViewAllArtistsClick}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#8456ff';
                        e.currentTarget.style.borderColor = '#8456ff';
                        e.currentTarget.style.background = 'rgba(132, 86, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '20px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontFamily: "'Press Start 2P', sans-serif",
                        fontSize: '0.6rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginLeft: '10px',
                        gap: '5px'
                      }}
                      title={`View all ${totalFollowingArtists} artists`}
                    >
                      <Shuffle
                        text="VIEW ALL"
                        tag="span"
                        duration={0.2}
                        ease="power3.out"
                        threshold={0.1}
                        shuffleDirection="right"
                        shuffleTimes={1}
                        animationMode="evenodd"
                        stagger={0.01}
                        colorFrom="rgba(255, 255, 255, 0.7)"
                        colorTo="rgba(255, 255, 255, 0.7)"
                        triggerOnce={true}
                        triggerOnHover={true}
                        style={{
                          fontSize: '0.6rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                        }}
                      />
                      <IconViewAll />
                      <span className="sidebar-view-all-count" style={{
                        fontSize: '0.5rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginLeft: '3px'
                      }}>
                        +{extraArtistsCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="sidebar-artists-list">
              {artistsToShow.map(artist => (
                <SidebarArtistCard
                  key={artist.id}
                  artist={artist}
                  isFollowing={isFollowing(artist.id)}
                  onFollowToggle={toggleFollow}
                  onClick={() => actualNavigate(`/profile/${artist.id}`)}
                  followsLoaded={followsLoaded}
                  isSelf={artist.id === user?.id}
                  followersCount={
                    artist?.followers_count ??
                    followerCounts?.[Number(artist.id)] ??
                    0
                  }
                  followingCount={
                    artist?.following_count ??
                    followingCounts?.[Number(artist.id)] ??
                    0
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <div className="section-header sidebar-liked-header">
            <h4 className="section-title">
              <Shuffle
                text="Liked Playlists"
                tag="span"
                textAlign="left"
                className="liked-playlists-shuffle"
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

            <div className="sidebar-liked-meta">
              <span className="track-count">
                {likedPlaylists.length} {likedPlaylists.length === 1 ? 'playlist' : 'playlists'}
              </span>

              {shouldShowPlaylistsViewAllButton && (
                <div className="sidebar-view-all-wrap">
                  <button
                    className="sidebar-view-all-btn"
                    onClick={handleViewAllPlaylistsClick}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#8456ff';
                      e.currentTarget.style.borderColor = '#8456ff';
                      e.currentTarget.style.background = 'rgba(132, 86, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      marginLeft: '10px',
                      gap: '5px'
                    }}
                    title={`View all ${likedPlaylists.length} playlists`}
                  >
                    <Shuffle
                      text="VIEW ALL"
                      tag="span"
                      duration={0.2}
                      ease="power3.out"
                      threshold={0.1}
                      shuffleDirection="right"
                      shuffleTimes={1}
                      animationMode="evenodd"
                      stagger={0.01}
                      colorFrom="rgba(255, 255, 255, 0.7)"
                      colorTo="rgba(255, 255, 255, 0.7)"
                      triggerOnce={true}
                      triggerOnHover={true}
                      style={{
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', sans-serif",
                      }}
                    />
                    <IconViewAll />
                    <span className="sidebar-view-all-count" style={{
                      fontSize: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginLeft: '3px'
                    }}>
                      +{extraPlaylistsCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {likedPlaylists.length === 0 ? (
            <div className="sidebar-empty">No liked playlists yet</div>
          ) : (
            <div className="sidebar-playlists-list">
              {playlistsToShow.map((pl) => {
                const isThisPlaylistPlaying = playingPlaylistId === pl.id && 
                                             Array.isArray(playQueueIds) && 
                                             playQueueIds.length > 0;
                
                return (
                  <SidebarPlaylistCard
                    key={pl.id}
                    playlist={pl}
                    onOpen={() => actualNavigate(`/playlist/${pl.id}`)}
                    onPlayPause={(e) => handlePlaylistPlayPause(pl, e)}
                    isActive={isThisPlaylistPlaying && isPlaying}
                    liked={isPlaylistLiked?.(pl.id) || false}
                    reposted={isPlaylistReposted?.(pl.id) || false}
                    likeCount={getPlaylistLikeCount?.(pl.id) ?? pl.likes_count ?? 0}
                    repostCount={getPlaylistRepostCount?.(pl.id) ?? pl.repost_count ?? pl.reposts_count ?? 0}
                    onToggleLike={(e) => handleTogglePlaylistLike(pl, e)}
                    onToggleRepost={() => togglePlaylistRepost?.(pl.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/*
          🔥 RECOMMENDED AUTHORS - ПОЛНОСТЬЮ СКРЫТ, ЕСЛИ НЕТ РЕКОМЕНДАЦИЙ
        */}
        {(() => {
          const authorsMap = new Map();
          
          likedPlaylists.forEach((pl) => {
            const a = pl?.created_by;
            if (!a?.id) return;
            if (a.id === user?.id) return;
            authorsMap.set(a.id, a);
          });

          const authors = Array.from(authorsMap.values())
            .filter(a => !isFollowing?.(a.id));

          if (authors.length === 0) return null;

          return (
            <div className="sidebar-section">
              <div className="section-header sidebar-liked-header">
                <h4 className="section-title">
                  <Shuffle
                    text="Recommended Authors"
                    tag="span"
                    textAlign="left"
                    className="recommended-authors-shuffle"
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

              <div className="sidebar-artists-list">
                {authors.slice(0, 5).map((a) => (
                  <SidebarArtistCard
                    key={a.id}
                    artist={{
                      id: a.id,
                      username: a.username,
                      avatar: a.avatar_url || a.avatar,
                    }}
                    isSelf={false}
                    isFollowing={isFollowing?.(a.id) || false}
                    followsLoaded={followsLoaded}
                    followersCount={0}
                    followingCount={0}
                    onClick={() => actualNavigate(`/profile/${a.username}`)}
                    onFollowToggle={() => followUnfollowUser?.(a.id)}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        <div className="liked-tracks-section">
          <div className="section-header sidebar-liked-header">
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

            <div className="sidebar-liked-meta">
              <span className="track-count">
                {sidebarTracks.length} {sidebarTracks.length === 1 ? 'track' : 'tracks'}
              </span>

              {shouldShowViewAllButton && (
                <div className="sidebar-view-all-wrap">
                  <button
                    className="sidebar-view-all-btn"
                    onClick={handleViewAllClick}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#8456ff';
                      e.currentTarget.style.borderColor = '#8456ff';
                      e.currentTarget.style.background = 'rgba(132, 86, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      marginLeft: '10px',
                      gap: '5px'
                    }}
                    title={`View all ${sidebarTracks.length} liked tracks`}
                  >
                    <Shuffle
                      text="VIEW ALL"
                      tag="span"
                      duration={0.2}
                      ease="power3.out"
                      threshold={0.1}
                      shuffleDirection="right"
                      shuffleTimes={1}
                      animationMode="evenodd"
                      stagger={0.01}
                      colorFrom="rgba(255, 255, 255, 0.7)"
                      colorTo="rgba(255, 255, 255, 0.7)"
                      triggerOnce={true}
                      triggerOnHover={true}
                      style={{
                        fontSize: '0.6rem',
                        fontFamily: "'Press Start 2P', sans-serif",
                      }}
                    />
                    <IconViewAll />
                    <span className="sidebar-view-all-count" style={{
                      fontSize: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginLeft: '3px'
                    }}>
                      +{extraTracksCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {sidebarTracks.length > 0 ? (
            <>
              <div className="liked-tracks-list">
                {tracksToShow.map(track => {
                  const isCurrent = track.id === currentTrack;
                  const isTrackPlaying = isCurrent && isPlaying;
                  const liked = isTrackLiked(track.id);
                  const reposted = isReposted(track.id);
                  const repostCountVal = getRepostCount(track.id);
                  const authorId = track.uploaded_by?.id;
                  
                  const following = authorId && followsLoaded ? isFollowing(authorId) : false;
                  const likeCount = likeCounts?.[track.id] !== undefined ? getLikeCount(track.id) : (track.like_count ?? 0);
                  
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
                        isLiked={liked}
                        onLikeClick={() => toggleLike(track.id)}
                        isHovered={hoveredTrackId === track.id}
                        onTrackTitleClick={handleTitleClick}
                        onArtistClick={handleArtistClick}
                        currentTime={isCurrent ? currentTime : 0}
                        isFollowing={following}
                        isReposted={reposted}
                        repostCount={repostCountVal}
                        onFollowToggle={toggleFollow}
                        onRepostToggle={toggleRepost}
                        followsLoaded={followsLoaded}
                        likeCount={likeCount}
                        commentCount={track.comment_count ?? 0}
                        currentUserId={user?.id}
                      />
                    </div>
                  );
                })}
              </div>

              {shouldShowViewAllButton && (
                <div className="sidebar-hidden-tracks-hint" style={{
                  fontSize: '0.6rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  marginTop: '10px',
                  fontFamily: "'Press Start 2P', sans-serif",
                  padding: '0 10px'
                }}>
                </div>
              )}
            </>
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

        <div className="liked-tracks-section">
          <div className="section-header sidebar-liked-header">
            <h4 className="section-title">
              <Shuffle
                text="Listening History"
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

            <div className="sidebar-liked-meta">
              <span className="track-count">
                {sidebarHistoryTracks.length} {sidebarHistoryTracks.length === 1 ? 'track' : 'tracks'}
              </span>

              {shouldShowHistoryViewAllButton && (
                <button
                  className="sidebar-view-all-btn"
                  onClick={handleViewAllHistoryClick}
                  title={`View all ${sidebarHistoryTracks.length} history tracks`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '20px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginLeft: '10px',
                    gap: '5px'
                  }}
                >
                  <Shuffle
                    text="VIEW ALL"
                    tag="span"
                    duration={0.2}
                    ease="power3.out"
                    threshold={0.1}
                    shuffleDirection="right"
                    shuffleTimes={1}
                    animationMode="evenodd"
                    stagger={0.01}
                    colorFrom="rgba(255, 255, 255, 0.7)"
                    colorTo="rgba(255, 255, 255, 0.7)"
                    triggerOnce={true}
                    triggerOnHover={true}
                    style={{
                      fontSize: '0.6rem',
                      fontFamily: "'Press Start 2P', sans-serif",
                    }}
                  />
                  <IconViewAll />
                  <span className="sidebar-view-all-count" style={{
                    fontSize: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginLeft: '3px'
                  }}>
                    +{sidebarHistoryTracks.length - MAX_HISTORY_TO_SHOW}
                  </span>
                </button>
              )}
            </div>
          </div>

          {sidebarHistoryTracks.length > 0 ? (
            <div className="liked-tracks-list">
              {historyTracksToShow.map(track => {
                const isCurrent = track.id === currentTrack;
                const isTrackPlaying = isCurrent && isPlaying;
                const liked = isTrackLiked(track.id);
                const reposted = isReposted(track.id);
                const repostCountVal = getRepostCount(track.id);
                const authorId = track.uploaded_by?.id;
                const following = authorId && followsLoaded ? isFollowing(authorId) : false;
                const likeCount = likeCounts?.[track.id] !== undefined ? getLikeCount(track.id) : (track.like_count ?? 0);

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
                      isLiked={liked}
                      onLikeClick={() => toggleLike(track.id)}
                      isHovered={hoveredTrackId === track.id}
                      onTrackTitleClick={handleTitleClick}
                      onArtistClick={handleArtistClick}
                      currentTime={isCurrent ? currentTime : 0}
                      isFollowing={following}
                      isReposted={reposted}
                      repostCount={repostCountVal}
                      onFollowToggle={toggleFollow}
                      onRepostToggle={toggleRepost}
                      followsLoaded={followsLoaded}
                      likeCount={likeCount}
                      commentCount={track.comment_count ?? 0}
                      currentUserId={user?.id}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-heart-icon">
                <IconClock />
              </div>
              <p className="empty-message">No listening history yet</p>
              <small className="empty-submessage">
                Play some tracks to see them here
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Sidebar;