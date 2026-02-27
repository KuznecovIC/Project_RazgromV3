import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';
import './SearchHub.css';

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
      fill={filled ? '#8456ff' : 'currentColor'}
      stroke={filled ? '#8456ff' : 'currentColor'}
      strokeWidth="0.5"
    />
  </svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
      fill="currentColor"
    />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      fill="currentColor"
    />
  </svg>
);

const IconComment = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"
      fill="currentColor"
    />
  </svg>
);

const defaultPalette = ['#FF9FFC', '#FF6B6B', '#FFD93D', '#6BCF7F', '#A0F7FF', '#9B8BFF'];

const remapColors = colors =>
  (colors.length ? colors : [1, 2, 3, 4]).map(value =>
    typeof value === 'number'
      ? defaultPalette[(value - 1 + defaultPalette.length) % defaultPalette.length]
      : value
  );

const createParticles = ({ count, distances, radius, animationTime, timeVariance, colors }) => {
  if (count <= 0) return [];
  const palette = remapColors(colors);
  return Array.from({ length: count }).map((_, idx) => {
    const baseDistance = distances[idx % distances.length] ?? radius * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const distance = baseDistance + Math.random() * Math.max(12, radius - baseDistance);
    const endDistance = distance * (0.5 + Math.random() * 0.8);

    const startX = Math.cos(angle) * baseDistance;
    const startY = Math.sin(angle) * baseDistance;
    const endX = Math.cos(angle) * endDistance;
    const endY = Math.sin(angle) * endDistance;

    const rotate = angle * (180 / Math.PI);
    const duration = Math.max(450, animationTime + (Math.random() - 0.5) * 2 * timeVariance) / 1000;
    const scale = 0.5 + Math.random() * 1.5;
    const color = palette[idx % palette.length];

    return {
      id: `${idx}-${Date.now()}-${Math.random()}`,
      rotate,
      startX,
      startY,
      endX,
      endY,
      scale,
      duration,
      color
    };
  });
};

const clamp01 = v => Math.min(1, Math.max(0, v));

const formatCount = value => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const getCover = t => t?.cover_url || t?.cover || t?.coverImage || null;
const getArtistName = t =>
  t?.artist ||
  t?.author_username ||
  t?.uploaded_by?.username ||
  t?.uploaded_by?.display_name ||
  t?.uploaded_by?.name ||
  'Unknown';

const getArtistId = t => t?.uploaded_by?.id || t?.user_id || t?.user?.id || null;

// 👇 Кэш для данных плейлистов
const playlistQueueCache = {};

// ✅ Функция для уникализации тегов (без дублей)
const uniqTags = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of (arr || [])) {
    const t = String(x || '').replace('#', '').trim().toLowerCase();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
};

function WaveformMini({ waveformData, progress, onSeekRatio }) {
  const containerRef = useRef(null);
  const safe = Array.isArray(waveformData) ? waveformData : [];

  const playedBars = useMemo(() => {
    if (!safe.length) return 0;
    const count = Math.floor(clamp01(progress) * safe.length);
    return Math.min(count, safe.length);
  }, [progress, safe.length]);

  const handleContainerClick = useCallback(
    e => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = clamp01((e.clientX - rect.left) / Math.max(1, rect.width));
      onSeekRatio?.(ratio);
    },
    [onSeekRatio]
  );

  return (
    <div
      className="sh-waveform-container"
      ref={containerRef}
      onMouseDown={handleContainerClick}
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

export default function SearchHub({
  playTrack,
  onPlayPause,
  onSeek,
  currentTrack,
  currentTrackFull,
  isPlaying,
  currentTime,
  duration,
  // 👇 НОВЫЕ ПРОПСЫ ДЛЯ ОЧЕРЕДИ
  setPlaybackQueue,
  playQueueIds,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const q = (params.get('q') || '').trim();

  const {
    toggleFollow,
    isFollowing,
    toggleLike,
    toggleRepost,
    isLiked,
    isReposted,
    likeCounts,
    repostCounts,
    followerCounts,
    // 👇 ПЛЕЙЛИСТНЫЕ ФУНКЦИИ ИЗ SOCIALCONTEXT
    togglePlaylistLike,
    togglePlaylistRepost,
    playlistLikes,
    playlistReposts,
    playlistLikeCounts,
    playlistRepostCounts,
  } = useSocial();

  // нормализуем текущий трек
  const currentTrackId = useMemo(() => {
    const raw =
      currentTrackFull?.id ??
      (typeof currentTrack === 'object' ? currentTrack?.id : currentTrack);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [currentTrack, currentTrackFull]);

  const [activeTab, setActiveTab] = useState('all');
  const [activeCountry, setActiveCountry] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ tracks: [], people: [], playlists: [] });
  const [filters, setFilters] = useState({ tags: [], trending_tags: [], countries: [] });

  const [wfMap, setWfMap] = useState({});

  // Gooey bursts
  const [bursts, setBursts] = useState([]);
  const spawnBurst = useCallback((el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const id = `${Date.now()}-${Math.random()}`;

    const particles = createParticles({
      count: 12,
      distances: [90, 20],
      radius: 120,
      animationTime: 600,
      timeVariance: 300,
      colors: []
    });

    const style = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };

    setBursts(prev => [...prev, { id, style, particles }]);

    window.setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id));
    }, 700);
  }, []);

  // pending seek
  const pendingSeekRef = useRef(null);

  const seekTrackAtRatio = useCallback(
    (track, ratio) => {
      const trackIdNum = Number(track?.id);
      if (!Number.isFinite(trackIdNum)) return;

      const r = clamp01(ratio);

      if (currentTrackId !== trackIdNum) {
        pendingSeekRef.current = { trackId: trackIdNum, ratio: r };
        playTrack?.(track);
        return;
      }

      if (duration && duration > 0) {
        onSeek?.(duration * r);
      } else {
        pendingSeekRef.current = { trackId: trackIdNum, ratio: r };
      }
    },
    [currentTrackId, duration, onSeek, playTrack]
  );

  useEffect(() => {
    const pending = pendingSeekRef.current;
    if (!pending) return;
    if (pending.trackId !== currentTrackId) return;
    if (!duration || duration <= 0) return;
    onSeek?.(duration * pending.ratio);
    pendingSeekRef.current = null;
  }, [currentTrackId, duration, onSeek]);

  // search fetch
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!q) {
        setResults({ tracks: [], people: [], playlists: [] });
        setFilters({ tags: [], trending_tags: [], countries: [] });
        return;
      }
      setLoading(true);
      try {
        const resp = await apiFetch(`/api/search/?q=${encodeURIComponent(q)}`);
        const data = await resp.json();
        if (cancelled) return;
        
        setResults({
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
          people: Array.isArray(data.people) ? data.people : [],
          playlists: Array.isArray(data.playlists) ? data.playlists : []
        });
        
        setFilters({
          tags: Array.isArray(data?.filters?.tags) ? data.filters.tags : [],
          trending_tags: Array.isArray(data?.filters?.trending_tags) ? data.filters.trending_tags : [],
          countries: Array.isArray(data?.filters?.countries) ? data.filters.countries : []
        });
      } catch (e) {
        if (!cancelled) {
          setResults({ tracks: [], people: [], playlists: [] });
          setFilters({ tags: [], trending_tags: [], countries: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [q]);

  // waveform fetch
  useEffect(() => {
    const tracks = results.tracks || [];
    if (!tracks.length) return;

    let cancelled = false;

    const fetchWaves = async () => {
      const toFetch = tracks
        .map(t => Number(t.id))
        .filter(id =>
          Number.isFinite(id) &&
          !wfMap[id] &&
          !(tracks.find(x => Number(x.id) === id)?.waveform_data?.length)
        );

      if (!toFetch.length) return;

      for (const id of toFetch.slice(0, 6)) {
        try {
          const resp = await apiFetch(`/api/track/${id}/waveform/`);
          const data = await resp.json();
          if (cancelled) return;
          const waveform = data.waveform || data.bars || [];
          if (Array.isArray(waveform) && waveform.length) {
            setWfMap(prev => ({ ...prev, [id]: waveform }));
          }
        } catch (_) {}
      }
    };

    fetchWaves();
    return () => { cancelled = true; };
  }, [results.tracks, wfMap]);

  // 👇 ФУНКЦИИ ДЛЯ РАБОТЫ С ОЧЕРЕДЬЮ ПЛЕЙЛИСТА
  const fetchPlaylistQueue = useCallback(async (playlistId) => {
    if (playlistQueueCache[playlistId]) {
      console.log(`✅ SearchHub: Используем кэшированную очередь для плейлиста ${playlistId}`);
      return playlistQueueCache[playlistId];
    }

    console.log(`🔄 SearchHub: Загружаем очередь для плейлиста ${playlistId}...`);
    try {
      const response = await apiFetch(`/api/playlists/${playlistId}/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.items && Array.isArray(data.items)) {
        const trackIds = data.items.map(item => item.track?.id).filter(id => id);
        playlistQueueCache[playlistId] = trackIds;
        console.log(`✅ SearchHub: Загружено ${trackIds.length} треков для плейлиста ${playlistId}`);
        return trackIds;
      }
      return [];
    } catch (error) {
      console.error(`❌ SearchHub: Ошибка загрузки очереди плейлиста ${playlistId}:`, error);
      return [];
    }
  }, []);

  const handlePlaylistPlayPause = useCallback(async (e, playlist) => {
    e.stopPropagation();
    e.preventDefault();

    const playlistId = playlist.id;
    const cachedIds = playlistQueueCache[playlistId];
    const isCurrentPlaylistPlaying = playQueueIds?.length > 0 && 
                                     playQueueIds === cachedIds && 
                                     isPlaying;

    if (isCurrentPlaylistPlaying) {
      onPlayPause?.();
      return;
    }

    const trackIds = await fetchPlaylistQueue(playlistId);
    if (trackIds.length === 0) {
      console.warn('⚠️ SearchHub: В плейлисте нет треков для воспроизведения');
      return;
    }

    setPlaybackQueue?.(trackIds);

    const firstTrackData = results.tracks?.find(t => t.id === trackIds[0]);
    if (firstTrackData) {
      playTrack?.(firstTrackData);
    } else {
      try {
        const response = await apiFetch(`/api/track/${trackIds[0]}/`);
        if (response.ok) {
          const trackData = await response.json();
          playTrack?.(trackData);
        }
      } catch (err) {
        console.error('❌ SearchHub: Не удалось загрузить первый трек плейлиста', err);
      }
    }
  }, [fetchPlaylistQueue, setPlaybackQueue, playTrack, results.tracks, onPlayPause, isPlaying, playQueueIds]);

  // ✅ УНИКАЛЬНЫЕ ТЕГИ (без дублей)
  const allTags = useMemo(() => {
    return uniqTags(filters.tags).slice(0, 12);
  }, [filters.tags]);

  const trendingTags = useMemo(() => {
    return uniqTags(filters.trending_tags).slice(0, 12);
  }, [filters.trending_tags]);

  const countries = useMemo(() => {
    return (filters.countries || []).map(c => String(c).trim()).filter(Boolean).slice(0, 12);
  }, [filters.countries]);

  const filtered = useMemo(() => {
    const byTag = t => {
      if (!activeTag) return true;
      const list = t.hashtag_list || t.tag_list || t.tags || [];
      if (Array.isArray(list)) return list.map(x => String(x).toLowerCase()).includes(activeTag.toLowerCase());
      if (typeof list === 'string') return list.toLowerCase().includes(activeTag.toLowerCase());
      return false;
    };

    const byCountry = p => {
      if (!activeCountry) return true;
      const c = p.country || p.location || p.profile?.country || p.profile?.location;
      return String(c || '').toLowerCase() === String(activeCountry).toLowerCase();
    };

    const tracks = (results.tracks || []).filter(byTag);
    const playlists = (results.playlists || []).filter(pl => !activeTag || String(pl.title || '').toLowerCase().includes(activeTag.toLowerCase()));
    const people = (results.people || []).filter(byCountry);

    return { tracks, playlists, people };
  }, [results, activeTag, activeCountry]);

  const totals = useMemo(() => {
    const playlists = filtered.playlists.length;
    const tracks = filtered.tracks.length;
    const people = filtered.people.length;
    return { playlists, tracks, people };
  }, [filtered]);

  const showTracks = activeTab === 'all' || activeTab === 'tracks';
  const showPeople = activeTab === 'all' || activeTab === 'people';
  const showPlaylists = activeTab === 'all' || activeTab === 'playlists';

  return (
    <div className="searchhub">
      {/* Gooey bursts overlay */}
      <div className="sh-gooey-overlay" aria-hidden="true">
        {bursts.map(b => (
          <div key={b.id} className="effect filter active sh-gooey-effect" style={b.style}>
            {b.particles.map(p => (
              <span
                key={p.id}
                className="particle"
                style={{
                  '--start-x': `${p.startX}px`,
                  '--start-y': `${p.startY}px`,
                  '--end-x': `${p.endX}px`,
                  '--end-y': `${p.endY}px`,
                  '--rotate': `${p.rotate}deg`,
                  '--scale': p.scale,
                  '--time': `${p.duration}s`,
                  '--color': p.color
                }}
              >
                <span className="point" />
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="searchhub-inner">
        <div className="sh-top">
          <div className="sh-title">
            <h1>Search results for “{q || '…'}”</h1>
            <div className="sh-found">
              Found {totals.playlists}+ playlists, {totals.tracks}+ tracks, {totals.people}+ people
            </div>
          </div>
        </div>

        <div className="sh-grid">
          <aside className="sh-left">
            <div className="sh-tabs">
              <button className={`sh-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={e => { setActiveTab('all'); spawnBurst(e.currentTarget); }}>
                Everything
              </button>

              <button className={`sh-tab ${activeTab === 'tracks' ? 'active' : ''}`}
                onClick={e => { setActiveTab('tracks'); spawnBurst(e.currentTarget); }}>
                Tracks
              </button>

              <button className={`sh-tab ${activeTab === 'people' ? 'active' : ''}`}
                onClick={e => { setActiveTab('people'); spawnBurst(e.currentTarget); }}>
                People
              </button>

              <button className={`sh-tab ${activeTab === 'playlists' ? 'active' : ''}`}
                onClick={e => { setActiveTab('playlists'); spawnBurst(e.currentTarget); }}>
                Playlists
              </button>

              {/* 👇 КНОПКА ALBUMS УДАЛЕНА */}
            </div>

            {countries.length > 0 && (
              <div className="sh-filter">
                <div className="sh-filter-title">Filter by location</div>
                <div className="sh-country-list">
                  {countries.map(c => (
                    <button key={c} className={`sh-country ${activeCountry === c ? 'active' : ''}`}
                      onClick={e => { setActiveCountry(prev => (prev === c ? null : c)); spawnBurst(e.currentTarget); }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allTags.length > 0 && (
              <div className="sh-filter">
                <div className="sh-filter-title">Filter by tag</div>
                <div className="sh-tags">
                  {allTags.map(tag => (
                    <button key={tag} className={`sh-tag ${activeTag === tag ? 'active' : ''}`}
                      onClick={e => { setActiveTag(prev => (prev === tag ? null : tag)); spawnBurst(e.currentTarget); }}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trendingTags.length > 0 && (
              <>
                <div className="sh-filter-title" style={{ marginTop: 14 }}>Trending</div>
                <div className="sh-tags">
                  {trendingTags.map(tag => (
                    <button
                      key={`tr-${tag}`}
                      className={`sh-tag ${activeTag === tag ? 'active' : ''}`}
                      onClick={e => { setActiveTag(prev => (prev === tag ? null : tag)); spawnBurst(e.currentTarget); }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>

          <section className="sh-right">
            {loading && (
              <div className="sh-loading">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4a8 8 0 108 8" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                Loading…
              </div>
            )}

            {!loading && showPeople && filtered.people.length > 0 && (
              <div className="sh-block">
                <div className="sh-block-title">People</div>
                <div className="sh-people">
                  {filtered.people.map(p => {
                    const userId = Number(p.id || p.user_id || p.user?.id);
                    const username = p.username || p.display_name || p.name || p.user?.username || 'User';
                    const country = p.country || p.location || p.profile?.country || '';
                    const following = isFollowing?.(userId);
                    
                    const hasFollower = followerCounts && Object.prototype.hasOwnProperty.call(followerCounts, userId);
                    const followersCount = hasFollower 
                      ? (followerCounts[userId] ?? 0) 
                      : (p.follower_count ?? p.followers_count ?? 0);

                    return (
                      <div key={userId || username} className="sh-person-card">
                        <div className="sh-person-avatar">
                          {p.avatar || p.avatar_url || p.profile?.avatar_url ? (
                            <img src={p.avatar_url || p.avatar || p.profile?.avatar_url} alt={username} />
                          ) : (
                            <div className="sh-person-fallback" />
                          )}
                        </div>

                        <div className="sh-person-mid">
                          <button className="sh-person-name" onClick={() => navigate(`/profile/${userId}`)}>
                            {username}
                          </button>
                          <div className="sh-person-sub">{country}</div>
                          <div className="sh-person-followers">{formatCount(followersCount)} followers</div>
                        </div>

                        <button className={`sh-follow ${following ? 'active' : ''}`}
                          onClick={() => toggleFollow?.(userId)}>
                          {following ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && showTracks && filtered.tracks.length > 0 && (
              <div className="sh-block">
                <div className="sh-block-title">Tracks</div>

                <div className="sh-tracks">
                  {filtered.tracks.map(t => {
                    const id = Number(t.id);
                    const isActive = currentTrackId !== null && currentTrackId === id;

                    const artistName = getArtistName(t);
                    const artistId = getArtistId(t);
                    const cover = getCover(t);

                    const waveform = wfMap[id] || t.waveform_data || [];
                    const progress = isActive && duration ? clamp01(currentTime / Math.max(1, duration)) : 0;

                    const liked = isLiked?.(id) ?? false;
                    const reposted = isReposted?.(id) ?? false;

                    const hasLike = likeCounts && Object.prototype.hasOwnProperty.call(likeCounts, id);
                    const hasRepost = repostCounts && Object.prototype.hasOwnProperty.call(repostCounts, id);

                    const likeCount = hasLike ? (likeCounts[id] ?? 0) : (t.like_count ?? 0);
                    const repostCount = hasRepost ? (repostCounts[id] ?? 0) : (t.repost_count ?? 0);

                    return (
                      <div key={id} className="sh-track">
                        <div className="sh-cover">
                          {cover ? <img src={cover} alt={t.title} /> : <div className="sh-cover-fallback" />}

                          <button className="sh-cover-play"
                            onClick={() => { if (isActive) onPlayPause?.(); else playTrack?.(t); }}
                            aria-label={isActive && isPlaying ? 'Pause' : 'Play'}>
                            {isActive && isPlaying ? <IconPause /> : <IconPlay />}
                          </button>
                        </div>

                        <div className="sh-track-mid">
                          <div className="sh-track-topline">
                            <button className="sh-artist"
                              onClick={() => artistId && navigate(`/profile/${artistId}`)}>
                              {artistName}
                            </button>

                            <button className="sh-titlelink" onClick={() => navigate(`/track/${id}`)}>
                              {t.title}
                            </button>
                          </div>

                          <WaveformMini
                            waveformData={waveform}
                            progress={progress}
                            onSeekRatio={(ratio) => seekTrackAtRatio(t, ratio)}
                          />

                          <div className="sh-track-actions">
                            <button className={`sh-action-btn ${liked ? 'active' : ''}`}
                              onClick={() => toggleLike?.(id)}
                              aria-label="Like">
                              <IconHeart filled={liked} />
                              <span>{formatCount(likeCount)}</span>
                            </button>

                            <button className={`sh-action-btn ${reposted ? 'active' : ''}`}
                              onClick={() => toggleRepost?.(id)}
                              aria-label="Repost">
                              <IconShare />
                              <span>{formatCount(repostCount)}</span>
                            </button>

                            <div className="sh-action-meta" title="Views">
                              <IconEye />
                              <span>{formatCount(t.play_count ?? 0)}</span>
                            </div>

                            <div className="sh-action-meta" title="Comments">
                              <IconComment />
                              <span>{formatCount(t.comment_count ?? t.comments_count ?? 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && showPlaylists && filtered.playlists.length > 0 && (
              <div className="sh-block">
                <div className="sh-block-title">Playlists</div>

                <div className="sh-playlists">
                  {filtered.playlists.map(pl => {
                    const playlistId = pl.id;
                    const isLiked = playlistLikes?.[playlistId] || false;
                    const isReposted = playlistReposts?.[playlistId] || false;
                    const likeCount = playlistLikeCounts?.[playlistId] ?? pl.like_count ?? 0;
                    const repostCount = playlistRepostCounts?.[playlistId] ?? pl.repost_count ?? 0;
                    const coverUrl = pl.cover_url || pl.cover || `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/static/default_playlist.jpg`;
                    
                    const isCurrentPlaylistPlaying = playQueueIds?.length > 0 && 
                                                     playQueueIds === playlistQueueCache[playlistId] && 
                                                     isPlaying;

                    return (
                      <div key={playlistId} className="sh-playlist-card">
                        <div className="sh-playlist-cover-container">
                          <img
                            src={coverUrl}
                            alt={pl.title}
                            className="sh-playlist-cover"
                            loading="lazy"
                          />
                          <button
                            className={`sh-pl-play ${isCurrentPlaylistPlaying ? 'playing' : ''}`}
                            onClick={(e) => handlePlaylistPlayPause(e, pl)}
                          >
                            {isCurrentPlaylistPlaying ? <IconPause /> : <IconPlay />}
                          </button>
                        </div>
                        <div className="sh-playlist-info">
                          <div className="sh-playlist-header">
                            <div
                              className="sh-pl-title-link"
                              onClick={() => navigate(`/playlist/${playlistId}`)}
                            >
                              {pl.title || 'Untitled Playlist'}
                            </div>
                            <div className="sh-pl-actions">
                              <button
                                className={`sh-pl-like ${isLiked ? 'liked' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlaylistLike?.(playlistId);
                                }}
                              >
                                <IconHeart filled={isLiked} />
                                <span>{formatCount(likeCount)}</span>
                              </button>
                              <button
                                className={`sh-pl-repost ${isReposted ? 'reposted' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlaylistRepost?.(playlistId);
                                }}
                              >
                                <IconShare />
                                <span>{formatCount(repostCount)}</span>
                              </button>
                            </div>
                          </div>
                          <div className="sh-pl-sub">{pl.track_count ?? pl.count ?? 0} tracks</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && !filtered.tracks.length && !filtered.people.length && !filtered.playlists.length && (
              <div style={{ opacity: 0.75, padding: 20 }}>Nothing found</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}