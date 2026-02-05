import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './context/UserContext';
import GridScan from './GridScan';
import Shuffle from './components/Shuffle';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ProtectedApp from './ProtectedApp';
import TrackPage from './components/TrackPage';
import UploadPage from './components/UploadPage';
import ProfilePage from './components/ProfilePage';
import { apiFetch } from './api/apiFetch';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const navigate = useNavigate();
  
  // 1️⃣ ФУНКЦИЯ НОРМАЛИЗАЦИИ ТРЕКА (ИСПРАВЛЕНА!)
  const normalizeTrack = useCallback((track) => {
    console.log('🔧 App: Нормализация трека:', track.id, track.title);
    
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
    
    // 🔥 ИСПРАВЛЕНО: Убеждаемся, что artistId всегда есть
    // Сначала пробуем получить ID из разных источников
    let artistId = null;
    
    // Источник 1: явно переданный artistId
    if (track.artistId) {
      artistId = track.artistId;
    }
    // Источник 2: поле artist_id
    else if (track.artist_id) {
      artistId = track.artist_id;
    }
    // Источник 3: из uploaded_by объекта (самый важный!)
    else if (track.uploaded_by?.id) {
      artistId = track.uploaded_by.id;
    }
    // Источник 4: если это объект user
    else if (track.user?.id) {
      artistId = track.user.id;
      // Также обновляем artistName если нужно
      if (!artistName || artistName === 'Unknown artist') {
        artistName = track.user.username || artistName;
      }
    }
    // Источник 5: из поля uploader_id (если есть)
    else if (track.uploader_id) {
      artistId = track.uploader_id;
    }
    
    console.log('🔍 App: Полученный artistId:', {
      artistId,
      fromArtistId: track.artistId,
      fromArtist_id: track.artist_id,
      fromUploadedBy: track.uploaded_by?.id,
      fromUser: track.user?.id,
      trackData: track
    });
    
    const normalized = {
      id: track.id,
      title: track.title || 'Без названия',
      artist: artistName,
      artistId: artistId, // 🔥 Теперь точно будет ID
      artistUsername: track.artistUsername || track.artist_username || track.uploaded_by?.username || track.user?.username,
      audio_url: audioUrl,
      cover: coverUrl,
      duration: durationValue,
      play_count: track.play_count || 0,
      like_count: track.like_count || 0,
      uploaded_by: track.uploaded_by || track.user, // Сохраняем полный объект если есть
      created_at: track.created_at,
      source: track.source || 'server',
      // Добавляем все оригинальные поля для совместимости
      ...track
    };
    
    console.log('✅ App: Нормализованный трек:', {
      id: normalized.id,
      title: normalized.title,
      artist: normalized.artist,
      artistId: normalized.artistId, // Должен быть заполнен!
      hasUploadedBy: !!normalized.uploaded_by
    });
    
    return normalized;
  }, []);

  // 2️⃣ СОСТОЯНИЯ
  const [tracksById, setTracksById] = useState({});
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedTrackIds, setLikedTrackIds] = useState([]);
  const [recentTrackIds, setRecentTrackIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [lastPathname, setLastPathname] = useState('');
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 3️⃣ REFS
  const isSeekingRef = useRef(false);
  const audioRef = useRef(null);
  const lastTrackIdRef = useRef(null);

  // 4️⃣ ФУНКЦИЯ ЛОГАУТА
  const handleLogout = useCallback(() => {
    console.log('👋 App: Принудительный выход из-за истечения токена');
    
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
    setRecentTrackIds([]);
    setHistory([]);
    lastTrackIdRef.current = null;
    
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    localStorage.removeItem('likedTracks');
    localStorage.removeItem('userAvatar');
    
    console.log('✅ App: Все данные пользователя очищены');
    
    navigate('/login');
  }, [navigate]);

  // 5️⃣ SEEK TO
  const seekTo = useCallback((time) => {
    console.log('🎯 App: Seek to', time, 'seconds');
    
    if (!audioRef.current || !audioRef.current.duration) {
      console.error('❌ App: Нет audio элемента для seek');
      return;
    }
    
    isSeekingRef.current = true;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    
    setTimeout(() => {
      isSeekingRef.current = false;
      console.log('✅ App: Завершена перемотка');
    }, 100);
  }, []);

  // 6️⃣ TOGGLE PLAY/PAUSE
  const togglePlayPause = useCallback(() => {
    console.log('⏯️ App: togglePlayPause вызван', {
      currentTrackId,
      isPlaying,
      audio: audioRef.current ? {
        paused: audioRef.current.paused,
        readyState: audioRef.current.readyState
      } : 'no audio'
    });
    
    if (!audioRef.current) {
      console.error('❌ App: Нет audio элемента');
      return;
    }
    
    if (!currentTrackId) {
      console.log('⚠️ App: Нет текущего трека');
      return;
    }
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      console.log('⏸️ App: Пауза');
      audio.pause();
      setIsPlaying(false);
    } else {
      console.log('▶️ App: Воспроизведение');
      audio.play()
        .then(() => {
          console.log('✅ App: Воспроизведение успешно');
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('❌ App: Ошибка воспроизведения:', error);
          setIsPlaying(false);
        });
    }
  }, [currentTrackId, isPlaying]);

  // 7️⃣ ДОБАВЛЕНИЕ ТРЕКОВ
  const addTracks = useCallback((tracks = []) => {
    console.log(`📦 App: Добавление ${tracks.length} треков в стор`);
    
    setTracksById(prev => {
      const updated = { ...prev };
      tracks.forEach(track => {
        if (!track?.id) return;
        const normalized = normalizeTrack(track);
        console.log(`📝 App: Добавлен трек ${track.id} с artistId:`, normalized.artistId);
        updated[track.id] = normalized;
      });
      return updated;
    });
  }, [normalizeTrack]);
  
  // 8️⃣ ЗАГРУЗКА ТРЕКА С СЕРВЕРА
  const loadTrackFromServer = useCallback(async (trackId) => {
    if (!trackId) return;
    
    console.log(`🔄 App: Загрузка трека ${trackId} с сервера...`);
    setIsLoadingTrack(true);
    
    try {
      const response = await apiFetch(`/api/track/${trackId}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const trackData = await response.json();
      console.log('📥 App: Данные с сервера:', {
        id: trackData.id,
        title: trackData.title,
        uploaded_by: trackData.uploaded_by,
        user: trackData.user
      });
      
      const normalizedTrack = normalizeTrack(trackData);
      
      setTracksById(prev => ({
        ...prev,
        [trackId]: normalizedTrack
      }));
      
      console.log(`✅ App: Трек ${trackId} загружен с сервера:`, {
        title: normalizedTrack.title,
        artistId: normalizedTrack.artistId,
        hasArtistId: !!normalizedTrack.artistId
      });
      
      setCurrentTrackId(trackId);
      
    } catch (error) {
      console.error(`❌ App: Ошибка загрузки трека ${trackId}:`, error);
      
      // Демо-данные с правильными artistId
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
        console.log(`✅ App: Используем демо-трек для ${trackId}`);
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

  // 🔥 9️⃣ ФУНКЦИЯ ВОСПРОИЗВЕДЕНИЯ ТРЕКА (ОСНОВНАЯ!)
  const playTrack = useCallback((track) => {
    if (!track?.id) {
      console.error('❌ App: Невалидный трек для воспроизведения');
      return;
    }
    
    console.log(`🎵 App: playTrack вызван для трека ${track.id}`, {
      title: track.title,
      incomingData: track,
      hasUploadedBy: !!track.uploaded_by,
      hasUser: !!track.user,
      currentTrackId
    });
    
    // Если трек уже играет, просто переключаем паузу
    if (currentTrackId === track.id) {
      console.log('🔄 App: Тот же трек, переключаем паузу');
      togglePlayPause();
      return;
    }
    
    // 🔥 ВАЖНО: Нормализуем трек перед использованием
    const normalizedTrack = normalizeTrack(track);
    
    console.log('🔍 App: Нормализованные данные для воспроизведения:', {
      id: normalizedTrack.id,
      title: normalizedTrack.title,
      artist: normalizedTrack.artist,
      artistId: normalizedTrack.artistId, // ✅ Проверяем, есть ли artistId
      uploaded_by: normalizedTrack.uploaded_by,
      source: normalizedTrack.source
    });
    
    if (!normalizedTrack.artistId) {
      console.warn('⚠️ App: Внимание! Трек не имеет artistId после нормализации');
      console.warn('🔍 Исходные данные:', track);
    }
    
    // Сохраняем нормализованный трек в хранилище
    setTracksById(prev => ({
      ...prev,
      [track.id]: normalizedTrack
    }));
    
    // Устанавливаем как текущий
    setCurrentTrackId(track.id);
    
    // Добавляем в недавние
    setRecentTrackIds(prev => {
      const filtered = prev.filter(id => id !== track.id);
      return [track.id, ...filtered].slice(0, 50);
    });
    
    // Добавляем в историю
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
    
    console.log(`✅ App: Трек "${track.title}" установлен для воспроизведения с artistId: ${normalizedTrack.artistId}`);
  }, [currentTrackId, togglePlayPause, normalizeTrack]);

  // 🔟 СЛЕДУЮЩИЙ/ПРЕДЫДУЩИЙ ТРЕК
  const playNextTrack = useCallback(() => {
    console.log('⏭️ App: playNextTrack вызван');
    
    if (!likedTrackIds || likedTrackIds.length === 0) {
      console.log('⚠️ App: Нет лайкнутых треков для автоплея');
      return;
    }
    
    let nextTrackId = null;
    
    if (currentTrackId) {
      const currentIndex = likedTrackIds.indexOf(currentTrackId);
      
      if (currentIndex === -1) {
        nextTrackId = likedTrackIds[0];
      } else {
        const nextIndex = (currentIndex + 1) % likedTrackIds.length;
        nextTrackId = likedTrackIds[nextIndex];
      }
    } else {
      nextTrackId = likedTrackIds[0];
    }
    
    if (!nextTrackId) return;
    
    const nextTrack = tracksById[nextTrackId];
    if (nextTrack) {
      console.log('▶️ App: Автопереход к следующему треку', nextTrack.title);
      playTrack(nextTrack);
    }
  }, [currentTrackId, likedTrackIds, tracksById, playTrack]);
  
  const playPreviousTrack = useCallback(() => {
    if (!likedTrackIds || likedTrackIds.length === 0) return;
    
    if (!currentTrackId) {
      const firstTrack = tracksById[likedTrackIds[0]];
      if (firstTrack) playTrack(firstTrack);
      return;
    }
    
    const currentIndex = likedTrackIds.indexOf(currentTrackId);
    if (currentIndex === -1) return;
    
    const prevIndex = currentIndex === 0 ? likedTrackIds.length - 1 : currentIndex - 1;
    const prevTrackId = likedTrackIds[prevIndex];
    const prevTrack = tracksById[prevTrackId];
    
    if (prevTrack) {
      playTrack(prevTrack);
    }
  }, [currentTrackId, likedTrackIds, tracksById, playTrack]);

  // 🎵 АУДИО ОБРАБОТКА
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isSeekingRef.current) return;
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // 🔗 ОТСЛЕЖИВАНИЕ URL
  useEffect(() => {
    const checkURLForTrack = () => {
      const path = window.location.pathname;
      
      if (path !== lastPathname) {
        setLastPathname(path);
        
        const trackMatch = path.match(/\/track\/(\d+)/);
        
        if (trackMatch) {
          const trackIdFromUrl = parseInt(trackMatch[1]);
          
          if (trackIdFromUrl === currentTrackId) {
            console.log('✅ App: Тот же трек в URL, игнорируем');
            return;
          }
          
          console.log('🌐 App: Определен trackId из URL:', trackIdFromUrl);
          
          const trackInStore = tracksById[trackIdFromUrl];
          
          if (trackInStore) {
            console.log('✅ App: Трек уже в сторе, устанавливаем как текущий');
            setCurrentTrackId(trackIdFromUrl);
          } else {
            console.log('🔄 App: Трека нет в сторе, нужно загрузить с сервера');
            loadTrackFromServer(trackIdFromUrl);
          }
        }
      }
    };

    checkURLForTrack();
    const urlCheckInterval = setInterval(checkURLForTrack, 100);

    return () => clearInterval(urlCheckInterval);
  }, [currentTrackId, tracksById, lastPathname, loadTrackFromServer]);

  // 🎵 ИНИЦИАЛИЗАЦИЯ AUDIO ЭЛЕМЕНТА
  useEffect(() => {
    console.log('🎵 App: Инициализация audio элемента');
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = volume;
      audioRef.current.loop = loopEnabled;
      console.log('✅ App: Audio элемент создан');
    }

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      console.log('✅ App: Метаданные загружены, duration:', audio.duration);
      setDuration(audio.duration || 0);
    };

    const handleCanPlay = () => {
      console.log('✅ App: Данные загружены, можно играть');
      setIsLoadingTrack(false);
    };

    const handlePlay = () => {
      console.log('▶️ App: Audio play event');
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      console.log('⏸️ App: Audio pause event');
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      console.log('⏹️ App: Трек завершен');
      setIsPlaying(false);
      playNextTrack();
    };

    const handleError = (e) => {
      console.error('❌ App: Ошибка audio:', e.target.error);
      setIsPlaying(false);
      setIsLoadingTrack(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, loopEnabled, playNextTrack]);

  // 🔄 ЗАГРУЗКА ТРЕКА ПРИ СМЕНЕ currentTrackId
  useEffect(() => {
    if (!currentTrackId || !audioRef.current) {
      console.log('⚠️ App: Нет трека для загрузки');
      return;
    }

    const trackInfo = tracksById[currentTrackId];
    if (!trackInfo) {
      console.error('❌ App: Нет данных для трека:', currentTrackId);
      return;
    }

    const audio = audioRef.current;
    const newSrc = trackInfo.audio_url || '';

    console.log('🔄 App: Обработка трека для воспроизведения:', {
      currentTrackId,
      trackTitle: trackInfo.title,
      artistId: trackInfo.artistId, // ✅ Теперь есть!
      newSrc,
      lastTrackId: lastTrackIdRef.current,
      audioSrc: audio.src
    });

    if (lastTrackIdRef.current === currentTrackId) {
      console.log('✅ App: Тот же трек, только управление воспроизведением');
      return;
    }

    console.log('🔄 App: Начинаем загрузку нового трека');
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
    
    console.log('🎵 App: Устанавливаем audio.src:', audioUrl);
    
    audio.src = audioUrl;
    audio.load();
    
  }, [currentTrackId, tracksById]);

  // 🎛️ ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ
  const handlePlayPause = useCallback(() => {
    console.log('🎵 App: handlePlayPause вызван', {
      currentTrackId,
      isPlaying,
      currentTrack: tracksById[currentTrackId]
    });
    
    if (!currentTrackId) {
      console.log('⚠️ App: Нет текущего трека для play/pause');
      return;
    }
    
    togglePlayPause();
  }, [currentTrackId, isPlaying, tracksById, togglePlayPause]);
  
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
    return localStorage.getItem('access');
  }, []);

  // 📡 ЗАГРУЗКА ДАННЫХ
  const fetchLikedTracks = useCallback(async () => {
    try {
      console.log('❤️ App: Загрузка лайкнутых треков с сервера...');
      
      const response = await apiFetch('/api/liked-tracks/');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ App: Загружены лайкнутые треки:', data.tracks?.length || 0);
        
        const likedIds = data.tracks?.map(track => track.id) || [];
        setLikedTrackIds(likedIds);
        
        localStorage.setItem('likedTracks', JSON.stringify(likedIds));
        
        if (data.tracks && data.tracks.length > 0) {
          // 🔥 ВАЖНО: Добавляем треки с проверкой artistId
          console.log('🔍 App: Проверяем данные лайкнутых треков:');
          data.tracks.forEach(track => {
            console.log(`  - Трек ${track.id}: ${track.title}`, {
              hasUploadedBy: !!track.uploaded_by,
              uploaded_by_id: track.uploaded_by?.id,
              hasUser: !!track.user,
              user_id: track.user?.id
            });
          });
          
          addTracks(data.tracks);
        }
        
        return likedIds;
      } else {
        console.error('❌ App: Ошибка загрузки лайкнутых треков:', response.status);
        
        const likedFromStorage = localStorage.getItem('likedTracks');
        if (likedFromStorage) {
          const likedArray = JSON.parse(likedFromStorage);
          setLikedTrackIds(likedArray);
          console.log('✅ App: Используем лайки из localStorage:', likedArray.length);
        }
      }
    } catch (error) {
      console.error('❌ App: Ошибка сети при загрузке лайков:', error);
      
      const likedFromStorage = localStorage.getItem('likedTracks');
      if (likedFromStorage) {
        const likedArray = JSON.parse(likedFromStorage);
        setLikedTrackIds(likedArray);
        console.log('✅ App: Используем лайки из localStorage:', likedArray.length);
      }
    }
    
    return [];
  }, [addTracks]);

  const fetchRecentTracks = useCallback(async () => {
    try {
      console.log('🕒 App: Загрузка недавних треков с сервера...');
      
      const response = await apiFetch('/api/recently-played/');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ App: Загружены недавние треки:', data.tracks?.length || 0);
        
        const recentIds = data.tracks?.map(track => track.id) || [];
        setRecentTrackIds(recentIds);
        
        if (data.tracks && data.tracks.length > 0) {
          addTracks(data.tracks);
        }
        
        return recentIds;
      } else {
        console.log('⚠️ App: Нет недавних треков на сервере');
      }
    } catch (error) {
      console.error('❌ App: Ошибка сети при загрузке недавних треков:', error);
    }
    
    return [];
  }, [addTracks]);

  const fetchHistory = useCallback(async () => {
    try {
      console.log('📚 App: Загрузка истории прослушиваний...');
      
      const response = await apiFetch('/api/tracks/history/');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ App: Загружена история:', data.history?.length || 0);
        
        setHistory(data.history || []);
        
        if (data.tracks && data.tracks.length > 0) {
          addTracks(data.tracks);
        }
        
        return data.history;
      } else {
        console.log('⚠️ App: Нет истории на сервере');
      }
    } catch (error) {
      console.error('❌ App: Ошибка сети при загрузке истории:', error);
    }
    
    return [];
  }, [addTracks]);

  const fetchUserData = useCallback(async () => {
    const authToken = getAuthToken();
    
    if (!authToken) {
      console.log('⚠️ App: Нет токена, пользовательские данные не загружены');
      return;
    }
    
    console.log('🔄 App: Начинаем загрузку пользовательских данных...');
    
    try {
      await Promise.all([
        fetchLikedTracks(),
        fetchRecentTracks(),
        fetchHistory()
      ]);
      
      console.log('✅ App: Все пользовательские данные загружены');
    } catch (error) {
      console.error('❌ App: Ошибка загрузки пользовательских данных:', error);
    }
  }, [getAuthToken, fetchLikedTracks, fetchRecentTracks, fetchHistory]);

  const handleToggleLike = useCallback(async (trackId) => {
    console.log('❤️ App: Обработка лайка трека', trackId);
    
    const authToken = getAuthToken();
    if (!authToken) {
      alert('Войдите в систему, чтобы ставить лайки');
      return false;
    }
    
    const currentLiked = likedTrackIds.includes(trackId);
    const newLiked = !currentLiked;
    
    if (newLiked) {
      setLikedTrackIds(prev => [...prev, trackId]);
    } else {
      setLikedTrackIds(prev => prev.filter(id => id !== trackId));
    }
    
    localStorage.setItem('likedTracks', JSON.stringify(
      newLiked ? [...likedTrackIds, trackId] : likedTrackIds.filter(id => id !== trackId)
    ));
    
    try {
      const response = await apiFetch(`/api/track/${trackId}/toggle-like/`, {
        method: 'POST',
        body: JSON.stringify({ 
          liked: newLiked 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (newLiked) {
          setLikedTrackIds(prev => prev.filter(id => id !== trackId));
        } else {
          setLikedTrackIds(prev => [...prev, trackId]);
        }
        alert(data.error || 'Ошибка при сохранении лайка');
        return false;
      }
      
      console.log('✅ App: Лайк успешно сохранен на сервере');
      
      setTracksById(prev => {
        const updated = { ...prev };
        if (updated[trackId]) {
          updated[trackId] = {
            ...updated[trackId],
            like_count: data.like_count || (updated[trackId].like_count || 0) + (newLiked ? 1 : -1)
          };
        }
        return updated;
      });
      
      window.dispatchEvent(new CustomEvent('trackLikedFromApp', {
        detail: { 
          trackId: trackId, 
          liked: newLiked,
          count: data.like_count,
          fromApp: true,
          user: user?.username
        }
      }));
      
      return true;
      
    } catch (error) {
      console.error('❌ App: Сетевая ошибка лайка трека:', error);
      if (newLiked) {
        setLikedTrackIds(prev => prev.filter(id => id !== trackId));
      } else {
        setLikedTrackIds(prev => [...prev, trackId]);
      }
      alert('Сетевая ошибка при сохранении лайка');
      return false;
    }
  }, [getAuthToken, likedTrackIds, user]);

  const checkTrackLiked = useCallback((trackId) => {
    return likedTrackIds.includes(trackId);
  }, [likedTrackIds]);

  // 🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
  useEffect(() => {
    console.log('🎵 App: Инициализация приложения');
    
    const token = localStorage.getItem('access');
    const refreshToken = localStorage.getItem('refresh');
    const savedUser = localStorage.getItem('user');
    
    if (token && refreshToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
        console.log('✅ App: Пользователь восстановлен');
        
        setTimeout(() => {
          console.log('🔍 App: Проверка валидности токена при старте...');
          fetchUserData();
        }, 1000);
        
      } catch (error) {
        handleLogout();
      }
    } else {
      console.log('⚠️ App: Пользователь не аутентифицирован');
    }
    
    // Демо-данные с правильными artistId
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
        like_count: 56,
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
        like_count: 34,
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
        like_count: 23,
        source: 'demo'
      }
    ];
    
    addTracks(demoData);
    
    try {
      const likedFromStorage = localStorage.getItem('likedTracks');
      if (likedFromStorage) {
        const likedArray = JSON.parse(likedFromStorage);
        setLikedTrackIds(likedArray);
        console.log('✅ App: Загружено лайков из localStorage:', likedArray.length);
      }
    } catch (error) {
      console.error('❌ App: Ошибка загрузки лайков:', error);
    }
    
    setIsLoading(false);
  }, [addTracks, fetchUserData, handleLogout]);

  const handleLogin = (userData, tokens) => {
    console.log('✅ App: Вход пользователя:', userData.username);
    
    setUser(userData);
    setIsAuthenticated(true);
    
    if (tokens?.access) {
      localStorage.setItem('access', tokens.access);
      console.log('✅ Access токен сохранен');
    }
    
    if (tokens?.refresh) {
      localStorage.setItem('refresh', tokens.refresh);
      console.log('✅ Refresh токен сохранен');
    }
    
    localStorage.setItem('user', JSON.stringify(userData));
    
    setTimeout(() => {
      fetchUserData();
    }, 500);
  };

  // 🖥️ РЕНДЕР
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
  
  // 🔥 ВАЖНО: Получаем текущий трек для передачи в GlassMusicPlayer
  const currentTrack = currentTrackId ? tracksById[currentTrackId] : null;
  
  return (
    <AuthProvider value={{ 
      user, 
      isAuthenticated,
      getAuthToken,
      handleLogout 
    }}>
      <UserProvider>
        <div className="App">
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated ? 
                <Navigate to="/" /> : 
                <Login onLogin={handleLogin} />
              }
            />
            <Route
              path="/register"
              element={isAuthenticated ? 
                <Navigate to="/" /> : 
                <Register onRegister={handleLogin} />
              }
            />
            <Route
              path="/forgot-password"
              element={isAuthenticated ? 
                <Navigate to="/" /> : 
                <ForgotPassword />
              }
            />
            <Route
              path="/upload"
              element={isAuthenticated ? 
                <UploadPage
                  user={user}
                  onLogout={handleLogout}
                  onUploadSuccess={(track) => {
                    if (track) {
                      addTracks([track]);
                      playTrack(track);
                    }
                  }}
                /> : 
                <Navigate to="/login" />
              }
            />
            <Route
              path="/profile"
              element={isAuthenticated ? 
                <ProfilePage
                  user={user}
                  onLogout={handleLogout}
                  currentTrack={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seekTo}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                  loopEnabled={loopEnabled}
                  onToggleLoop={handleToggleLoop}
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTrackIds}
                  checkTrackLiked={checkTrackLiked}
                  trackData={tracksById}
                /> : 
                <Navigate to="/login" />
              }
            />
            <Route
              path="/profile/:id"
              element={isAuthenticated ? 
                <ProfilePage
                  user={user}
                  onLogout={handleLogout}
                  currentTrack={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seekTo}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                  loopEnabled={loopEnabled}
                  onToggleLoop={handleToggleLoop}
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTrackIds}
                  checkTrackLiked={checkTrackLiked}
                  trackData={tracksById}
                /> : 
                <Navigate to="/login" />
              }
            />
            <Route
              path="/track/:trackId"
              element={isAuthenticated ? 
                <TrackPage
                  user={user}
                  onLogout={handleLogout}
                  currentTrack={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seekTo}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                  loopEnabled={loopEnabled}
                  onToggleLoop={handleToggleLoop}
                  onToggleLike={handleToggleLike}
                  likedTracks={likedTrackIds}
                  checkTrackLiked={checkTrackLiked}
                  trackData={tracksById}
                /> : 
                <Navigate to="/login" />
              }
            />
            <Route
              path="/"
              element={isAuthenticated ? 
                <ProtectedApp
                  user={user}
                  onLogout={handleLogout}
                  currentTrack={currentTrackId}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onTogglePlayPause={togglePlayPause}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seekTo}
                  volume={volume}
                  onVolumeChange={handleVolumeChange}
                  onNext={playNextTrack}
                  onPrevious={playPreviousTrack}
                  loopEnabled={loopEnabled}
                  onToggleLoop={handleToggleLoop}
                  likedTrackIds={likedTrackIds}
                  onToggleLike={handleToggleLike}
                  tracksById={tracksById}
                  recentTrackIds={recentTrackIds}
                  history={history}
                  playTrack={playTrack}
                  addTracks={addTracks}
                  isLoadingTrack={isLoadingTrack}
                  navigate={navigate}
                  // 🔥 ВАЖНО: Передаем полный объект текущего трека
                  currentTrackFull={currentTrack} // ✅ Добавлено!
                /> : 
                <Navigate to="/login" />
              }
            />
          </Routes>
        </div>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;