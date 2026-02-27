// frontend/src/components/TrackPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // ✅ Добавлен Link
import GridScan from '../GridScan';
import Shuffle from './Shuffle';
import GooeyNav from './GooeyNav';
import FloatingLinesDropdown from './FloatingLinesDropdown';
import logoMark from '../logo1.ico';
import './TrackPage.css';
import GlassMusicPlayer from './GlassMusicPlayer';
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';

// Иконки
const IconPlay = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="play-icon">
    <path d="M8 5v14l11-7z" fill="currentColor" />
  </svg>
);

const IconPause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
  </svg>
);

const IconHeart = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="heart-icon">
    <path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
      fill={filled ? "#ff6b9d" : "currentColor"}
      stroke={filled ? "#ff6b9d" : "currentColor"}
      strokeWidth="0.5"
    />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="share-icon">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

const IconRepost = ({ active = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" 
      fill={active ? "#8456ff" : "currentColor"}
    />
  </svg>
);

const IconComment = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>
  </svg>
);

const IconMore = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
  </svg>
);

const IconRepeat = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/>
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="currentColor"/>
    <path d="M12 14c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" fill="currentColor"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconProfile = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path
      d="M4.5 21c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 18h12l-1.3-2.2a6.8 6.8 0 0 1-.9-3.4V11a4.8 4.8 0 0 0-9.6 0v1.4a6.8 6.8 0 0 1-.9 3.4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const IconMessage = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8A2.5 2.5 0 0 1 18.5 17H7l-4 3V6.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="m6 8 6 4 6-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

// 🎯 НОВАЯ ИКОНКА: Admin
const IconAdmin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 16h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const IconDots = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41zM19 3a2 2 0 012 2v4h-2V5H5v14h14v-4h2v4a2 2 0 01-2 2H5a2 01-2-2h14z"
      fill="currentColor"
    />
  </svg>
);

const IconUserCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
  </svg>
);

// ============================================
// ✅ ИКОНКИ И ХЕЛПЕРЫ ДЛЯ MORE FROM (КАК В SIDEBAR)
// ============================================

const IconClockMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 11.2 4.2 2.5-.8 1.3L11 14V7h2v6.2Z"
      fill="currentColor"
    />
  </svg>
);

const IconPlayCountMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1 14V8l7 4-7 4Z"
      fill="currentColor"
    />
  </svg>
);

// ✅ Иконка комментариев для мета-строки (мини)
const IconCommentMini = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
      fill="currentColor"
    />
  </svg>
);

// 👇 форматирование как в Sidebar (только число, без слова plays)
const formatPlaysNumber = (count) => {
  const n = Number(count || 0);
  if (!n) return '0';
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
};

const formatDurationCompact = (value) => {
  // value может быть number (сек) или строка "1:42"
  if (typeof value === 'string' && value.includes(':')) return value;
  const s = Number(value || 0);
  if (!s || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

// ✅ Хелперы для аватара как в ProtectedApp
const isBackendDefaultImage = (url) => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('/static/default_avatar') ||
    url.includes('/static/default_cover') ||
    url.includes('default_avatar') ||
    url.includes('default_cover')
  );
};

const getAvatarUrl = (user) => {
  if (user?.avatar) {
    if (String(user.avatar).startsWith('http')) return user.avatar;
    return `http://localhost:8000${user.avatar}`;
  }
  return null;
};

// ============================================

const TrackPage = ({ 
  currentTime,
  duration,
  currentTrack,
  isPlaying,
  onPlayPause,
  onToggleLike,
  user,
  sessionToken,
  onLogout,
  volume,
  onVolumeChange,
  onNext,
  onPrevious,
  loopEnabled,
  onToggleLoop,
  trackData = {},
  likedTracks = [],
  checkTrackLiked,
  getAuthToken,
  onSeek,
  onPlayTrack,
  // 🔥 НОВЫЙ ПРОП
  setPlaybackContext,
}) => {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const currentTrackId = parseInt(trackId);

  // 🔥 НОВЫЙ ХУК: управление single-track режимом
  useEffect(() => {
    console.log('🎵 TrackPage: Активирован режим single-track');
    // При монтировании страницы трека включаем single-режим
    if (typeof setPlaybackContext === 'function') {
      setPlaybackContext('single');
    }

    // При размонтировании страницы (уходе с неё) возвращаем обычный режим
    return () => {
      console.log('🎵 TrackPage: Деактивирован режим single-track');
      if (typeof setPlaybackContext === 'function') {
        setPlaybackContext(null);
      }
    };
  }, [setPlaybackContext]); // Сработает только при монтировании и размонтировании
  
  // ✅ Состояние для поиска в шапке
  const [topSearch, setTopSearch] = useState('');
  
  // ✅ Подключаем SocialContext для лайков/репостов — добавили likeCounts и getLikeCount
  const {
    toggleLike: toggleLikeGlobal,
    toggleRepost: toggleRepostGlobal,
    isLiked: isLikedGlobal,
    isReposted: isRepostedGlobal,
    getRepostCount,
    likeCounts,
    getLikeCount
  } = useSocial();
  
  const [track, setTrack] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #0d0c1d, #111129)');
  
  // 🔥 ДИНАМИЧЕСКИЕ ЦВЕТА ДЛЯ GRIDSCAN (HEX, валидные для THREE.Color)
  const [gridScanColor, setGridScanColor] = useState('#8456ff');
  const [gridLinesColor, setGridLinesColor] = useState('#cbd5e1');
  
  const [isLoading, setIsLoading] = useState(true);
  const [waveformData, setWaveformData] = useState([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const [trackLikesCount, setTrackLikesCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isTrackLiked, setIsTrackLiked] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(true);
  const [repeatActive, setRepeatActive] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const [usersWhoLiked, setUsersWhoLiked] = useState([]);
  const [usersWhoReposted, setUsersWhoReposted] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [isReposted, setIsReposted] = useState(false);
  
  // ✅ More from (реальные треки автора)
  const [moreFromTracks, setMoreFromTracks] = useState([]);
  const [moreFromTotalCount, setMoreFromTotalCount] = useState(0);
  const [loadingMoreFrom, setLoadingMoreFrom] = useState(false);
  
  // ✅ State для related tracks
  const [relatedTracks, setRelatedTracks] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // ✅ State для плейлистов трека
  const [inPlaylists, setInPlaylists] = useState([]);
  const [loadingInPlaylists, setLoadingInPlaylists] = useState(false);
  
  const isSeekingRef = useRef(false);
  const userMenuRef = useRef(null);
  
  const getAuthTokenForTrackPage = useCallback(() => {
    return (getAuthToken && getAuthToken()) ||
           sessionToken ||
           localStorage.getItem('access') ||
           localStorage.getItem('accessToken') ||
           localStorage.getItem('token');
  }, [getAuthToken, sessionToken]);
  
  const isCurrentTrackPlaying = currentTrack === currentTrackId && isPlaying;

  // ✅ authorId для переиспользования
  const authorId = useMemo(() => track?.uploaded_by?.id || track?.artistId, [track]);

  // ✅ Подсчет общего количества треков автора для отображения в карточке
  const authorTracksCount = useMemo(() => {
    if (!authorId) return 0;
    
    // moreFromTotalCount — это количество треков автора БЕЗ текущего
    // Если текущий трек принадлежит этому автору — добавляем 1
    const currentBelongsToAuthor = (track?.uploaded_by?.id || track?.artistId) === authorId;
    return (moreFromTotalCount || 0) + (currentBelongsToAuthor ? 1 : 0);
  }, [authorId, moreFromTotalCount, track]);

  // ✅ isAdmin как в ProtectedApp
  const isAdmin = !!(user?.is_admin || user?.is_staff || user?.is_superuser);

  // ✅ actionIcons с условной иконкой Admin/Notifications
  const actionIcons = [
    { label: 'Upload', Icon: IconUpload },
    { label: isAdmin ? 'Admin' : 'Notifications', Icon: isAdmin ? IconAdmin : IconBell },
    { label: 'Messages', Icon: IconMessage }
  ];

  // 🔥 СБРОС ЦВЕТОВ ПРИ СМЕНЕ ТРЕКА
  useEffect(() => {
    setGridScanColor('#8456ff');
    setGridLinesColor('#cbd5e1');
  }, [currentTrackId]);

  // ✅ Обработчики для шапки
  const submitTopSearch = useCallback(() => {
    const q = (topSearch || '').trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }, [topSearch, navigate]);

  const goToStudio = useCallback(() => {
    navigate('/studio');
  }, [navigate]);

  const goToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const goToFeed = useCallback(() => {
    navigate('/feed');
  }, [navigate]);

  const goToLibrary = useCallback(() => {
    navigate('/library');
  }, [navigate]);

  const checkFollowStatus = useCallback(async (authorId) => {
    const authToken = getAuthTokenForTrackPage();
    if (!authToken) return false;
    
    try {
      const response = await apiFetch(`/api/users/${authorId}/check-follow/`);
      if (response.ok) {
        const data = await response.json();
        return data.is_following || false;
      }
    } catch (error) {
      console.error('❌ Ошибка проверки статуса подписки:', error);
    }
    return false;
  }, [getAuthTokenForTrackPage]);

  const handleFollowToggle = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!authToken) {
      alert('Войдите в систему, чтобы подписываться на пользователей');
      return;
    }
    
    if (followLoading) return;
    
    const authorId = track?.uploaded_by?.id || track?.artistId;
    if (!authorId) return;
    
    setFollowLoading(true);
    
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await apiFetch(`/api/users/${authorId}/follow/`, {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState);
        
        if (track?.uploaded_by) {
          const currentFollowers = parseInt(track.uploaded_by.followers_count || track.uploaded_by.followers || 0, 10) || 0;
          const newCount = isFollowing 
            ? Math.max(0, currentFollowers - 1)
            : currentFollowers + 1;
          
          setTrack(prev => ({
            ...prev,
            uploaded_by: {
              ...prev.uploaded_by,
              followers: newCount,
              followers_count: newCount
            }
          }));
        }
        
        const currentUserId = user?.id || null;
        window.dispatchEvent(new CustomEvent('followStatusChanged', {
          detail: {
            targetUserId: authorId,
            currentUserId,
            isFollowing: newFollowingState,
            timestamp: Date.now()
          }
        }));
        
        console.log(`✅ ${newFollowingState ? 'Подписались на' : 'Отписались от'} пользователя ${authorId}`);
        
      } else {
        alert(data.error || 'Ошибка при изменении подписки');
        console.error('❌ Ошибка API подписки:', data.error);
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка подписки:', error);
      alert('Сетевая ошибка при изменении подписки');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRepost = async () => {
    const authToken = getAuthTokenForTrackPage();

    if (!authToken) {
      alert('Войдите в систему, чтобы репостить треки');
      return;
    }

    if (syncInProgress || isReposted) return;

    setSyncInProgress(true);

    try {
      const response = await apiFetch('/api/repost/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ track_id: currentTrackId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTrack(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            reposts: data.repost_count || (prev.stats.reposts + 1)
          }
        }));
        setIsReposted(true);

        if (user) {
          setUsersWhoReposted(prev => {
            const userAlreadyExists = prev.some(u => 
              u.id === user.id || u.username === user.username
            );
            if (!userAlreadyExists) {
              return [
                {
                  id: user.id || 'current-user',
                  username: user.username,
                  avatar: user.avatar || '',
                  avatar_url: user.avatar_url || user.avatar || '',
                  name: user.username
                },
                ...prev
              ];
            }
            return prev;
          });
        }

        window.dispatchEvent(new CustomEvent('trackReposted', {
          detail: {
            trackId: currentTrackId,
            userId: user?.id,
            repostCount: data.repost_count || (track?.stats?.reposts + 1),
            isReposted: true,
            timestamp: Date.now()
          }
        }));
        
        console.log('✅ Трек успешно репостнут');
        
      } else {
        alert(data.error || 'Не удалось репостнуть трек');
      }
    } catch (e) {
      console.error('❌ Ошибка репоста:', e);
      alert('Сетевая ошибка при репосте');
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleUnrepost = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!authToken) {
      alert('Войдите в систему, чтобы удалить репост');
      return;
    }
    
    if (syncInProgress || !isReposted) return;
    
    setSyncInProgress(true);
    
    try {
      const response = await apiFetch('/api/repost/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ track_id: currentTrackId })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const newRepostCount = data.repost_count ?? (track?.stats?.reposts > 0 ? track.stats.reposts - 1 : 0);
        setTrack(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            reposts: newRepostCount
          },
        }));
        setIsReposted(false);
        
        if (user) {
          setUsersWhoReposted(prev => 
            prev.filter(u => !(u.id === user.id || u.username === user.username))
          );
        }
        
        window.dispatchEvent(
          new CustomEvent('trackReposted', {
            detail: {
              trackId: currentTrackId,
              userId: user?.id,
              repostCount: newRepostCount,
              isReposted: false,
              timestamp: Date.now()
            },
          })
        );
        
        console.log('✅ Репост успешно удален');
        
      } else {
        alert(data.error || 'Не удалось удалить репост');
      }
    } catch (e) {
      console.error('❌ Ошибка удаления репоста:', e);
      alert('Сетевая ошибка при удалении репоста');
    } finally {
      setSyncInProgress(false);
    }
  };

  // ✅ ИСПРАВЛЕНО: УБРАНА ПРОВЕРКА ТОКЕНА - ЭНДПОИНТЫ ПУБЛИЧНЫЕ
  const loadUsersData = useCallback(async () => {
    if (!currentTrackId) return;
    
    setLoadingUsers(true);
    
    try {
      try {
        const likesResponse = await apiFetch(`/api/track/${currentTrackId}/likes/users/`);
        if (likesResponse.ok) {
          const likesData = await likesResponse.json();
          setUsersWhoLiked(likesData.users || []);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки лайков пользователей:', error);
        setUsersWhoLiked([]);
      }
      
      try {
        const repostsResponse = await apiFetch(`/api/track/${currentTrackId}/reposts/users/`);
        if (repostsResponse.ok) {
          const repostsData = await repostsResponse.json();
          setUsersWhoReposted(repostsData.users || []);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки репостов пользователей:', error);
        setUsersWhoReposted([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользовательских данных:', error);
      setUsersWhoLiked([]);
      setUsersWhoReposted([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentTrackId]);

  // ✅ Реальные треки автора для секции "More from"
  const loadMoreFromTracks = useCallback(async () => {
    if (!authorId) {
      setMoreFromTracks([]);
      setMoreFromTotalCount(0);
      return;
    }

    setLoadingMoreFrom(true);

    try {
      const resp = await apiFetch(`/api/users/${authorId}/tracks/`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const list = Array.isArray(data.tracks) ? data.tracks : [];

      // общее число треков автора (можно вычесть текущий, чтобы не дублировался)
      const hasCurrent = list.some(t => t?.id === currentTrackId);
      const rawTotal = typeof data.count === 'number' ? data.count : list.length;
      const totalWithoutCurrent = Math.max(0, rawTotal - (hasCurrent ? 1 : 0));
      setMoreFromTotalCount(totalWithoutCurrent);

      // топ-3 по play_count
      const normalized = list
        .filter(t => t && t.id !== currentTrackId)
        .map(t => ({
          id: t.id,
          title: t.title || 'Untitled',
          artist: t.artist || t.uploaded_by?.username || track?.artist || 'Unknown',
          artistId: t.uploaded_by?.id || authorId,
          cover: t.cover_url || t.cover || '',
          play_count: typeof t.play_count === 'number' ? t.play_count : 0,
          duration_seconds: t.duration_seconds || t.duration || 180,
          uploaded_by: t.uploaded_by,
          stats: t.stats || { plays: t.play_count || 0 },
          comments_count: t.comments_count || t.comment_count || 0,
          like_count: t.like_count || 0
        }))
        .sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

      setMoreFromTracks(normalized.slice(0, 3));
    } catch (e) {
      console.error('❌ TrackPage: Ошибка загрузки треков автора (More from):', e);
      setMoreFromTracks([]);
      setMoreFromTotalCount(0);
    } finally {
      setLoadingMoreFrom(false);
    }
  }, [authorId, currentTrackId, track]);

  // ✅ Улучшенная загрузка related треков (как в SearchHub)
  useEffect(() => {
    const loadRelatedTracks = async () => {
      if (!track?.id) return;

      // ✅ Берём теги из правильного поля
      const tags = (track.hashtags || [])
        .map(t => String(t || '').replace('#', '').trim().toLowerCase())
        .filter(Boolean);

      if (!tags.length) {
        setRelatedTracks([]);
        setLoadingRelated(false);
        return;
      }

      setLoadingRelated(true);
      try {
        // Берём первые 2 тега (достаточно для поиска)
        const take = tags.slice(0, 2);

        // Параллельно ищем по каждому тегу
        const results = await Promise.all(
          take.map(async (tag) => {
            try {
              const response = await apiFetch(`/api/search/?type=tracks&tag=${encodeURIComponent(tag)}`);
              if (!response.ok) return [];
              const data = await response.json();
              return data?.tracks || [];
            } catch (err) {
              console.error(`Ошибка поиска по тегу #${tag}:`, err);
              return [];
            }
          })
        );

        // Объединяем результаты и убираем дубли
        const merged = [];
        const seen = new Set();
        
        for (const arr of results) {
          for (const tr of arr) {
            if (!tr?.id) continue;
            if (tr.id === track.id) continue; // исключаем текущий трек
            if (seen.has(tr.id)) continue;
            
            seen.add(tr.id);
            merged.push({
              id: tr.id,
              title: tr.title,
              artist: tr.artist || tr.uploaded_by?.username || 'Unknown',
              artistId: tr.artist_id || tr.uploaded_by?.id,
              cover: tr.cover_url || tr.cover || '',
              duration: tr.duration || '3:00',
              duration_seconds: tr.duration_seconds || 180,
              play_count: tr.play_count || tr.stats?.plays || 0,
              hashtags: tr.hashtags || []
            });
          }
        }

        // Берём первые 3
        setRelatedTracks(merged.slice(0, 3));
      } catch (error) {
        console.error('❌ Ошибка загрузки related треков:', error);
        setRelatedTracks([]);
      } finally {
        setLoadingRelated(false);
      }
    };

    loadRelatedTracks();
  }, [track?.id, track?.hashtags]);

  // ✅ Загрузка плейлистов, в которых есть этот трек
  useEffect(() => {
    const loadTrackPlaylists = async () => {
      if (!track?.id) return;

      setLoadingInPlaylists(true);
      try {
        const response = await apiFetch(`/api/tracks/${track.id}/playlists/`);
        if (!response.ok) {
          setInPlaylists([]);
          return;
        }
        const data = await response.json();
        setInPlaylists(data?.playlists || []);
      } catch (error) {
        console.error('❌ Ошибка загрузки плейлистов трека:', error);
        setInPlaylists([]);
      } finally {
        setLoadingInPlaylists(false);
      }
    };

    loadTrackPlaylists();
  }, [track?.id]);

  // Вызов загрузки More from
  useEffect(() => {
    loadMoreFromTracks();
  }, [loadMoreFromTracks]);

  const authorAvatarUrl = useMemo(() => {
    if (!track) return null;

    const avatar = track.uploaded_by?.avatar_url
                 || track.uploaded_by?.avatar
                 || null;

    if (avatar && !avatar.startsWith('http')) {
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'http://localhost:8000'
        : window.location.origin;
      return `${baseUrl}${avatar}`;
    }
    return avatar;
  }, [track]);

  // 🔥 УЛУЧШЕННЫЙ АНАЛИЗ ДОМИНАНТНОГО ЦВЕТА ОБЛОЖКИ (как в PlaylistPage)
  const analyzeImageColor = useCallback((imageUrl) => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    const rgbToHsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      const s = max === 0 ? 0 : d / max;
      const v = max;
      return { h, s, v };
    };

    const hsvToRgb = (h, s, v) => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;
      let r = 0, g = 0, b = 0;
      if (h < 60) [r, g, b] = [c, x, 0];
      else if (h < 120) [r, g, b] = [x, c, 0];
      else if (h < 180) [r, g, b] = [0, c, x];
      else if (h < 240) [r, g, b] = [0, x, c];
      else if (h < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
      };
    };

    const toHex = (r, g, b) => {
      const h = (n) => n.toString(16).padStart(2, '0');
      return `#${h(r)}${h(g)}${h(b)}`;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const w = (canvas.width = 96);
        const h = (canvas.height = 96);
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);

        const bucket = new Map();

        // квантование 16 уровней -> лучше группирует
        const add = (r, g, b) => {
          const rQ = r >> 4;
          const gQ = g >> 4;
          const bQ = b >> 4;
          const key = (rQ << 8) | (gQ << 4) | bQ;
          bucket.set(key, (bucket.get(key) || 0) + 1);
        };

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 220) continue;

          // жестко выкидываем почти черный/белый
          if (r < 20 && g < 20 && b < 20) continue;
          if (r > 245 && g > 245 && b > 245) continue;

          add(r, g, b);
        }

        if (!bucket.size) return;

        // выбираем не "самый частый", а "самый жирный по насыщенности/яркости"
        let bestKey = null;
        let bestScore = -1;

        for (const [k, count] of bucket.entries()) {
          const rQ = (k >> 8) & 15;
          const gQ = (k >> 4) & 15;
          const bQ = k & 15;

          const r = rQ * 16 + 8;
          const g = gQ * 16 + 8;
          const b = bQ * 16 + 8;

          const { s, v } = rgbToHsv(r, g, b);

          // score: частота * насыщенность * яркость
          const score = count * (0.6 + s * 1.7) * (0.25 + v * 0.75);

          if (score > bestScore) {
            bestScore = score;
            bestKey = k;
          }
        }

        const rQ = (bestKey >> 8) & 15;
        const gQ = (bestKey >> 4) & 15;
        const bQ = bestKey & 15;

        const domR = rQ * 16 + 8;
        const domG = gQ * 16 + 8;
        const domB = bQ * 16 + 8;

        // сохраняем тон, просто "поднимаем" яркость
        const { h: H, s: S, v: V } = rgbToHsv(domR, domG, domB);

        const scanRGB  = hsvToRgb(H, Math.min(1, S * 1.05), Math.min(1, V * 1.15 + 0.06));
        const linesRGB = hsvToRgb(H, Math.min(1, S * 1.10), Math.min(1, V * 1.30 + 0.10));

        // ✅ важно: отдаём HEX (самый стабильный формат для GridScan)
        setGridScanColor(toHex(scanRGB.r, scanRGB.g, scanRGB.b));
        setGridLinesColor(toHex(linesRGB.r, linesRGB.g, linesRGB.b));

        const bg = `radial-gradient(1200px 700px at 50% 30%,
          rgba(${domR}, ${domG}, ${domB}, 0.34) 0%,
          rgba(11, 10, 25, 0.92) 55%,
          rgba(8, 7, 18, 0.96) 100%
        )`;
        setBackgroundColor(bg);

        console.log('🎨 TrackPage: доминантный цвет:', { 
          scan: toHex(scanRGB.r, scanRGB.g, scanRGB.b), 
          lines: toHex(linesRGB.r, linesRGB.g, linesRGB.b), 
          bestScore, 
          domR, domG, domB 
        });
      } catch (e) {
        console.warn('🎨 TrackPage: dominant failed', e);
      }
    };

    img.onerror = () => console.warn('🎨 TrackPage: image load failed', imageUrl);
  }, []);

  const loadTrack = useCallback(async () => {
    if (!currentTrackId) return;
    
    setIsLoading(true);
    console.log(`🔄 TrackPage: Загрузка трека ${currentTrackId} с сервера...`);
    
    try {
      const response = await apiFetch(`/api/track/${currentTrackId}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 TrackPage: Данные с сервера:', {
        id: data.id,
        title: data.title,
        play_count: data.play_count,
        uploaded_by: data.uploaded_by,
        hashtag_list: data.hashtag_list,
        tag_list: data.tag_list
      });
      
      // ✅ ФИКС: Правильно читаем теги из разных полей (приоритет: hashtag_list)
      const rawData = data.track || data; // некоторые эндпоинты оборачивают в { track: ... }
      const trackHashtags = rawData.hashtag_list || rawData.tag_list || rawData.tags || rawData.hashtags || [];
      
      const formattedTrack = {
        id: rawData.id,
        title: rawData.title,
        artist: rawData.artist || 'Неизвестный артист',
        artistId: rawData.artist_id || rawData.uploaded_by?.id || 1,
        artistUsername: rawData.artist_username || rawData.uploaded_by?.username || 'unknown',
        cover: rawData.cover || rawData.cover_url || '',
        audio_url: rawData.audio_url || '',
        duration: rawData.duration || '3:00',
        duration_seconds: rawData.duration_seconds || 180,
        hashtags: trackHashtags, // ← теперь правильно читает теги с бэкенда
        uploaded_by: rawData.uploaded_by || {
          id: rawData.artist_id || 1,
          username: rawData.artist_username || rawData.uploaded_by?.username || 'unknown',
          name: rawData.artist || 'Неизвестный артист',
          followers: rawData.uploaded_by?.followers_count || rawData.uploaded_by?.followers || 0,
          followers_count: rawData.uploaded_by?.followers_count || rawData.uploaded_by?.followers || 0,
          tracks: rawData.uploaded_by?.tracks_count || 1,
          avatar: rawData.uploaded_by?.avatar || rawData.uploaded_by?.avatar_url || null,
          avatar_url: rawData.uploaded_by?.avatar_url || rawData.uploaded_by?.avatar || null
        },
        stats: {
          reposts: rawData.repost_count || 0,
          plays: rawData.play_count || 0,
          likes: rawData.like_count || 0
        },
        play_count: rawData.play_count || 0,
        is_reposted: rawData.is_reposted || false
      };
      
      setTrack(formattedTrack);
      setTrackLikesCount(rawData.like_count || 0);
      setIsReposted(!!rawData.is_reposted);
      
      // 🔥 Анализируем цвет обложки для динамического GridScan
      const coverForColor = rawData.cover_url || rawData.cover;
      if (coverForColor) {
        analyzeImageColor(coverForColor);
      }
      
      try {
        const waveformResponse = await apiFetch(`/api/track/${currentTrackId}/waveform/`);
        if (waveformResponse.ok) {
          const waveformData = await waveformResponse.json();
          setWaveformData(waveformData.waveform || []);
        }
      } catch (error) {
        setWaveformData(Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15));
      }
      
      await loadComments(currentTrackId);
      await loadUsersData();
      
      console.log(`✅ TrackPage: Трек ${currentTrackId} успешно загружен, play_count: ${formattedTrack.play_count}, теги:`, trackHashtags);
      console.log('📸 Avatar URL для автора:', authorAvatarUrl);
      
    } catch (error) {
      console.error('❌ TrackPage: Ошибка загрузки трека:', error);
      
      const demoData = {
        1: {
          id: 1,
          title: "hard drive (slowed & muffled)",
          artist: "griffinilla",
          artistId: 101,
          artistUsername: "griffinilla",
          cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
          audio_url: "/tracks/track1.mp3",
          duration: "3:20",
          duration_seconds: 200,
          hashtags: ["slowed", "lofi", "electronic"],
          uploaded_by: {
            id: 101,
            username: "griffinilla",
            name: "griffinilla",
            followers: "125k",
            tracks: 42,
            avatar: "https://i.pravatar.cc/150?img=1",
            avatar_url: "https://i.pravatar.cc/150?img=1"
          },
          stats: {
            reposts: 3241,
            plays: 254789,
            likes: 56
          },
          is_reposted: false
        },
        2: {
          id: 2,
          title: "Deutschland",
          artist: "Rammstein",
          artistId: 102,
          artistUsername: "rammstein",
          cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
          audio_url: "/tracks/track2.mp3",
          duration: "5:22",
          duration_seconds: 322,
          hashtags: ["industrial", "metal", "german"],
          uploaded_by: {
            id: 102,
            username: "rammstein",
            name: "Rammstein",
            followers: "2.4M",
            tracks: 156,
            avatar: "https://i.pravatar.cc/150?img=2",
            avatar_url: "https://i.pravatar.cc/150?img=2"
          },
          stats: {
            reposts: 89124,
            plays: 12457896,
            likes: 34
          },
          is_reposted: false
        }
      };
      
      const demoTrack = demoData[currentTrackId];
      if (demoTrack) {
        const formattedDemoTrack = {
          ...demoTrack,
          stats: {
            ...demoTrack.stats,
            plays: demoTrack.stats.plays
          },
          play_count: demoTrack.stats.plays
        };
        
        setTrack(formattedDemoTrack);
        setTrackLikesCount(demoTrack.stats.likes || 0);
        setIsReposted(demoTrack.is_reposted || false);
        
        // 🔥 Анализируем цвет демо-обложки
        if (demoTrack.cover) {
          analyzeImageColor(demoTrack.cover);
        }
        
        setWaveformData(Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15));
        setComments([]);
        setUsersWhoLiked([]);
        setUsersWhoReposted([]);
        
        console.log(`✅ TrackPage: Используем демо-данные, play_count: ${formattedDemoTrack.play_count}`);
      } else {
        setTrack(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTrackId, loadUsersData, authorAvatarUrl, analyzeImageColor]);

  const loadComments = async (trackId) => {
    try {
      const response = await apiFetch(`/api/track/${trackId}/comments/`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        
        const likedCommentsSet = new Set();
        data.comments?.forEach(comment => {
          if (comment.user_liked) {
            likedCommentsSet.add(comment.id);
          }
        });
        setLikedComments(likedCommentsSet);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки комментариев:', error);
      setComments([]);
    }
  };

  const togglePlayPause = useCallback(() => {
    if (!track) return;
    
    if (currentTrack !== currentTrackId) {
      if (onPlayTrack) {
        onPlayTrack(track);
      } else if (onPlayPause) {
        onPlayPause(track);
      }
    } else {
      if (onPlayPause) {
        onPlayPause();
      }
    }
  }, [currentTrackId, currentTrack, track, onPlayTrack, onPlayPause]);

  const handleToggleLoop = useCallback(() => {
    setRepeatActive(prev => !prev);
    if (onToggleLoop) {
      onToggleLoop();
    }
  }, [onToggleLoop]);

  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!track) return;
      
      const authorId = track.uploaded_by?.id || track.artistId;
      if (!authorId) return;
      
      const authToken = getAuthTokenForTrackPage();
      if (!authToken) {
        setIsFollowing(false);
        return;
      }
      
      try {
        const followingStatus = await checkFollowStatus(authorId);
        setIsFollowing(followingStatus);
      } catch (error) {
        console.error('❌ Ошибка загрузки статуса подписки:', error);
        setIsFollowing(false);
      }
    };
    
    if (track) {
      loadFollowStatus();
    }
  }, [track, getAuthTokenForTrackPage, checkFollowStatus]);

  useEffect(() => {
    const handleFollowStatusChanged = (event) => {
      const { targetUserId, isFollowing: newFollowing } = event.detail;
      const authorId = track?.uploaded_by?.id || track?.artistId;
      
      if (targetUserId === authorId) {
        setIsFollowing(newFollowing);
        
        if (track?.uploaded_by) {
          const currentFollowers = parseInt(track.uploaded_by.followers_count || track.uploaded_by.followers || 0, 10) || 0;
          const newCount = newFollowing ? currentFollowers + 1 : Math.max(0, currentFollowers - 1);
          
          setTrack(prev => ({
            ...prev,
            uploaded_by: {
              ...prev.uploaded_by,
              followers: newCount,
              followers_count: newCount
            }
          }));
        }
      }
    };
    
    window.addEventListener('followStatusChanged', handleFollowStatusChanged);
    
    return () => {
      window.removeEventListener('followStatusChanged', handleFollowStatusChanged);
    };
  }, [track]);

  useEffect(() => {
    const handleTrackReposted = (e) => {
      const { trackId: eventTrackId, userId, repostCount, isReposted: newReposted } = e.detail || {};

      if (eventTrackId === currentTrackId) {
        if (typeof repostCount === 'number') {
          setTrack(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              reposts: repostCount
            }
          }));
        } else {
          setTrack(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              reposts: newReposted
                ? (prev.stats.reposts || 0) + 1
                : Math.max(0, (prev.stats.reposts || 0) - 1)
            }
          }));
        }

        setIsReposted(!!newReposted);

        if (userId && userId !== user?.id) {
          setUsersWhoReposted(prev => {
            if (!newReposted) {
              return prev.filter(u => !(u.id === userId || u.username === user?.username));
            }

            const already = prev.some(u => u.id === userId || u.username === user?.username);
            if (!already) {
              return [
                {
                  id: userId,
                  username: `user_${userId}`,
                  avatar: '',
                  avatar_url: '',
                  name: `User ${userId}`
                },
                ...prev
              ];
            }
            return prev;
          });
        }
      }
    };

    window.addEventListener('trackReposted', handleTrackReposted);
    return () => window.removeEventListener('trackReposted', handleTrackReposted);
  }, [currentTrackId, user]);

  const syncLikesWithBackend = useCallback(async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!authToken) {
      setIsTrackLiked(checkTrackLiked ? checkTrackLiked(currentTrackId) : false);
      setLoadingLikes(false);
      return false;
    }
    
    try {
      setLoadingLikes(true);
      
      const response = await apiFetch(`/api/track/${currentTrackId}/check-like/`);
      
      if (response.ok) {
        const data = await response.json();
        const serverLiked = data.liked || false;
        const serverLikeCount = data.like_count || 0;
        
        setIsTrackLiked(serverLiked);
        setTrackLikesCount(serverLikeCount);
        
        const likedTracksStorage = localStorage.getItem('likedTracks');
        if (likedTracksStorage) {
          const likedArray = JSON.parse(likedTracksStorage);
          const currentIndex = likedArray.indexOf(currentTrackId);
          
          if (serverLiked && currentIndex === -1) {
            likedArray.push(currentTrackId);
            localStorage.setItem('likedTracks', JSON.stringify(likedArray));
          } else if (!serverLiked && currentIndex !== -1) {
            likedArray.splice(currentIndex, 1);
            localStorage.setItem('likedTracks', JSON.stringify(likedArray));
          }
        }
        
        return serverLiked;
      }
    } catch (error) {
      console.error('❌ Ошибка синхронизации лайков:', error);
    } finally {
      setLoadingLikes(false);
    }
    
    return false;
  }, [currentTrackId, getAuthTokenForTrackPage, checkTrackLiked]);

  // 🔥 Слушаем события обновления количества прослушиваний от App
  useEffect(() => {
    const handlePlayCountUpdated = (event) => {
      const { trackId: eventTrackId, playCount } = event.detail || {};
      if (eventTrackId === currentTrackId && playCount !== undefined) {
        setTrack((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: { ...prev.stats, plays: playCount },
            play_count: playCount,
          };
        });
      }
    };

    window.addEventListener('playCountUpdated', handlePlayCountUpdated);
    return () => window.removeEventListener('playCountUpdated', handlePlayCountUpdated);
  }, [currentTrackId]);

  useEffect(() => {
    // 🔥 чистим старый баг, чтобы не тянулись фейковые просмотры
    localStorage.removeItem('pendingPlays');

    loadTrack();
    setRepeatActive(loopEnabled || false);

    console.log(`🎵 TrackPage: Компонент смонтирован для трека ${currentTrackId}`);
  }, [loadTrack, loopEnabled, currentTrackId]);

  useEffect(() => {
    if (currentTrackId) {
      const authToken = getAuthTokenForTrackPage();
      if (authToken) {
        syncLikesWithBackend();
      } else {
        setIsTrackLiked(checkTrackLiked ? checkTrackLiked(currentTrackId) : false);
        setLoadingLikes(false);
      }
    }
  }, [currentTrackId, syncLikesWithBackend, checkTrackLiked, getAuthTokenForTrackPage]);

  useEffect(() => {
    const handleGlobalTrackLiked = (event) => {
      const { trackId: eventTrackId, liked } = event.detail;
      if (eventTrackId === currentTrackId) {
        setIsTrackLiked(liked);
        
        if (event.detail.count !== undefined) {
          setTrackLikesCount(event.detail.count);
        }
        
        const authToken = getAuthTokenForTrackPage();
        if (authToken && !event.detail.fromTrackPage) {
          setTimeout(() => syncLikesWithBackend(), 500);
        }
      }
    };

    window.addEventListener('trackLiked', handleGlobalTrackLiked);
    window.addEventListener('trackLikedGlobal', handleGlobalTrackLiked);
    window.addEventListener('trackLikedFromApp', handleGlobalTrackLiked);
    window.addEventListener('trackLikedServer', handleGlobalTrackLiked);

    return () => {
      window.removeEventListener('trackLiked', handleGlobalTrackLiked);
      window.removeEventListener('trackLikedGlobal', handleGlobalTrackLiked);
      window.removeEventListener('trackLikedFromApp', handleGlobalTrackLiked);
      window.removeEventListener('trackLikedServer', handleGlobalTrackLiked);
    };
  }, [currentTrackId, syncLikesWithBackend, getAuthTokenForTrackPage]);

  const handleTrackLike = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!authToken) {
      alert('Войдите в систему, чтобы ставить лайки');
      return;
    }
    
    if (syncInProgress || loadingLikes) return;
    
    const currentIsLiked = isTrackLiked;
    const newLikedState = !currentIsLiked;
    const currentLikes = trackLikesCount || 0;
    
    setSyncInProgress(true);
    
    try {
      setIsTrackLiked(newLikedState);
      const newLikesCount = newLikedState ? currentLikes + 1 : Math.max(0, currentLikes - 1);
      setTrackLikesCount(newLikesCount);
      
      if (track) {
        setTrack(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            likes: newLikesCount
          }
        }));
      }
      
      const response = await apiFetch(`/api/track/${currentTrackId}/toggle-like/`, {
        method: 'POST',
        body: JSON.stringify({
          liked: newLikedState
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.like_count !== undefined) {
          setTrackLikesCount(data.like_count);
          
          if (track) {
            setTrack(prev => ({
              ...prev,
              stats: {
                ...prev.stats,
                likes: data.like_count
              }
            }));
          }
        }
        
        const likedTracksStorage = localStorage.getItem('likedTracks');
        let likedArray = [];
        
        if (likedTracksStorage) {
          likedArray = JSON.parse(likedTracksStorage);
        }
        
        if (newLikedState) {
          if (!likedArray.includes(currentTrackId)) {
            likedArray.push(currentTrackId);
          }
        } else {
          likedArray = likedArray.filter(id => id !== currentTrackId);
        }
        
        localStorage.setItem('likedTracks', JSON.stringify(likedArray));
        
        window.dispatchEvent(new CustomEvent('trackLiked', {
          detail: { 
            trackId: currentTrackId, 
            liked: newLikedState,
            count: data.like_count || newLikesCount,
            fromTrackPage: true,
            user: user?.username,
            timestamp: Date.now()
          }
        }));
        
        window.dispatchEvent(new CustomEvent('trackLikedFromApp', {
          detail: { 
            trackId: currentTrackId, 
            liked: newLikedState,
            count: data.like_count || newLikesCount,
            fromTrackPage: true,
            timestamp: Date.now()
          }
        }));
        
        if (onToggleLike) {
          try {
            await onToggleLike(currentTrackId);
          } catch (error) {
            console.error('❌ Ошибка вызова onToggleLike:', error);
          }
        }
        
        if (newLikedState && user) {
          setUsersWhoLiked(prev => {
            const userAlreadyExists = prev.some(u => u.id === user.id || u.username === user.username);
            if (!userAlreadyExists) {
              return [
                {
                  id: user.id || 'current-user',
                  username: user.username,
                  avatar: user.avatar || '',
                  avatar_url: user.avatar_url || user.avatar || '',
                  name: user.name || user.username
                },
                ...prev
              ];
            }
            return prev;
          });
        } else if (!newLikedState && user) {
          setUsersWhoLiked(prev => 
            prev.filter(u => !(u.id === user.id || u.username === user.username))
          );
        }
        
      } else {
        setIsTrackLiked(currentIsLiked);
        setTrackLikesCount(currentLikes);
        
        if (track) {
          setTrack(prev => ({
            ...prev,
            stats: {
              ...prev.stats,
              likes: currentLikes
            }
          }));
        }
        
        if (data.error && data.error.includes('аутентификации')) {
          alert('Сессия истекла. Пожалуйста, войдите заново.');
          onLogout?.();
        } else {
          alert(data.error || 'Ошибка при сохранении лайка');
        }
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка лайка трека:', error);
      
      setIsTrackLiked(currentIsLiked);
      setTrackLikesCount(currentLikes);
      
      if (track) {
        setTrack(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            likes: currentLikes
          }
        }));
      }
      
      alert('Сетевая ошибка при сохранении лайка');
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleAddComment = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!newComment.trim() || isAddingComment) return;
    
    if (!authToken) {
      alert('Требуется войти в систему для комментирования');
      return;
    }
    
    setIsAddingComment(true);
    
    try {
      const response = await apiFetch(`/api/track/${currentTrackId}/add-comment/`, {
        method: 'POST',
        body: JSON.stringify({ text: newComment })
      });
      
      const data = await response.json();
      
      if (response.ok && data.comment) {
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        alert(`Ошибка при добавлении комментария: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка добавления комментария:', error);
      alert('Сетевая ошибка при отправке комментария');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const authToken = getAuthTokenForTrackPage();
    
    if (isDeletingComment || !authToken) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }
    
    setIsDeletingComment(true);
    
    try {
      const response = await apiFetch(`/api/comments/${commentId}/delete/`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
        
        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else if (response.status === 401) {
        alert('Требуется войти в систему для удаления комментариев');
      } else if (response.status === 404) {
        const data = await response.json();
        alert(data.message || 'Комментарий не найден или у вас нет прав на его удаление');
        await loadComments(currentTrackId);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Ошибка при удалении комментария: ${errorData.message || errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка удаления комментария:', error);
      alert('Сетевая ошибка при удалении комментария');
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    const authToken = getAuthTokenForTrackPage();
    
    try {
      if (!authToken) {
        alert('Войдите в систему, чтобы ставить лайки комментариям');
        return;
      }
      
      const isCurrentlyLiked = likedComments.has(commentId);
      const newLiked = !isCurrentlyLiked;
      
      const response = await apiFetch(`/api/comments/${commentId}/like/`, {
        method: 'POST',
        body: JSON.stringify({
          liked: newLiked
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const commentIndex = comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return;
        
        const updatedComments = [...comments];
        
        if (data.likes_count !== undefined) {
          updatedComments[commentIndex] = {
            ...updatedComments[commentIndex],
            likes: data.likes_count
          };
        } else {
          const currentLikes = updatedComments[commentIndex].likes || 0;
          const newLikesCount = newLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
          
          updatedComments[commentIndex] = {
            ...updatedComments[commentIndex],
            likes: newLikesCount
          };
        }
        
        setComments(updatedComments);
        setLikedComments(prev => {
          const newSet = new Set(prev);
          if (newLiked) {
            newSet.add(commentId);
          } else {
            newSet.delete(commentId);
          }
          return newSet;
        });
        
      } else {
        alert(data.error || 'Ошибка при сохранении лайка');
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка лайка комментария:', error);
      alert('Сетевая ошибка при сохранении лайка');
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleBarClick = useCallback((index) => {
    if (!duration || !waveformData.length || !onSeek) return;
    
    const percent = index / waveformData.length;
    const newTime = percent * duration;
    
    isSeekingRef.current = true;
    
    onSeek(newTime);
    
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 100);
  }, [duration, waveformData.length, onSeek, currentTime]);

  const progress = duration > 0 ? currentTime / duration : 0;
  
  const getPlayedBarsCount = useCallback(() => {
    if (!waveformData.length) return 0;
    
    if (progress >= 1) {
      return waveformData.length;
    }
    
    const playedBars = Math.floor(progress * waveformData.length);
    return Math.min(playedBars, waveformData.length);
  }, [progress, waveformData.length]);
  
  const playedBarsCount = getPlayedBarsCount();

  const primaryNav = [
    { label: 'Home', href: '#home' },
    { label: 'Feed', href: '#feed' },
    { label: 'Library', href: '#library' }
  ];

  const handleNavNavigate = (item, index) => {
    let page = 'home';
    if (item.label === 'Feed') {
      page = 'feed';
    } else if (item.label === 'Library') {
      page = 'library';
    }
    navigate(`/?page=${page}`);
  };

  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <GridScan
          className="background-gridscan"
          sensitivity={0.65}
          lineThickness={1}
          linesColor={gridLinesColor}
          gridScale={0.12}
          scanColor={gridScanColor}
          scanOpacity={0.45}
        />
        <div className="loading-content">
          <Shuffle
            text="Loading track..."
            shuffleDirection="right"
            duration={0.5}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={false}
            loop={true}
            style={{ 
              fontSize: '1.5rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#c084fc'
            }}
          />
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="track-not-found">
        <Shuffle
          text="Track not found"
          shuffleDirection="right"
          duration={0.5}
          animationMode="evenodd"
          shuffleTimes={2}
          ease="power3.out"
          stagger={0.02}
          threshold={0.1}
          triggerOnce={true}
          style={{ 
            fontSize: '2rem',
            fontFamily: "'Press Start 2P', sans-serif",
            color: '#ffffff'
          }}
        />
        <button onClick={() => navigate('/')}>
          <Shuffle
            text="Go home"
            shuffleDirection="left"
            duration={0.3}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power2.out"
            stagger={0.01}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            style={{ 
              fontSize: '1rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#8456ff'
            }}
          />
        </button>
      </div>
    );
  }

  const currentPlayCount = track?.stats?.plays || track?.play_count || 0;

  return (
    <div className="track-page" style={{ background: backgroundColor }}>
      {/* 🔥 ДИНАМИЧЕСКИЙ GRIDSCAN С ЦВЕТОМ ИЗ ОБЛОЖКИ */}
      <GridScan
        className="background-gridscan"
        sensitivity={0.65}
        lineThickness={1}
        linesColor={gridLinesColor}
        gridScale={0.12}
        scanColor={gridScanColor}
        scanOpacity={0.25}
      />

      <header className="site-header">
        <nav className="sound-nav">
          <div className="nav-left">
            <Link to="/" className="brand">
              <img src={logoMark} alt="Music platform logo" />
              <Shuffle
                text="MUSIC"
                shuffleDirection="right"
                duration={0.35}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.03}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                style={{ 
                  fontSize: '1.2rem',
                  marginLeft: '10px',
                  fontFamily: "'Press Start 2P', sans-serif"
                }}
              />
            </Link>
            
            <GooeyNav
              items={primaryNav}
              particleCount={12}
              particleDistances={[90, 20]}
              particleR={120}
              initialActiveIndex={0}
              activeIndex={0}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 4, 5, 6]}
              onNavigate={handleNavNavigate}
            />
          </div>

          <div className="nav-center" role="search">
            <div className="nav-search">
              <input 
                type="text" 
                placeholder="Search for tracks, artists, playlists, and more..." 
                aria-label="Search tracks" 
                className="nav-search-input"
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitTopSearch();
                }}
              />
              <button 
                type="button" 
                aria-label="Search" 
                className="nav-search-btn"
                onClick={submitTopSearch}
              >
                <IconSearch />
              </button>
            </div>
          </div>

          <div className="nav-right">
            <button 
              className="nav-pill" 
              type="button"
              onClick={goToStudio}
            >
              <Shuffle
                text="For Artists"
                shuffleDirection="right"
                duration={0.3}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power2.out"
                stagger={0.01}
                threshold={0.1}
                triggerOnce={false}
                triggerOnHover={true}
                style={{ 
                  fontSize: '0.9rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ffffff'
                }}
              />
            </button>
            
            <div className="icon-group">
              {actionIcons.map(({ label, Icon }) => (
                <button 
                  key={label} 
                  className="icon-button" 
                  type="button" 
                  aria-label={label}
                  onClick={() => {
                    if (label === 'Upload') {
                      navigate('/upload');
                      return;
                    }
                    if (label === 'Admin') {
                      navigate('/admin');
                      return;
                    }
                    if (label === 'Messages') {
                      navigate('/messagehub');
                      return;
                    }
                  }}
                >
                  <Icon />
                </button>
              ))}
            </div>
            
            <div className="user-avatar-container" ref={userMenuRef}>
              <button 
                className="user-avatar-btn"
                onClick={handleUserMenuToggle}
                aria-label="User menu"
              >
                <div className="user-avatar-circle">
                  {getAvatarUrl(user) && !isBackendDefaultImage(getAvatarUrl(user)) ? (
                    <img 
                      src={getAvatarUrl(user)} 
                      alt={user?.username || 'User'} 
                      className="user-avatar-image"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <IconUserCircle />
                  )}
                </div>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <FloatingLinesDropdown
                    linesGradient={['#ff00ff', '#ff00cc', '#8456ff', '#00ccff', '#ff00ff']}
                    enabledWaves={['top', 'middle', 'bottom']}
                    lineCount={[8, 15, 22]}
                    lineDistance={[1.5, 0.8, 0.3]}
                    animationSpeed={1.5}
                    interactive={true}
                    opacity={1.0}
                    brightness={2.8}
                    showOverlay={false}
                  />
                  
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {getAvatarUrl(user) && !isBackendDefaultImage(getAvatarUrl(user)) ? (
                        <img 
                          src={getAvatarUrl(user)} 
                          alt={user?.username || 'User'} 
                          className="user-dropdown-avatar-image"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <IconUserCircle />
                      )}
                    </div>
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-username">
                        <Shuffle
                          text={user?.username || 'User'}
                          shuffleDirection="right"
                          duration={0.4}
                          animationMode="evenodd"
                          shuffleTimes={1}
                          ease="power2.out"
                          stagger={0.01}
                          threshold={0.1}
                          triggerOnce={false}
                          triggerOnHover={true}
                          style={{ 
                            fontSize: '1rem',
                            fontFamily: "'Press Start 2P', sans-serif",
                            color: '#ffffff'
                          }}
                        />
                      </div>
                      <div className="user-dropdown-email">
                        <Shuffle
                          text={user?.email || 'user@example.com'}
                          shuffleDirection="left"
                          duration={0.3}
                          animationMode="random"
                          shuffleTimes={1}
                          ease="power2.out"
                          stagger={0.01}
                          threshold={0.1}
                          triggerOnce={false}
                          triggerOnHover={true}
                          style={{ 
                            fontSize: '0.8rem',
                            fontFamily: "'Press Start 2P', sans-serif",
                            color: '#94a3b8'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="user-dropdown-divider"></div>
                  
                  <div className="user-dropdown-items">
                    <button 
                      className="user-dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                    >
                      <IconProfile />
                      <Shuffle
                        text="Profile"
                        shuffleDirection="right"
                        duration={0.3}
                        animationMode="evenodd"
                        shuffleTimes={1}
                        ease="power2.out"
                        stagger={0.01}
                        threshold={0.1}
                        triggerOnce={false}
                        triggerOnHover={true}
                        style={{ 
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ffffff'
                        }}
                      />
                    </button>
                    
                    <button 
                      className="user-dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                    >
                      <IconDots />
                      <Shuffle
                        text="Settings"
                        shuffleDirection="left"
                        duration={0.3}
                        animationMode="evenodd"
                        shuffleTimes={1}
                        ease="power2.out"
                        stagger={0.01}
                        threshold={0.1}
                        triggerOnce={false}
                        triggerOnHover={true}
                        style={{ 
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ffffff'
                        }}
                      />
                    </button>
                    
                    <div className="user-dropdown-divider"></div>
                    
                    <button 
                      className="user-dropdown-item logout-item"
                      onClick={() => {
                        if (onLogout) {
                          onLogout();
                        }
                        setShowUserMenu(false);
                        navigate('/');
                      }}
                    >
                      <IconLogout />
                      <Shuffle
                        text="Log Out"
                        shuffleDirection="up"
                        duration={0.3}
                        animationMode="evenodd"
                        shuffleTimes={1}
                        ease="power2.out"
                        stagger={0.01}
                        threshold={0.1}
                        triggerOnce={false}
                        triggerOnHover={true}
                        style={{ 
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ff4757'
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="track-page-content">
        <div className="track-hero">
          <div className="track-title-wrapper">
            <div className="track-title-main">
              <Shuffle
                text={track.title}
                shuffleDirection="right"
                duration={0.8}
                animationMode="evenodd"
                shuffleTimes={2}
                ease="power4.out"
                stagger={0.05}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                style={{ 
                  fontSize: '3rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ffffff',
                  textTransform: 'uppercase'
                }}
              />
            </div>
            
            <div className="track-artist-main">
              <span
                className="track-author-link"
                onClick={() => navigate(`/profile/${track.uploaded_by?.id || track.artistId}`)}
                title={`Перейти в профиль ${track.artist}`}
                style={{ cursor: 'pointer', color: '#c084fc' }}
              >
                <Shuffle
                  text={track.artist}
                  shuffleDirection="left"
                  duration={0.6}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power3.out"
                  stagger={0.03}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  style={{ 
                    fontSize: '1.5rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#c084fc'
                  }}
                />
              </span>
            </div>
            
            {/* 🔥 КРАСИВЫЕ КЛИКАБЕЛЬНЫЕ ПИЛЮЛИ ДЛЯ ТЕГОВ */}
            <div className="track-hashtags">
              {(track.hashtags || [])
                .map(t => String(t || '').trim())
                .filter(Boolean)
                .slice(0, 12)
                .map((rawTag) => {
                  const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
                  const q = tag.replace(/^#/, '');

                  return (
                    <button
                      key={tag}
                      className="hashtag-pill"
                      type="button"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
                      title={`Искать по тегу ${tag}`}
                    >
                      {tag}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="track-hero-grid">
            <div className="track-hero-left">
              <div className="track-waveform-section">
                <div className="waveform-container-large">
                  <div className="waveform-inner">
                    {waveformData.map((height, index) => {
                      const isPlayed = index < playedBarsCount;
                      
                      return (
                        <div 
                          key={index}
                          className={`waveform-bar-large ${isPlayed ? 'played' : ''}`}
                          style={{
                            '--height': `${height}%`,
                            '--index': index
                          }}
                          onClick={() => handleBarClick(index)}
                        />
                      );
                    })}
                    
                    <div 
                      className="waveform-laser"
                      style={{ left: `${progress * 100}%` }}
                    />
                  </div>
                  
                  <div 
                    className="waveform-progress"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                
                <div className="waveform-controls">
                  <button 
                    className="play-button-large"
                    onClick={togglePlayPause}
                    disabled={isLoading}
                  >
                    {isCurrentTrackPlaying ? <IconPause /> : <IconPlay />}
                  </button>
                  
                  <div className="time-display">
                    <span className="current-time">
                      {formatTime(currentTime)}
                    </span>
                    <span className="time-separator">/</span>
                    <span className="total-duration">
                      {formatTime(duration)}
                    </span>
                  </div>
                  
                  <button 
                    className={`repeat-button ${repeatActive ? 'active' : ''}`}
                    onClick={handleToggleLoop}
                    title={repeatActive ? "Repeat: ON" : "Repeat: OFF"}
                  >
                    <IconRepeat />
                  </button>
                </div>
              </div>

              <div className="track-stats track-stats-hero">
                <div className="stat-item">
                  <IconHeart filled={isTrackLiked} />
                  <span>
                    {trackLikesCount.toLocaleString()} likes
                  </span>
                </div>
                <div className="stat-item">
                  <IconShare />
                  <span>
                    {track.stats.reposts.toLocaleString()} reposts
                  </span>
                </div>
                <div className="stat-item">
                  <IconPlay />
                  <span>
                    {currentPlayCount.toLocaleString()} plays
                  </span>
                </div>
              </div>

              <div className="track-actions-main">
                <button 
                  className={`action-button like-button ${isTrackLiked ? 'liked' : ''} ${loadingLikes ? 'loading' : ''}`}
                  onClick={handleTrackLike}
                  disabled={syncInProgress || loadingLikes}
                  title={!getAuthTokenForTrackPage() ? "Войдите в систему, чтобы ставить лайки" : ""}
                >
                  <IconHeart filled={isTrackLiked} />
                  <span>
                    {syncInProgress ? '...' : loadingLikes ? '...' : isTrackLiked ? 'Liked' : 'Like'}
                  </span>
                </button>
                
                <button
                  className={`action-button repost-button ${isReposted ? 'reposted' : ''}`}
                  onClick={isReposted ? handleUnrepost : handleRepost}
                  disabled={syncInProgress}
                  title={isReposted ? 'Отменить репост' : 'Репостнуть'}
                >
                  <IconShare />
                  <span>{isReposted ? 'Reposted' : 'Repost'}</span>
                </button>
                
                <button 
                  className="action-button"
                  onClick={togglePlayPause}
                  disabled={isLoading}
                >
                  {isCurrentTrackPlaying ? <IconPause /> : <IconPlay />}
                  <span>{isCurrentTrackPlaying ? 'Pause' : 'Play'}</span>
                </button>
                
                <button className="action-button">
                  <IconMore />
                  <span>More</span>
                </button>
              </div>
            </div>

            <div className="track-hero-right" style={{ marginTop: '-55px' }}>
              <div className="track-cover-large">
                <img src={track.cover} alt={track.title} />
              </div>
            </div>
          </div>
        </div>

        <div className="track-body">
          <div className="track-body-left">
            <div className="artist-info-section">
              <div className="track-artist">
                <div className="artist-avatar">
                  {authorAvatarUrl ? (
                    <img
                      src={authorAvatarUrl}
                      alt={track.uploaded_by?.username ?? 'author avatar'}
                      className="artist-avatar-img"
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <IconUser />
                  )}
                </div>

                <div className="artist-details">
                  <h4 className="track-author-link"
                      onClick={() =>
                        navigate(
                          `/profile/${track.uploaded_by?.id || track.artistId}`
                        )
                      }
                      title={`Перейти в профиль ${track.artist}`}
                      style={{
                        cursor: 'pointer',
                        color: '#c084fc',
                      }}
                  >
                    {track.uploaded_by?.name || track.artist}
                  </h4>

                  <div className="artist-stats">
                    <span>
                      {track.uploaded_by?.followers_count ||
                       track.uploaded_by?.followers ||
                       0}{' '}
                      followers
                    </span>
                    <span className="stat-separator">•</span>
                    <span>
                      {authorTracksCount} tracks
                    </span>
                  </div>
                </div>

                <div className="artist-actions">
                  <button
                    className={`follow-button ${
                      isFollowing ? 'following' : ''
                    } ${followLoading ? 'loading' : ''}`}
                    onClick={handleFollowToggle}
                    disabled={followLoading || !getAuthTokenForTrackPage()}
                    title={
                      !getAuthTokenForTrackPage()
                        ? 'Войдите в систему, чтобы подписаться'
                        : ''
                    }
                  >
                    {followLoading
                      ? '...'
                      : isFollowing
                      ? 'Following'
                      : 'Follow'}
                  </button>

                  <button
                    className={`repost-button ${
                      isReposted ? 'reposted' : ''
                    }`}
                    onClick={isReposted ? handleUnrepost : handleRepost}
                    disabled={syncInProgress}
                    title={isReposted ? 'Отменить репост' : 'Репостнуть'}
                  >
                    <IconShare />
                    <span>{isReposted ? 'Reposted' : 'Repost'}</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="comments-section">
              <h3>Comments ({comments.length})</h3>
              
              <div className="add-comment">
                <input
                  type="text"
                  placeholder={getAuthTokenForTrackPage() ? "Add a comment..." : "Войдите в систему, чтобы комментировать"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAddingComment && getAuthTokenForTrackPage() && handleAddComment()}
                  disabled={isAddingComment || !getAuthTokenForTrackPage()}
                />
                <button 
                  onClick={handleAddComment} 
                  disabled={isAddingComment || !newComment.trim() || !getAuthTokenForTrackPage()}
                  title={!getAuthTokenForTrackPage() ? "Войдите в систему, чтобы комментировать" : ""}
                >
                  {isAddingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
              
              <div className="comments-list">
                {comments.length === 0 ? (
                  <div className="no-comments">
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map(comment => {
                    const isCommentLiked = likedComments.has(comment.id);
                    const userId = comment.user?.id || comment.user_id;
                    const username = comment.user?.username || comment.username || 'Anonymous';
                    
                    return (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-user">
                          <div className="comment-avatar">
                            {comment.user?.avatar ? (
                              <img 
                                src={comment.user.avatar} 
                                alt={username}
                                className="track-author-link"
                                onClick={() => userId && navigate(`/profile/${userId}`)}
                                style={{ cursor: 'pointer' }}
                                title={`Перейти в профиль ${username}`}
                              />
                            ) : (
                              <IconUser />
                            )}
                          </div>
                          <div className="comment-info">
                            <div className="comment-header">
                              <span 
                                className="comment-username track-author-link"
                                onClick={() => userId && navigate(`/profile/${userId}`)}
                                title={`Перейти в профиль ${username}`}
                                style={{ cursor: 'pointer', color: '#ffffff' }}
                              >
                                {username}
                              </span>
                              <span className="comment-time">{comment.timestamp}</span>
                            </div>
                            <p className="comment-text">{comment.text}</p>
                            <div className="comment-actions">
                              <button 
                                className={`comment-like ${isCommentLiked ? 'liked' : ''}`}
                                onClick={() => handleLikeComment(comment.id)}
                                disabled={!getAuthTokenForTrackPage()}
                                title={!getAuthTokenForTrackPage() ? "Войдите в систему, чтобы лайкать комментарии" : ""}
                              >
                                <IconHeart filled={isCommentLiked} />
                                <span>{comment.likes || 0}</span>
                              </button>
                              {comment.is_mine && (
                                <button 
                                  className="comment-delete"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={isDeletingComment || !getAuthTokenForTrackPage()}
                                  title="Delete comment"
                                >
                                  <IconTrash />
                                  <span>{isDeletingComment ? 'Deleting...' : 'Delete'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="track-body-right">
            {/* 🔥 RELATED TRACKS - ТЕПЕРЬ С ТОЧНО ТАКОЙ ЖЕ РАЗМЕТКОЙ КАК MORE FROM */}
            <div className="related-section">
              <h3>Related Tracks</h3>

              {loadingRelated ? (
                <div className="related-empty">Loading…</div>
              ) : relatedTracks.length === 0 ? (
                <div className="related-empty">No related tracks yet</div>
              ) : (
                <div className="albums-grid morefrom-grid">
                  {relatedTracks.map((t) => {
                    const isThisCurrent = currentTrack === t.id;
                    const isThisPlaying = isThisCurrent && isPlaying;

                    const coverSrc =
                      t.cover ||
                      t.cover_url ||
                      t.coverUrl ||
                      'https://via.placeholder.com/220x220?text=No+Cover';

                    const artistName =
                      t.uploaded_by?.username ||
                      t.artist ||
                      'Unknown';

                    const artistId =
                      t.uploaded_by?.id ||
                      t.artistId ||
                      null;

                    const durationLabel =
                      t.duration ||
                      (t.duration_seconds ? `${Math.floor(t.duration_seconds / 60)}:${String(t.duration_seconds % 60).padStart(2, '0')}` : '0:00');

                    const playsLabel = Number(t.play_count ?? t.plays ?? 0).toLocaleString();

                    const commentsCount = t.comments_count ?? t.comment_count ?? 0;

                    // ✅ Like/Repost state — как в More From
                    const liked = isLikedGlobal?.(t.id) ?? false;
                    const reposted = isRepostedGlobal?.(t.id) ?? false;

                    const likeCount =
                      typeof getLikeCount === 'function'
                        ? (getLikeCount(t.id) ?? 0)
                        : (t.like_count ?? 0);

                    const repostCount =
                      typeof getRepostCount === 'function'
                        ? (getRepostCount(t.id) ?? 0)
                        : (t.repost_count ?? 0);

                    return (
                      <div
                        key={t.id}
                        className="morefrom-card"
                        onClick={() => navigate(`/track/${t.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="morefrom-cover">
                          <img src={coverSrc} alt={t.title} />

                          <button
                            className={`morefrom-play-button ${isThisPlaying ? 'playing' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();

                              // если это текущий трек — пауза/плей
                              if (isThisCurrent) {
                                onPlayPause?.();
                                return;
                              }

                              // иначе запускаем трек и переходим
                              if (onPlayTrack) onPlayTrack(t);
                              navigate(`/track/${t.id}`);
                            }}
                            aria-label={isThisPlaying ? 'Pause' : 'Play'}
                            title={isThisPlaying ? 'Pause' : 'Play'}
                          >
                            {isThisPlaying ? <IconPause /> : <IconPlay />}
                          </button>
                        </div>

                        <div className="morefrom-info">
                          <div className="morefrom-title">{t.title}</div>

                          <div
                            className="morefrom-artist track-author-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (artistId) navigate(`/profile/${artistId}`);
                            }}
                            title={`Перейти в профиль ${artistName}`}
                          >
                            {artistName}
                          </div>

                          <div className="morefrom-meta">
                            <span className="morefrom-meta-item">
                              <IconClockMini /> {durationLabel}
                            </span>
                            <span className="morefrom-meta-item">
                              <IconPlayCountMini /> {playsLabel}
                            </span>
                            <span className="morefrom-meta-item">
                              <IconCommentMini /> {Number(commentsCount).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="morefrom-actions">
                          <div className="morefrom-action-group">
                            <button
                              className={`morefrom-like-btn ${liked ? 'liked' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLikeGlobal(t.id);
                              }}
                              title={liked ? 'Unlike' : 'Like'}
                              aria-label={liked ? 'Unlike' : 'Like'}
                            >
                              <IconHeart filled={liked} />
                            </button>
                            <span className="morefrom-action-count">
                              {Number(likeCount).toLocaleString()}
                            </span>
                          </div>

                          <div className="morefrom-action-group">
                            <button
                              className={`morefrom-repost-btn ${reposted ? 'reposted' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRepostGlobal(t.id);
                              }}
                              title={reposted ? 'Unrepost' : 'Repost'}
                              aria-label={reposted ? 'Unrepost' : 'Repost'}
                            >
                              <IconRepost active={reposted} />
                            </button>
                            <span className="morefrom-action-count">
                              {Number(repostCount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 🔥 СЕКЦИЯ "IN PLAYLISTS" - ТЕПЕРЬ С РЕАЛЬНЫМИ ДАННЫМИ И КЛИКАБЕЛЬНЫМ АВТОРОМ */}
            <div className="inplaylists-section">
              <h3>In playlists</h3>

              {loadingInPlaylists ? (
                <div className="related-empty">Loading playlists…</div>
              ) : inPlaylists.length === 0 ? (
                <div className="related-empty">Not in playlists yet</div>
              ) : (
                <div className="inplaylists-list">
                  {inPlaylists.slice(0, 6).map((pl) => {
                    // Определяем обложку
                    const coverSrc = 
                      pl.cover_url || 
                      pl.cover || 
                      'https://via.placeholder.com/64x64?text=Playlist';

                    // Имя создателя
                    const creatorName = 
                      pl.created_by?.username || 
                      pl.owner?.username || 
                      'Unknown';

                    // ID создателя
                    const creatorId = pl.created_by?.id || pl.owner?.id;

                    // Количество треков
                    const tracksCount = 
                      pl.tracks_count || 
                      pl.items_count || 
                      pl.track_count || 
                      0;

                    return (
                      <div
                        key={pl.id}
                        className="inplaylists-card"
                        onClick={() => navigate(`/playlist/${pl.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <img
                          className="inplaylists-cover"
                          src={coverSrc}
                          alt={pl.title}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/64x64?text=Playlist';
                          }}
                        />
                        <div className="inplaylists-info">
                          <div className="inplaylists-title">{pl.title}</div>
                          <div
                            className="inplaylists-author"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (creatorId) navigate(`/profile/${creatorId}`);
                            }}
                          >
                            by {creatorName}
                          </div>
                          <div className="inplaylists-sub">
                            {tracksCount} {tracksCount === 1 ? 'track' : 'tracks'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Кнопка "View all" если плейлистов больше 6 */}
                  {inPlaylists.length > 6 && (
                    <button
                      className="view-all-playlists-btn"
                      onClick={() => navigate(`/track/${track.id}/playlists`)}
                    >
                      View all ({inPlaylists.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="users-section">
              <h3>Users who liked this track ({usersWhoLiked.length})</h3>
              {loadingUsers ? (
                <div className="loading-users">
                  <p>Loading users...</p>
                </div>
              ) : usersWhoLiked.length === 0 ? (
                <div className="no-users">
                  <p>No users have liked this track yet</p>
                </div>
              ) : (
                <div className="users-grid">
                  {usersWhoLiked.map(userItem => (
                    <div key={userItem.id || userItem.username} className="user-card">
                      <div className="user-avatar">
                        {(userItem.avatar_url || userItem.avatar) ? (
                          <img 
                            src={userItem.avatar_url || userItem.avatar} 
                            alt={userItem.username}
                            className="track-author-link"
                            onClick={() => navigate(`/profile/${userItem.id}`)}
                            style={{ cursor: 'pointer' }}
                            title={`Перейти в профиль ${userItem.username}`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentNode.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M12 14c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" fill="currentColor"/></svg>';
                            }}
                          />
                        ) : (
                          <IconUser />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="users-section">
              <h3>Users who reposted ({usersWhoReposted.length})</h3>
              {loadingUsers ? (
                <div className="loading-users">
                  <p>Loading users...</p>
                </div>
              ) : usersWhoReposted.length === 0 ? (
                <div className="no-users">
                  <p>No users have reposted this track yet</p>
                </div>
              ) : (
                <div className="users-grid">
                  {usersWhoReposted.map(userItem => (
                    <div key={userItem.id || userItem.username} className="user-card">
                      <div className="user-avatar">
                        {(userItem.avatar_url || userItem.avatar) ? (
                          <img 
                            src={userItem.avatar_url || userItem.avatar} 
                            alt={userItem.username}
                            className="track-author-link"
                            onClick={() => navigate(`/profile/${userItem.id}`)}
                            style={{ cursor: 'pointer' }}
                            title={`Перейти в профиль ${userItem.username}`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentNode.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M12 14c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" fill="currentColor"/></svg>';
                            }}
                          />
                        ) : (
                          <IconUser />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ РЕАЛЬНЫЙ БЛОК "MORE FROM" — КРАСИВЫЙ КАК В SIDEBAR */}
            <div className="albums-section">
              <div className="albums-header">
                <h3>More from {track.artist}</h3>

                <button
                  className="view-all-button"
                  type="button"
                  onClick={() => authorId && navigate(`/profile/${authorId}`)}
                  disabled={!authorId}
                  title="Открыть профиль автора и посмотреть все треки"
                >
                  View all{moreFromTotalCount ? ` (${moreFromTotalCount})` : ''}
                </button>
              </div>

              {loadingMoreFrom ? (
                <div className="loading-users"><p>Loading tracks...</p></div>
              ) : moreFromTracks.length === 0 ? (
                <div className="no-users"><p>No other tracks yet</p></div>
              ) : (
                <div className="albums-grid morefrom-grid">
                  {moreFromTracks.map((t) => {
                    const isThisCurrent = currentTrack === t.id;
                    const isThisPlaying = isThisCurrent && isPlaying;

                    const coverSrc = t.cover_url || t.cover || logoMark;
                    const artistName = t.uploaded_by?.username || t.artist || track.artist;
                    const artistId = t.uploaded_by?.id || t.artistId || track?.uploaded_by?.id;

                    const durationLabel = formatDurationCompact(t.duration_seconds ?? t.duration);
                    const playsLabel = formatPlaysNumber(t.play_count ?? t?.stats?.plays);
                    
                    // ✅ Состояния лайка/репоста из SocialContext
                    const liked = isLikedGlobal?.(t.id);
                    const reposted = isRepostedGlobal?.(t.id);
                    const repostCount = getRepostCount?.(t.id) || 0;
                    
                    // ✅ Like count как в Sidebar: если SocialContext уже знает — берём оттуда, иначе из трека
                    const likeCount = likeCounts?.[t.id] !== undefined
                      ? (getLikeCount?.(t.id) ?? 0)
                      : (t.like_count ?? 0);
                    
                    // ✅ Comments count (бэк отдаёт comments_count в CompactTrackSerializer)
                    const commentsCount = t.comments_count ?? t.comment_count ?? 0;

                    return (
                      <div
                        key={t.id}
                        className="morefrom-card"
                        onClick={() => navigate(`/track/${t.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="morefrom-cover">
                          <img src={coverSrc} alt={t.title} />

                          <button
                            className={`morefrom-play-button ${isThisPlaying ? 'playing' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();

                              // Если это текущий трек — просто пауза/плей
                              if (isThisCurrent) {
                                onPlayPause?.();
                                return;
                              }

                              // Иначе: запускаем трек (если есть playTrack) и переходим на его страницу
                              if (onPlayTrack) onPlayTrack(t);
                              navigate(`/track/${t.id}`);
                            }}
                            aria-label={isThisPlaying ? 'Pause' : 'Play'}
                            title={isThisPlaying ? 'Pause' : 'Play'}
                          >
                            {isThisPlaying ? <IconPause /> : <IconPlay />}
                          </button>
                        </div>

                        <div className="morefrom-info">
                          <div className="morefrom-title">{t.title}</div>

                          <div
                            className="morefrom-artist track-author-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (artistId) navigate(`/profile/${artistId}`);
                            }}
                            title={`Перейти в профиль ${artistName}`}
                          >
                            {artistName}
                          </div>

                          <div className="morefrom-meta">
                            <span className="morefrom-meta-item">
                              <IconClockMini /> {durationLabel}
                            </span>
                            <span className="morefrom-meta-item">
                              <IconPlayCountMini /> {playsLabel}
                            </span>
                            <span className="morefrom-meta-item">
                              <IconCommentMini /> {Number(commentsCount).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* ✅ Кнопки лайка/репоста как в Sidebar (кнопка + число) */}
                        <div className="morefrom-actions">
                          <div className="morefrom-action-group">
                            <button
                              className={`morefrom-like-btn ${liked ? 'liked' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLikeGlobal(t.id);
                              }}
                              title={liked ? 'Unlike' : 'Like'}
                              aria-label={liked ? 'Unlike' : 'Like'}
                            >
                              <IconHeart filled={liked} />
                            </button>
                            <span className="morefrom-action-count">
                              {Number(likeCount).toLocaleString()}
                            </span>
                          </div>

                          <div className="morefrom-action-group">
                            <button
                              className={`morefrom-repost-btn ${reposted ? 'reposted' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRepostGlobal(t.id);
                              }}
                              title={reposted ? 'Unrepost' : 'Repost'}
                              aria-label={reposted ? 'Unrepost' : 'Repost'}
                            >
                              <IconRepost active={reposted} />
                            </button>
                            <span className="morefrom-action-count">
                              {Number(repostCount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <GlassMusicPlayer 
        currentTrack={currentTrackId}
        isPlaying={isCurrentTrackPlaying}
        onPlayPause={togglePlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        isLiked={isTrackLiked}
        onToggleLike={handleTrackLike}
        volume={volume}
        onVolumeChange={onVolumeChange}
        onNext={onNext}
        onPrevious={onPrevious}
        loopEnabled={repeatActive}
        onToggleLoop={handleToggleLoop}
        isLoading={false}
        onTrackClick={(trackId) => navigate(`/track/${trackId}`)}
        trackInfo={track}
        getAuthToken={getAuthTokenForTrackPage}
        isReposted={isReposted}
        onToggleRepost={isReposted ? handleUnrepost : handleRepost}
        isFollowing={isFollowing}
        onToggleFollow={handleFollowToggle}
      />
    </div>
  );
};

export default TrackPage;