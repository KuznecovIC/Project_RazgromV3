// frontend/src/components/GlassMusicPlayer.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Shuffle from "./Shuffle";
import { useNavigate } from "react-router-dom";

/* ────────────────────── Иконки ────────────────────── */
const IconPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" fill="currentColor"/>
  </svg>
);

const IconPause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/>
  </svg>
);

const IconPrevious = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/>
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6h-2v12h2zm-3.5 6L6 18V6z" fill="currentColor"/>
  </svg>
);

const IconVolume = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
  </svg>
);

const IconHeart = ({filled = false}) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'fill 0.2s ease' }}>
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? "#8456ff" : "currentColor"}
      stroke={filled ? "#8456ff" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconRepeat = ({active = false}) => (
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

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'all 0.3s ease', width: '18px', height: '18px' }}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

const IconFollow = ({following = false}) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ transition: 'all 0.3s ease', width: '18px', height: '18px' }}>
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

/* ────────────────────── Вспомогательные функции ────────────────────── */
const formatDuration = seconds => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

/* ────────────────────── Основной компонент ────────────────────── */
const GlassMusicPlayer = ({
  /* Трек и управление */
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

  /* Лайк */
  isLiked,
  onToggleLike,

  /* Встроенный плеер */
  loopEnabled = false,
  onToggleLoop = () => {},

  /* UI/прочее */
  isLoading = false,
  showInFooter = true,
  trackInfo = null,
  getAuthToken,
  navigate = null,
  onTrackClick = () => {},
}) => {
  const internalNavigate = useNavigate();
  const actualNavigate = navigate || internalNavigate;
  
  /* ==== Состояния ==== */
  const [isFollowing, setIsFollowing] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
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
  const [localTrackInfo, setLocalTrackInfo] = useState(trackInfo);
  const [repostLoading, setRepostLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  /* ==== 🔥 РЕФЫ ДЛЯ АВТОПЛЕЯ (pending autoplay) ==== */
  const pendingAutoPlayRef = useRef(false);
  const lastTrackIdRef = useRef(null);

  /* ==== Проверка ширины экрана ==== */
  useEffect(() => {
    const checkWidth = () => setIsCompact(window.innerWidth < 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  /* ==== Синхронизация лайков и trackInfo ==== */
  useEffect(() => {
    setLocalIsLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    if (trackInfo) {
      setLocalTrackInfo(trackInfo);
      setRepostCount(trackInfo.repost_count || 0);
    }
  }, [trackInfo]);

  /* ==== При смене трека обновляем ключ и сбрасываем статусы ==== */
  useEffect(() => {
    setPlayerKey(prev => prev + 1);
    setForceTrigger(prev => prev + 1);
    
    setIsFollowing(false);
    setIsReposted(false);
    setRepostCount(0);
    
    if (trackInfo?.uploaded_by?.id && trackInfo?.id) {
      loadFollowStatus();
      loadRepostStatus();
    }
  }, [currentTrack, trackInfo]);

  /* ==== 🔥 ЭФФЕКТ №1: фиксируем "трек сменился → надо автоплей" ==== */
  useEffect(() => {
    if (!currentTrack) return;

    const trackId =
      typeof currentTrack === 'object' && currentTrack !== null
        ? currentTrack.id
        : currentTrack;

    if (!trackId) return;

    if (lastTrackIdRef.current !== trackId) {
      lastTrackIdRef.current = trackId;
      pendingAutoPlayRef.current = true;
    }
  }, [currentTrack]);

  /* ==== 🔥 ЭФФЕКТ №2: когда загрузка закончилась — запускаем ==== */
  useEffect(() => {
    if (!currentTrack) return;
    if (isLoading) return;
    if (!pendingAutoPlayRef.current) return;
    if (typeof onPlayPause !== 'function') return;

    if (isPlaying) {
      pendingAutoPlayRef.current = false;
      return;
    }

    const raf = requestAnimationFrame(() => {
      try {
        onPlayPause();
      } catch (e) {
      } finally {
        pendingAutoPlayRef.current = false;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [currentTrack, isLoading, isPlaying, onPlayPause]);

  /* ==== Получение токена ==== */
  const authToken = useCallback(() => {
    const token = getAuthToken ? getAuthToken() : 
      localStorage.getItem('accessToken') || 
      localStorage.getItem('access') ||
      localStorage.getItem('token');
    
    return token;
  }, [getAuthToken]);

  /* ==== Функции для Follow ==== */
  const loadFollowStatus = useCallback(async () => {
    if (!trackInfo?.uploaded_by?.id) return;
    
    try {
      const token = authToken();
      if (!token) return;

      const resp = await fetch(
        `http://localhost:8000/api/users/${trackInfo.uploaded_by.id}/check-follow/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await resp.json();
      if (resp.ok) {
        setIsFollowing(!!data.is_following);
      }
    } catch (e) {
    }
  }, [trackInfo, authToken]);

  const handleCreateFollow = useCallback(async () => {
    if (!trackInfo?.uploaded_by?.id) return;

    const token = authToken();
    if (!token) {
      alert('Войдите, чтобы подписаться');
      return;
    }

    setFollowLoading(true);
    try {
      const resp = await fetch(
        `http://localhost:8000/api/users/${trackInfo.uploaded_by.id}/follow/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await resp.json();
      
      if (resp.ok) {
        setIsFollowing(true);
        
        window.dispatchEvent(
          new CustomEvent("followStatusChanged", {
            detail: {
              targetUserId: trackInfo.uploaded_by.id,
              isFollowing: true,
              timestamp: Date.now(),
            },
          })
        );
      } else {
        throw new Error(data?.error ?? "Не удалось подписаться");
      }
    } catch (e) {
      alert(e.message ?? "Сетевая ошибка");
    } finally {
      setFollowLoading(false);
    }
  }, [trackInfo, authToken]);

  const handleUnfollow = useCallback(async () => {
    if (!trackInfo?.uploaded_by?.id) return;

    const token = authToken();
    if (!token) {
      alert('Войдите, чтобы отписаться');
      return;
    }

    setFollowLoading(true);
    try {
      const resp = await fetch(
        `http://localhost:8000/api/users/${trackInfo.uploaded_by.id}/follow/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await resp.json();
      
      if (resp.ok) {
        setIsFollowing(false);
        
        window.dispatchEvent(
          new CustomEvent("followStatusChanged", {
            detail: {
              targetUserId: trackInfo.uploaded_by.id,
              isFollowing: false,
              timestamp: Date.now(),
            },
          })
        );
      } else {
        throw new Error(data?.error ?? "Не удалось отписаться");
      }
    } catch (e) {
      alert(e.message ?? "Сетевая ошибка");
    } finally {
      setFollowLoading(false);
    }
  }, [trackInfo, authToken]);

  const toggleFollow = () => {
    if (followLoading) return;
    if (isFollowing) {
      handleUnfollow();
    } else {
      handleCreateFollow();
    }
  };

  /* ==== Функции для Repost (Share) ==== */
  const loadRepostStatus = useCallback(async () => {
    if (!trackInfo?.id) return;
    
    try {
      const token = authToken();
      if (!token) return;

      const resp = await fetch(
        `http://localhost:8000/api/track/${trackInfo.id}/check-repost/`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await resp.json();
      if (resp.ok && data.success) {
        setIsReposted(!!data.is_reposted);
        setRepostCount(data.repost_count || 0);
      }
    } catch (e) {
    }
  }, [trackInfo, authToken]);

  const handleCreateRepost = useCallback(async () => {
    if (!trackInfo?.id) return;

    const token = authToken();
    if (!token) {
      alert('Войдите, чтобы сделать репост');
      return;
    }

    setRepostLoading(true);
    try {
      const resp = await fetch(
        "http://localhost:8000/api/repost/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ track_id: trackInfo.id })
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data?.error ?? "Не удалось репостнуть");
      }

      setIsReposted(true);
      setRepostCount(data.repost_count || 0);

      setLocalTrackInfo(prev => ({
        ...prev,
        repost_count: data.repost_count || 0
      }));

      const savedReposts = JSON.parse(localStorage.getItem('user_reposts') || '{}');
      savedReposts[trackInfo.id] = true;
      localStorage.setItem('user_reposts', JSON.stringify(savedReposts));

      window.dispatchEvent(
        new CustomEvent("trackReposted", {
          detail: {
            trackId: trackInfo.id,
            isReposted: true,
            repostCount: data.repost_count || 0,
            timestamp: Date.now()
          }
        })
      );

    } catch (e) {
      alert(e.message ?? "Сетевая ошибка");
    } finally {
      setRepostLoading(false);
    }
  }, [trackInfo, authToken]);

  const handleUnrepost = useCallback(async () => {
    if (!trackInfo?.id) return;

    const token = authToken();
    if (!token) {
      alert('Войдите, чтобы удалить репост');
      return;
    }

    setRepostLoading(true);
    try {
      const resp = await fetch(
        "http://localhost:8000/api/repost/",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ track_id: trackInfo.id })
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data?.error ?? "Не удалось удалить репост");
      }

      setIsReposted(false);
      setRepostCount(data.repost_count || 0);

      setLocalTrackInfo(prev => ({
        ...prev,
        repost_count: data.repost_count || 0
      }));

      const savedReposts = JSON.parse(localStorage.getItem('user_reposts') || '{}');
      delete savedReposts[trackInfo.id];
      localStorage.setItem('user_reposts', JSON.stringify(savedReposts));

      window.dispatchEvent(
        new CustomEvent("trackReposted", {
          detail: {
            trackId: trackInfo.id,
            isReposted: false,
            repostCount: data.repost_count,
            timestamp: Date.now()
          }
        })
      );

    } catch (e) {
      alert(e.message ?? "Сетевая ошибка");
    } finally {
      setRepostLoading(false);
    }
  }, [trackInfo, authToken]);

  const toggleRepost = () => {
    if (repostLoading) return;
    if (isReposted) {
      handleUnrepost();
    } else {
      handleCreateRepost();
    }
  };

  /* ==== Слушатель глобальных событий для синхронизации ==== */
  useEffect(() => {
    const onTrackReposted = e => {
      const { trackId, isReposted: newReposted, repostCount: newRepostCount } = e.detail || {};
      if (trackId == null) return;

      const normalizedEventId = Number(trackId);
      
      let normalizedCurrentId;
      if (typeof currentTrack === "object" && currentTrack !== null) {
        normalizedCurrentId = Number(currentTrack.id);
      } else {
        normalizedCurrentId = Number(currentTrack);
      }

      if (!Number.isFinite(normalizedEventId) || !Number.isFinite(normalizedCurrentId)) return;

      if (normalizedEventId === normalizedCurrentId) {
        setIsReposted(!!newReposted);
        setRepostCount(newRepostCount || 0);
        setLocalTrackInfo(prev => ({
          ...prev,
          repost_count: newRepostCount || prev?.repost_count || 0
        }));
      }
    };

    const onFollowStatusChanged = e => {
      const { targetUserId, isFollowing: newFollowing } = e.detail || {};
      if (trackInfo?.uploaded_by?.id === targetUserId) {
        setIsFollowing(!!newFollowing);
      }
    };

    window.addEventListener("trackReposted", onTrackReposted);
    window.addEventListener("followStatusChanged", onFollowStatusChanged);
    
    return () => {
      window.removeEventListener("trackReposted", onTrackReposted);
      window.removeEventListener("followStatusChanged", onFollowStatusChanged);
    };
  }, [currentTrack, trackInfo]);

  /* ==== При загрузке компонента загружаем статусы ==== */
  useEffect(() => {
    if (trackInfo?.id) {
      loadRepostStatus();
    }
    if (trackInfo?.uploaded_by?.id) {
      loadFollowStatus();
    }
  }, [trackInfo, loadRepostStatus, loadFollowStatus]);

  /* ==== Остальные обработчики ==== */
  const handleClickOutside = e => {
    if (volumeRef.current && !volumeRef.current.contains(e.target)) {
      setShowVolume(false);
    }
  };
  
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateVolumeSliderPosition = useCallback(() => {
    const slider = volumeSliderRef.current;
    if (!slider) return;
    slider.style.setProperty("--volume-percent", `${volume * 100}%`);
  }, [volume]);
  
  useEffect(() => updateVolumeSliderPosition(), [volume, updateVolumeSliderPosition]);

  const handleLikeClick = () => {
    if (isLoading) return;
    const newState = !localIsLiked;
    setLocalIsLiked(newState);
    if (typeof onToggleLike === "function") onToggleLike();
  };

  const handlePlayPause = () => {
    if (isLoading || !currentTrack) return;
    if (onPlayPause) onPlayPause();
  };

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

  const handleArtistClick = (e) => {
    e.stopPropagation();
    
    if (!localTrackInfo) {
      return;
    }
    
    const artistId = localTrackInfo.uploaded_by?.id;
    
    if (!artistId) {
      const artistName = localTrackInfo.artist || 'Unknown';
      alert(`Ошибка: невозможно перейти к профилю артиста "${artistName}"\n\nПожалуйста, сообщите об ошибке разработчику.`);
      return;
    }
    
    actualNavigate(`/profile/${artistId}`);
  };

  /* ==== Функция для получения автора ==== */
  const getArtistDisplayName = () => {
    if (!localTrackInfo) return 'Unknown artist';
    
    if (localTrackInfo.uploaded_by?.username) {
      return localTrackInfo.uploaded_by.username;
    }
    
    if (typeof localTrackInfo.artist === 'string') {
      return localTrackInfo.artist;
    }
    
    if (typeof localTrackInfo.artist === 'object' && localTrackInfo.artist !== null) {
      return localTrackInfo.artist.username || localTrackInfo.artist.name || 'Unknown artist';
    }
    
    return 'Unknown artist';
  };

  const getArtistId = () => {
    return localTrackInfo?.uploaded_by?.id || null;
  };

  /* ==== UI разметка ==== */
  if (!showInFooter) return null;
  if (!currentTrack) return null;

  const artistDisplayName = getArtistDisplayName();
  const artistId = getArtistId();
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canSeek = duration > 0 && !isLoading;

  if (!localTrackInfo || !localTrackInfo.title || localTrackInfo.title === 'Loading...') {
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

  const followButtonStyle = {
    background: isFollowing ? "rgba(132, 86, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
    border: isFollowing ? "1px solid #8456ff" : "1px solid rgba(255,255,255,0.15)",
    color: isFollowing ? "#8456ff" : "rgba(255,255,255,0.7)",
    cursor: isLoading || followLoading ? "not-allowed" : "pointer",
    padding: "8px",
    borderRadius: "50%",
    transition: "all 0.3s ease",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const repostButtonStyle = {
    background: isReposted ? "rgba(132, 86, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
    border: isReposted ? "1px solid #8456ff" : "1px solid rgba(255,255,255,0.15)",
    color: isReposted ? "#8456ff" : "rgba(255,255,255,0.7)",
    cursor: isLoading || repostLoading ? "not-allowed" : "pointer",
    padding: "8px",
    borderRadius: "50%",
    transition: "all 0.3s ease",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  };

  return (
    <div className="glass-player-footer" key={`player-${playerKey}`}>
      {/* 🔥 СТИЛИ ДЛЯ ЭФФЕКТА ВРЕМЕНИ */}
      <style>{`
        .gmp-time-shuffle {
          font-family: 'Press Start 2P', sans-serif;
          letter-spacing: 0.04em;
          position: relative;
          line-height: 1;
          animation: gmpTimeShuffle 2.6s steps(2, end) infinite;
          will-change: transform, filter;
          text-shadow: 0 1px 0 rgba(0,0,0,0.35);
        }

        .gmp-time-shuffle::before,
        .gmp-time-shuffle::after {
          content: attr(data-text);
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          pointer-events: none;
        }

        .gmp-time-shuffle::before {
          color: rgba(132, 86, 255, 0.85);
          animation: gmpTimeGhostA 2.6s steps(2, end) infinite;
        }

        .gmp-time-shuffle::after {
          color: rgba(255, 159, 252, 0.75);
          animation: gmpTimeGhostB 2.6s steps(2, end) infinite;
        }

        .gmp-time-shuffle:hover {
          animation-duration: 1.25s;
          filter: drop-shadow(0 0 10px rgba(132,86,255,0.35));
        }

        @keyframes gmpTimeShuffle {
          0% { transform: translate3d(0,0,0); opacity: .75; }
          6% { transform: translate3d(.4px,-.3px,0); opacity: .95;
               text-shadow: -1px 0 rgba(132,86,255,.35), 1px 0 rgba(255,159,252,.20), 0 1px 0 rgba(0,0,0,.35); }
          10% { transform: translate3d(-.3px,.4px,0);
                text-shadow: -1px 0 rgba(255,159,252,.18), 1px 0 rgba(132,86,255,.30), 0 1px 0 rgba(0,0,0,.35); }
          14% { transform: translate3d(0,0,0); opacity: .75; }
          50% { transform: translate3d(0,0,0); opacity: .75; }
          56% { transform: translate3d(.6px,0,0); opacity: .95;
                text-shadow: -2px 0 rgba(132,86,255,.35), 2px 0 rgba(255,159,252,.20), 0 1px 0 rgba(0,0,0,.35); }
          58% { transform: translate3d(-.6px,0,0);
                text-shadow: -2px 0 rgba(255,159,252,.18), 2px 0 rgba(132,86,255,.30), 0 1px 0 rgba(0,0,0,.35); }
          62% { transform: translate3d(0,0,0); opacity: .75; }
          100% { transform: translate3d(0,0,0); opacity: .75; }
        }

        @keyframes gmpTimeGhostA {
          0%,45%,100% { opacity: 0; transform: translate3d(0,0,0); }
          6%  { opacity: .35; transform: translate3d(-1px,0,0); }
          10% { opacity: .25; transform: translate3d(1px,0,0); }
          56% { opacity: .35; transform: translate3d(-2px,0,0); }
          58% { opacity: .25; transform: translate3d(2px,0,0); }
          62% { opacity: 0; transform: translate3d(0,0,0); }
        }

        @keyframes gmpTimeGhostB {
          0%,45%,100% { opacity: 0; transform: translate3d(0,0,0); }
          6%  { opacity: .22; transform: translate3d(1px,0,0); }
          10% { opacity: .18; transform: translate3d(-1px,0,0); }
          56% { opacity: .22; transform: translate3d(2px,0,0); }
          58% { opacity: .18; transform: translate3d(-2px,0,0); }
          62% { opacity: 0; transform: translate3d(0,0,0); }
        }
      `}</style>

      <div className="glass-player-container">
        {/* Track Info - LEFT */}
        <div className="glass-player-track">
          {localTrackInfo.cover && (
            <img 
              src={localTrackInfo.cover} 
              alt={localTrackInfo.title} 
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
                  {localTrackInfo.title}
                </div>
              ) : (
                <Shuffle
                  key={`title-${currentTrack}-${forceTrigger}`}
                  text={localTrackInfo.title}
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
              <span 
                className="glass-time gmp-time-shuffle"
                data-text={formatDuration(currentTime)}
              >
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
              <span 
                className="glass-time gmp-time-shuffle"
                data-text={formatDuration(duration)}
              >
                {formatDuration(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Volume, Like, Loop, Share и Follow - RIGHT */}
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

            <div className="glass-repost-container" style={{ position: 'relative' }}>
              <button
                className={`glass-control-btn glass-repost-btn ${isReposted ? 'reposted' : ''}`}
                onClick={toggleRepost}
                disabled={isLoading || repostLoading}
                style={repostButtonStyle}
                title={isReposted ? "Отменить репост" : "Репостнуть"}
              >
                {repostLoading ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  <IconShare />
                )}
                {repostCount > 0 && (
                  <span className="glass-repost-count" style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: isReposted ? '#8456ff' : 'rgba(255,255,255,0.3)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}>
                    {repostCount}
                  </span>
                )}
              </button>
            </div>

            <button
              className={`glass-control-btn glass-follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={toggleFollow}
              disabled={isLoading || followLoading}
              style={followButtonStyle}
              title={isFollowing ? "Отписаться" : "Подписаться"}
            >
              {followLoading ? (
                <div className="loading-spinner-small"></div>
              ) : (
                <IconFollow following={isFollowing} />
              )}
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

/* ────────────────────── Экспорт ────────────────────── */
export default GlassMusicPlayer;