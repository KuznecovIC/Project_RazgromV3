// frontend/src/components/AdminTracksPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';
import FaultyTerminal from './FaultyTerminal';
import './AdminTracksPage.css';
import './Sidebar.css'; // ✅ чтобы карточки выглядели как sidebar

// ---------- СТАБИЛЬНЫЕ ПРОПСЫ ДЛЯ TERMINAL (чтобы не пересоздавался) ----------
const TERMINAL_PROPS = {
  scale: 1.5,
  gridMul: [2, 1],
  digitSize: 1.2,
  timeScale: 0.5,
  pause: false,
  scanlineIntensity: 0.5,
  glitchAmount: 1,
  flickerAmount: 1,
  noiseAmp: 1,
  chromaticAberration: 0,
  dither: 0,
  curvature: 0.1,
  tint: "#A7EF9E",
  mouseReact: true,
  mouseStrength: 0.5,
  pageLoadAnimation: true,
  brightness: 0.6,
};

// ---------- helpers ----------
const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const getTrackCoverUrl = (track) => {
  if (track.cover_url) return track.cover_url;

  if (track.cover && typeof track.cover === 'string' && track.cover.startsWith('http')) return track.cover;
  if (track.cover && typeof track.cover === 'string' && track.cover.startsWith('/media/')) return `http://localhost:8000${track.cover}`;
  if (track.cover && typeof track.cover === 'string') {
    const cleanPath = track.cover.startsWith('/') ? track.cover : `/${track.cover}`;
    return `http://localhost:8000${cleanPath}`;
  }
  return 'http://localhost:8000/static/default_cover.jpg';
};

// ---------- mini waveform (как в SearchHub) ----------
function WaveformMini({ waveformData, progress, onSeekRatio }) {
  const containerRef = useRef(null);
  const safe = Array.isArray(waveformData) ? waveformData : [];

  const playedBars = useMemo(() => {
    if (!safe.length) return 0;
    return Math.min(safe.length, Math.floor(clamp01(progress) * safe.length));
  }, [progress, safe.length]);

  const handleClick = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / Math.max(1, rect.width));
    onSeekRatio?.(ratio);
  }, [onSeekRatio]);

  return (
    <div
      className="sh-waveform-container"
      ref={containerRef}
      onMouseDown={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Waveform seek"
    >
      <div className="sh-waveform-progress" style={{ width: `${clamp01(progress) * 100}%` }} />
      <div className="sh-waveform-inner">
        {safe.length ? (
          safe.map((height, idx) => (
            <div
              key={idx}
              className={`sh-waveform-bar ${idx < playedBars ? 'played' : ''}`}
              style={{ '--height': `${Math.max(6, Math.min(100, Number(height) || 0))}%` }}
            />
          ))
        ) : (
          <div className="sh-wf-empty" />
        )}
      </div>
      <div className="sh-waveform-laser" style={{ left: `${clamp01(progress) * 100}%` }} />
    </div>
  );
}

// ---------- icons (минимально нужные) ----------
const IconTrash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 7h12l-1 14H7L6 7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 7V5h6v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 11v7M14 11v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      fill="currentColor"
    />
  </svg>
);

const IconComment = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: '16px', height: '16px' }}>
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
      fill="currentColor"
    />
  </svg>
);

export default function AdminTracksPage({
  playTrack,
  currentTrack,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
}) {
  const navigate = useNavigate();

  // ✅ Подключаем все нужные функции из SocialContext
  const {
    toggleLike,
    toggleRepost,
    isLiked,
    isReposted,
    likeCounts,
    repostCounts,
    seedTrackCounts, // ✅ добавили для инициализации счетчиков
  } = useSocial();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); // ✅ состояние для поиска

  // waveform cache
  const [wfMap, setWfMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/api/admin/tracks/');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      
      const usersArr = Array.isArray(data?.users) ? data.users : [];
      
      // ✅ Засеиваем счетчики в SocialContext, чтобы дальше они обновлялись в реальном времени
      usersArr.forEach(u => {
        (u.tracks || []).forEach(t => {
          const id = Number(t?.id);
          if (!id) return;
          seedTrackCounts?.(id, t.like_count ?? 0, t.repost_count ?? 0);
        });
      });
      
      setUsers(usersArr);
    } catch (e) {
      console.error('AdminTracksPage load error', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [seedTrackCounts]);

  useEffect(() => { load(); }, [load]);

  // подтягиваем waveform для видимых треков (простая версия)
  useEffect(() => {
    const ids = [];
    users.forEach(u => (u.tracks || []).forEach(t => { if (t?.id) ids.push(Number(t.id)); }));

    const need = ids.filter(id => !(wfMap[id]?.length));
    if (!need.length) return;

    let cancelled = false;
    (async () => {
      for (const id of need.slice(0, 40)) { // ограничим пачку, чтобы не убить браузер
        try {
          const resp = await apiFetch(`/api/track/${id}/waveform/`);
          if (!resp.ok) continue;
          const data = await resp.json();
          const waveform = data?.waveform || data?.bars || [];
          if (!cancelled && Array.isArray(waveform) && waveform.length) {
            setWfMap(prev => ({ ...prev, [id]: waveform }));
          }
        } catch (_) {}
      }
    })();

    return () => { cancelled = true; };
  }, [users, wfMap]);

  const handleDelete = useCallback(async (trackId) => {
    const ok = window.confirm('Удалить трек навсегда?');
    if (!ok) return;

    try {
      const resp = await apiFetch(`/api/admin/tracks/${trackId}/delete/`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // убираем из UI
      setUsers(prev =>
        prev.map(u => ({ ...u, tracks: (u.tracks || []).filter(t => Number(t.id) !== Number(trackId)) }))
      );
    } catch (e) {
      console.error('delete track error', e);
      alert('Не получилось удалить трек (ошибка в консоли).');
    }
  }, []);

  const goProfile = useCallback((username) => {
    if (!username) return;
    navigate(`/profile/${encodeURIComponent(username)}`);
  }, [navigate]);

  const goTrack = useCallback((id) => {
    navigate(`/track/${id}`);
  }, [navigate]);

  // ✅ фильтрация пользователей и треков по поисковому запросу
  const filteredUsers = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return users;

    return users
      .map(u => {
        const userMatch = (u.username || '').toLowerCase().includes(q);

        const tracks = (u.tracks || []).filter(t => {
          const title = (t.title || '').toLowerCase();
          const artist = (t.uploaded_by?.username || t.artist || '').toLowerCase();
          return title.includes(q) || artist.includes(q);
        });

        // если совпал юзер — показываем его целиком
        if (userMatch) return { ...u, tracks: u.tracks || [] };

        // иначе показываем только совпавшие треки
        return { ...u, tracks };
      })
      .filter(u => (u.tracks || []).length > 0);
  }, [users, query]);

  return (
    <div className="admin-tracks-page">
      <div className="admin-terminal-bg">
        {/* ✅ используем стабильные пропсы, чтобы терминал не пересоздавался */}
        <FaultyTerminal {...TERMINAL_PROPS} />
      </div>

      <div className="admin-tracks-overlay">
        <div className="admin-tracks-card">
          <div className="admin-tracks-header">
            <div className="admin-tracks-title">ADMIN: TRACKS</div>
            
            {/* ✅ поле поиска */}
            <input
              className="admin-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users / tracks..."
            />
            
            <button className="admin-tracks-refresh" onClick={load}>Refresh</button>
          </div>

          {loading ? (
            <div className="admin-tracks-loading">Loading…</div>
          ) : (
            <div className="admin-tracks-list">
              {filteredUsers.map(u => (
                <div key={u.id} className="admin-user-block">
                  <div
                    className="admin-user-title"
                    onClick={() => goProfile(u.username)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#8456ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                  >
                    {u.username} <span className="admin-user-id">#{u.id}</span>
                  </div>

                  <div className="admin-user-tracks">
                    {(u.tracks || []).length ? (u.tracks || []).map(t => {
                      const id = Number(t.id);
                      const liked = !!isLiked?.(id);
                      const reposted = !!isReposted?.(id);

                      // ✅ Берем счетчики из контекста, если они там есть, иначе из данных с бэка
                      const hasLike = Object.prototype.hasOwnProperty.call(likeCounts || {}, id);
                      const hasRepost = Object.prototype.hasOwnProperty.call(repostCounts || {}, id);

                      const likeCount = hasLike ? Number(likeCounts[id] ?? 0) : Number(t.like_count ?? 0);
                      const repostCount = hasRepost ? Number(repostCounts[id] ?? 0) : Number(t.repost_count ?? 0);
                      const commentCount = Number(t.comment_count ?? 0) || 0;
                      const viewsCount = Number(t.play_count ?? 0) || 0;

                      const coverUrl = getTrackCoverUrl(t);

                      // ✅ ИСПРАВЛЕНИЕ: правильно определяем ID текущего трека
                      const currentTrackId = (typeof currentTrack === 'object' && currentTrack)
                        ? Number(currentTrack.id)
                        : Number(currentTrack);
                      
                      const isCurrent = currentTrackId === id;
                      const playingNow = isCurrent && !!isPlaying;
                      
                      const dur = Number(duration || t.duration_seconds || 0) || 0;
                      const progress = isCurrent && dur > 0 ? clamp01((Number(currentTime) || 0) / dur) : 0;

                      return (
                        <div key={id} className="admin-track-row">
                          {/* карточка в стиле sidebar */}
                          <div className="sidebar-track-card admin-track-card">
                            <div className="sidebar-track-cover">
                              <img
                                src={coverUrl}
                                alt={t.title}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'http://localhost:8000/static/default_cover.jpg';
                                }}
                              />
                              <button
                                className={`sidebar-play-button ${playingNow ? 'playing' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // play/pause с усилением
                                  if (isCurrent) {
                                    onPlayPause?.();
                                  } else {
                                    playTrack?.(t);
                                    // если после выбора трека оно почему-то остаётся paused — пробуем включить
                                    setTimeout(() => {
                                      if (typeof onPlayPause === 'function' && !isPlaying) {
                                        onPlayPause();
                                      }
                                    }, 0);
                                  }
                                }}
                                aria-label={playingNow ? 'Pause' : 'Play'}
                              >
                                {playingNow ? <IconPause /> : <IconPlay />}
                              </button>
                            </div>

                            <div className="sidebar-track-info">
                              <div className="sidebar-track-header">
                                <div
                                  className="sidebar-track-title"
                                  onClick={() => goTrack(id)}
                                  style={{ cursor: 'pointer', transition: 'color 0.2s ease' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#8456ff')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
                                >
                                  {t.title}
                                </div>

                                {/* delete */}
                                <button
                                  className="admin-delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(id);
                                  }}
                                  title="Delete track"
                                  aria-label="Delete track"
                                >
                                  <IconTrash />
                                </button>
                              </div>

                              <div
                                className="sidebar-track-artist clickable-artist"
                                onClick={() => goProfile(t.uploaded_by?.username || t.artist)}
                                title="Перейти в профиль"
                              >
                                {t.uploaded_by?.username || t.artist}
                              </div>

                              {/* waveform */}
                              <div className="admin-waveform-wrap">
                                <WaveformMini
                                  waveformData={wfMap[id] || []}
                                  progress={progress}
                                  onSeekRatio={(ratio) => {
                                    if (!isCurrent) return;
                                    if (typeof onSeek === 'function' && dur > 0) {
                                      onSeek(ratio * dur);
                                    }
                                  }}
                                />
                              </div>

                              <div className="admin-track-actions">
                                <button
                                  className={`admin-like-btn ${liked ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); toggleLike?.(id); }}
                                  title={liked ? 'Unlike' : 'Like'}
                                >
                                  <IconHeart filled={liked} />
                                </button>
                                <span className="admin-count">{Number(likeCount).toLocaleString()}</span>

                                <button
                                  className={`admin-repost-btn ${reposted ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); toggleRepost?.(id); }}
                                  title={reposted ? 'Unrepost' : 'Repost'}
                                >
                                  <IconShare />
                                </button>
                                <span className="admin-count">{Number(repostCount).toLocaleString()}</span>

                                <span className="admin-stat">
                                  <IconEye /> <span className="admin-count">{viewsCount.toLocaleString()}</span>
                                </span>

                                <span className="admin-stat">
                                  <IconComment /> <span className="admin-count">{commentCount.toLocaleString()}</span>
                                </span>

                                <span className="admin-duration">
                                  {formatDuration(Number(t.duration_seconds || 0) || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="admin-empty">No tracks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}