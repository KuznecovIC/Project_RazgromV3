// frontend/src/App.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './context/UserContext';
import { SocialProvider } from './context/SocialContext';
import GridScan from './GridScan';
import Shuffle from './components/Shuffle';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ProtectedApp from './ProtectedApp';
import TrackPage from './components/TrackPage';
import PlaylistPage from './components/PlaylistPage';
import UploadPage from './components/UploadPage';
import ProfilePage from './components/ProfilePage';
import LibraryPage from './components/LibraryPage';
import FeedPage from './components/FeedPage';
import BannedScreen from './components/BannedScreen';
import BanGuard from './components/BanGuard';
import AppealPage from './components/AppealPage';
import AdminMenu from './components/AdminMenu';
import AdminUsersPage from './components/AdminUsersPage';
import AdminTracksPage from './components/AdminTracksPage';
import AdminPlaylistsPage from './components/AdminPlaylistsPage';
import AdminReportsPage from './components/AdminReportsPage';
import { apiFetch } from './api/apiFetch';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const navigate = useNavigate();
  
  const hasRecordedPlayRef = useRef(false);
  const lastNowPlayingRef = useRef({ trackId: null, isPlaying: null, ts: 0 });
  const lastHistoryFetchAtRef = useRef(0);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [playbackContext, setPlaybackContext] = useState(null);

  const normalizeTrack = useCallback((track) => {
    let audioUrl = '';
    if (track.audio_url) {
      audioUrl = track.audio_url;
    } else if (track.audio_file) {
      audioUrl = track.audio_file;
    } else if (track.audio) {
      audioUrl = track.audio;
    }
    
    let coverUrl = '';
    if (track.cover_url) {
      coverUrl = track.cover_url;
    } else if (typeof track.cover === 'string') {
      coverUrl = track.cover;
    } else if (track.cover && track.cover.url) {
      coverUrl = track.cover.url;
    } else {
      coverUrl = `${API_URL}/static/default_cover.jpg`;
    }
    
    let durationValue = 0;
    if (track.duration_seconds !== undefined && track.duration_seconds !== null) {
      durationValue = Number(track.duration_seconds);
    } else if (track.duration !== undefined && track.duration !== null) {
      if (typeof track.duration === 'number') {
        durationValue = track.duration;
      } else if (typeof track.duration === 'string') {
        const parts = track.duration.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0], 10);
          const seconds = parseInt(parts[1], 10);
          if (!isNaN(minutes) && !isNaN(seconds)) {
            durationValue = minutes * 60 + seconds;
          }
        }
      }
    }
    
    if (isNaN(durationValue)) {
      durationValue = 0;
    }
    
    let artistName = 'Unknown artist';
    if (track.artist) {
      artistName = track.artist;
    } else if (track.uploaded_by?.username) {
      artistName = track.uploaded_by.username;
    }
    
    let artistId = null;
    
    if (track.artistId) {
      artistId = track.artistId;
    } else if (track.artist_id) {
      artistId = track.artist_id;
    } else if (track.uploaded_by?.id) {
      artistId = track.uploaded_by.id;
    } else if (track.user?.id) {
      artistId = track.user.id;
      if (!artistName || artistName === 'Unknown artist') {
        artistName = track.user.username || artistName;
      }
    } else if (track.uploader_id) {
      artistId = track.uploader_id;
    }
    
    const normalized = {
      id: track.id,
      title: track.title || 'Без названия',
      artist: artistName,
      artistId: artistId,
      artistUsername: track.artistUsername || track.artist_username || track.uploaded_by?.username || track.user?.username,
      audio_url: audioUrl,
      cover: coverUrl,
      duration: durationValue,
      play_count: track.play_count || 0,
      like_count: track.like_count || 0,
      repost_count: track.repost_count || 0,
      uploaded_by: track.uploaded_by || track.user,
      created_at: track.created_at,
      source: track.source || 'server',
      ...track
    };
    
    return normalized;
  }, []);

  const [tracksById, setTracksById] = useState({});
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedTrackIds, setLikedTrackIds] = useState([]);
  const [playQueueIds, setPlayQueueIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [lastPathname, setLastPathname] = useState('');
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const autoPlayNextRef = useRef(false);
  const autoPlayTrackIdRef = useRef(null);

  const getRecentKey = (userId) => `rg_recent:v1:${userId || 'anon'}`;

  const recentHydratedRef = useRef(false);
  const lastRecentUserIdRef = useRef(null);

  const [recentTrackIds, setRecentTrackIds] = useState(() => {
    try {
      const raw = localStorage.getItem(getRecentKey(null));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    if (lastRecentUserIdRef.current === uid) return;
    lastRecentUserIdRef.current = uid;

    try {
      const userKey = getRecentKey(uid);
      const rawUser = localStorage.getItem(userKey);

      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (Array.isArray(parsed)) setRecentTrackIds(parsed);
      } else {
        const rawAnon = localStorage.getItem(getRecentKey(null));
        const parsedAnon = rawAnon ? JSON.parse(rawAnon) : [];
        if (Array.isArray(parsedAnon) && parsedAnon.length > 0) {
          setRecentTrackIds(parsedAnon);
          localStorage.setItem(userKey, JSON.stringify(parsedAnon));
          localStorage.removeItem(getRecentKey(null));
        }
      }
    } catch {}

    recentHydratedRef.current = true;
  }, [user?.id]);

  useEffect(() => {
    const uid = user?.id;
    const key = getRecentKey(uid);

    if (uid && !recentHydratedRef.current) return;

    try {
      localStorage.setItem(key, JSON.stringify(recentTrackIds || []));
    } catch {}
  }, [recentTrackIds, user?.id]);

  const isSeekingRef = useRef(false);
  const audioRef = useRef(null);
  const lastTrackIdRef = useRef(null);
  const autoPlayAfterLoadRef = useRef(false);

  const recordPlay = useCallback(async (trackId) => {
    try {
      const payload = {
        track_id: trackId,
        listened_seconds: Math.floor(currentTime)
      };

      const response = await apiFetch(`/api/track/${trackId}/record-play/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.counted) {
        setTracksById(prev => ({
          ...prev,
          [trackId]: {
            ...prev[trackId],
            play_count: data.play_count
          }
        }));
        
        const t = tracksById?.[trackId];
        
        if (t) {
          setHistory(prev => {
            const item = {
              trackId: t.id,
              title: t.title,
              artist: t.artist,
              cover: t.cover || t.cover_url,
              playedAt: new Date().toISOString()
            };
            const filtered = (prev || []).filter(x => (x.trackId ?? x.track_id) !== t.id);
            return [item, ...filtered].slice(0, 100);
          });

          setRecentTrackIds(prev => {
            const filtered = (prev || []).filter(id => id !== t.id);
            return [t.id, ...filtered].slice(0, 50);
          });
        }
        
        window.dispatchEvent(new CustomEvent('playCountUpdated', {
          detail: { 
            trackId, 
            playCount: data.play_count,
            counted: true,
            success: true
          }
        }));
        
        return data;
      }
      
      return data;
    } catch (err) {
      return null;
    }
  }, [currentTime, tracksById]);

  useEffect(() => {
    hasRecordedPlayRef.current = false;
  }, [currentTrackId]);

  useEffect(() => {
    const handlePlayCountUpdated = (event) => {
      const { trackId, playCount } = event.detail || {};
      if (trackId && playCount !== undefined) {
        setTracksById(prev => ({
          ...prev,
          [trackId]: {
            ...prev[trackId],
            play_count: playCount
          }
        }));
      }
    };

    window.addEventListener('playCountUpdated', handlePlayCountUpdated);
    
    return () => {
      window.removeEventListener('playCountUpdated', handlePlayCountUpdated);
    };
  }, []);

  const handleLogout = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setUser(null);
    setIsAuthenticated(false);
    setCurrentTrackId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLikedTrackIds([]);
    setPlayQueueIds([]);
    setRecentTrackIds([]);
    setHistory([]);
    setTracksById({});
    setPlaybackContext(null);
    
    lastTrackIdRef.current = null;
    hasRecordedPlayRef.current = false;
    autoPlayAfterLoadRef.current = false;
    autoPlayNextRef.current = false;
    autoPlayTrackIdRef.current = null;
    
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('likedTracks');
    localStorage.removeItem('userAvatar');
    localStorage.removeItem('pendingPlays');
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('likedTrackIds:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    
    setSessionVersion(v => v + 1);
    
    navigate('/login');
  }, [navigate]);

  const seekTo = useCallback((time) => {
    if (!audioRef.current || !audioRef.current.duration) {
      return;
    }
    
    isSeekingRef.current = true;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 100);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    
    if (!currentTrackId) {
      return;
    }
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      
      if (currentTime >= 30 && !hasRecordedPlayRef.current) {
        hasRecordedPlayRef.current = true;
        recordPlay(currentTrackId);
      }
    } else {
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.1)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [currentTrackId, isPlaying, currentTime, recordPlay]);

  const addTracks = useCallback((tracks = []) => {
    setTracksById(prev => {
      const updated = { ...prev };
      tracks.forEach(track => {
        if (!track?.id) return;
        const normalized = normalizeTrack(track);
        updated[track.id] = normalized;
      });
      return updated;
    });
  }, [normalizeTrack]);
  
  const loadTrackFromServer = useCallback(async (trackId) => {
    if (!trackId) return;
    
    setIsLoadingTrack(true);
    
    try {
      const response = await apiFetch(`/api/track/${trackId}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const trackData = await response.json();
      const normalizedTrack = normalizeTrack(trackData);
      
      setTracksById(prev => ({
        ...prev,
        [trackId]: normalizedTrack
      }));
      
      setCurrentTrackId(trackId);
      
    } catch (error) {
      const demoFallback = {
        1: {
          id: 1,
          title: "hard drive (slowed & muffled)",
          artist: "griffinilla",
          artistId: 101,
          uploaded_by: { id: 101, username: "griffinilla" },
          cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          duration: 200
        },
        2: {
          id: 2,
          title: "Deutschland",
          artist: "Rammstein",
          artistId: 102,
          uploaded_by: { id: 102, username: "Rammstein" },
          cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
          duration: 322
        },
        3: {
          id: 3,
          title: "Sonne",
          artist: "Rammstein",
          artistId: 102,
          uploaded_by: { id: 102, username: "Rammstein" },
          cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
          audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
          duration: 245
        }
      };
      
      const demoTrack = demoFallback[trackId];
      if (demoTrack) {
        const normalizedDemoTrack = normalizeTrack(demoTrack);
        setTracksById(prev => ({
          ...prev,
          [trackId]: normalizedDemoTrack
        }));
        setCurrentTrackId(trackId);
      }
    } finally {
      setIsLoadingTrack(false);
    }
  }, [normalizeTrack]);

  const playTrack = useCallback((track) => {
    if (!track?.id) {
      return;
    }

    if (playQueueIds.length > 0 && !playQueueIds.includes(track.id)) {
      setPlayQueueIds([]);
    }
    
    if (currentTrackId === track.id) {
      togglePlayPause();
      return;
    }
    
    const normalizedTrack = normalizeTrack(track);
    
    setTracksById(prev => ({
      ...prev,
      [track.id]: normalizedTrack
    }));
    
    autoPlayNextRef.current = true;
    autoPlayTrackIdRef.current = track.id;
    
    setCurrentTrackId(track.id);
    
    setRecentTrackIds(prev => {
      const filtered = prev.filter(id => id !== track.id);
      return [track.id, ...filtered].slice(0, 50);
    });
    
    setHistory(prev => {
      const newHistoryItem = {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.cover || track.cover_url,
        playedAt: new Date().toISOString()
      };
      
      const filtered = prev.filter(item => item.trackId !== track.id);
      return [newHistoryItem, ...filtered].slice(0, 100);
    });
    
  }, [currentTrackId, togglePlayPause, normalizeTrack, playQueueIds]);

  const getAutoQueueIds = useCallback(() => {
    const ids = Object.keys(tracksById || {})
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (currentTrackId && Number.isFinite(Number(currentTrackId))) {
      const cid = Number(currentTrackId);
      if (!ids.includes(cid)) ids.unshift(cid);
    }

    return ids;
  }, [tracksById, currentTrackId]);

  const playNextTrack = useCallback(() => {
    const isPlaylistQueue = (playQueueIds && playQueueIds.length > 0);
    const queueIds = isPlaylistQueue ? playQueueIds : getAutoQueueIds();

    if (!queueIds || queueIds.length === 0) {
      return;
    }
    
    let nextTrackId = null;
    
    if (currentTrackId) {
      const currentIndex = queueIds.indexOf(currentTrackId);
      
      if (currentIndex === -1) {
        nextTrackId = queueIds[0];
      } else {
        if (isPlaylistQueue && currentIndex >= queueIds.length - 1) {
          setPlayQueueIds([]);
          setIsPlaying(false);
          return;
        }
        
        const nextIndex = isPlaylistQueue
          ? (currentIndex + 1)
          : ((currentIndex + 1) % queueIds.length);
        nextTrackId = queueIds[nextIndex];
      }
    } else {
      nextTrackId = queueIds[0];
    }
    
    if (!nextTrackId) return;
    
    const nextTrack = tracksById[nextTrackId];
    if (nextTrack) {
      playTrack(nextTrack);
    }
  }, [currentTrackId, likedTrackIds, playQueueIds, tracksById, playTrack, getAutoQueueIds]);
  
  const playPreviousTrack = useCallback(() => {
    const isPlaylistQueue = (playQueueIds && playQueueIds.length > 0);
    const queueIds = isPlaylistQueue ? playQueueIds : getAutoQueueIds();
    
    if (!queueIds || queueIds.length === 0) return;
    
    if (!currentTrackId) {
      const firstTrack = tracksById[queueIds[0]];
      if (firstTrack) playTrack(firstTrack);
      return;
    }
    
    const currentIndex = queueIds.indexOf(currentTrackId);
    if (currentIndex === -1) return;
    
    const prevIndex = currentIndex === 0 ? queueIds.length - 1 : currentIndex - 1;
    const prevTrackId = queueIds[prevIndex];
    const prevTrack = tracksById[prevTrackId];
    
    if (prevTrack) {
      playTrack(prevTrack);
    }
  }, [currentTrackId, likedTrackIds, playQueueIds, tracksById, playTrack, getAutoQueueIds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isSeekingRef.current) return;
      
      const newTime = audio.currentTime;
      setCurrentTime(newTime);
      
      if (newTime >= 30 && !hasRecordedPlayRef.current && isPlaying) {
        hasRecordedPlayRef.current = true;
        if (currentTrackId) {
          recordPlay(currentTrackId);
        }
      }
    };

    const handleEnded = () => {
      if (currentTime >= 30 && !hasRecordedPlayRef.current && currentTrackId) {
        hasRecordedPlayRef.current = true;
        recordPlay(currentTrackId);
      }

      if (playbackContext === 'single') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        return;
      }

      autoPlayAfterLoadRef.current = true;
      setIsPlaying(false);
      playNextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackId, isPlaying, currentTime, recordPlay, playNextTrack, playbackContext]);

  useEffect(() => {
    const checkURLForTrack = () => {
      const path = window.location.pathname;
      
      if (path !== lastPathname) {
        setLastPathname(path);
        
        const trackMatch = path.match(/\/track\/(\d+)/);
        
        if (trackMatch) {
          const trackIdFromUrl = parseInt(trackMatch[1]);
          
          if (trackIdFromUrl === currentTrackId) {
            return;
          }
          
          const trackInStore = tracksById[trackIdFromUrl];
          
          if (trackInStore) {
            setCurrentTrackId(trackIdFromUrl);
          } else {
            loadTrackFromServer(trackIdFromUrl);
          }
        }
      }
    };

    checkURLForTrack();
    const urlCheckInterval = setInterval(checkURLForTrack, 100);

    return () => clearInterval(urlCheckInterval);
  }, [currentTrackId, tracksById, lastPathname, loadTrackFromServer]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = volume;
      audioRef.current.loop = loopEnabled;
    }

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleCanPlay = () => {
      setIsLoadingTrack(false);

      try {
        const wantAuto =
          autoPlayNextRef.current &&
          String(autoPlayTrackIdRef.current) === String(currentTrackId);

        if (wantAuto) {
          autoPlayNextRef.current = false;
          autoPlayTrackIdRef.current = null;

          audio.play().catch(() => {});
        }
      } catch (e) {}
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleError = () => {
      setIsPlaying(false);
      setIsLoadingTrack(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, loopEnabled, currentTrackId]);

  useEffect(() => {
    if (!currentTrackId || !audioRef.current) {
      return;
    }

    const trackInfo = tracksById[currentTrackId];
    if (!trackInfo) {
      return;
    }

    const audio = audioRef.current;
    const newSrc = trackInfo.audio_url || '';

    if (lastTrackIdRef.current === currentTrackId) {
      return;
    }

    lastTrackIdRef.current = currentTrackId;
    
    audio.pause();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoadingTrack(true);
    
    let audioUrl = newSrc;
    if (!audioUrl || audioUrl.trim() === '') {
      const publicTestTracks = {
        1: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        2: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        3: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      };
      audioUrl = publicTestTracks[currentTrackId] || publicTestTracks[1];
    }
    
    audio.src = audioUrl;
    audio.load();

    const tryAutoPlay = () => {
      if (!autoPlayAfterLoadRef.current) return;

      autoPlayAfterLoadRef.current = false;

      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    };

    audio.addEventListener('canplay', tryAutoPlay, { once: true });
    
  }, [currentTrackId, tracksById]);

  const handlePlayPause = useCallback(() => {
    if (!currentTrackId) {
      return;
    }
    
    togglePlayPause();
  }, [currentTrackId, togglePlayPause]);
  
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  }, []);
  
  const handleToggleLoop = useCallback(() => {
    const newLoopEnabled = !loopEnabled;
    setLoopEnabled(newLoopEnabled);
    if (audioRef.current) audioRef.current.loop = newLoopEnabled;
  }, [loopEnabled]);
  
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('access') ||
                  localStorage.getItem('accessToken') ||
                  localStorage.getItem('token');
    
    return token;
  }, []);

  const getAuthTokenInternal = useCallback(() => {
    return getAuthToken();
  }, [getAuthToken]);

  useEffect(() => {
    const token = getAuthTokenInternal?.();
    if (!token) return;

    if (!currentTrackId) return;

    const trackId = currentTrackId;
    const playing = !!isPlaying;

    const now = Date.now();
    const last = lastNowPlayingRef.current;
    if (last.trackId === trackId && last.isPlaying === playing && (now - last.ts) < 4000) return;

    lastNowPlayingRef.current = { trackId, isPlaying: playing, ts: now };

    apiFetch('/api/me/now-playing/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId, is_playing: playing })
    }).catch(() => {});
  }, [currentTrackId, isPlaying, getAuthTokenInternal]);

  const mergeRecentIds = useCallback((localIds, serverIds, limit = 50) => {
    const out = [];
    const seen = new Set();

    const push = (id) => {
      if (!id) return;
      const v = Number(id);
      const norm = Number.isFinite(v) ? v : id;
      if (seen.has(norm)) return;
      seen.add(norm);
      out.push(norm);
    };

    (localIds || []).forEach(push);
    (serverIds || []).forEach(push);

    return out.slice(0, limit);
  }, []);

  const fetchLikedTracks = useCallback(async () => {
    try {
      const response = await apiFetch('/api/liked-tracks/');
      
      if (response.ok) {
        const data = await response.json();
        
        const likedIds = data.tracks?.map(track => track.id) || [];
        setLikedTrackIds(likedIds);
        
        localStorage.setItem('likedTracks', JSON.stringify(likedIds));
        
        if (data.tracks && data.tracks.length > 0) {
          addTracks(data.tracks);
        }
        
        return likedIds;
      } else {
        const likedFromStorage = localStorage.getItem('likedTracks');
        if (likedFromStorage) {
          const likedArray = JSON.parse(likedFromStorage);
          setLikedTrackIds(likedArray);
        }
      }
    } catch (error) {
      const likedFromStorage = localStorage.getItem('likedTracks');
      if (likedFromStorage) {
        const likedArray = JSON.parse(likedFromStorage);
        setLikedTrackIds(likedArray);
      }
    }
    
    return [];
  }, [addTracks]);

  const fetchRecentTracks = useCallback(async () => {
    try {
      const response = await apiFetch('/api/recently-played/');

      if (response.ok) {
        const data = await response.json();
        const serverIds = (data.tracks || []).map(t => t?.id).filter(Boolean);

        setRecentTrackIds(prev => mergeRecentIds(prev, serverIds, 50));

        if (data.tracks && data.tracks.length > 0) {
          addTracks(data.tracks);
        }

        return serverIds;
      }
    } catch (error) {}

    return null;
  }, [addTracks, mergeRecentIds]);

  const fetchHistory = useCallback(async () => {
    const now = Date.now();
    if (now - lastHistoryFetchAtRef.current < 120000) {
      return;
    }
    lastHistoryFetchAtRef.current = now;

    try {
      const response = await apiFetch('/api/tracks/history/');
      
      if (response.ok) {
        const data = await response.json();
        
        setHistory(data.history || []);
        
        if (data.tracks && data.tracks.length > 0) {
          addTracks(data.tracks);
        }
        
        return data.history;
      }
    } catch (error) {}
    
    return [];
  }, [addTracks]);

  const fetchUserData = useCallback(async () => {
    const authToken = getAuthTokenInternal?.();
    
    if (!authToken) {
      return;
    }
    
    try {
      await Promise.all([
        fetchLikedTracks(),
        fetchRecentTracks(),
        fetchHistory()
      ]);
    } catch (error) {}
  }, [getAuthTokenInternal, fetchLikedTracks, fetchRecentTracks, fetchHistory]);

  const handleToggleLike = useCallback((trackId) => {
    return Promise.resolve(true);
  }, []);

  const checkTrackLiked = useCallback((trackId) => {
    return likedTrackIds.includes(trackId);
  }, [likedTrackIds]);

  useEffect(() => {
    const handleTrackLikedFromApp = (e) => {
      const { trackId, liked, count } = e.detail || {};
      if (trackId && e.detail?.fromSocialContext) {
        if (liked) {
          setLikedTrackIds(prev => {
            if (!prev.includes(trackId)) {
              return [...prev, trackId];
            }
            return prev;
          });
        } else {
          setLikedTrackIds(prev => prev.filter(id => id !== trackId));
        }
        
        if (count !== undefined) {
          setTracksById(prev => ({
            ...prev,
            [trackId]: {
              ...prev[trackId],
              like_count: count
            }
          }));
        }
      }
    };

    window.addEventListener('trackLikedFromApp', handleTrackLikedFromApp);
    
    return () => {
      window.removeEventListener('trackLikedFromApp', handleTrackLikedFromApp);
    };
  }, []);

  const handleLogin = useCallback((userData, tokens) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setTracksById({});
    setCurrentTrackId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLikedTrackIds([]);
    setPlayQueueIds([]);
    setRecentTrackIds([]);
    setHistory([]);
    setIsLoadingTrack(false);
    setPlaybackContext(null);

    lastTrackIdRef.current = null;
    hasRecordedPlayRef.current = false;
    autoPlayAfterLoadRef.current = false;
    autoPlayNextRef.current = false;
    autoPlayTrackIdRef.current = null;

    localStorage.removeItem('likedTracks');
    localStorage.removeItem('pendingPlays');
    
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('likedTrackIds:')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_) {}
    
    setSessionVersion(v => v + 1);
    
    setUser(userData);
    setIsAuthenticated(true);
    
    if (tokens?.access) {
      localStorage.setItem('access', tokens.access);
    }
    
    if (tokens?.refresh) {
      localStorage.setItem('refresh', tokens.refresh);
    }
    
    localStorage.setItem('user', JSON.stringify(userData));
    
    setTimeout(() => {
      fetchUserData();
    }, 500);
    
  }, [fetchUserData]);

  const setPlaybackQueue = useCallback((ids = []) => {
    const clean = Array.from(new Set((ids || [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x))
    ));
    setPlayQueueIds(clean);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access');
    const refreshToken = localStorage.getItem('refresh');
    const savedUser = localStorage.getItem('user');
    
    if (token && refreshToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
        
        setTimeout(() => {
          fetchUserData();
        }, 1000);
        
      } catch (error) {
        handleLogout();
      }
    }
    
    if (!localStorage.getItem('pendingPlays')) {
      localStorage.setItem('pendingPlays', JSON.stringify({}));
    }
    
    const demoData = [
      {
        id: 1,
        title: "hard drive (slowed & muffled)",
        artist: "griffinilla",
        artistId: 101,
        uploaded_by: { id: 101, username: "griffinilla" },
        cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGF8gEyh_MA8=&rs=AOn4CLDjiyHGoELcWa2t37NenbmBQ-JlSw",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        duration: 200,
        duration_seconds: 200,
        play_count: 254789,
        like_count: 56,
        repost_count: 12,
        source: 'demo'
      },
      {
        id: 2,
        title: "Deutschland",
        artist: "Rammstein", 
        artistId: 102,
        uploaded_by: { id: 102, username: "Rammstein" },
        cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        duration: 322,
        duration_seconds: 322,
        play_count: 12457896,
        like_count: 34,
        repost_count: 8,
        source: 'demo'
      },
      {
        id: 3,
        title: "Sonne", 
        artist: "Rammstein",
        artistId: 102,
        uploaded_by: { id: 102, username: "Rammstein" },
        cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
        audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        duration: 245,
        duration_seconds: 245,
        play_count: 567890,
        like_count: 23,
        repost_count: 5,
        source: 'demo'
      }
    ];
    
    addTracks(demoData);
    
    try {
      const likedFromStorage = localStorage.getItem('likedTracks');
      if (likedFromStorage) {
        const likedArray = JSON.parse(likedFromStorage);
        setLikedTrackIds(likedArray);
      }
    } catch (error) {}
    
    setIsLoading(false);
  }, [addTracks, fetchUserData, handleLogout]);

  const commonProps = {
    user,
    onLogout: handleLogout,
    currentTrack: currentTrackId,
    isPlaying,
    onPlayPause: handlePlayPause,
    onTogglePlayPause: togglePlayPause,
    currentTime,
    duration,
    onSeek: seekTo,
    volume,
    onVolumeChange: handleVolumeChange,
    onNext: playNextTrack,
    onPrevious: playPreviousTrack,
    loopEnabled,
    onToggleLoop: handleToggleLoop,
    onToggleLike: handleToggleLike,
    likedTracks: likedTrackIds,
    checkTrackLiked,
    trackData: tracksById,
    playTrack,
    getAuthToken: getAuthTokenInternal,
    onRecordPlay: recordPlay,
    setPlaybackQueue,
    playQueueIds,
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <GridScan
          className="background-gridscan"
          sensitivity={0.65}
          lineThickness={1}
          linesColor="#ffffff"
          gridScale={0.12}
          scanColor="#8456ff"
          scanOpacity={0.45}
        />
        <div className="loading-content">
          <Shuffle
            text="Loading..."
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
  
  const currentTrack = currentTrackId ? tracksById[currentTrackId] : null;
  
  return (
    <AuthProvider value={{ 
      user, 
      isAuthenticated,
      getAuthToken: getAuthTokenInternal,
      handleLogout 
    }}>
      <UserProvider key={`user-${sessionVersion}`}>
        <SocialProvider 
          key={`social-${sessionVersion}`}
          getAuthToken={getAuthTokenInternal} 
          currentUser={user}
        >
          <div className="App">
            <BanGuard>
              <Routes>
                <Route
                  path="/login"
                  element={<Login onLogin={handleLogin} />}
                />
                <Route
                  path="/register"
                  element={<Register onRegister={handleLogin} />}
                />
                <Route
                  path="/forgot-password"
                  element={<ForgotPassword />}
                />
                
                <Route
                  path="/banned"
                  element={<BannedScreen />}
                />
                
                <Route
                  path="/appeal"
                  element={<AppealPage />}
                />
                
                {isAuthenticated ? (
                  <>
                    <Route
                      path="/upload"
                      element={
                        <UploadPage
                          user={user}
                          onLogout={handleLogout}
                          onUploadSuccess={(track) => {
                            if (track) {
                              addTracks([track]);
                              playTrack(track);
                            }
                          }}
                          getAuthToken={getAuthTokenInternal}
                        />
                      }
                    />
                    
                    <Route
                      path="/track/:trackId"
                      element={
                        <TrackPage
                          {...commonProps}
                          sessionToken={getAuthTokenInternal?.()}
                          onPlayTrack={playTrack}
                          setPlaybackContext={setPlaybackContext}
                        />
                      }
                    />
                    
                    <Route
                      path="/playlist/:playlistId"
                      element={
                        <PlaylistPage
                          {...commonProps}
                          addTracks={addTracks}
                          setCurrentTrackId={setCurrentTrackId}
                        />
                      }
                    />
                    
                    <Route
                      path="/*"
                      element={
                        <ProtectedApp
                          key={`protected-${sessionVersion}`}
                          {...commonProps}
                          currentTrackFull={currentTrack}
                          tracksById={tracksById}
                          recentTrackIds={recentTrackIds}
                          history={history}
                          addTracks={addTracks}
                          isLoadingTrack={isLoadingTrack}
                          navigate={navigate}
                        />
                      }
                    />
                  </>
                ) : (
                  <Route path="*" element={<Navigate to="/login" />} />
                )}
              </Routes>
            </BanGuard>
          </div>
        </SocialProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;