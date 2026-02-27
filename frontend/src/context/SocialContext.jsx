// frontend/src/context/SocialContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../api/apiFetch';

/* -------------------------------------------------
   Context & Hook
------------------------------------------------- */
const SocialContext = createContext();

export const useSocial = () => {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used within SocialProvider');
  return ctx;
};

/* -------------------------------------------------
   Provider
------------------------------------------------- */
export const SocialProvider = ({ children, getAuthToken, currentUser }) => {
  
  // -------------------------------------------------
  // 🔥 КЛЮЧИ ДЛЯ ХРАНЕНИЯ В LOCALSTORAGE
  // -------------------------------------------------
  const likedStorageKey = currentUser?.id 
    ? `likedTrackIds:${currentUser.id}` 
    : 'likedTrackIds:guest';
  
  const playlistLikedStorageKey = currentUser?.id
    ? `likedPlaylistIds:${currentUser.id}`
    : 'likedPlaylistIds:guest';

  const playlistRepostedStorageKey = currentUser?.id
    ? `repostedPlaylistIds:${currentUser.id}`
    : 'repostedPlaylistIds:guest';
  
  /* -------------------------------------------------
     Хелпер для чтения из localStorage
  ------------------------------------------------- */
  const readBoolMapFromStorage = (key) => {
    try {
      const ids = JSON.parse(localStorage.getItem(key) || '[]');
      const map = {};
      (Array.isArray(ids) ? ids : []).forEach(id => { map[Number(id)] = true; });
      return map;
    } catch {
      return {};
    }
  };
  
  /* -------------------------------------------------
     Состояния
  ------------------------------------------------- */
  const [likedTrackIds, setLikedTrackIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(likedStorageKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (_) {
      return [];
    }
  });

  const [likes, setLikes] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [tracksById, setTracksById] = useState({});
  
  const [follows, setFollows] = useState({});
  const [followerCounts, setFollowerCounts] = useState({});
  
  const [followingCounts, setFollowingCounts] = useState({});
  
  const [reposts, setReposts] = useState({});
  const [repostCounts, setRepostCounts] = useState({});
  const [repostsLoaded, setRepostsLoaded] = useState(false);

  const [playlistLikes, setPlaylistLikes] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem(playlistLikedStorageKey) || '[]');
      const map = {};
      (Array.isArray(ids) ? ids : []).forEach(id => { map[Number(id)] = true; });
      return map;
    } catch { 
      return {}; 
    }
  });
  
  const [playlistLikeCounts, setPlaylistLikeCounts] = useState({});
  
  const [playlistReposts, setPlaylistReposts] = useState(() => {
    return readBoolMapFromStorage(playlistRepostedStorageKey);
  });

  const [playlistRepostCounts, setPlaylistRepostCounts] = useState({});

  const [followsLoaded, setFollowsLoaded] = useState(false);
  const followLoadingRef = useRef(false);

  /* -------------------------------------------------
     🔥 ЭФФЕКТ: Подхват репостов из localStorage при смене ключа
  ------------------------------------------------- */
  useEffect(() => {
    // Когда currentUser прогрузился и ключ поменялся — подтяни репосты из localStorage
    const map = readBoolMapFromStorage(playlistRepostedStorageKey);
    setPlaylistReposts(map);
    console.log('🔄 SocialContext: репосты плейлистов загружены из localStorage', Object.keys(map).length);
  }, [playlistRepostedStorageKey]);
  
  /* -------------------------------------------------
     Загрузка лайкнутых треков
  ------------------------------------------------- */
  const loadLikedTracks = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const resp = await apiFetch('/api/liked-tracks/');
      if (!resp.ok) throw new Error(`liked-tracks error ${resp.status}`);

      const data = await resp.json();
      const ids = [];
      const likesMap = {};
      const countsMap = {};
      const tracksMap = {};

      data.tracks?.forEach(t => {
        ids.push(t.id);
        likesMap[t.id] = true;
        countsMap[t.id] = t.like_count ?? 0;
        tracksMap[t.id] = t;
      });

      setLikedTrackIds(ids);
      setLikes(likesMap);
      setLikeCounts(prev => ({ ...prev, ...countsMap }));
      setTracksById(prev => ({ ...prev, ...tracksMap }));

      localStorage.setItem(likedStorageKey, JSON.stringify(ids));
      
      try { localStorage.removeItem('likedTrackIds'); } catch (_) {}
      
    } catch (e) {
      console.error('❌ SocialContext: ошибка загрузки liked tracks', e);
    }
  }, [getAuthToken, likedStorageKey]);

  /* -------------------------------------------------
     Загрузка репостов текущего пользователя (треки)
  ------------------------------------------------- */
  const loadMyReposts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      console.warn('SocialContext: нет токена → не загружаем репосты');
      return;
    }

    if (!currentUser?.id) {
      console.warn('SocialContext: нет currentUser.id, ждём...');
      return;
    }

    console.log('🔄 SocialContext: загрузка репостов треков для пользователя', currentUser.id);

    try {
      const resp = await apiFetch(`/api/users/${currentUser.id}/reposts/`);
      
      if (!resp.ok) {
        console.warn(`⚠️ SocialContext: не удалось загрузить репосты (${resp.status})`);
        return;
      }

      const data = await resp.json();
      
      const repostMap = {};
      const countsMap = {};
      const tracksMap = {};

      (data.reposts || []).forEach(t => {
        repostMap[t.id] = true;
        countsMap[t.id] = t.repost_count ?? 0;
        tracksMap[t.id] = t;
      });

      setReposts(repostMap);
      setRepostCounts(prev => ({ ...prev, ...countsMap }));
      setTracksById(prev => ({ ...prev, ...tracksMap }));
      setRepostsLoaded(true);

      console.log(`✅ SocialContext: загружено ${Object.keys(repostMap).length} репостов треков`);
      
    } catch (error) {
      console.error('❌ SocialContext: ошибка загрузки репостов:', error);
    }
  }, [getAuthToken, currentUser?.id]);

  /* -------------------------------------------------
     Загрузка лайкнутых плейлистов
  ------------------------------------------------- */
  const loadMyPlaylistLikes = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !currentUser?.id) return;

    try {
      const resp = await apiFetch(`/api/users/${currentUser.id}/liked-playlists/`);
      if (!resp.ok) {
        console.warn(`⚠️ SocialContext: не удалось загрузить лайки плейлистов (${resp.status})`);
        return;
      }

      const data = await resp.json();
      const likesMap = {};
      const countsMap = {};

      data.playlists?.forEach(p => {
        likesMap[p.id] = true;
        countsMap[p.id] = p.likes_count ?? 0;
      });

      setPlaylistLikes(prev => {
        const next = { ...prev, ...likesMap };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      
      setPlaylistLikeCounts(prev => ({ ...prev, ...countsMap }));

      console.log(`✅ SocialContext: загружено ${Object.keys(likesMap).length} лайков плейлистов`);
      
    } catch (e) {
      console.error('❌ SocialContext: ошибка загрузки liked playlists', e);
    }
  }, [getAuthToken, currentUser?.id, playlistLikedStorageKey]);

  /* -------------------------------------------------
     Загрузка репостнутых плейлистов
  ------------------------------------------------- */
  const loadMyPlaylistReposts = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !currentUser?.id) return;

    try {
      const resp = await apiFetch(`/api/users/${currentUser.id}/reposted-playlists/`);
      if (!resp.ok) {
        console.warn(`⚠️ SocialContext: не удалось загрузить репосты плейлистов (${resp.status})`);
        return;
      }

      const data = await resp.json();
      const repostsMap = {};
      const countsMap = {};

      data.playlists?.forEach(p => {
        repostsMap[p.id] = true;
        countsMap[p.id] = p.reposts_count ?? 0;
      });

      setPlaylistReposts(prev => {
        const next = { ...prev, ...repostsMap };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      
      setPlaylistRepostCounts(prev => ({ ...prev, ...countsMap }));

      console.log(`✅ SocialContext: загружено ${Object.keys(repostsMap).length} репостов плейлистов`);
      
    } catch (e) {
      console.error('❌ SocialContext: ошибка загрузки reposted playlists', e);
    }
  }, [getAuthToken, currentUser?.id, playlistRepostedStorageKey]);

  /* -------------------------------------------------
     Загрузка follow-статусов
  ------------------------------------------------- */
  const loadMyFollowing = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      console.warn('SocialContext: нет токена → не загружаем following');
      return;
    }

    if (!currentUser?.id) {
      console.warn('SocialContext: нет currentUser.id, ждём...');
      return;
    }

    if (followLoadingRef.current) {
      console.log('SocialContext: загрузка following уже в процессе');
      return;
    }

    followLoadingRef.current = true;
    
    console.log('🔄 SocialContext: загрузка following для пользователя', currentUser.id);

    try {
      const resp = await apiFetch(`/api/users/${currentUser.id}/following/`);
      
      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`⚠️ SocialContext: не удалось загрузить following (${resp.status}):`, err);
        return;
      }

      const data = await resp.json();
      
      const extractFollowingId = (item) => {
        if (!item) return null;
        if (item.id && typeof item.id === 'number') return item.id;
        if (item.id && typeof item.id === 'string') return parseInt(item.id);
        if (item.following) {
          if (typeof item.following === 'number') return item.following;
          if (typeof item.following === 'string') return parseInt(item.following);
          if (item.following?.id) {
            const id = item.following.id;
            return typeof id === 'number' ? id : parseInt(id);
          }
        }
        if (item.following_id) {
          return typeof item.following_id === 'number' ? item.following_id : parseInt(item.following_id);
        }
        if (item.user_id) {
          return typeof item.user_id === 'number' ? item.user_id : parseInt(item.user_id);
        }
        return null;
      };

      const normalizeArray = (payload) => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.results)) return payload.results;
        if (Array.isArray(payload?.following)) return payload.following;
        if (Array.isArray(payload?.users)) return payload.users;
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
      };

      const followingList = normalizeArray(data);
      
      const followMap = {};
      const followersMap = {};
      const followingMap = {};

      followingList.forEach(item => {
        const userId = extractFollowingId(item);
        if (!userId) return;
        
        const userIdNum = Number(userId);
        if (isNaN(userIdNum)) return;
        
        followMap[userIdNum] = true;
        
        if (item.followers_count !== undefined) {
          followersMap[userIdNum] = item.followers_count;
        } else if (item.follower_count !== undefined) {
          followersMap[userIdNum] = item.follower_count;
        } else if (item.followers !== undefined) {
          followersMap[userIdNum] = item.followers;
        } else if (item.following?.follower_count !== undefined) {
          followersMap[userIdNum] = item.following.follower_count;
        }
        
        if (item.following_count !== undefined) {
          followingMap[userIdNum] = item.following_count;
        } else if (item.follows_count !== undefined) {
          followingMap[userIdNum] = item.follows_count;
        } else if (item.following?.following_count !== undefined) {
          followingMap[userIdNum] = item.following.following_count;
        }
      });

      setFollows(followMap);
      setFollowerCounts(prev => ({ ...prev, ...followersMap }));
      setFollowingCounts(prev => ({ ...prev, ...followingMap }));
      setFollowsLoaded(true);

      console.log(`✅ SocialContext: загружено ${Object.keys(followMap).length} follow статусов`);

    } catch (error) {
      console.error('❌ SocialContext: ошибка загрузки following:', error);
    } finally {
      followLoadingRef.current = false;
    }
  }, [getAuthToken, currentUser?.id]);

  /* -------------------------------------------------
     Загрузка собственных статистик подписок
  ------------------------------------------------- */
  const loadSelfFollowStats = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const resp = await apiFetch(`/api/users/${currentUser.id}/follow-stats/`);

      if (!resp.ok) return;

      const data = await resp.json();
      const followers = data?.stats?.followers ?? 0;
      const following = data?.stats?.following ?? 0;

      setFollowerCounts(prev => ({ ...prev, [Number(currentUser.id)]: followers }));
      setFollowingCounts(prev => ({ ...prev, [Number(currentUser.id)]: following }));
    } catch (e) {
      console.warn('SocialContext: loadSelfFollowStats error', e);
    }
  }, [currentUser?.id]);

  /* -------------------------------------------------
     Эффект сброса при смене пользователя
  ------------------------------------------------- */
  useEffect(() => {
    console.log('🔄 SocialContext: смена пользователя, полный сброс кэша', currentUser?.id);
    
    try { localStorage.removeItem('likedTrackIds'); } catch (_) {}

    setLikedTrackIds([]);
    setLikes({});
    setLikeCounts({});
    setTracksById({});
    setFollows({});
    setFollowerCounts({});
    setFollowingCounts({});
    setReposts({});
    setRepostCounts({});
    setPlaylistLikes({});
    setPlaylistLikeCounts({});
    // 🔥 ИСПРАВЛЕНО: загружаем репосты из localStorage при смене пользователя
    setPlaylistReposts(readBoolMapFromStorage(playlistRepostedStorageKey));
    setPlaylistRepostCounts({});
    setFollowsLoaded(false);
    setRepostsLoaded(false);
    
    followLoadingRef.current = false;
    
    const token = getAuthToken();
    if (token && currentUser?.id) {
      console.log('📦 SocialContext: загружаем данные для нового пользователя');
      loadLikedTracks();
      loadMyFollowing();
      loadMyReposts();
      loadMyPlaylistLikes();
      loadMyPlaylistReposts();
      loadSelfFollowStats();
    }
    
  }, [currentUser?.id]);

  /* -------------------------------------------------
     Эффект загрузки при наличии токена
  ------------------------------------------------- */
  useEffect(() => {
    const token = getAuthToken();
    if (token && currentUser?.id) {
      if (likedTrackIds.length === 0) {
        loadLikedTracks();
      }
      if (!followsLoaded) {
        loadMyFollowing();
      }
      if (!repostsLoaded) {
        loadMyReposts();
      }
      if (Object.keys(playlistLikes).length === 0) {
        loadMyPlaylistLikes();
      }
      if (Object.keys(playlistReposts).length === 0) {
        loadMyPlaylistReposts();
      }
      loadSelfFollowStats();
    }
  }, [getAuthToken, currentUser?.id, likedTrackIds.length, followsLoaded, repostsLoaded, 
      playlistLikes, playlistReposts, loadLikedTracks, loadMyFollowing, loadMyReposts,
      loadMyPlaylistLikes, loadMyPlaylistReposts, loadSelfFollowStats]);

  /* -------------------------------------------------
     Подписка на события
  ------------------------------------------------- */
  useEffect(() => {
    const onLiked = (e) => {
      const trackId = e?.detail?.trackId;
      const playlistId = e?.detail?.playlistId;
      const type = e?.detail?.type;
      const liked = e?.detail?.liked ?? e?.detail?.isLiked;
      const count = e?.detail?.count ?? e?.detail?.likeCount;

      if (type === 'track' && trackId) {
        setLikes(prev => ({ ...prev, [trackId]: liked }));
        setLikeCounts(prev => ({ ...prev, [trackId]: count }));
        
        setLikedTrackIds(prev => {
          const newIds = liked 
            ? (prev.includes(trackId) ? prev : [...prev, trackId])
            : prev.filter(id => id !== trackId);
          localStorage.setItem(likedStorageKey, JSON.stringify(newIds));
          return newIds;
        });
      }
      
      if (type === 'playlist' && playlistId) {
        setPlaylistLikes(prev => {
          const next = { ...prev, [playlistId]: liked };
          try {
            const ids = Object.keys(next).filter(k => next[k]).map(Number);
            localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
          } catch (e) {}
          return next;
        });
        if (count !== undefined) {
          setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: count }));
        }
      }
    };

    const onReposted = (e) => {
      const trackId = e?.detail?.trackId;
      const playlistId = e?.detail?.playlistId;
      const type = e?.detail?.type;
      const reposted = e?.detail?.reposted ?? e?.detail?.isReposted;
      const count = e?.detail?.count ?? e?.detail?.repostCount;

      if (type === 'track' && trackId) {
        setReposts(prev => ({ ...prev, [trackId]: reposted }));
        if (count !== undefined) {
          setRepostCounts(prev => ({ ...prev, [trackId]: count }));
        }
        
        if (currentUser?.id) {
          setTimeout(() => loadMyReposts(), 300);
        }
      }
      
      if (type === 'playlist' && playlistId) {
        setPlaylistReposts(prev => {
          const next = { ...prev, [playlistId]: reposted };
          try {
            const ids = Object.keys(next).filter(k => next[k]).map(Number);
            localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
          } catch (e) {}
          return next;
        });
        if (count !== undefined) {
          setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: count }));
        }
      }
    };

    const handleTrackLiked = (e) => {
      const { trackId, liked, count } = e.detail || {};
      if (trackId === undefined) return;

      setLikes(prev => ({ ...prev, [trackId]: liked }));
      setLikedTrackIds(prev => {
        const newIds = liked 
          ? (prev.includes(trackId) ? prev : [...prev, trackId])
          : prev.filter(id => id !== trackId);
        localStorage.setItem(likedStorageKey, JSON.stringify(newIds));
        return newIds;
      });
      if (count !== undefined) setLikeCounts(prev => ({ ...prev, [trackId]: count }));
    };

    const handleTrackReposted = (e) => {
      const { trackId, isReposted, repostCount } = e.detail || {};
      if (trackId === undefined) return;
      setReposts(prev => ({ ...prev, [trackId]: isReposted }));
      if (repostCount !== undefined) setRepostCounts(prev => ({ ...prev, [trackId]: repostCount }));
      
      if (currentUser?.id) {
        setTimeout(() => loadMyReposts(), 300);
      }
    };

    const handlePlaylistLiked = (e) => {
      const { playlistId, isLiked, likeCount } = e.detail || {};
      if (playlistId === undefined) return;
      
      setPlaylistLikes(prev => {
        const next = { ...prev, [playlistId]: isLiked };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      if (likeCount !== undefined) {
        setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: likeCount }));
      }
    };

    const handlePlaylistReposted = (e) => {
      const { playlistId, isReposted, repostCount } = e.detail || {};
      if (playlistId === undefined) return;
      
      setPlaylistReposts(prev => {
        const next = { ...prev, [playlistId]: isReposted };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      if (repostCount !== undefined) {
        setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: repostCount }));
      }
    };

    const handleFollowStatusChanged = (e) => {
      const { targetUserId, isFollowing } = e.detail || {};
      if (targetUserId === undefined) return;
      const userIdNum = Number(targetUserId);
      setFollows(prev => ({ ...prev, [userIdNum]: isFollowing }));
      
      if (currentUser?.id) {
        setTimeout(() => loadMyFollowing(), 300);
      }
    };

    window.addEventListener('liked', onLiked);
    window.addEventListener('reposted', onReposted);
    window.addEventListener('trackLikedFromApp', handleTrackLiked);
    window.addEventListener('trackReposted', handleTrackReposted);
    window.addEventListener('playlistLiked', handlePlaylistLiked);
    window.addEventListener('playlistReposted', handlePlaylistReposted);
    window.addEventListener('followStatusChanged', handleFollowStatusChanged);

    return () => {
      window.removeEventListener('liked', onLiked);
      window.removeEventListener('reposted', onReposted);
      window.removeEventListener('trackLikedFromApp', handleTrackLiked);
      window.removeEventListener('trackReposted', handleTrackReposted);
      window.removeEventListener('playlistLiked', handlePlaylistLiked);
      window.removeEventListener('playlistReposted', handlePlaylistReposted);
      window.removeEventListener('followStatusChanged', handleFollowStatusChanged);
    };
  }, [likedStorageKey, playlistLikedStorageKey, playlistRepostedStorageKey, currentUser?.id, loadMyReposts, loadMyFollowing]);

  /* -------------------------------------------------
     Функции для обновления
  ------------------------------------------------- */
  const updateTrackLike = useCallback((trackId, liked, count) => {
    setLikes(prev => ({ ...prev, [trackId]: liked }));
    setLikeCounts(prev => ({ ...prev, [trackId]: count }));
    
    setLikedTrackIds(prev => {
      const newIds = liked 
        ? (prev.includes(trackId) ? prev : [...prev, trackId])
        : prev.filter(id => id !== trackId);
      localStorage.setItem(likedStorageKey, JSON.stringify(newIds));
      return newIds;
    });
  }, [likedStorageKey]);

  const updateTrackRepost = useCallback((trackId, reposted, count) => {
    setReposts(prev => ({ ...prev, [trackId]: reposted }));
    if (count !== undefined) {
      setRepostCounts(prev => ({ ...prev, [trackId]: count }));
    }
    
    if (currentUser?.id) {
      setTimeout(() => loadMyReposts(), 300);
    }
  }, [currentUser?.id, loadMyReposts]);

  const updatePlaylistLike = useCallback((playlistId, liked, count) => {
    setPlaylistLikes(prev => {
      const next = { ...prev, [playlistId]: liked };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
      } catch (e) {}
      return next;
    });
    if (count !== undefined) {
      setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: count }));
    }
  }, [playlistLikedStorageKey]);

  const updatePlaylistRepost = useCallback((playlistId, reposted, count) => {
    setPlaylistReposts(prev => {
      const next = { ...prev, [playlistId]: reposted };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
      } catch (e) {}
      return next;
    });
    if (count !== undefined) {
      setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: count }));
    }
  }, [playlistRepostedStorageKey]);

  /* -------------------------------------------------
     Функции для работы с лайками плейлистов
  ------------------------------------------------- */
  const togglePlaylistLike = useCallback(async (playlistId) => {
    const token = getAuthToken();
    if (!token) {
      alert('Требуется авторизация');
      return false;
    }

    const currentlyLiked = playlistLikes[playlistId] ?? false;
    const newLiked = !currentlyLiked;

    setPlaylistLikes(prev => {
      const next = { ...prev, [playlistId]: newLiked };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
      } catch (e) {}
      return next;
    });
    
    const currentCount = playlistLikeCounts[playlistId] ?? 0;
    const optimisticCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
    setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: optimisticCount }));

    try {
      const resp = await apiFetch(`/api/playlists/${playlistId}/toggle-like/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error('❌ SocialContext: ошибка лайка плейлиста', data?.error);
        setPlaylistLikes(prev => {
          const next = { ...prev, [playlistId]: currentlyLiked };
          try {
            const ids = Object.keys(next).filter(k => next[k]).map(Number);
            localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
          } catch (e) {}
          return next;
        });
        setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: currentCount }));
        return false;
      }

      if (data.likes_count !== undefined) {
        setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: data.likes_count }));
      }

      window.dispatchEvent(
        new CustomEvent('liked', {
          detail: { 
            type: 'playlist',
            playlistId, 
            liked: newLiked, 
            count: data.likes_count ?? optimisticCount 
          },
        })
      );

      window.dispatchEvent(
        new CustomEvent('playlistLiked', {
          detail: { 
            playlistId, 
            isLiked: newLiked, 
            likeCount: data.likes_count ?? optimisticCount 
          },
        })
      );

      return true;
    } catch (error) {
      console.error('❌ SocialContext: сетевая ошибка togglePlaylistLike', error);
      setPlaylistLikes(prev => {
        const next = { ...prev, [playlistId]: currentlyLiked };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: currentCount }));
      return false;
    }
  }, [playlistLikes, playlistLikeCounts, getAuthToken, playlistLikedStorageKey]);

  /* -------------------------------------------------
     Функции для работы с репостами плейлистов
  ------------------------------------------------- */
  const togglePlaylistRepost = useCallback(async (playlistId) => {
    const token = getAuthToken();
    if (!token) {
      alert('Требуется авторизация');
      return false;
    }

    const currentlyReposted = playlistReposts[playlistId] ?? false;
    const newReposted = !currentlyReposted;

    setPlaylistReposts(prev => {
      const next = { ...prev, [playlistId]: newReposted };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
      } catch (e) {
        console.warn("Failed to save playlist reposts to localStorage", e);
      }
      return next;
    });
    
    const currentCount = playlistRepostCounts[playlistId] ?? 0;
    const optimisticCount = newReposted ? currentCount + 1 : Math.max(0, currentCount - 1);
    setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: optimisticCount }));

    try {
      const resp = await apiFetch(`/api/playlists/${playlistId}/toggle-repost/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error('❌ SocialContext: ошибка репоста плейлиста', data?.error);
        setPlaylistReposts(prev => {
          const next = { ...prev, [playlistId]: currentlyReposted };
          try {
            const ids = Object.keys(next).filter(k => next[k]).map(Number);
            localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
          } catch (e) {}
          return next;
        });
        setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: currentCount }));
        return false;
      }

      if (data.reposts_count !== undefined) {
        setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: data.reposts_count }));
      }

      window.dispatchEvent(
        new CustomEvent('reposted', {
          detail: { 
            type: 'playlist',
            playlistId, 
            reposted: newReposted, 
            count: data.reposts_count ?? optimisticCount 
          },
        })
      );

      window.dispatchEvent(
        new CustomEvent('playlistReposted', {
          detail: { 
            playlistId, 
            isReposted: newReposted, 
            repostCount: data.reposts_count ?? optimisticCount 
          },
        })
      );

      return true;
    } catch (error) {
      console.error('❌ SocialContext: сетевая ошибка togglePlaylistRepost', error);
      setPlaylistReposts(prev => {
        const next = { ...prev, [playlistId]: currentlyReposted };
        try {
          const ids = Object.keys(next).filter(k => next[k]).map(Number);
          localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
        } catch (e) {}
        return next;
      });
      setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: currentCount }));
      return false;
    }
  }, [playlistReposts, playlistRepostCounts, getAuthToken, playlistRepostedStorageKey]);

  /* -------------------------------------------------
     Функции для работы с треками
  ------------------------------------------------- */
  const toggleLike = useCallback(async (trackId, liked = null) => {
    const token = getAuthToken();
    if (!token) {
      alert('Требуется авторизация');
      return false;
    }

    const currentlyLiked = likes[trackId] ?? false;
    const newLiked = liked !== null ? liked : !currentlyLiked;

    setLikes(prev => ({ ...prev, [trackId]: newLiked }));
    setLikedTrackIds(prev => {
      const newIds = newLiked 
        ? (prev.includes(trackId) ? prev : [...prev, trackId])
        : prev.filter(id => id !== trackId);
      localStorage.setItem(likedStorageKey, JSON.stringify(newIds));
      return newIds;
    });

    const currentCount = likeCounts[trackId] ?? 0;
    const optimisticCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
    setLikeCounts(prev => ({ ...prev, [trackId]: optimisticCount }));

    try {
      const resp = await apiFetch('/api/like/toggle/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId, liked: newLiked }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setLikes(prev => ({ ...prev, [trackId]: currentlyLiked }));
        setLikedTrackIds(prev => {
          const rolledBackIds = currentlyLiked 
            ? (prev.includes(trackId) ? prev : [...prev, trackId])
            : prev.filter(id => id !== trackId);
          localStorage.setItem(likedStorageKey, JSON.stringify(rolledBackIds));
          return rolledBackIds;
        });
        setLikeCounts(prev => ({ ...prev, [trackId]: currentCount }));
        console.error('SocialContext: ошибка toggleLike', data?.error);
        return false;
      }

      if (data.like_count !== undefined) {
        setLikeCounts(prev => ({ ...prev, [trackId]: data.like_count }));
      }

      window.dispatchEvent(
        new CustomEvent('liked', {
          detail: { 
            type: 'track',
            trackId, 
            liked: newLiked, 
            count: data.like_count ?? optimisticCount 
          },
        })
      );

      window.dispatchEvent(
        new CustomEvent('trackLikedFromApp', {
          detail: { trackId, liked: newLiked, count: data.like_count ?? optimisticCount },
        })
      );

      return true;
    } catch (error) {
      console.error('SocialContext: ошибка сети toggleLike', error);
      setLikes(prev => ({ ...prev, [trackId]: currentlyLiked }));
      setLikedTrackIds(prev => {
        const rolledBackIds = currentlyLiked 
          ? (prev.includes(trackId) ? prev : [...prev, trackId])
          : prev.filter(id => id !== trackId);
        localStorage.setItem(likedStorageKey, JSON.stringify(rolledBackIds));
        return rolledBackIds;
      });
      setLikeCounts(prev => ({ ...prev, [trackId]: currentCount }));
      return false;
    }
  }, [likes, likeCounts, getAuthToken, likedStorageKey]);

  const toggleRepost = useCallback(async (trackId, isReposted = null) => {
    const token = getAuthToken();
    if (!token) {
      alert('Требуется авторизация');
      return false;
    }

    const currentlyReposted = reposts[trackId] ?? false;
    const newReposted = isReposted !== null ? isReposted : !currentlyReposted;

    setReposts(prev => ({ ...prev, [trackId]: newReposted }));
    const currentCount = repostCounts[trackId] ?? 0;
    const optimisticCount = newReposted ? currentCount + 1 : Math.max(0, currentCount - 1);
    setRepostCounts(prev => ({ ...prev, [trackId]: optimisticCount }));

    try {
      const method = newReposted ? 'POST' : 'DELETE';
      const resp = await apiFetch('/api/repost/', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId }),
      });
      
      const data = await resp.json();

      if (!resp.ok) {
        const errorText = data?.error?.toLowerCase() || '';
        const isAlreadyReposted = 
          errorText.includes('уже репостнули') || 
          errorText.includes('already reposted') ||
          errorText.includes('already exists') ||
          (resp.status === 400 && method === 'POST');
        
        if (isAlreadyReposted) {
          console.log('ℹ️ SocialContext: уже репостнуто → синхронизируем');
          setReposts(prev => ({ ...prev, [trackId]: true }));
          setRepostCounts(prev => ({ ...prev, [trackId]: data.repost_count ?? currentCount }));
          
          window.dispatchEvent(
            new CustomEvent('reposted', {
              detail: { 
                type: 'track',
                trackId, 
                reposted: true, 
                count: data.repost_count ?? currentCount 
              },
            })
          );
          
          window.dispatchEvent(
            new CustomEvent('trackReposted', {
              detail: { trackId, isReposted: true, repostCount: data.repost_count ?? currentCount },
            })
          );
          
          if (currentUser?.id) {
            setTimeout(() => loadMyReposts(), 300);
          }
          
          return true;
        }

        console.error('SocialContext: ошибка репоста', data?.error);
        setReposts(prev => ({ ...prev, [trackId]: currentlyReposted }));
        setRepostCounts(prev => ({ ...prev, [trackId]: currentCount }));
        return false;
      }

      if (data.repost_count !== undefined) {
        setRepostCounts(prev => ({ ...prev, [trackId]: data.repost_count }));
      }

      window.dispatchEvent(
        new CustomEvent('reposted', {
          detail: { 
            type: 'track',
            trackId, 
            reposted: newReposted, 
            count: data.repost_count ?? optimisticCount 
          },
        })
      );

      window.dispatchEvent(
        new CustomEvent('trackReposted', {
          detail: { trackId, isReposted: newReposted, repostCount: data.repost_count ?? optimisticCount },
        })
      );

      if (currentUser?.id) {
        setTimeout(() => loadMyReposts(), 300);
      }

      return true;
    } catch (error) {
      console.error('SocialContext: ошибка сети toggleRepost', error);
      setReposts(prev => ({ ...prev, [trackId]: currentlyReposted }));
      setRepostCounts(prev => ({ ...prev, [trackId]: currentCount }));
      return false;
    }
  }, [reposts, repostCounts, getAuthToken, currentUser?.id, loadMyReposts]);

  const toggleFollow = useCallback(async (userId, isFollowing = null) => {
    const token = getAuthToken();
    if (!token) {
      alert('Требуется авторизация');
      return false;
    }

    const userIdNum = Number(userId);
    const currentlyFollowing = follows[userIdNum] ?? false;
    const newFollowing = isFollowing !== null ? isFollowing : !currentlyFollowing;

    setFollows(prev => ({ ...prev, [userIdNum]: newFollowing }));
    
    const currentFollowerCount = followerCounts[userIdNum] ?? 0;
    const optimisticFollowerCount = newFollowing ? currentFollowerCount + 1 : Math.max(0, currentFollowerCount - 1);
    setFollowerCounts(prev => ({ ...prev, [userIdNum]: optimisticFollowerCount }));

    try {
      const method = newFollowing ? 'POST' : 'DELETE';
      const resp = await apiFetch(`/api/users/${userIdNum}/follow/`, { 
        method,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await resp.json();

      if (!resp.ok) {
        const errorText = data?.error?.toLowerCase() || '';
        const isAlreadyFollowing = 
          errorText.includes('уже подписаны') || 
          errorText.includes('already following') ||
          (resp.status === 400 && errorText.includes('follow'));

        if (isAlreadyFollowing) {
          console.log('ℹ️ SocialContext: уже подписан → просто синхронизируем');
          if (currentUser?.id) {
            setTimeout(() => loadMyFollowing(), 300);
          }
          window.dispatchEvent(
            new CustomEvent('followStatusChanged', {
              detail: { targetUserId: userIdNum, isFollowing: true },
            })
          );
          return true;
        }

        console.error('❌ SocialContext: ошибка follow', data?.error);
        setFollows(prev => ({ ...prev, [userIdNum]: currentlyFollowing }));
        setFollowerCounts(prev => ({ ...prev, [userIdNum]: currentFollowerCount }));
        return false;
      }

      if (data.follower_count !== undefined) {
        setFollowerCounts(prev => ({ ...prev, [userIdNum]: data.follower_count }));
      } else if (data.followers_count !== undefined) {
        setFollowerCounts(prev => ({ ...prev, [userIdNum]: data.followers_count }));
      }

      if (currentUser?.id) {
        setTimeout(() => loadMyFollowing(), 300);
      }

      window.dispatchEvent(
        new CustomEvent('followStatusChanged', {
          detail: { targetUserId: userIdNum, isFollowing: newFollowing },
        })
      );

      return true;
    } catch (error) {
      console.error('❌ SocialContext: сетевая ошибка toggleFollow', error);
      setFollows(prev => ({ ...prev, [userIdNum]: currentlyFollowing }));
      setFollowerCounts(prev => ({ ...prev, [userIdNum]: currentFollowerCount }));
      return false;
    }
  }, [follows, followerCounts, getAuthToken, currentUser?.id, loadMyFollowing]);

  /* -------------------------------------------------
     Геттеры
  ------------------------------------------------- */
  const getTrackLikeState = useCallback((trackId) => {
    return {
      liked: likes[trackId] ?? false,
      count: likeCounts[trackId] ?? 0
    };
  }, [likes, likeCounts]);

  const getTrackRepostState = useCallback((trackId) => {
    return {
      reposted: reposts[trackId] ?? false,
      count: repostCounts[trackId] ?? 0
    };
  }, [reposts, repostCounts]);

  const getPlaylistLikeState = useCallback((playlistId) => {
    return {
      liked: playlistLikes[playlistId] ?? false,
      count: playlistLikeCounts[playlistId] ?? 0
    };
  }, [playlistLikes, playlistLikeCounts]);

  const getPlaylistRepostState = useCallback((playlistId) => {
    return {
      reposted: playlistReposts[playlistId] ?? false,
      count: playlistRepostCounts[playlistId] ?? 0
    };
  }, [playlistReposts, playlistRepostCounts]);

  const isLiked = useCallback((trackId) => !!likes[trackId], [likes]);
  const isReposted = useCallback((trackId) => !!reposts[trackId], [reposts]);
  const getLikeCount = useCallback((trackId) => likeCounts[trackId] ?? 0, [likeCounts]);
  const getRepostCount = useCallback((trackId) => repostCounts[trackId] ?? 0, [repostCounts]);

  const isPlaylistLiked = useCallback((playlistId) => !!playlistLikes[playlistId], [playlistLikes]);
  const isPlaylistReposted = useCallback((playlistId) => !!playlistReposts[playlistId], [playlistReposts]);
  const getPlaylistLikeCount = useCallback((playlistId) => playlistLikeCounts[playlistId] ?? 0, [playlistLikeCounts]);
  const getPlaylistRepostCount = useCallback((playlistId) => playlistRepostCounts[playlistId] ?? 0, [playlistRepostCounts]);

  const isFollowing = useCallback((userId) => {
    const userIdNum = Number(userId);
    return !!follows[userIdNum];
  }, [follows]);

  const getFollowerCount = useCallback((userId) => {
    const userIdNum = Number(userId);
    if (Number.isNaN(userIdNum)) return undefined;

    return Object.prototype.hasOwnProperty.call(followerCounts, userIdNum)
      ? followerCounts[userIdNum]
      : undefined;
  }, [followerCounts]);
  
  const getFollowingCount = useCallback((userId) => {
    const userIdNum = Number(userId);
    if (Number.isNaN(userIdNum)) return undefined;

    return Object.prototype.hasOwnProperty.call(followingCounts, userIdNum)
      ? followingCounts[userIdNum]
      : undefined;
  }, [followingCounts]);

  /* -------------------------------------------------
     Инициализация счётчиков
  ------------------------------------------------- */
  const seedTrackCounts = useCallback((trackId, likeCountFromServer, repostCountFromServer) => {
    if (trackId == null) return;

    if (likeCountFromServer !== undefined && likeCountFromServer !== null) {
      setLikeCounts(prev => (
        prev[trackId] === undefined
          ? { ...prev, [trackId]: Number(likeCountFromServer) || 0 }
          : prev
      ));
    }

    if (repostCountFromServer !== undefined && repostCountFromServer !== null) {
      setRepostCounts(prev => (
        prev[trackId] === undefined
          ? { ...prev, [trackId]: Number(repostCountFromServer) || 0 }
          : prev
      ));
    }
  }, []);

  const seedPlaylistCounts = useCallback((playlistId, likeCountFromServer, repostCountFromServer) => {
    if (playlistId == null) return;

    if (likeCountFromServer !== undefined && likeCountFromServer !== null) {
      setPlaylistLikeCounts(prev => (
        prev[playlistId] === undefined
          ? { ...prev, [playlistId]: Number(likeCountFromServer) || 0 }
          : prev
      ));
    }

    if (repostCountFromServer !== undefined && repostCountFromServer !== null) {
      setPlaylistRepostCounts(prev => (
        prev[playlistId] === undefined
          ? { ...prev, [playlistId]: Number(repostCountFromServer) || 0 }
          : prev
      ));
    }
  }, []);

  /* -------------------------------------------------
     Ручные апдейты
  ------------------------------------------------- */
  const setLikeStatus = useCallback((trackId, liked, count = null) => {
    setLikes(prev => ({ ...prev, [trackId]: liked }));
    setLikedTrackIds(prev => {
      const newIds = liked 
        ? (prev.includes(trackId) ? prev : [...prev, trackId])
        : prev.filter(id => id !== trackId);
      localStorage.setItem(likedStorageKey, JSON.stringify(newIds));
      return newIds;
    });
    if (count !== null) setLikeCounts(prev => ({ ...prev, [trackId]: count }));
  }, [likedStorageKey]);

  const setRepostStatus = useCallback((trackId, reposted, count = null) => {
    setReposts(prev => ({ ...prev, [trackId]: reposted }));
    if (count !== null) setRepostCounts(prev => ({ ...prev, [trackId]: count }));
  }, []);

  const setPlaylistLikeStatus = useCallback((playlistId, liked, count = null) => {
    setPlaylistLikes(prev => {
      const next = { ...prev, [playlistId]: liked };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistLikedStorageKey, JSON.stringify(ids));
      } catch (e) {}
      return next;
    });
    if (count !== null) setPlaylistLikeCounts(prev => ({ ...prev, [playlistId]: count }));
  }, [playlistLikedStorageKey]);

  const setPlaylistRepostStatus = useCallback((playlistId, reposted, count = null) => {
    setPlaylistReposts(prev => {
      const next = { ...prev, [playlistId]: reposted };
      try {
        const ids = Object.keys(next).filter(k => next[k]).map(Number);
        localStorage.setItem(playlistRepostedStorageKey, JSON.stringify(ids));
      } catch (e) {}
      return next;
    });
    if (count !== null) setPlaylistRepostCounts(prev => ({ ...prev, [playlistId]: count }));
  }, [playlistRepostedStorageKey]);

  const setFollowStatus = useCallback((userId, following, followerCount = null) => {
    const userIdNum = Number(userId);
    setFollows(prev => ({ ...prev, [userIdNum]: following }));
    if (followerCount !== null) setFollowerCounts(prev => ({ ...prev, [userIdNum]: followerCount }));
  }, []);

  const refreshFollows = useCallback(async () => {
    console.log('🔄 SocialContext: принудительное обновление follow-статусов');
    await loadMyFollowing();
    await loadSelfFollowStats();
  }, [loadMyFollowing, loadSelfFollowStats]);

  const refreshReposts = useCallback(async () => {
    console.log('🔄 SocialContext: принудительное обновление репостов');
    await loadMyReposts();
  }, [loadMyReposts]);

  const refreshPlaylistLikes = useCallback(async () => {
    console.log('🔄 SocialContext: принудительное обновление лайков плейлистов');
    await loadMyPlaylistLikes();
  }, [loadMyPlaylistLikes]);

  const refreshPlaylistReposts = useCallback(async () => {
    console.log('🔄 SocialContext: принудительное обновление репостов плейлистов');
    await loadMyPlaylistReposts();
  }, [loadMyPlaylistReposts]);

  /* -------------------------------------------------
     Публичный API контекста
  ------------------------------------------------- */
  return (
    <SocialContext.Provider
      value={{
        likedTrackIds,
        tracksById,
        likes,
        reposts,
        follows,
        likeCounts,
        repostCounts,
        followerCounts,
        followingCounts,
        
        playlistLikes,
        playlistReposts,
        playlistLikeCounts,
        playlistRepostCounts,
        
        followsLoaded,
        repostsLoaded,
        
        loadLikedTracks,
        loadMyFollowing,
        loadMyReposts,
        loadMyPlaylistLikes,
        loadMyPlaylistReposts,
        refreshFollows,
        refreshReposts,
        refreshPlaylistLikes,
        refreshPlaylistReposts,
        
        updateTrackLike,
        updateTrackRepost,
        updatePlaylistLike,
        updatePlaylistRepost,
        
        seedTrackCounts,
        seedPlaylistCounts,
        
        getTrackLikeState,
        getTrackRepostState,
        getPlaylistLikeState,
        getPlaylistRepostState,
        
        toggleLike,
        toggleRepost,
        toggleFollow,
        
        togglePlaylistLike,
        togglePlaylistRepost,
        
        isLiked,
        isReposted,
        getLikeCount,
        getRepostCount,
        
        isPlaylistLiked,
        isPlaylistReposted,
        getPlaylistLikeCount,
        getPlaylistRepostCount,
        
        isFollowing,
        getFollowerCount,
        getFollowingCount,
        
        setLikeStatus,
        setRepostStatus,
        setPlaylistLikeStatus,
        setPlaylistRepostStatus,
        setFollowStatus,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
};