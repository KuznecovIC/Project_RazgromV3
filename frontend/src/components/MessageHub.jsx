import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ Добавлен useLocation
import EmojiPicker from 'emoji-picker-react';
import twemoji from 'twemoji';
import './MessageHub.css';
import Beams from './Beams';
import { apiFetch } from '../api/apiFetch';

// 🔥 Компонент для отображения текста с эмодзи через Twemoji (флаги работают!)
function EmojiText({ text }) {
  const html = useMemo(() => {
    const safe = String(text || '');
    // twemoji превращает эмодзи в <img> с SVG
    return twemoji.parse(safe, {
      folder: 'svg',
      ext: '.svg',
      className: 'emoji', // добавляем класс для стилизации
      attributes: () => ({
        alt: '', // скрываем от скринридеров, т.к. эмодзи уже есть в тексте
        'aria-hidden': 'true'
      })
    });
  }, [text]);

  return (
    <span
      className="mh-bubble-text"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// 🔥 Функция форматирования секунд в MM:SS
const formatSec = (sec) => {
  const s = Number(sec || 0);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
};

// 🔥 Функция форматирования времени сообщения
const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function MessageHub({ user, getAuthToken, navigate }) {
  const routerNavigate = useNavigate();
  const location = useLocation(); // ✅ Добавлено для получения query-параметров
  
  // ==================== СОСТОЯНИЯ ====================
  const [dialogs, setDialogs] = useState([]);           // список диалогов слева
  const [activeDialogId, setActiveDialogId] = useState(null); // выбранный диалог
  const [messages, setMessages] = useState([]);         // сообщения текущего диалога
  
  const [peopleQuery, setPeopleQuery] = useState('');   // текст поиска людей
  const [peopleResults, setPeopleResults] = useState([]); // результаты поиска
  const [isSearching, setIsSearching] = useState(false); // флаг поиска
  
  const [text, setText] = useState('');                  // текст нового сообщения
  const [activity, setActivity] = useState(null);        // now-playing данные
  const [nowPlayingEnabled, setNowPlayingEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);     // загрузка поиска
  const [isSending, setIsSending] = useState(false);     // отправка сообщения
  const [debugInfo, setDebugInfo] = useState(null);      // для отладки
  
  // 🔥 НОВОЕ: состояние для статуса присутствия текущего собеседника
  const [userPresence, setUserPresence] = useState(null);
  
  // 🔥 НОВОЕ: карта статусов для всех пользователей в списке диалогов
  const [presenceMap, setPresenceMap] = useState({}); // { [userId]: 'online'|'afk'|'offline' }

  // ==================== EMOJI & REACTIONS ====================
  // 🔥 НОВОЕ: режим правой панели: 'profile' | 'emoji'
  const [rightMode, setRightMode] = useState('profile');

  // ✅ меню сообщения (ПКМ)
  const [msgMenu, setMsgMenu] = useState(null); 
  // { x, y, msgId }
  
  // ✅ Emoji panel mode: send or react
  const [emojiPanel, setEmojiPanel] = useState({
    open: false,        // открыт ли emoji-панель справа
    mode: 'send',       // 'send' | 'react'
    targetMsgId: null,  // msgId для реакции
  });
  
  const QUICK_REACTIONS = ['❤️','😂','👍','😮','😍','😭','🎉'];

  // ==================== ATTACH (image/video) ====================
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachFile, setAttachFile] = useState(null); // File
  const [attachPreviewUrl, setAttachPreviewUrl] = useState(null); // blob url
  const [attachType, setAttachType] = useState(null); // 'image' | 'video'
  const [attachCaption, setAttachCaption] = useState('');

  const attachInputRef = useRef(null);

  // ==================== VOICE MESSAGES ====================
  const [isRecording, setIsRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const mediaRecRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);

  const recStartAtRef = useRef(0);
  const recTimerRef = useRef(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  // ✅ флаг: надо ли отправлять (если запись слишком короткая)
  const shouldSendVoiceRef = useRef(true);
  
  // ✅ ПАТЧ 2: флаг для первого chunk
  const gotFirstChunkRef = useRef(false);

  // проигрывание войса (один общий audio, чтобы не создавалось 100 штук)
  const voiceAudioRef = useRef(null);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  
  // ✅ позиция проигрывания для каждого voice: { [messageId]: seconds }
  const [voicePosMap, setVoicePosMap] = useState({});
  
  // ✅ какой msg.id сейчас управляет audio
  const voiceOwnerIdRef = useRef(null);

  // ✅ refs для автоперехода (чтобы не пересоздавать слушатели)
  const voiceOrderRef = useRef([]);
  const playVoiceRef = useRef(null);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // ====== SCROLL CONTROL (чтобы не прыгало вниз когда ты читаешь вверх) ======
  const chatBodyRef = useRef(null);
  const isNearBottomRef = useRef(true);
  
  // ✅ Jump-to-bottom кнопка
  const [showJumpBtn, setShowJumpBtn] = useState(false);
  const [newBelowCount, setNewBelowCount] = useState(0);
  const lastMsgCountRef = useRef(0);

  // ==================== ЗАКРЫТИЕ МЕНЮ ПО КЛИКУ ====================
  useEffect(() => {
    const close = () => setMsgMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = chatBodyRef.current;
    if (!el) return;

    const threshold = 140; // px — насколько “рядом с низом” считаем что пользователь внизу
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    const nearBottom = distanceToBottom < threshold;
    isNearBottomRef.current = nearBottom;

    // ✅ показать/скрыть кнопку
    setShowJumpBtn(!nearBottom);

    // ✅ если пользователь вернулся вниз — сбрасываем счётчик
    if (nearBottom) {
      setNewBelowCount(0);
    }
  }, []);

  // ==================== UNREAD COUNT (БЕЙДЖ) ====================
  const getUnreadCount = useCallback((d) => {
    const n =
      (d?.unread_count ??
        d?.unread ??
        d?.unread_messages ??
        d?.unreadCount ??
        d?.unread_count_messages ??
        0);
    return Number.isFinite(Number(n)) ? Number(n) : 0;
  }, []);

  // ==================== НАВИГАЦИЯ НА ПРОФИЛЬ ====================
  const goToProfile = (user) => {
    if (!user) return;
    const uid = user.id ?? user.user_id ?? user.pk;
    if (uid) routerNavigate(`/profile/${uid}`);
  };

  // ==================== НАВИГАЦИЯ НА ТРЕК ====================
  const getTrackId = (t) => t?.id ?? t?.track_id ?? t?.pk ?? null;

  const goToTrack = (track) => {
    const tid = getTrackId(track);
    if (tid) routerNavigate(`/track/${tid}`);
  };

  // ==================== ПИНГ ОНЛАЙН ====================
  useEffect(() => {
    const pingOnline = async () => {
      try {
        await apiFetch('/api/presence/ping/', { method: 'POST' });
        console.log('✅ Presence ping sent');
      } catch (err) {
        console.log('ℹ️ Presence ping error (ignored):', err.message);
      }
    };

    pingOnline();
    const interval = setInterval(pingOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==================== ЗАГРУЗКА СТАТУСОВ ДЛЯ СПИСКА ДИАЛОГОВ ====================
  const loadPresenceForDialogs = useCallback(async (list) => {
    try {
      const ids = Array.from(
        new Set((list || [])
          .map(d => d?.other_user?.id)
          .filter(Boolean))
      );

      if (ids.length === 0) return;

      const results = await Promise.all(ids.map(async (uid) => {
        try {
          const res = await apiFetch(`/api/users/${uid}/presence/`);
          if (!res.ok) return [uid, 'offline'];
          const data = await res.json();
          return [uid, data?.presence || 'offline'];
        } catch {
          return [uid, 'offline'];
        }
      }));

      setPresenceMap(prev => {
        const next = { ...prev };
        for (const [uid, p] of results) next[uid] = p;
        return next;
      });
    } catch (e) {
      console.warn('⚠️ presence load failed', e);
    }
  }, []);

  // ==================== ЗАГРУЗКА ДИАЛОГОВ ====================
  const loadDialogs = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dialogs/');
      if (!res.ok) {
        console.warn(`⚠️ MessageHub: Ошибка загрузки диалогов: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      const list = data.dialogs || [];
      console.log(`📋 MessageHub: Загружено ${list.length} диалогов`);
      setDialogs(list);
      
      await loadPresenceForDialogs(list);

      if (activeDialogId && !list.some(d => d.id === activeDialogId)) {
        setActiveDialogId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('❌ MessageHub: Ошибка сети при загрузке диалогов:', err);
    }
  }, [activeDialogId, loadPresenceForDialogs]);

  // Загрузка при монтировании и периодическое обновление
  useEffect(() => {
    let cancelled = false;
    let interval;

    const load = async () => {
      if (cancelled) return;
      await loadDialogs();
    };

    load();
    interval = setInterval(load, 6000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadDialogs]);

  // Периодическое обновление статусов
  useEffect(() => {
    if (!dialogs || dialogs.length === 0) return;
    const t = setInterval(() => loadPresenceForDialogs(dialogs), 8000);
    return () => clearInterval(t);
  }, [dialogs, loadPresenceForDialogs]);

  // ==================== ЗАГРУЗКА СООБЩЕНИЙ ====================
  useEffect(() => {
    if (!activeDialogId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    let interval;

    const loadMessages = async () => {
      try {
        const res = await apiFetch(`/api/dialogs/${activeDialogId}/messages/`);
        if (!res.ok) {
          console.warn(`⚠️ MessageHub: Ошибка загрузки сообщений: ${res.status}`);
          return;
        }
        
        const data = await res.json();
        if (!cancelled) {
          const msgs = data.messages || [];
          console.log(`📋 MessageHub: Загружено ${msgs.length} сообщений`);
          
          const msgsWithStatus = msgs.map(msg => ({
            ...msg,
            _status: msg.is_mine ? 'delivered' : null
          }));
          
          setMessages(msgsWithStatus);
        }
      } catch (err) {
        console.error('❌ MessageHub: Ошибка сети при загрузке сообщений:', err);
      }
    };

    loadMessages();
    interval = setInterval(loadMessages, 3000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeDialogId]);

  // ==================== ЗАГРУЗКА СООБЩЕНИЙ (отдельная функция) ====================
  const loadMessagesForDialog = async (dialogId) => {
    try {
      const res = await apiFetch(`/api/dialogs/${dialogId}/messages/`);
      if (!res.ok) {
        console.warn(`⚠️ MessageHub: Ошибка загрузки сообщений: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      const msgs = data.messages || [];
      console.log(`📋 MessageHub: Загружено ${msgs.length} сообщений`);
      
      const msgsWithStatus = msgs.map(msg => ({
        ...msg,
        _status: msg.is_mine ? 'delivered' : null
      }));
      
      setMessages(msgsWithStatus);
      
      isNearBottomRef.current = true;
      setTimeout(() => {
        const el = chatBodyRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('❌ MessageHub: Ошибка сети при загрузке сообщений:', err);
    }
  };

  // ==================== ПОИСК ЛЮДЕЙ ====================
  useEffect(() => {
    const q = (peopleQuery || '').trim();
    if (!q) {
      setPeopleResults([]);
      return;
    }

    let cancelled = false;
    let timeout;

    const loadPeople = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(`/api/search/?type=people&q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          console.warn(`⚠️ MessageHub: Ошибка поиска людей: ${res.status}`);
          return;
        }

        const data = await res.json();
        const list = data.people || data.users || [];

        if (!cancelled) {
          console.log(`📋 MessageHub: Найдено ${list.length} пользователей`);
          setPeopleResults(list);
        }
      } catch (err) {
        console.error('❌ MessageHub: Ошибка сети при поиске людей:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    timeout = setTimeout(loadPeople, 250);
    
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [peopleQuery]);

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ВЫЧИСЛЕНИЯ ====================
  const activeDialog = useMemo(
    () => dialogs.find(d => d.id === activeDialogId) || null,
    [dialogs, activeDialogId]
  );

  const otherUser = activeDialog?.other_user || null;
  const otherUserId = otherUser?.id || null;

  const otherLastReadId = activeDialog?.other_last_read_message_id || null;

  const getMessageStatus = useCallback((msg) => {
    if (!msg.is_mine) return null;

    if (msg._status === 'sending') return 'sending';
    if (msg._status === 'error') return 'error';

    if (otherLastReadId && msg.id <= otherLastReadId) {
      return 'read';
    }

    return 'delivered';
  }, [otherLastReadId]);

  const listeningTrack = useMemo(() => {
    return activity?.track || null;
  }, [activity]);

  const isPlaying = activity?.is_playing ?? true;

  const hasNowPlaying = useMemo(() => {
    return !!(listeningTrack && (
      listeningTrack.id || 
      listeningTrack.track_id || 
      (listeningTrack.title && listeningTrack.title !== '—')
    ));
  }, [listeningTrack]);

  // ==================== ЗАГРУЗКА СТАТУСА ПРИСУТСТВИЯ ====================
  const loadUserPresence = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      const res = await apiFetch(`/api/users/${userId}/presence/`);
      
      if (res.ok) {
        const data = await res.json();
        setUserPresence(data);
      } else if (res.status === 404) {
        console.log('ℹ️ Presence endpoint not available');
      }
    } catch (err) {
      console.log('ℹ️ Presence error (ignored):', err.message);
    }
  }, []);

  useEffect(() => {
    if (!activeDialogId || !otherUserId) {
      setUserPresence(null);
      return;
    }

    loadUserPresence(otherUserId);
    
    const interval = setInterval(() => {
      if (otherUserId) {
        loadUserPresence(otherUserId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeDialogId, otherUserId, loadUserPresence]);

  const presence = useMemo(() => {
    if (userPresence?.presence) {
      return userPresence.presence;
    }
    
    if (!activity?.seconds_ago) return 'offline';
    
    const s = activity.seconds_ago;
    if (s <= 90) return 'online';
    if (s <= 300) return 'afk';
    return 'offline';
  }, [userPresence, activity]);

  // ==================== НАЧАТЬ ДИАЛОГ ====================
  const startDialog = async (userId) => {
    if (!userId) {
      console.error('❌ MessageHub: userId is undefined or null');
      setDebugInfo({
        error: 'userId is undefined',
        userId: userId,
        type: typeof userId
      });
      return;
    }

    const numericId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    if (isNaN(numericId)) {
      console.error('❌ MessageHub: Invalid userId:', userId);
      setDebugInfo({
        error: 'Invalid userId',
        userId: userId,
        type: typeof userId,
        parsed: numericId
      });
      return;
    }

    console.log(`📤 MessageHub: Starting dialog with user ID: ${numericId}`);

    try {
      setIsSearching(true);
      
      const requestBody = { user_id: numericId };
      console.log('📦 Отправляем запрос:', requestBody);
      
      const res = await apiFetch('/api/dialogs/start/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`⚠️ MessageHub: Ошибка создания диалога: ${res.status}`, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error('❌ Детали ошибки:', errorData);
          setDebugInfo({
            status: res.status,
            error: errorData,
            requestBody: requestBody
          });
        } catch (e) {
          console.error('❌ Не удалось распарсить ошибку:', errorText);
          setDebugInfo({
            status: res.status,
            error: errorText,
            requestBody: requestBody
          });
        }
        return;
      }

      const data = await res.json();
      console.log('✅ MessageHub: Dialog started successfully:', data);
      
      const newId = data.conversation_id || data.dialog?.id;
      
      if (newId) {
        await loadDialogs();
        setActiveDialogId(newId);
        setPeopleQuery('');
        setPeopleResults([]);
        setDebugInfo(null);
        console.log(`✅ Открыт диалог ${newId}`);
      } else {
        console.error('❌ MessageHub: No conversation_id in response:', data);
        setDebugInfo({
          error: 'No conversation_id in response',
          response: data
        });
      }
    } catch (err) {
      console.error('❌ MessageHub: Ошибка сети при создании диалога:', err);
      setDebugInfo({
        error: 'Network error',
        message: err.message
      });
    } finally {
      setIsSearching(false);
    }
  };

  // ✅ ==================== СТАРТ ДИАЛОГА ИЗ ДРУГИХ СТРАНИЦ ====================
  // Если мы пришли на /messagehub?start_user=123 — автоматически создаём/открываем диалог.
  useEffect(() => {
    const sp = new URLSearchParams(location.search || '');
    const startUser = sp.get('start_user');
    if (!startUser) return;

    // убираем параметр сразу, чтобы не стартовало повторно при перерендере
    sp.delete('start_user');
    const next = sp.toString();
    routerNavigate(`/messagehub${next ? `?${next}` : ''}`, { replace: true });

    // Небольшая задержка, чтобы диалоги успели загрузиться
    setTimeout(() => {
      startDialog(startUser);
    }, 300);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ==================== ОТМЕТИТЬ ДИАЛОГ КАК ПРОЧИТАННЫЙ ====================
  const markDialogAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    
    try {
      await apiFetch(`/api/dialogs/${conversationId}/read/`, { 
        method: 'POST' 
      });
      console.log(`✅ Диалог ${conversationId} отмечен как прочитанный`);
    } catch (err) {
      console.warn(`⚠️ Не удалось отметить диалог как прочитанный: ${err.message}`);
    }
  }, []);

  // ==================== ОТКРЫТЬ ДИАЛОГ ====================
  const openDialog = useCallback(async (dialog) => {
    if (!dialog || !dialog.id) return;
    
    console.log(`📂 Открываем диалог ${dialog.id}`);
    setActiveDialogId(dialog.id);
    
    await loadMessagesForDialog(dialog.id);
    await markDialogAsRead(dialog.id);
    
    setDialogs(prev => prev.map(d => {
      if (d.id !== dialog.id) return d;
      return {
        ...d,
        unread_count: 0,
        unread: 0,
        unread_messages: 0,
        unreadCount: 0,
        unread_count_messages: 0
      };
    }));
  }, [markDialogAsRead]);

  // ==================== СКРЫТЬ ДИАЛОГ ====================
  const hideDialog = async (conversationId) => {
    try {
      const res = await apiFetch(`/api/dialogs/${conversationId}/hide/`, { 
        method: 'POST' 
      });
      
      if (!res.ok) {
        console.warn(`⚠️ MessageHub: Ошибка скрытия диалога: ${res.status}`);
        return;
      }

      setDialogs(prev => prev.filter(d => d.id !== conversationId));

      if (activeDialogId === conversationId) {
        setActiveDialogId(null);
        setMessages([]);
      }
      
      console.log(`✅ Диалог ${conversationId} скрыт`);
    } catch (err) {
      console.error('❌ MessageHub: Ошибка сети при скрытии диалога:', err);
    }
  };

  // ==================== ФУНКЦИЯ УДАЛЕНИЯ СООБЩЕНИЯ (ИСПРАВЛЕНО НА POST) ====================
  const deleteMessage = async (messageId) => {
    // ✅ оптимистично убираем из UI
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      // ✅ ИСПРАВЛЕНО: используем POST вместо DELETE
      const res = await apiFetch(`/api/messages/${messageId}/delete/`, {
        method: 'POST',  // сервер использует POST
      });

      if (!res.ok) {
        console.warn('❌ delete message failed', res.status);
        // Если ошибка - перезагружаем сообщения
        if (activeDialogId) {
          await loadMessagesForDialog(activeDialogId);
        }
      }
    } catch (e) {
      console.warn('❌ delete message error', e);
      if (activeDialogId) {
        await loadMessagesForDialog(activeDialogId);
      }
    }
  };

  // ==================== ОТПРАВКА СООБЩЕНИЯ (ОПТИМИСТИЧНАЯ) ====================
  const sendMessage = async () => {
    const trimmedText = (text || '').trim();
    if (!trimmedText || !activeDialogId || isSending) return;

    const currentText = trimmedText;
    
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      text: currentText,
      created_at: new Date().toISOString(),
      is_mine: true,
      _status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setText('');
    setIsSending(true);

    isNearBottomRef.current = true;
    setTimeout(() => {
      const el = chatBodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);

    try {
      const res = await apiFetch(`/api/dialogs/${activeDialogId}/messages/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText })
      });
      
      if (!res.ok) {
        console.warn(`⚠️ MessageHub: Ошибка отправки сообщения: ${res.status}`);
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? { ...m, _status: 'error' }
              : m
          )
        );
        return;
      }

      const data = await res.json();
      
      if (data.message) {
        setMessages(prev =>
          prev.map(m =>
            m.id === tempId
              ? { ...data.message, _status: 'delivered' }
              : m
          )
        );
      }
    } catch (err) {
      console.error('❌ MessageHub: Ошибка сети при отправке сообщения:', err);
      setMessages(prev =>
        prev.map(m =>
          m.id === tempId
            ? { ...m, _status: 'error' }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // ==================== ФУНКЦИЯ ДЛЯ ОТПРАВКИ СООБЩЕНИЯ С КОНКРЕТНЫМ ТЕКСТОМ ====================
  const sendMessageWithText = async (rawText) => {
    const trimmedText = (rawText || '').trim();
    if (!trimmedText || !activeDialogId || isSending) return;

    const currentText = trimmedText;

    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      text: currentText,
      created_at: new Date().toISOString(),
      is_mine: true,
      _status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setText('');
    setIsSending(true);

    isNearBottomRef.current = true;
    setTimeout(() => {
      const el = chatBodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);

    try {
      const res = await apiFetch(`/api/dialogs/${activeDialogId}/messages/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText })
      });

      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
        return;
      }

      const data = await res.json();
      if (data.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message, _status: 'delivered' } : m));
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
    } finally {
      setIsSending(false);
    }
  };

  // ==================== ФУНКЦИЯ ДЛЯ ОБРАБОТКИ ВЫБОРА ЭМОДЗИ ====================
  const onPickEmoji = async (emoji) => {
    if (!emoji) return;

    // ✅ Если панель открыта для реакции — ставим реакцию
    if (emojiPanel.open && emojiPanel.mode === 'react' && emojiPanel.targetMsgId) {
      await toggleReaction(emojiPanel.targetMsgId, emoji);

      // закрываем панель и возвращаем профиль
      setEmojiPanel({ open: false, mode: 'send', targetMsgId: null });
      setRightMode('profile');
      return;
    }

    // ✅ иначе это обычная отправка эмодзи как сообщения
    await sendMessageWithText(emoji);
  };

  // ==================== ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ РЕАКЦИЙ ====================
  const toggleReaction = async (msgId, emoji) => {
    const uid = user?.id;
    if (!uid) return;

    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;

      const r = { ...(m.reactions || {}) };
      const expanded = m.reactions_expanded ? { ...m.reactions_expanded } : {};

      let prevEmoji = null;
      Object.keys(r).forEach(em => {
        const arr = Array.isArray(r[em]) ? r[em] : [];
        if (arr.includes(uid)) {
          prevEmoji = em;
          const nextArr = arr.filter(x => x !== uid);
          if (nextArr.length) {
            r[em] = nextArr;
            if (expanded[em]) {
              expanded[em] = expanded[em].filter(u => u.id !== uid);
            }
          } else {
            delete r[em];
            delete expanded[em];
          }
        }
      });

      if (prevEmoji === emoji) {
        return { ...m, reactions: r, reactions_expanded: expanded };
      }

      const arr = Array.isArray(r[emoji]) ? r[emoji] : [];
      r[emoji] = [...arr, uid];
      
      if (!expanded[emoji]) expanded[emoji] = [];
      expanded[emoji] = [
        ...expanded[emoji],
        {
          id: uid,
          username: user.username,
          avatar: user.avatar || user.avatar_url || null
        }
      ];

      return { ...m, reactions: r, reactions_expanded: expanded };
    }));

    try {
      const res = await apiFetch(`/api/messages/${msgId}/react/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data?.reactions) {
        setMessages(prev => prev.map(m => 
          m.id === msgId ? { 
            ...m, 
            reactions: data.reactions,
            reactions_expanded: data.reactions_expanded || m.reactions_expanded
          } : m
        ));
      }
    } catch(e) {
      console.error('Error toggling reaction:', e);
    }
  };

  // ==================== ФУНКЦИИ ДЛЯ ATTACH ====================
  const closeAttach = useCallback(() => {
    setAttachOpen(false);
    setAttachFile(null);
    setAttachType(null);
    setAttachCaption('');
    if (attachPreviewUrl) {
      try { URL.revokeObjectURL(attachPreviewUrl); } catch(e){}
    }
    setAttachPreviewUrl(null);
  }, [attachPreviewUrl]);

  const onPickAttach = (file) => {
    if (!file) return;

    const isImg = file.type?.startsWith('image/');
    const isVid = file.type?.startsWith('video/');
    if (!isImg && !isVid) {
      alert('Можно отправлять только картинку или видео');
      return;
    }

    const url = URL.createObjectURL(file);
    setAttachFile(file);
    setAttachPreviewUrl(url);
    setAttachType(isImg ? 'image' : 'video');
    setAttachOpen(true);
  };

  const sendAttachMessage = async () => {
    if (!activeDialogId || isSending || !attachFile || !attachType) return;

    const tempId = Date.now();
    const tempMsg = {
      id: tempId,
      text: attachCaption || '',
      created_at: new Date().toISOString(),
      is_mine: true,
      _status: 'sending',
      image_url: attachType === 'image' ? attachPreviewUrl : null,
      video_url: attachType === 'video' ? attachPreviewUrl : null,
      _is_local_media: true,
    };

    setMessages(prev => [...prev, tempMsg]);
    setIsSending(true);

    isNearBottomRef.current = true;
    setTimeout(() => {
      const el = chatBodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);

    try {
      const fd = new FormData();
      fd.append('text', attachCaption || '');

      if (attachType === 'image') fd.append('image', attachFile);
      if (attachType === 'video') fd.append('video', attachFile);

      const res = await apiFetch(`/api/dialogs/${activeDialogId}/messages/send/`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
        return;
      }

      const data = await res.json();
      if (data?.message) {
        setMessages(prev => prev.map(m => {
          if (m.id !== tempId) return m;
          try { URL.revokeObjectURL(attachPreviewUrl); } catch(e){}
          return { ...data.message, _status: 'delivered' };
        }));
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'delivered' } : m));
      }

      closeAttach();
    } catch (e) {
      console.error('attach send error', e);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
    } finally {
      setIsSending(false);
    }
  };

  // ==================== VOICE FUNCTIONS ====================
  const decodeWaveformAndDuration = async (blob, bars = 46) => {
    const arrayBuf = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    try {
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const durationSec = Math.max(1, Math.round(audioBuf.duration));

      const ch0 = audioBuf.getChannelData(0);
      const block = Math.floor(ch0.length / bars) || 1;

      const peaks = [];
      for (let i = 0; i < bars; i++) {
        const start = i * block;
        const end = Math.min(start + block, ch0.length);

        let peak = 0;
        for (let j = start; j < end; j++) {
          const v = Math.abs(ch0[j]);
          if (v > peak) peak = v;
        }

        const h = 6 + Math.round(Math.min(1, peak * 1.8) * 22);
        peaks.push(h);
      }

      return { waveform: peaks, durationSec };
    } finally {
      try { await ctx.close(); } catch (e) {}
    }
  };

  const sendVoiceMessage = async ({ blob, durationSec, waveform }) => {
    if (!activeDialogId || isSending) return;

    const tempId = Date.now();
    const localUrl = URL.createObjectURL(blob);

    const tempMessage = {
      id: tempId,
      text: '',
      created_at: new Date().toISOString(),
      is_mine: true,
      _status: 'sending',
      voice_url: localUrl,
      voice_duration: durationSec,
      waveform: waveform,
      _is_local_voice: true,
    };

    setMessages(prev => [...prev, tempMessage]);
    setIsSending(true);

    isNearBottomRef.current = true;
    setTimeout(() => {
      const el = chatBodyRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);

    try {
      const fd = new FormData();
      fd.append('audio', blob, `voice_${Date.now()}.webm`);
      fd.append('duration', String(durationSec));
      fd.append('waveform', JSON.stringify(waveform));

      const res = await apiFetch(`/api/dialogs/${activeDialogId}/messages/send/`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
        return;
      }

      const data = await res.json();

      if (data.message) {
        setMessages(prev => prev.map(m => {
          if (m.id !== tempId) return m;
          try { URL.revokeObjectURL(localUrl); } catch(e){}
          return { ...data.message, _status: 'delivered' };
        }));
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'delivered' } : m));
      }
    } catch (err) {
      console.error('❌ voice send error:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'error' } : m));
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceRecording = async () => {
    if (isRecording) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      alert('Микрофон не поддерживается в этом браузере');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      } catch (e) {}

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        const an = analyserRef.current;
        if (!an) return;
        an.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const x = (data[i] - 128) / 128;
          sum += x * x;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(clamp01(rms * 2.2));
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      chunksRef.current = [];
      
      gotFirstChunkRef.current = false;
      
      let mime = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mime = 'audio/webm';
      }
      
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecRef.current = rec;

      shouldSendVoiceRef.current = true;

      let gotAnyChunk = false;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          gotAnyChunk = true;
          gotFirstChunkRef.current = true;
          chunksRef.current.push(e.data);
        }
      };

      rec.onstop = async () => {
        try {
          if (!gotAnyChunk || chunksRef.current.length === 0) {
            chunksRef.current = [];
            return;
          }

          const realMs = Date.now() - recStartAtRef.current;
          
          if (!shouldSendVoiceRef.current || realMs < 1000) {
            chunksRef.current = [];
            return;
          }

          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

          const { waveform, durationSec } = await decodeWaveformAndDuration(blob, 46);
          await sendVoiceMessage({ blob, durationSec, waveform });
        } catch (e) {
          console.error('voice onstop error', e);
        } finally {
          try {
            if (mediaStreamRef.current) {
              mediaStreamRef.current.getTracks().forEach(t => t.stop());
            }
          } catch (e) {}
          mediaStreamRef.current = null;

          try { if (audioCtxRef.current) await audioCtxRef.current.close(); } catch (e) {}
          audioCtxRef.current = null;
          analyserRef.current = null;
        }
      };

      await new Promise(r => setTimeout(r, 120));

      rec.start(250);

      setTimeout(() => {
        try {
          if (mediaRecRef.current && mediaRecRef.current.state === 'recording') {
            mediaRecRef.current.requestData();
          }
        } catch (e) {}
      }, 220);

      setIsRecording(true);
      setRecordMs(0);
      recStartAtRef.current = Date.now();
      recTimerRef.current = setInterval(() => {
        setRecordMs(Date.now() - recStartAtRef.current);
      }, 100);
    } catch (e) {
      console.error('mic error:', e);
      alert('Не удалось включить микрофон. Проверь разрешение в браузере.');
    }
  };

  const stopVoiceRecording = async () => {
    if (!isRecording) return;
    
    if (!gotFirstChunkRef.current) {
      await new Promise(r => setTimeout(r, 450));
    }
    
    if (recordMs < 1000) {
      shouldSendVoiceRef.current = false;
    }
    
    setIsRecording(false);

    try { if (recTimerRef.current) clearInterval(recTimerRef.current); } catch (e) {}
    recTimerRef.current = null;

    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        try {
          mediaRecRef.current.requestData();
        } catch (e) {}
        
        mediaRecRef.current.stop();
      }
    } catch (e) {}

    try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch (e) {}
    rafRef.current = null;
    setMicLevel(0);
  };

  const getVoiceUrl = (m) => m?.voice_url || m?.audio_url || null;

  const voiceMessageIdsInOrder = useMemo(() => {
    return (messages || [])
      .filter(m => !!getVoiceUrl(m))
      .map(m => m.id);
  }, [messages]);

  const messageById = useMemo(() => {
    const map = new Map();
    (messages || []).forEach(m => map.set(m.id, m));
    return map;
  }, [messages]);

  const playVoiceByMessageId = useCallback((messageId) => {
    const m = messageById.get(messageId);
    if (!m) return;

    const url = getVoiceUrl(m);
    if (!url) return;

    if (!voiceAudioRef.current) voiceAudioRef.current = new Audio();
    const a = voiceAudioRef.current;

    voiceOwnerIdRef.current = messageId;

    if (a.src !== url) {
      a.src = url;
      const saved = Number(voicePosMap?.[messageId] || 0);
      if (saved > 0) {
        const onMeta = () => {
          a.removeEventListener('loadedmetadata', onMeta);
          try { a.currentTime = saved; } catch(e){}
        };
        a.addEventListener('loadedmetadata', onMeta);
        a.load();
      }
    }

    a.play().catch(() => {});
    setPlayingVoiceId(messageId);
  }, [messageById, voicePosMap]);

  useEffect(() => {
    voiceOrderRef.current = voiceMessageIdsInOrder;
  }, [voiceMessageIdsInOrder]);

  useEffect(() => {
    playVoiceRef.current = playVoiceByMessageId;
  }, [playVoiceByMessageId]);

  useEffect(() => {
    if (!voiceAudioRef.current) voiceAudioRef.current = new Audio();
    const a = voiceAudioRef.current;

    const onTime = () => {
      const ownerId = voiceOwnerIdRef.current;
      if (!ownerId) return;

      const t = a.currentTime || 0;

      setVoicePosMap(prev => {
        if (prev[ownerId] === t) return prev;
        return { ...prev, [ownerId]: t };
      });
    };

    const onEnd = () => {
      const ownerId = voiceOwnerIdRef.current;
      if (!ownerId) return;

      setVoicePosMap(prev => ({ ...prev, [ownerId]: 0 }));

      const order = voiceOrderRef.current || [];
      const idx = order.indexOf(ownerId);
      const nextId = idx >= 0 ? order[idx + 1] : null;

      if (nextId && playVoiceRef.current) {
        voiceOwnerIdRef.current = nextId;
        playVoiceRef.current(nextId);
        return;
      }

      setPlayingVoiceId(null);
      voiceOwnerIdRef.current = null;
    };

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);

    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  // ==================== АВТОМАТИЧЕСКАЯ ОТМЕТКА ПРОЧИТАННЫХ ====================
  useEffect(() => {
    if (!activeDialogId) return;
    if (!messages || messages.length === 0) return;

    const timeout = setTimeout(async () => {
      await markDialogAsRead(activeDialogId);
      
      setDialogs(prev => prev.map(d => {
        if (d.id !== activeDialogId) return d;
        return {
          ...d,
          unread_count: 0,
          unread: 0,
          unread_messages: 0,
          unreadCount: 0,
          unread_count_messages: 0
        };
      }));
    }, 400);

    return () => clearTimeout(timeout);
  }, [activeDialogId, messages, markDialogAsRead]);

  // ==================== АВТОСКРОЛЛ ====================
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    if (!isNearBottomRef.current) return;

    requestAnimationFrame(() => {
      const el = chatBodyRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  // ==================== ЭФФЕКТ ДЛЯ НОВЫХ СООБЩЕНИЙ ====================
  useEffect(() => {
    if (lastMsgCountRef.current === 0) {
      lastMsgCountRef.current = messages?.length || 0;
      return;
    }

    const prevCount = lastMsgCountRef.current;
    const curCount = messages?.length || 0;

    if (curCount <= prevCount) {
      lastMsgCountRef.current = curCount;
      return;
    }

    const added = (messages || []).slice(prevCount);
    const incoming = added.filter(m => !m?.is_mine);

    if (!isNearBottomRef.current && incoming.length > 0) {
      setNewBelowCount(prev => prev + incoming.length);
      setShowJumpBtn(true);
    }

    lastMsgCountRef.current = curCount;
  }, [messages]);

  // ==================== ПОЛЛИНГ NOW-PLAYING ====================
  useEffect(() => {
    if (!activeDialogId || !nowPlayingEnabled || !otherUserId) return;

    let cancelled = false;

    const loadNowPlaying = async () => {
      try {
        const res = await apiFetch(`/api/users/${otherUserId}/now-playing/`);

        if (res.status === 404) {
          console.warn(`⚠️ MessageHub: Эндпоинт now-playing не найден (404), отключаем polling`);
          if (!cancelled) setNowPlayingEnabled(false);
          return;
        }

        if (!res.ok) {
          console.warn(`⚠️ MessageHub: Ошибка загрузки now-playing: ${res.status}`);
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          console.log(`📡 MessageHub: Получены данные now-playing:`, data);
          setActivity(data);
        }
      } catch (err) {
        console.error('❌ MessageHub: Ошибка сети при загрузке now-playing:', err);
      }
    };

    loadNowPlaying();
    const interval = setInterval(loadNowPlaying, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeDialogId, otherUserId, nowPlayingEnabled]);

  // Периодическое обновление статусов прочитанных сообщений
  useEffect(() => {
    if (!activeDialogId) return;

    const interval = setInterval(() => {
      loadDialogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [activeDialogId, loadDialogs]);

  // ==================== Cleanup for voice on unmount ====================
  useEffect(() => {
    return () => {
      try { if (recTimerRef.current) clearInterval(recTimerRef.current); } catch (e) {}
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch (e) {}
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
      } catch (e) {}
      try { if (audioCtxRef.current) audioCtxRef.current.close(); } catch (e) {}
    };
  }, []);

  // ===== Left sidebar resize =====
  const MIN_LEFT_W = 72;
  const MAX_LEFT_W = 320;
  const DEFAULT_LEFT_W = 280;

  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('mh_left_width');
    const n = saved ? parseInt(saved, 10) : DEFAULT_LEFT_W;
    if (!Number.isFinite(n)) return DEFAULT_LEFT_W;
    return Math.min(MAX_LEFT_W, Math.max(MIN_LEFT_W, n));
  });

  const draggingRef = useRef(false);
  const layoutRef = useRef(null);

  const isCollapsed = leftWidth <= 110;

  const startDrag = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      
      let offsetX = 0;
      if (layoutRef.current) {
        const rect = layoutRef.current.getBoundingClientRect();
        offsetX = rect.left;
      }
      
      const next = Math.min(MAX_LEFT_W, Math.max(MIN_LEFT_W, e.clientX - offsetX));
      setLeftWidth(next);
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem('mh_left_width', String(leftWidth));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [leftWidth]);

  // ==================== ФУНКЦИЯ "СКРОЛЛ ВНИЗ ПО КНОПКЕ" ====================
  const jumpToBottom = useCallback(() => {
    const el = chatBodyRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
    isNearBottomRef.current = true;
    setShowJumpBtn(false);
    setNewBelowCount(0);
  }, []);

  return (
    <div className="mh-root">
      {/* ФОН */}
      <div className="mh-bg" aria-hidden="true">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>

      {/* КОНТЕНТ */}
      <div className="mh-shell">
        {/* Верхняя панель: поиск людей */}
        <div className="mh-topbar">
          <div className="mh-search">
            <input
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search users..."
              className="mh-search-input"
            />
          </div>

          <div className="mh-actions">
            <button 
              className="mh-btn" 
              type="button" 
              title="New chat"
              onClick={() => {
                setPeopleQuery('');
                setPeopleResults([]);
              }}
            >
              ＋
            </button>
          </div>
        </div>

        {/* 🔥 Отладочная информация (только если есть ошибка) */}
        {debugInfo && (
          <div className="mh-debug" style={{
            background: 'rgba(255,0,0,0.2)',
            padding: '10px',
            margin: '10px 0',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <strong>🔧 Debug Info:</strong>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}

        {/* ===== MAIN LAYOUT с ресайзером ===== */}
        <div className="mh-layout" ref={layoutRef}>
          {/* LEFT PANEL (Users + Dialogs) */}
          <div
            className={`mh-left ${isCollapsed ? 'collapsed' : ''}`}
            style={{ width: leftWidth }}
          >
            {/* 🔥 Верхняя часть с результатами поиска людей */}
            <div className="mh-left-top">
              {/* Результаты поиска людей (показываются только когда есть результаты) */}
              {peopleResults.length > 0 && (
                <div className="mh-search-results">
                  {isLoading ? (
                    <div className="mh-search-loading">Loading...</div>
                  ) : (
                    peopleResults.map(u => {
                      const userId = u.id ?? u.user_id ?? u.pk;
                      
                      if (!userId) {
                        console.warn('⚠️ Пользователь без ID:', u);
                        return null;
                      }
                      
                      return (
                        <button
                          key={userId}
                          className="mh-search-item"
                          onClick={() => startDialog(userId)}
                          disabled={isSearching}
                        >
                          <div className="mh-search-ava">
                            {u.avatar ? (
                              <img src={u.avatar} alt="" />
                            ) : (
                              <span>{(u.username || '?').slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="mh-search-meta">
                            <div className="mh-search-name">{u.username}</div>
                            <div className="mh-search-sub">{u.bio || ''}</div>
                          </div>
                        </button>
                      );
                    }).filter(Boolean)
                  )}
                </div>
              )}
            </div>

            <div className="mh-left-title">
              {dialogs.length > 0 ? 'DIALOGS' : 'NO DIALOGS YET'}
            </div>

            <div className="mh-left-list">
              {dialogs.length > 0 ? (
                dialogs.map(d => {
                  const isActive = d.id === activeDialogId;
                  const lastMsg = d.last_message;
                  
                  const unread = getUnreadCount(d);
                  const unreadLabel = unread > 99 ? '99+' : String(unread);
                  
                  return (
                    <div
                      key={d.id}
                      className={`mh-dialog-item ${isActive ? 'active' : ''}`}
                    >
                      <button
                        className="mh-dialog-content"
                        onClick={() => openDialog(d)}
                      >
                        <div className="mh-dialog-ava">
                          {d.other_user?.avatar ? (
                            <img src={d.other_user.avatar} alt="" />
                          ) : (
                            <span>{(d.other_user?.username || '?').slice(0, 1).toUpperCase()}</span>
                          )}

                          {unread > 0 && (
                            <span className="mh-unread-badge" title={`${unread} unread`}>
                              {unreadLabel}
                            </span>
                          )}

                          <span className={`mh-presence ${presenceMap[d.other_user?.id] || 'offline'}`} />
                        </div>

                        <div className="mh-dialog-meta">
                          <div
                            className="mh-dialog-name mh-username-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToProfile(d.other_user);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && goToProfile(d.other_user)}
                          >
                            {d.other_user?.username || 'Unknown'}
                          </div>
                          <div className="mh-dialog-last">
                            {lastMsg ? lastMsg.text : 'No messages yet'}
                          </div>
                        </div>
                      </button>

                      <button
                        className="mh-dialog-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          hideDialog(d.id);
                        }}
                        title="Hide dialog"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="mh-empty-state">
                  No dialogs yet.<br />
                  Click ＋ to start one!
                </div>
              )}
            </div>
          </div>

          {/* RESIZER */}
          <div
            className="mh-resizer"
            onMouseDown={startDrag}
            title="Resize"
            role="separator"
            aria-orientation="vertical"
          />

          {/* CENTER PANEL (Chat) */}
          <div className="mh-center">
            <div className="mh-chat-head">
              <div className="mh-chat-ava">
                {otherUser ? (
                  otherUser.avatar ? (
                    <img src={otherUser.avatar} alt="" />
                  ) : (
                    (otherUser.username || '?').slice(0, 1).toUpperCase()
                  )
                ) : '?'}
                <span className={`mh-presence ${presence}`} />
              </div>
              <div className="mh-chat-info">
                {otherUser ? (
                  <span
                    className="mh-chat-name mh-username-link"
                    onClick={() => goToProfile(otherUser)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && goToProfile(otherUser)}
                  >
                    {otherUser?.username}
                  </span>
                ) : (
                  <div className="mh-chat-name">Select a dialog</div>
                )}
                <div className="mh-chat-status">
                  {presence === 'online' && 'Online'}
                  {presence === 'afk' && 'Away'}
                  {presence === 'offline' && 'Offline'}
                </div>
              </div>
            </div>

            <div
              className="mh-chat-body"
              ref={chatBodyRef}
              onScroll={handleChatScroll}
            >
              {!activeDialog ? (
                <div className="mh-chat-placeholder">
                  Select a dialog from the left to start chatting
                </div>
              ) : messages.length === 0 ? (
                <div className="mh-chat-placeholder">
                  <div>💬 No messages yet</div>
                  <div className="mh-chat-subtitle">
                    Send the first message!
                  </div>
                </div>
              ) : (
                messages.map(m => {
                  const fromMe = !!m.is_mine;
                  const status = getMessageStatus(m);
                  
                  return (
                    <div
                      key={m.id}
                      className={`mh-bubble-row ${fromMe ? 'me' : 'them'}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMsgMenu({
                          x: e.clientX,
                          y: e.clientY,
                          msgId: m.id
                        });
                      }}
                    >
                      {/* ✅ АВАТАРКА СЛЕВА ДЛЯ ЧУЖИХ */}
                      {!fromMe && (
                        <div className="mh-msg-ava">
                          {otherUser?.avatar ? (
                            <img src={otherUser.avatar} alt="" />
                          ) : (
                            <span>{(otherUser?.username || '?').slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                      )}

                      <div 
                        className={`mh-bubble ${fromMe ? 'me' : 'them'}`}
                      >
                        {m.voice_url || m.audio_url ? (
                          <VoiceBubble
                            msg={m}
                            audioRef={voiceAudioRef}
                            playingId={playingVoiceId}
                            setPlayingId={setPlayingVoiceId}
                            voicePosMap={voicePosMap}
                            setVoicePosMap={setVoicePosMap}
                            ownerIdRef={voiceOwnerIdRef}
                          />
                        ) : m.image_url ? (
                          <div className="mh-media">
                            <img className="mh-media-img" src={m.image_url} alt="" />
                            {m.text ? <div className="mh-media-caption">{m.text}</div> : null}
                          </div>
                        ) : m.video_url ? (
                          <div className="mh-media">
                            <video className="mh-media-video" src={m.video_url} controls />
                            {m.text ? <div className="mh-media-caption">{m.text}</div> : null}
                          </div>
                        ) : (
                          <EmojiText text={m.text} />
                        )}

                        {m.track && (
                          <div className="mh-bubble-track">
                            🎵 {m.track.title} - {m.track.artist}
                          </div>
                        )}

                        {((m.reactions && Object.keys(m.reactions).length > 0) || 
                          (m.reactions_expanded && Object.keys(m.reactions_expanded).length > 0)) && (
                          <div className="mh-reactions">
                            {Object.entries(m.reactions_expanded || m.reactions || {}).map(([em, users]) => {
                              const count = Array.isArray(users) ? users.length : 0;
                              const userList = m.reactions_expanded && Array.isArray(users) ? users : [];
                              
                              return (
                                <button
                                  key={em}
                                  className="mh-react-pill"
                                  onClick={() => toggleReaction(m.id, em)}
                                  title="Toggle reaction"
                                >
                                  {m.reactions_expanded && userList.length > 0 && (
                                    <span className="mh-react-avatars">
                                      {userList.slice(0, 3).map(u => (
                                        <span key={u.id} className="mh-react-ava">
                                          {u.avatar ? (
                                            <img src={u.avatar} alt="" />
                                          ) : (
                                            <span className="mh-react-ava-fallback" />
                                          )}
                                        </span>
                                      ))}
                                      {userList.length > 3 && (
                                        <span className="mh-react-more">+{userList.length - 3}</span>
                                      )}
                                    </span>
                                  )}

                                  <span className="mh-react-emo">{em}</span>
                                  <span className="mh-react-count">{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {fromMe ? (
                          <div className="mh-bubble-meta">
                            <span className="mh-bubble-time">{formatMessageTime(m.created_at)}</span>
                            <span className={`mh-bubble-status ${status || ''}`}>
                              {status === 'sending' && '⏳'}
                              {status === 'delivered' && '✓'}
                              {status === 'read' && '✓✓'}
                              {status === 'error' && '⚠️'}
                            </span>
                          </div>
                        ) : (
                          <div className="mh-bubble-meta">
                            <span className="mh-bubble-time">{formatMessageTime(m.created_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* ✅ АВАТАРКА СПРАВА ДЛЯ ТВОИХ */}
                      {fromMe && (
                        <div className="mh-msg-ava me">
                          {(user?.avatar || user?.profile?.avatar) ? (
                            <img src={(user.avatar || user?.profile?.avatar)} alt="" />
                          ) : (
                            <span>{(user?.username || 'ME').slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ✅ Кнопка вниз (показывается если пользователь не внизу) */}
            {showJumpBtn && (
              <button
                className={`mh-jump-bottom ${newBelowCount > 0 ? 'has-new' : ''}`}
                onClick={jumpToBottom}
                title="Scroll to latest"
                aria-label="Scroll to latest"
              >
                <span className="mh-jump-arrow">⌄</span>
                {newBelowCount > 0 && (
                  <span className="mh-jump-badge">{newBelowCount > 99 ? '99+' : newBelowCount}</span>
                )}
              </button>
            )}

            <div className="mh-chat-input">
              <div className="mh-voice-wrap">
                <button
                  className="mh-attach-btn"
                  type="button"
                  title="Attach"
                  disabled={!activeDialog || isSending}
                  onClick={() => {
                    if (!activeDialog || isSending) return;
                    attachInputRef.current?.click();
                  }}
                >
                  +
                </button>

                <input
                  ref={attachInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    onPickAttach(f);
                  }}
                />

                <button
                  className={`mh-voice-btn ${isRecording ? 'recording' : ''}`}
                  style={{ '--mic-level': Number.isFinite(micLevel) ? micLevel : 0 }}
                  onMouseDown={() => {
                    if (!activeDialog || isSending) return;
                    startVoiceRecording();
                  }}
                  onMouseUp={stopVoiceRecording}
                  onMouseLeave={stopVoiceRecording}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    if (!activeDialog || isSending) return;
                    startVoiceRecording();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopVoiceRecording();
                  }}
                  title="Hold to record"
                  disabled={!activeDialog || isSending}
                >
                  <span className="mh-voice-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="mh-voice-svg">
                      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
                    </svg>
                  </span>
                </button>
              </div>

              <input
                className="mh-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isRecording ? `Recording… ${formatSec(recordMs / 1000)}` : "Write a message..."}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!activeDialog || isSending}
              />

              <button
                className="mh-emoji-btn"
                type="button"
                title="Emoji"
                disabled={!activeDialog || isSending}
                onClick={() => {
                  setEmojiPanel({ open: true, mode: 'send', targetMsgId: null });
                  setRightMode('emoji');
                }}
              >
                🙂
              </button>

              <button 
                className="send-button" 
                onClick={sendMessage}
                disabled={!activeDialog || isSending || !text.trim()}
                aria-label="Send message"
                title="Send message"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  className="send-icon"
                >
                  <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <aside className="mh-right">
            {rightMode === 'emoji' ? (
              <div className="mh-emoji-panel">
                <div className="mh-emoji-head">
                  <button 
                    className="mh-emoji-back" 
                    onClick={() => {
                      setEmojiPanel({ open: false, mode: 'send', targetMsgId: null });
                      setRightMode('profile');
                    }}
                  >
                    ← Back
                  </button>
                  <div className="mh-emoji-title">
                    {emojiPanel.mode === 'react' ? 'REACT WITH EMOJI' : 'SEND EMOJI'}
                  </div>
                </div>

                <div className="mh-emoji-picker-wrap">
                  <EmojiPicker
                    theme="dark"
                    lazyLoadEmojis={true}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    previewConfig={{ showPreview: false }}
                    onEmojiClick={(emojiData) => {
                      const em = emojiData?.emoji;
                      if (!em) return;
                      onPickEmoji(em);
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mh-profile-head">
                  <div className="mh-profile-ava">
                    {otherUser ? (
                      otherUser.avatar ? (
                        <img src={otherUser.avatar} alt="" />
                      ) : (
                        (otherUser.username || '?').slice(0, 1).toUpperCase()
                      )
                    ) : '?'}
                    <span className={`mh-presence big ${presence}`} />
                  </div>

                  <div className="mh-profile-meta">
                    <div className="mh-profile-name">
                      <span
                        className="mh-username-link"
                        onClick={() => goToProfile(otherUser)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && goToProfile(otherUser)}
                      >
                        {otherUser?.username || '—'}
                      </span>
                    </div>
                    <div className="mh-profile-status">
                      <span className={`mh-presence-label ${presence}`}>
                        {presence === 'online' && 'Online'}
                        {presence === 'afk' && 'Away'}
                        {presence === 'offline' && 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mh-profile-block">
                  <div className="mh-profile-title">BIO</div>
                  <div className="mh-profile-bio">
                    {otherUser?.bio || '—'}
                  </div>
                </div>

                {hasNowPlaying && (
                  <div className="mh-profile-block">
                    <div className="mh-profile-title">LISTENING NOW</div>

                    <div className="mh-track-card">
                      <div className="mh-track-cover">
                        {listeningTrack?.cover_url ? (
                          <img src={listeningTrack.cover_url} alt="" />
                        ) : listeningTrack?.cover ? (
                          <img src={listeningTrack.cover} alt="" />
                        ) : (
                          <div className="mh-track-cover-fallback" />
                        )}
                      </div>

                      <div className="mh-track-info">
                        <div className="mh-track-title">
                          <span
                            className={`mh-link ${getTrackId(listeningTrack) ? '' : 'is-disabled'}`}
                            onClick={() => getTrackId(listeningTrack) && goToTrack(listeningTrack)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && getTrackId(listeningTrack) && goToTrack(listeningTrack)}
                            title={getTrackId(listeningTrack) ? 'Open track' : ''}
                          >
                            {listeningTrack?.title || '—'}
                          </span>
                        </div>

                        <div className="mh-track-artist">
                          <span
                            className={`mh-link ${listeningTrack?.uploaded_by?.id ? '' : 'is-disabled'}`}
                            onClick={() => listeningTrack?.uploaded_by?.id && goToProfile(listeningTrack.uploaded_by)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && listeningTrack?.uploaded_by?.id && goToProfile(listeningTrack.uploaded_by)}
                            title={listeningTrack?.uploaded_by?.id ? 'Open artist profile' : ''}
                          >
                            {listeningTrack?.uploaded_by?.username || listeningTrack?.artist || '—'}
                          </span>
                        </div>

                        <div className="mh-track-row">
                          <div className="mh-track-pill">
                            <span className="mh-track-pill-ico" aria-hidden="true">
                              {isPlaying ? '▶' : '⏸'}
                            </span>
                            <span className="mh-track-pill-text">
                              {isPlaying ? 'playing' : 'paused'}
                            </span>
                          </div>
                          <div className="mh-track-time">
                            {listeningTrack?.duration_seconds 
                              ? formatSec(listeningTrack.duration_seconds) 
                              : listeningTrack?.duration || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </div>

      {/* 🔥 МОДАЛКА ПРЕДПРОСМОТРА ИЗОБРАЖЕНИЙ/ВИДЕО */}
      {attachOpen && (
        <div className="mh-attach-modal" role="dialog" aria-modal="true">
          <div className="mh-attach-backdrop" onClick={closeAttach} />

          <div className="mh-attach-card">
            <div className="mh-attach-preview">
              {attachType === 'image' && attachPreviewUrl && (
                <img src={attachPreviewUrl} alt="preview" />
              )}

              {attachType === 'video' && attachPreviewUrl && (
                <video src={attachPreviewUrl} controls />
              )}
            </div>

            <div className="mh-attach-bottom">
              <input
                className="mh-attach-caption"
                placeholder="Write a caption..."
                value={attachCaption}
                onChange={(e) => setAttachCaption(e.target.value)}
              />

              <div className="mh-attach-actions">
                <button className="mh-attach-cancel" onClick={closeAttach}>
                  Cancel
                </button>
                <button
                  className="mh-attach-send"
                  onClick={sendAttachMessage}
                  disabled={isSending}
                  title="Send"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21l20.99-9L2.01 3v7l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 КОНТЕКСТНОЕ МЕНЮ ДЛЯ РЕАКЦИЙ (ПКМ) */}
      {msgMenu && (
        <div
          className="mh-msgmenu"
          style={{ left: msgMenu.x, top: msgMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ✅ Быстрые реакции */}
          <div className="mh-msgmenu-reactrow">
            {QUICK_REACTIONS.map((emo) => (
              <button
                key={emo}
                className="mh-msgmenu-react"
                onClick={() => {
                  toggleReaction(msgMenu.msgId, emo);
                  setMsgMenu(null);
                }}
                title="React"
              >
                {emo}
              </button>
            ))}

            {/* ✅ Плюс = открыть все эмодзи именно ДЛЯ РЕАКЦИИ */}
            <button
              className="mh-msgmenu-react more"
              onClick={() => {
                setEmojiPanel({ open: true, mode: 'react', targetMsgId: msgMenu.msgId });
                setRightMode('emoji');   // важно: показываем панель справа
                setMsgMenu(null);
              }}
              title="More reactions"
            >
              ＋
            </button>
          </div>

          {/* ✅ Delete ниже реакций */}
          {(() => {
            const m = messages.find(x => x.id === msgMenu.msgId);
            const canDelete = !!m?.is_mine;
            if (!canDelete) return null;

            return (
              <button
                className="mh-msgmenu-item danger"
                onClick={() => {
                  deleteMessage(msgMenu.msgId);
                  setMsgMenu(null);
                }}
              >
                🗑 Delete
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ==================== Voice Bubble Component ====================
function VoiceBubble({
  msg,
  audioRef,
  playingId,
  setPlayingId,
  voicePosMap,
  setVoicePosMap,
  ownerIdRef
}) {
  const url = msg.voice_url || msg.audio_url;
  const total = Number(msg.voice_duration || msg.duration || 0);

  const waveform = Array.isArray(msg.waveform) ? msg.waveform : [];
  const bars = waveform.length ? waveform : Array.from({ length: 46 }, () => 18);

  const isActive = playingId === msg.id;

  const waveRef = React.useRef(null);
  const draggingRef = React.useRef(false);

  const pos = Number(voicePosMap?.[msg.id] || 0);

  const safeDuration = () => {
    const a = audioRef.current;
    const d = a?.duration;
    if (Number.isFinite(d) && d > 0) return d;
    if (Number.isFinite(total) && total > 0) return total;
    return 0;
  };

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  const applySeek = (targetSec) => {
    if (!url) return;
    const a = ensureAudio();

    ownerIdRef.current = msg.id;

    const switching = a.src !== url;
    if (switching) {
      a.src = url;
    }

    const doSet = () => {
      const d = safeDuration();
      if (!d) return;
      const t = Math.max(0, Math.min(d - 0.01, targetSec));
      if (!Number.isFinite(t)) return;

      try { a.currentTime = t; } catch (e) { return; }
      setVoicePosMap(prev => ({ ...prev, [msg.id]: t }));
    };

    if (!Number.isFinite(a.duration) || a.duration <= 0) {
      const onMeta = () => {
        a.removeEventListener('loadedmetadata', onMeta);
        doSet();
      };
      a.addEventListener('loadedmetadata', onMeta);
      a.load();
      return;
    }

    doSet();
  };

  const seekToClientX = (clientX) => {
    const el = waveRef.current;
    if (!el) return;

    const d = safeDuration();
    if (!d) return;

    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 0;
    const next = ratio * d;
    if (!Number.isFinite(next)) return;

    applySeek(next);
  };

  React.useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      seekToClientX(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [url, total]);

  const toggle = () => {
    if (!url) return;
    const a = ensureAudio();

    const switching = a.src !== url;

    ownerIdRef.current = msg.id;

    if (switching) {
      a.src = url;
      applySeek(pos || 0);
    } else {
      if (!isActive && Number.isFinite(pos) && pos > 0) {
        try { a.currentTime = pos; } catch(e){}
      }
    }

    if (isActive) {
      a.pause();
      setPlayingId(null);
      return;
    }

    a.play().catch(() => {});
    setPlayingId(msg.id);
  };

  const d = safeDuration();
  const ratio = d > 0 ? Math.max(0, Math.min(1, pos / d)) : 0;
  const filledCount = Math.floor(bars.length * ratio);

  const remaining = d > 0 ? Math.max(0, Math.ceil(d - pos)) : 0;

  return (
    <div className="mh-voice">
      <button className="mh-voice-play" onClick={toggle}>
        {isActive ? '⏸' : '▶'}
      </button>

      <div
        className="mh-voice-wave"
        ref={waveRef}
        onMouseDown={(e) => {
          draggingRef.current = true;
          seekToClientX(e.clientX);
        }}
        onClick={(e) => seekToClientX(e.clientX)}
        onTouchStart={(e) => {
          const t = e.touches?.[0];
          if (!t) return;
          draggingRef.current = true;
          seekToClientX(t.clientX);
        }}
        onTouchMove={(e) => {
          const t = e.touches?.[0];
          if (!t) return;
          seekToClientX(t.clientX);
        }}
        onTouchEnd={() => { draggingRef.current = false; }}
        title="Seek"
      >
        {bars.map((h, i) => (
          <span
            key={i}
            className={`mh-voice-bar ${i < filledCount ? 'filled' : ''}`}
            style={{ height: `${Math.max(6, Math.min(28, Number(h) || 12))}px` }}
          />
        ))}
      </div>

      <div className="mh-voice-time">{formatSec(remaining)}</div>
    </div>
  );
}