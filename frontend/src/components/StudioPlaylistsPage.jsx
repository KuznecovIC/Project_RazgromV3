// StudioPlaylistsPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // ✅ Добавлен useParams
import GridScan from '../GridScan';
import Shuffle from './Shuffle';
import { apiFetch } from '../api/apiFetch';
import './StudioPlaylistsPage.css';

const API_BASE = 'http://localhost:8000';

const IconPlus = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" />
  </svg>
);

const IconMinus = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 11h14v2H5z" fill="currentColor" />
  </svg>
);

// ✅ УЛУЧШЕННЫЙ АЛГОРИТМ: доминантный цвет с приоритетом насыщенных цветов
function computeDominantFromCover(imageUrl, onColors) {
  if (!imageUrl) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageUrl;

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

      // Функция конвертации RGB в HSV для оценки насыщенности
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

      // Более крупное квантование (16 уровней вместо 32) чтобы цвета лучше группировались
      const add = (r, g, b) => {
        const rQ = r >> 4; // 16 уровней (0-15)
        const gQ = g >> 4;
        const bQ = b >> 4;
        const key = (rQ << 8) | (gQ << 4) | bQ;
        bucket.set(key, (bucket.get(key) || 0) + 1);
      };

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Пропускаем слишком прозрачные пиксели
        if (a < 220) continue;

        // ✅ ЖЕСТКО ОТСЕКАЕМ ПОЧТИ ЧЕРНЫЙ
        if (r < 20 && g < 20 && b < 20) continue;
        
        // ✅ ЖЕСТКО ОТСЕКАЕМ ПОЧТИ БЕЛЫЙ
        if (r > 245 && g > 245 && b > 245) continue;

        add(r, g, b);
      }

      if (!bucket.size) return;

      // ✅ НОВАЯ СИСТЕМА ОЦЕНКИ: частота * насыщенность * яркость
      let bestKey = null;
      let bestScore = -1;

      for (const [k, count] of bucket.entries()) {
        const rQ = (k >> 8) & 15;
        const gQ = (k >> 4) & 15;
        const bQ = k & 15;

        // Восстанавливаем примерные значения RGB
        const r = rQ * 16 + 8;
        const g = gQ * 16 + 8;
        const b = bQ * 16 + 8;

        const { s, v } = rgbToHsv(r, g, b);

        // ✅ Score: частота * (насыщенность с весом) * (яркость с весом)
        // Насыщенность важна - яркие, насыщенные цвета выигрывают у серых
        // Яркость тоже важна, но не доминирует
        const score = count * (0.5 + s * 1.5) * (0.3 + v * 0.7);

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

      const clamp = (v) => Math.max(0, Math.min(255, v));

      // ✅ Делаем цвета более насыщенными и яркими для эффекта
      const scan = `rgb(${clamp(domR + 30)}, ${clamp(domG + 30)}, ${clamp(domB + 30)})`;
      const lines = `rgb(${clamp(domR + 120)}, ${clamp(domG + 120)}, ${clamp(domB + 120)})`;
      const bg = `radial-gradient(1200px 700px at 50% 30%, rgba(${domR}, ${domG}, ${domB}, 0.34) 0%, rgba(11, 10, 25, 0.92) 55%, rgba(8, 7, 18, 0.96) 100%)`;

      onColors?.({ scan, lines, bg });
    } catch (e) {
      // ✅ Логируем ошибку CORS, но не ломаем интерфейс
      console.warn('Dominant color failed (CORS or tainted canvas):', e);
    }
  };

  // Обработка ошибок загрузки изображения
  img.onerror = (e) => {
    console.warn('Failed to load image for dominant color:', imageUrl);
  };
}

export default function StudioPlaylistsPage({
  user,
  playTrack,
  addTracks,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  getAuthToken
}) {
  const navigate = useNavigate();
  const params = useParams(); // ✅ Получаем параметры из URL
  const routePlaylistId = params?.id ? Number(params.id) : null; // ✅ Извлекаем ID плейлиста

  const [playlistId, setPlaylistId] = useState(null);
  const [title, setTitle] = useState('New playlist');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  const [selectedTracks, setSelectedTracks] = useState([]);
  const selectedIds = useMemo(() => new Set(selectedTracks.map((t) => t?.id)), [selectedTracks]);

  const [previewTrack, setPreviewTrack] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [waveLoading, setWaveLoading] = useState(false);

  const [gridScanColor, setGridScanColor] = useState('#8456ff');
  const [gridLinesColor, setGridLinesColor] = useState('#ffffff');
  const [bg, setBg] = useState(
    'radial-gradient(900px 600px at 50% 30%, rgba(132, 86, 255, 0.18) 0%, rgba(11,10,25,0.92) 60%, rgba(8,7,18,0.96) 100%)'
  );

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const coverInputRef = useRef(null);
  const debounceRef = useRef(null);

  // ✅ ЭФФЕКТ ЗАГРУЗКИ ПЛЕЙЛИСТА ПО ID ИЗ URL
  useEffect(() => {
    let alive = true;
    if (!routePlaylistId) return;

    (async () => {
      try {
        const resp = await apiFetch(`/api/playlists/${routePlaylistId}/`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!alive) return;

        const pl = data?.playlist;
        const items = Array.isArray(data?.items) ? data.items : [];

        setPlaylistId(pl?.id || routePlaylistId);
        setTitle(pl?.title || "New playlist");
        setDescription(pl?.description || "");
        setVisibility(pl?.visibility || "private");

        // cover preview
        const cover = pl?.cover_url || pl?.cover || "";
        if (cover) setCoverPreview(cover);

        // items -> selectedTracks (берем track объекты, если сериализатор их отдаёт)
        const tracks = items
          .map((it) => it?.track)
          .filter(Boolean);

        setSelectedTracks(tracks);
        
        // Если есть треки, устанавливаем первый как preview
        if (tracks.length > 0 && !previewTrack) {
          setPreviewTrack(tracks[0]);
        }
      } catch (_) {}
    })();

    return () => {
      alive = false;
    };
  }, [routePlaylistId, previewTrack]);

  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    const t = previewTrack;
    if (!t?.id) return;

    const coverUrl = t.cover_url || t.cover;
    if (coverUrl) {
      computeDominantFromCover(coverUrl, ({ scan, lines, bg }) => {
        setGridScanColor(scan);
        setGridLinesColor(lines);
        setBg(bg);
      });
    }

    let alive = true;
    (async () => {
      try {
        setWaveLoading(true);
        const resp = await apiFetch(`/api/track/${t.id}/waveform/`);
        if (!resp.ok) {
          if (!alive) return;
          setWaveformData([]);
          return;
        }
        const data = await resp.json();
        if (!alive) return;
        setWaveformData(Array.isArray(data?.waveform) ? data.waveform : []);
      } catch (_) {
        if (!alive) return;
        setWaveformData([]);
      } finally {
        if (!alive) return;
        setWaveLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [previewTrack]);

  useEffect(() => {
    const q = query.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');

      try {
        const resp = await apiFetch(`/api/tracks/search/?q=${encodeURIComponent(q)}&page=1&per_page=24`);
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          setSearchResults([]);
          setSearchError(data?.error || 'Ошибка поиска');
          return;
        }

        setSearchResults(Array.isArray(data?.tracks) ? data.tracks : []);
      } catch (_) {
        setSearchResults([]);
        setSearchError('Ошибка сети');
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const toggleTrack = useCallback((track) => {
    if (!track?.id) return;

    setSelectedTracks((prev) => {
      const exists = prev.some((t) => t?.id === track.id);
      if (exists) {
        const next = prev.filter((t) => t?.id !== track.id);
        if (previewTrack?.id === track.id) setPreviewTrack(next[0] || null);
        return next;
      }
      const next = [...prev, track];
      if (!previewTrack) setPreviewTrack(track);
      return next;
    });
  }, [previewTrack]);

  const playFromPlaylist = useCallback((track) => {
    if (!track?.id) return;
    setPreviewTrack(track);

    if (typeof addTracks === 'function') addTracks(selectedTracks);
    if (typeof playTrack === 'function') playTrack(track);
  }, [addTracks, playTrack, selectedTracks]);

  const onWaveClick = useCallback((index) => {
    if (!previewTrack?.id) return;
    if (!duration || !waveformData.length || typeof onSeek !== 'function') return;

    const percent = index / waveformData.length;
    onSeek(percent * duration);
  }, [duration, waveformData.length, onSeek, previewTrack]);

  const progress = useMemo(() => {
    if (!previewTrack?.id) return 0;
    if (currentTrack !== previewTrack.id) return 0;
    if (!duration) return 0;
    return Math.max(0, Math.min(1, currentTime / duration));
  }, [currentTrack, currentTime, duration, previewTrack]);

  const playedBars = useMemo(() => {
    if (!waveformData.length) return 0;
    return Math.min(waveformData.length, Math.floor(progress * waveformData.length));
  }, [progress, waveformData.length]);

  // ✅ УЛУЧШЕННАЯ ФУНКЦИЯ СОХРАНЕНИЯ с параметром publish
  const savePlaylist = useCallback(async ({ publish = false } = {}) => {
    setSaving(true);
    setSaveStatus('');

    try {
      // Получаем токен
      const token = getAuthToken?.() || localStorage.getItem('access') || localStorage.getItem('accessToken');
      if (!token) throw new Error('Нет токена авторизации');

      const form = new FormData();
      form.append('title', title.trim() || 'New playlist');
      form.append('description', description.trim());

      // ✅ если publish — принудительно public
      const finalVisibility = publish ? 'public' : visibility;
      form.append('visibility', finalVisibility);

      form.append('track_ids', JSON.stringify(selectedTracks.map(t => t.id)));

      if (coverFile) {
        // фронт уже шлёт cover — это ок, бэкенд принимает cover
        form.append('cover', coverFile);
      }

      const isUpdate = Boolean(playlistId);
      const url = isUpdate ? `/api/playlists/${playlistId}/update/` : '/api/playlists/create/';
      const method = 'POST'; // update тоже использует POST с multipart

      const resp = await fetch(`${API_BASE}${url}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);

      const playlist = data.playlist || data;
      setPlaylistId(playlist.id);
      setSaveStatus(publish ? '✅ Published!' : '✅ Saved!');

      // ✅ если publish — кидаем на публичную страницу
      if (publish) {
        navigate(`/playlist/${playlist.id}`);
      }
    } catch (e) {
      console.error('❌ savePlaylist:', e);
      setSaveStatus(`❌ ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }, [title, description, visibility, coverFile, selectedTracks, playlistId, navigate, getAuthToken]);

  return (
    <div className="studioPlaylists">
      {/* ✅ Фоновый градиент как отдельный слой под GridScan */}
      <div className="spBg" style={{ background: bg }} />
      
      {/* ✅ GridScan с отключенными пост-эффектами */}
      <GridScan
        className="background-gridscan"
        sensitivity={0.65}
        lineThickness={1}
        linesColor={gridLinesColor}
        gridScale={0.12}
        scanColor={gridScanColor}
        scanOpacity={0.25}
        enablePost={false}           // ✅ Отключаем пост-эффекты
        chromaticAberration={0}      // ✅ Убираем цветные контуры
        noiseIntensity={0.0}         // ✅ Убираем шум
        bloomIntensity={0.0}         // ✅ Убираем свечение
        scanGlow={0.0}               // ✅ Убираем свечение скана
      />

      <div className="spWrap">
        <div className="spTitleRow">
          <Shuffle
            text="PLAYLIST STUDIO"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.02}
            threshold={0.1}
            triggerOnce={true}
            style={{ fontSize: '1.1rem' }}
          />

          <div className="spTopActions">
            <button className="spBtn" onClick={() => navigate('/studio')}>Back</button>
            
            {/* ✅ Статус сохранения */}
            {saveStatus && <div className="spSaveStatus">{saveStatus}</div>}
            
            {/* ✅ Кнопка Save */}
            <button 
              className="spBtn spBtnPrimary" 
              onClick={() => savePlaylist({ publish: false })} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            
            {/* ✅ Кнопка Public */}
            <button 
              className="spBtn spBtnPrimary" 
              onClick={() => savePlaylist({ publish: true })} 
              disabled={saving}
            >
              {saving ? 'Publishing...' : 'Public'}
            </button>
          </div>
        </div>

        <div className="spPanels">
          {/* LEFT */}
          <section className="spPanel spPanelLeft">
            <div className="spMeta">
              <div className="spCover" onClick={() => coverInputRef.current?.click()}>
                {coverPreview ? (
                  <img src={coverPreview} alt="Playlist cover" />
                ) : (
                  <div className="spCoverPlaceholder">
                    <div className="spCoverPlus">+</div>
                    <div className="spCoverText">Upload cover</div>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="spMetaFields">
                <label className="spLabel">
                  <span>Title</span>
                  <input className="spInput" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>

                <label className="spLabel">
                  <span>Description</span>
                  <textarea className="spTextarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </label>

                <label className="spLabel">
                  <span>Visibility</span>
                  {/* ✅ Кастомный селектор вместо стандартного select */}
                  <div className="visibilitySelector">
                    {["public", "unlisted", "private"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`visBtn ${visibility === v ? "active" : ""}`}
                        onClick={() => setVisibility(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </label>

                <div className="spOwner">
                  <div className="spOwnerAvatar">
                    {user?.avatar_url || user?.avatar ? (
                      <img src={user.avatar_url || user.avatar} alt="avatar" />
                    ) : (
                      <div className="spOwnerAvatarFallback" />
                    )}
                  </div>
                  <div className="spOwnerMeta">
                    <div className="spOwnerName">@{user?.username || 'you'}</div>
                    <div className="spOwnerHint">Клик по треку — меняет GridScan</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="spWave">
              <div className="spWaveHead">
                <div className="spWaveTitle">Waveform</div>
                <div className="spWaveSub">
                  {previewTrack ? `${previewTrack.title} — ${previewTrack.artist}` : 'Выбери трек'}
                </div>
              </div>

              <div className="spWaveBody">
                {waveLoading ? (
                  <div className="spWaveLoading">Загрузка waveform…</div>
                ) : waveformData.length ? (
                  <div className="spWaveBars" role="presentation">
                    {waveformData.map((h, idx) => {
                      const isPlayed = currentTrack === previewTrack?.id && idx <= playedBars;
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`spWaveBar ${isPlayed ? 'played' : ''}`}
                          style={{ height: `${Math.max(4, Math.min(100, Number(h) || 0))}%` }}
                          onClick={() => onWaveClick(idx)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="spWaveEmpty">Waveform появится после выбора трека</div>
                )}
              </div>

              <div className="spWaveFoot">
                <button className="spBtn spBtnPrimary" disabled={!selectedTracks.length} onClick={() => playFromPlaylist(selectedTracks[0])}>
                  Play playlist
                </button>
                <div className="spMini">Tracks: <b>{selectedTracks.length}</b></div>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <section className="spPanel spPanelRight">
            <div className="spSearchHead">
              <div className="spSearchTitle">Add tracks</div>
              <input className="spSearchInput" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tracks by title…" />
              {searchError && <div className="spErr">{searchError}</div>}
            </div>

            <div className="spSearchBody">
              {searchLoading ? (
                <div className="spSearchLoading">Поиск…</div>
              ) : !query.trim() ? (
                <div className="spSearchHint">Начни вводить название — покажу результаты.</div>
              ) : !searchResults.length ? (
                <div className="spSearchHint">Ничего не найдено</div>
              ) : (
                <div className="spResults">
                  {searchResults.map((t) => {
                    const cover = t.cover_url || t.cover;
                    const inPl = selectedIds.has(t.id);

                    return (
                      <div key={t.id} className={`spResult ${inPl ? 'in' : ''}`}>
                        <div className="spResultCover">
                          {cover ? <img src={cover} alt="cover" /> : <div className="spResultCoverPh" />}
                        </div>

                        <div className="spResultMeta">
                          <div className="spResultTitle">{t.title}</div>
                          <div className="spResultArtist">@{t.artist}</div>
                        </div>

                        <button type="button" className={`spAddBtn ${inPl ? 'minus' : 'plus'}`} onClick={() => toggleTrack(t)}>
                          {inPl ? <IconMinus /> : <IconPlus />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Tracklist */}
        <section className="spTracklist">
          <div className="spTracklistHead">
            <div className="spTracklistTitle">Tracks in playlist</div>
            <div className="spTracklistSub">Клик по треку — сразу играет + меняет GridScan цвет</div>
          </div>

          {!selectedTracks.length ? (
            <div className="spTracklistEmpty">Пока пусто. Добавь треки справа.</div>
          ) : (
            <div className="spTrackRows">
              {selectedTracks.map((t, idx) => {
                const cover = t.cover_url || t.cover;
                const active = previewTrack?.id === t.id;

                return (
                  <div key={t.id} className={`spTrackRow ${active ? 'active' : ''}`} onClick={() => playFromPlaylist(t)} role="button" tabIndex={0}>
                    <div className="spTrackIdx">{idx + 1}</div>
                    <div className="spTrackCover">
                      {cover ? <img src={cover} alt="cover" /> : <div className="spTrackCoverPh" />}
                    </div>
                    <div className="spTrackMeta">
                      <div className="spTrackTitle">{t.title}</div>
                      <div className="spTrackArtist">@{t.artist}</div>
                    </div>

                    <button
                      type="button"
                      className="spRemoveBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrack(t);
                      }}
                    >
                      <IconMinus />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}