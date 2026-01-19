import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GridScan from '../GridScan';
import Shuffle from './Shuffle';
import GooeyNav from './GooeyNav';
import FloatingLinesDropdown from './FloatingLinesDropdown';
import logoMark from '../logo1.ico';
import './TrackPage.css';
import GlassMusicPlayer from './GlassMusicPlayer';

// Иконки (оставляем без изменений)

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

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
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
  onSeek,  // ✅ ДОБАВИЛИ onSeek из пропсов
}) => {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const currentTrackId = parseInt(trackId);
  
  console.log('🎧 TrackPage render', { 
    currentTime, 
    duration, 
    trackId: currentTrackId,
    currentTrackIdInApp: currentTrack,
    isCurrentTrack: currentTrack === currentTrackId,
    isPlaying 
  });
  
  const [track, setTrack] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('linear-gradient(135deg, #0d0c1d, #111129)');
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
  
  // 🔥 ДОБАВЛЕНО: Ref для отслеживания перемотки
  const isSeekingRef = useRef(false);
  const userMenuRef = useRef(null);
  
  // ✅ 1️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильное получение токена
  const getAuthTokenForTrackPage = useCallback(() => {
    console.log('🔑 TrackPage: Получение токена авторизации...');
    
    // Пробуем все возможные источники
    const token = 
      (getAuthToken && getAuthToken()) ||  // Из пропсов
      sessionToken ||                       // Из сессии
      localStorage.getItem('accessToken') || 
      localStorage.getItem('access') ||
      localStorage.getItem('token') ||
      localStorage.getItem('sessionToken');
    
    console.log('🔑 TrackPage: Полученный токен:', token ? 'есть' : 'ОТСУТСТВУЕТ');
    
    if (!token) {
      console.error('❌ TrackPage: Токен не найден!');
    }
    
    return token;
  }, [getAuthToken, sessionToken]);
  
  const isCurrentTrackPlaying = currentTrack === currentTrackId && isPlaying;

  // ✅ ПРАВИЛЬНАЯ ФУНКЦИЯ: только пауза/продолжение
  const togglePlayPause = useCallback(() => {
    console.log(`🎵 TrackPage: togglePlayPause для трека ${currentTrackId}`);
    
    if (onPlayPause) {
      onPlayPause();
    }
  }, [currentTrackId, onPlayPause]);

  // ✅ Функция для обработки повтора
  const handleToggleLoop = useCallback(() => {
    setRepeatActive(prev => !prev);
    if (onToggleLoop) {
      onToggleLoop();
    }
  }, [onToggleLoop]);

  const demoData = {
    1: {
      id: 1,
      title: "hard drive (slowed & muffled)",
      artist: "griffinilla",
      cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
      audio_url: "/tracks/track1.mp3",
      duration: "3:20",
      hashtags: ["#slowed", "#lofi", "#electronic"],
      artistInfo: {
        name: "griffinilla",
        followers: "125k",
        tracks: 42
      },
      stats: {
        reposts: 3241,
        plays: 254789,
        likes: 56
      }
    },
    2: {
      id: 2,
      title: "Deutschland",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "/tracks/track2.mp3",
      duration: "5:22",
      hashtags: ["#industrial", "#metal", "#german"],
      artistInfo: {
        name: "Rammstein",
        followers: "2.4M",
        tracks: 156
      },
      stats: {
        reposts: 89124,
        plays: 12457896,
        likes: 34
      }
    },
    3: {
      id: 3,
      title: "Sonne",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      audio_url: "/tracks/track3.mp3",
      duration: "4:05",
      hashtags: ["#industrial", "#metal", "#rock"],
      artistInfo: {
        name: "Rammstein",
        followers: "2.4M",
        tracks: 156
      },
      stats: {
        reposts: 74521,
        plays: 9874123,
        likes: 23
      }
    }
  };

  const loadTrack = useCallback(async () => {
    if (!currentTrackId) return;
    
    console.log(`🎵 TrackPage: Загрузка данных трека ${currentTrackId}...`);
    setIsLoading(true);
    
    try {
      let trackDataItem = trackData[currentTrackId] || demoData[currentTrackId];
      
      if (trackDataItem) {
        console.log(`✅ Используем данные из trackData`);
        const formattedTrack = {
          id: trackDataItem.id,
          title: trackDataItem.title,
          artist: trackDataItem.artist || 'Неизвестный артист',
          cover: trackDataItem.cover || trackDataItem.cover_url || '',
          audio_url: trackDataItem.audio_url || '',
          duration: trackDataItem.duration || '3:00',
          hashtags: trackDataItem.hashtags || [],
          artistInfo: trackDataItem.artistInfo || {
            name: trackDataItem.artist || 'Неизвестный артист',
            followers: "1k",
            tracks: 1
          },
          stats: trackDataItem.stats || {
            reposts: trackDataItem.repost_count || 0,
            plays: trackDataItem.play_count || 0,
            likes: trackDataItem.like_count || 0
          }
        };
        
        setTrack(formattedTrack);
        setTrackLikesCount(formattedTrack.stats.likes || 0);
        analyzeImageColor(formattedTrack.cover);
        
        try {
          const waveformResponse = await fetch(`/api/tracks/${currentTrackId}/waveform/`);
          if (waveformResponse.ok) {
            const waveformData = await waveformResponse.json();
            setWaveformData(waveformData.waveform || []);
          }
        } catch (error) {
          console.warn('⚠️ Ошибка загрузки waveform:', error);
          setWaveformData(Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15));
        }
        
        await loadComments(currentTrackId);
        setIsLoading(false);
        
        console.log(`✅ TrackPage: Данные трека ${currentTrackId} загружены (не играет)`);
        return;
      }
      
      console.log(`🔄 Пробуем загрузить с сервера`);
      const response = await fetch(`/api/tracks/${currentTrackId}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`✅ Загружен трек с сервера: ${data.title} (ID: ${data.id})`);
      
      const formattedTrack = {
        id: data.id,
        title: data.title,
        artist: data.artist || 'Неизвестный артист',
        cover: data.cover || data.cover_url || '',
        audio_url: data.audio_url || '',
        duration: data.duration || '3:00',
        hashtags: data.hashtags || [],
        artistInfo: {
          name: data.artist || (data.uploaded_by?.username || 'Неизвестный артист'),
          followers: "1k",
          tracks: 1
        },
        stats: {
          reposts: data.repost_count || 0,
          plays: data.play_count || 0,
          likes: data.like_count || 0
        }
      };
      
      setTrack(formattedTrack);
      setTrackLikesCount(data.like_count || 0);
      
      if (data.cover) {
        analyzeImageColor(data.cover);
      }
      
      try {
        const waveformResponse = await fetch(`/api/tracks/${currentTrackId}/waveform/`);
        if (waveformResponse.ok) {
          const waveformData = await waveformResponse.json();
          setWaveformData(waveformData.waveform || []);
        }
      } catch (error) {
        console.warn('⚠️ Ошибка загрузки waveform, используем дефолтный:', error);
        setWaveformData(Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15));
      }
      
      await loadComments(currentTrackId);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки трека:', error);
      
      const demoTrack = demoData[currentTrackId];
      if (demoTrack) {
        console.log(`✅ Используем демо-данные`);
        setTrack(demoTrack);
        setTrackLikesCount(demoTrack.stats.likes || 0);
        analyzeImageColor(demoTrack.cover);
        setWaveformData(Array(60).fill().map((_, i) => 20 + Math.sin(i * 0.2) * 40 + Math.random() * 15));
        setComments([]);
      } else {
        setTrack(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTrackId, trackData]);

  // ✅ 2️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: syncLikesWithBackend с правильным Authorization
  const syncLikesWithBackend = useCallback(async () => {
    const authToken = getAuthTokenForTrackPage();
    
    if (!authToken) {
      console.log(`⚠️ TrackPage: Нет токена для синхронизации лайков`);
      setIsTrackLiked(checkTrackLiked ? checkTrackLiked(currentTrackId) : false);
      setLoadingLikes(false);
      return false;
    }
    
    try {
      setLoadingLikes(true);
      console.log(`🔄 TrackPage: Синхронизация лайков трека ${currentTrackId}`);
      
      // ✅ ИСПРАВЛЕНО: Добавлен Authorization header
      const response = await fetch(`http://localhost:8000/api/tracks/${currentTrackId}/check-like/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const serverLiked = data.liked || false;
        const serverLikeCount = data.like_count || 0;
        
        console.log(`✅ TrackPage: Серверные данные: liked=${serverLiked}, count=${serverLikeCount}`);
        
        setIsTrackLiked(serverLiked);
        setTrackLikesCount(serverLikeCount);
        
        const likedTracksStorage = localStorage.getItem('likedTracks');
        if (likedTracksStorage) {
          const likedArray = JSON.parse(likedTracksStorage);
          const currentIndex = likedArray.indexOf(currentTrackId);
          
          if (serverLiked && currentIndex === -1) {
            likedArray.push(currentTrackId);
            localStorage.setItem('likedTracks', JSON.stringify(likedArray));
            console.log(`💾 TrackPage: Добавлен лайк в localStorage`);
          } else if (!serverLiked && currentIndex !== -1) {
            likedArray.splice(currentIndex, 1);
            localStorage.setItem('likedTracks', JSON.stringify(likedArray));
            console.log(`🗑️ TrackPage: Удален лайк из localStorage`);
          }
        }
        
        return serverLiked;
      }
    } catch (error) {
      console.error('❌ TrackPage: Ошибка синхронизации лайков:', error);
    } finally {
      setLoadingLikes(false);
    }
    
    return false;
  }, [currentTrackId, getAuthTokenForTrackPage, checkTrackLiked]);

  // ✅ Загружаем данные трека при монтировании
  useEffect(() => {
    loadTrack();
    setRepeatActive(loopEnabled || false);
  }, [loadTrack, loopEnabled]);

  // Синхронизация состояния лайков с App.js
  useEffect(() => {
    if (currentTrackId) {
      console.log(`🔄 TrackPage: Начало синхронизации лайков для трека ${currentTrackId}`);
      const authToken = getAuthTokenForTrackPage();
      if (authToken) {
        syncLikesWithBackend();
      } else {
        console.log(`⚠️ TrackPage: Нет токена, лайки недоступны`);
        setIsTrackLiked(checkTrackLiked ? checkTrackLiked(currentTrackId) : false);
        setLoadingLikes(false);
      }
    }
  }, [currentTrackId, syncLikesWithBackend, checkTrackLiked, getAuthTokenForTrackPage]);

  // Слушаем глобальные события лайков
  useEffect(() => {
    const handleGlobalTrackLiked = (event) => {
      const { trackId: eventTrackId, liked } = event.detail;
      if (eventTrackId === currentTrackId) {
        console.log(`📢 TrackPage: Получено глобальное событие лайка: ${eventTrackId} -> ${liked}`);
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

  // ✅ 3️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Лайк трека с правильными заголовками
  const handleTrackLike = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    console.log('🔑 TrackPage: Токен для лайка:', authToken ? 'есть' : 'ОТСУТСТВУЕТ');
    
    if (!authToken) {
      alert('Войдите в систему, чтобы ставить лайки');
      return;
    }
    
    if (syncInProgress || loadingLikes) return;
    
    const newLikedState = !isTrackLiked;
    
    console.log('❤️ TrackPage: Обработка лайка трека:', {
      trackId: currentTrackId,
      from: isTrackLiked,
      to: newLikedState,
      currentCount: trackLikesCount,
      user: user?.username
    });
    
    setSyncInProgress(true);
    
    try {
      // ✅ ИСПРАВЛЕНО: Правильный URL и заголовки (без CSRF)
      const response = await fetch('http://localhost:8000/api/tracks/like/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          track_id: currentTrackId,
          liked: newLikedState
        })
      });
      
      const data = await response.json();
      
      console.log('📡 TrackPage: Ответ сервера на лайк:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      if (response.ok && data.success) {
        console.log('✅ TrackPage: Лайк сохранен на сервере:', data);
        
        // ТОЛЬКО ПОСЛЕ УСПЕШНОГО ОТВЕТА меняем UI
        setIsTrackLiked(newLikedState);
        
        if (data.like_count !== undefined) {
          setTrackLikesCount(data.like_count);
        } else {
          setTrackLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
        }
        
        // Обновляем localStorage
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
            count: data.like_count || trackLikesCount,
            fromTrackPage: true,
            user: user?.username,
            timestamp: Date.now()
          }
        }));
        
        window.dispatchEvent(new CustomEvent('trackLikedServer', {
          detail: { 
            trackId: currentTrackId, 
            liked: newLikedState, 
            count: data.like_count || trackLikesCount,
            success: true,
            fromTrackPage: true
          }
        }));
        
        if (onToggleLike) {
          try {
            await onToggleLike(currentTrackId);
          } catch (error) {
            console.error('❌ TrackPage: Ошибка вызова onToggleLike:', error);
          }
        }
        
      } else {
        console.error('❌ TrackPage: Ошибка сервера:', data.error);
        
        if (data.error && data.error.includes('аутентификации')) {
          alert('Сессия истекла. Пожалуйста, войдите заново.');
          onLogout?.();
        } else {
          alert(data.error || 'Ошибка при сохранении лайка');
        }
      }
    } catch (error) {
      console.error('❌ TrackPage: Сетевая ошибка лайка трека:', error);
      alert('Сетевая ошибка при сохранении лайка');
    } finally {
      setSyncInProgress(false);
    }
  };

  const analyzeImageColor = (imageUrl) => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      let count = 0;
      
      for (let i = 0; i < data.length; i += 40) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      const bgColor = `linear-gradient(135deg, 
        rgba(${r}, ${g}, ${b}, 0.8) 0%,
        rgba(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)}, 0.6) 50%,
        rgba(13, 12, 29, 0.9) 100%
      )`;
      
      setBackgroundColor(bgColor);
    };
  };

  // ✅ 4️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: loadComments с правильным Authorization
  const loadComments = async (trackId) => {
    try {
      const authToken = getAuthTokenForTrackPage();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      console.log(`💬 TrackPage: Загрузка комментариев для трека ${trackId}...`);
      
      // ✅ ИСПРАВЛЕНО: Абсолютный URL
      const response = await fetch(`http://localhost:8000/api/tracks/${trackId}/comments/`, {
        method: 'GET',
        headers: headers
      });
      
      console.log('📡 TrackPage: Ответ сервера на загрузку комментариев:', {
        status: response.status,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ TrackPage: Загружено комментариев: ${data.comments?.length || 0}`);
        
        setComments(data.comments || []);
        
        const likedCommentsSet = new Set();
        data.comments?.forEach(comment => {
          if (comment.user_liked) {
            likedCommentsSet.add(comment.id);
          }
        });
        setLikedComments(likedCommentsSet);
      } else {
        console.log(`⚠️ TrackPage: Комментарии не загружены, статус: ${response.status}`);
        setComments([]);
      }
    } catch (error) {
      console.error('❌ TrackPage: Ошибка загрузки комментариев:', error);
      setComments([]);
    }
  };

  // ✅ 5️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавление комментария с правильными заголовками
  const handleAddComment = async () => {
    const authToken = getAuthTokenForTrackPage();
    
    console.log('🔑 TrackPage: Токен для комментария:', authToken ? 'есть' : 'ОТСУТСТВУЕТ');
    
    if (!newComment.trim() || isAddingComment) return;
    
    if (!authToken) {
      alert('Требуется войти в систему для комментирования');
      return;
    }
    
    setIsAddingComment(true);
    console.log(`📝 TrackPage: Добавление комментария: "${newComment.substring(0, 30)}..."`);
    
    try {
      // ✅ ИСПРАВЛЕНО: Абсолютный URL и правильные заголовки (без CSRF)
      const response = await fetch(`http://localhost:8000/api/tracks/${currentTrackId}/comments/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ text: newComment })
      });
      
      const data = await response.json();
      
      console.log('📡 TrackPage: Ответ сервера на добавление комментария:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      if (response.ok && data.comment) {
        console.log('✅ TrackPage: Комментарий добавлен:', data.comment);
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        console.error('❌ TrackPage: Ошибка добавления комментария:', data.error);
        alert(`Ошибка при добавлении комментария: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('❌ TrackPage: Сетевая ошибка добавления комментария:', error);
      alert('Сетевая ошибка при отправке комментария');
    } finally {
      setIsAddingComment(false);
    }
  };

  // ✅ 6️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удаление комментария с правильными заголовками
  const handleDeleteComment = async (commentId) => {
    const authToken = getAuthTokenForTrackPage();
    
    if (isDeletingComment || !authToken) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }
    
    setIsDeletingComment(true);
    
    try {
      // ✅ ИСПРАВЛЕНО: Абсолютный URL и правильные заголовки (без CSRF)
      const response = await fetch(`http://localhost:8000/api/comments/${commentId}/delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        }
      });
      
      console.log('📡 TrackPage: Ответ сервера на удаление комментария:', {
        status: response.status,
        ok: response.ok
      });
      
      if (response.ok) {
        console.log(`✅ TrackPage: Комментарий ${commentId} удален`);
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
      console.error('❌ TrackPage: Сетевая ошибка удаления комментария:', error);
      alert('Сетевая ошибка при удалении комментария');
    } finally {
      setIsDeletingComment(false);
    }
  };

  // ✅ 7️⃣ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Лайк комментария с правильными заголовками
  const handleLikeComment = async (commentId) => {
    const authToken = getAuthTokenForTrackPage();
    
    console.log('🔑 TrackPage: Токен для лайка комментария:', authToken ? 'есть' : 'ОТСУТСТВУЕТ');
    
    try {
      if (!authToken) {
        alert('Войдите в систему, чтобы ставить лайки комментариям');
        return;
      }
      
      const isCurrentlyLiked = likedComments.has(commentId);
      const newLiked = !isCurrentlyLiked;
      
      console.log('❤️ TrackPage: Лайк комментария:', {
        commentId,
        from: isCurrentlyLiked,
        to: newLiked
      });
      
      // ✅ ИСПРАВЛЕНО: Абсолютный URL и правильные заголовки (без CSRF)
      const response = await fetch(`http://localhost:8000/api/comments/${commentId}/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          liked: newLiked
        })
      });
      
      const data = await response.json();
      
      console.log('📡 TrackPage: Ответ сервера на лайк комментария:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      if (response.ok && data.success) {
        console.log('✅ TrackPage: Лайк комментария сохранен:', data);
        
        // ТОЛЬКО ПОСЛЕ УСПЕШНОГО ОТВЕТА меняем UI
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
        console.error('❌ TrackPage: Ошибка сервера:', data.error);
        alert(data.error || 'Ошибка при сохранении лайка');
      }
    } catch (error) {
      console.error('❌ TrackPage: Сетевая ошибка лайка комментария:', error);
      alert('Сетевая ошибка при сохранении лайка');
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ПРАВИЛЬНЫЙ seek
  const handleBarClick = useCallback((index) => {
    if (!duration || !waveformData.length || !onSeek) return;
    
    const percent = index / waveformData.length;
    const newTime = percent * duration;
    
    console.log('🎯 TrackPage: Клик по палочке - SEEK:', {
      index,
      newTime: formatTime(newTime),
      currentTime: formatTime(currentTime)
    });
    
    // 🔥 Устанавливаем флаг перемотки
    isSeekingRef.current = true;
    
    // 🔥 Вызываем onSeek из пропсов (главный контроллер плеера)
    onSeek(newTime);
    
    // 🔥 Снимаем флаг через небольшое время
    setTimeout(() => {
      isSeekingRef.current = false;
      console.log('✅ TrackPage: Завершена перемотка');
    }, 100);
  }, [duration, waveformData.length, onSeek, currentTime]);

  // ✅ Единый источник progress
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

  const actionIcons = [
    { label: 'Upload', Icon: IconUpload },
    { label: 'Notifications', Icon: IconBell },
    { label: 'Messages', Icon: IconMessage }
  ];
  
  const relatedTracks = [
    {
      id: 2,
      title: "Deutschland",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      duration: "5:22"
    },
    {
      id: 3,
      title: "Sonne",
      artist: "Rammstein",
      cover: "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
      duration: "4:05"
    }
  ];

  const albums = [
    {
      id: 1,
      title: "Greatest Hits",
      artist: "griffinilla",
      cover: "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
      trackCount: 12
    },
    {
      id: 2,
      title: "Mutter",
      artist: "Rammstein",
      cover: "https://upload.wikimedia.org/wikipedia/en/7/71/Mutter_%28Rammstein_album%29_cover.jpg",
      trackCount: 11
    }
  ];

  const playlists = [
    {
      id: 1,
      title: "Industrial Metal Essentials",
      creator: "MetalHead",
      cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
      trackCount: 25
    },
    {
      id: 2,
      title: "Lofi Study Mix",
      creator: "StudyBeats",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
      trackCount: 18
    }
  ];

  const usersWhoLikedStatic = [
    {
      id: 1,
      username: "metal_fan_88",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80",
      tracksLiked: 124
    },
    {
      id: 2,
      username: "synthwave_dreamer",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80",
      tracksLiked: 89
    },
    {
      id: 3,
      username: "electronic_artist",
      avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=120&q=80",
      tracksLiked: 256
    }
  ];

  const usersWhoReposted = [
    {
      id: 4,
      username: "repost_king",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
    },
    {
      id: 5,
      username: "darkwave",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80"
    },
    {
      id: 6,
      username: "retro_soul",
      avatar: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=120&q=80"
    }
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
          linesColor="#ffffff"
          gridScale={0.12}
          scanColor="#8456ff"
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

  const usersWhoLiked = (() => {
    const base = [...usersWhoLikedStatic];
    if (isTrackLiked && user) {
      base.unshift({
        id: 'current-user',
        username: user.username,
        avatar: user.avatar || '',
        tracksLiked: 0
      });
    }
    return base;
  })();

  return (
    <div className="track-page" style={{ background: backgroundColor }}>
      <GridScan
        className="background-gridscan"
        sensitivity={0.65}
        lineThickness={1}
        linesColor="#ffffff"
        gridScale={0.12}
        scanColor="#8456ff"
        scanOpacity={0.2}
      />

      <header className="site-header">
        <nav className="sound-nav">
          <div className="nav-left">
            <button
              className="brand"
              onClick={() => navigate('/')}
            >
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
            </button>
            
            <GooeyNav
              items={primaryNav}
              particleCount={12}
              particleDistances={[90, 20]}
              particleR={120}
              initialActiveIndex={0}
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
              />
              <button type="button" aria-label="Search" className="nav-search-btn">
                <IconSearch />
              </button>
            </div>
          </div>

          <div className="nav-right">
            <button className="nav-pill" type="button">
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
                  <IconUserCircle />
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
                      <IconUserCircle />
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
            </div>
            
            <div className="track-hashtags">
              {track.hashtags && track.hashtags.map((tag, index) => (
                <Shuffle
                  key={tag}
                  text={tag}
                  shuffleDirection={index % 2 === 0 ? 'right' : 'left'}
                  duration={0.4 + index * 0.1}
                  animationMode="random"
                  shuffleTimes={1}
                  ease="power2.out"
                  stagger={0.02}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#94a3b8',
                    marginRight: '10px'
                  }}
                />
              ))}
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
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: isTrackLiked ? '#8456ff' : '#ffffff'
                  }}>
                    {trackLikesCount.toLocaleString()} likes
                  </span>
                </div>
                <div className="stat-item">
                  <IconShare />
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#ffffff'
                  }}>
                    {track.stats.reposts.toLocaleString()} reposts
                  </span>
                </div>
                <div className="stat-item">
                  <IconPlay />
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#ffffff'
                  }}>
                    {track.stats.plays.toLocaleString()} plays
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
              <div className="artist-details">
                <div className="artist-avatar">
                  <IconUser />
                </div>
                <div className="artist-info">
                  <h4>{track.artistInfo.name}</h4>
                  <div className="artist-stats">
                    <span>{track.artistInfo.followers} followers</span>
                    <span className="stat-separator">•</span>
                    <span>{track.artistInfo.tracks} tracks</span>
                  </div>
                </div>
                <div className="artist-actions">
                  <button className="follow-button">Follow</button>
                  <button className="repost-button">
                    <IconShare />
                    <span>Repost</span>
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
                    return (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-user">
                          <div className="comment-avatar">
                            {comment.user?.avatar ? (
                              <img src={comment.user.avatar} alt={comment.user.username} />
                            ) : (
                              <IconUser />
                            )}
                          </div>
                          <div className="comment-info">
                            <div className="comment-header">
                              <span className="comment-username">{comment.user?.username || 'Anonymous'}</span>
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
            <div className="related-section">
              <h3>Related Tracks</h3>
              <div className="related-tracks-grid">
                {relatedTracks.map(relatedTrack => (
                  <div 
                    key={relatedTrack.id} 
                    className="related-track-card"
                    onClick={() => {
                      navigate(`/track/${relatedTrack.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="related-track-cover">
                      <img src={relatedTrack.cover} alt={relatedTrack.title} />
                      <button 
                        className="related-play-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayPause();
                        }}
                      >
                        <IconPlay />
                      </button>
                    </div>
                    <div className="related-track-info">
                      <div 
                        className="related-track-title"
                        style={{
                          cursor: 'pointer',
                          transition: 'color 0.2s ease',
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#8456ff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                      >
                        {relatedTrack.title}
                      </div>
                      <div 
                        className="related-track-artist"
                        style={{
                          fontSize: '0.8rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#94a3b8'
                        }}
                      >
                        {relatedTrack.artist}
                      </div>
                      <div 
                        className="related-track-duration"
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#64748b'
                        }}
                      >
                        {relatedTrack.duration}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="playlists-section">
              <h3>In playlists</h3>
              <div className="playlists-grid">
                {playlists.map(playlist => (
                  <div 
                    key={playlist.id} 
                    className="playlist-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      alert(`Будущая страница плейлиста: ${playlist.title}`);
                    }}
                  >
                    <img src={playlist.cover} alt={playlist.title} />
                    <div className="playlist-info">
                      <div 
                        className="playlist-title"
                        style={{
                          cursor: 'pointer',
                          transition: 'color 0.2s ease',
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#8456ff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                      >
                        {playlist.title}
                      </div>
                      <div 
                        className="playlist-creator"
                        style={{
                          fontSize: '0.8rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#94a3b8'
                        }}
                      >
                        by {playlist.creator}
                      </div>
                      <div 
                        className="playlist-track-count"
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#64748b'
                        }}
                      >
                        {playlist.trackCount} tracks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="users-section">
              <h3>Users who liked this track</h3>
              <div className="users-grid">
                {usersWhoLiked.map(userItem => (
                  <div key={userItem.id} className="user-card">
                    <div className="user-avatar">
                      {userItem.avatar ? (
                        <img src={userItem.avatar} alt={userItem.username} />
                      ) : (
                        <IconUser />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="users-section">
              <h3>Users who reposted</h3>
              <div className="users-grid">
                {usersWhoReposted.map(userItem => (
                  <div key={userItem.id} className="user-card">
                    <div className="user-avatar">
                      {userItem.avatar ? (
                        <img src={userItem.avatar} alt={userItem.username} />
                      ) : (
                        <IconUser />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="albums-section">
              <h3>More from {track.artist}</h3>
              <div className="albums-grid">
                {albums.map(album => (
                  <div 
                    key={album.id} 
                    className="album-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      alert(`Будущая страница альбома: ${album.title}`);
                    }}
                  >
                    <img src={album.cover} alt={album.title} />
                    <div className="album-info">
                      <div 
                        className="album-title"
                        style={{
                          cursor: 'pointer',
                          transition: 'color 0.2s ease',
                          fontSize: '0.9rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#8456ff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ffffff'}
                      >
                        {album.title}
                      </div>
                      <div 
                        className="album-artist"
                        style={{
                          fontSize: '0.8rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#94a3b8'
                        }}
                      >
                        {album.artist}
                      </div>
                      <div 
                        className="album-track-count"
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: "'Press Start 2P', sans-serif",
                          color: '#64748b'
                        }}
                      >
                        {album.trackCount} tracks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
        onSeek={onSeek}  // ✅ ПЕРЕДАЕМ onSeek дальше
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
        showInFooter={true}
        trackInfo={track}
        getAuthToken={getAuthTokenForTrackPage}
      />
    </div>
  );
};

export default TrackPage;