import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';
import FaultyTerminal from './FaultyTerminal';
import './AdminPlaylistsPage.css';
import './Sidebar.css'; // ✅ чтобы стиль был как в сайдбаре

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

const IconTrash = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 7h12l-1 14H7L6 7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 7V5h6v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M10 11v7M14 11v7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function AdminPlaylistsPage() {
  const navigate = useNavigate();

  const {
    togglePlaylistLike,
    togglePlaylistRepost,
    isPlaylistLiked,
    isPlaylistReposted,
    playlistLikeCounts,
    playlistRepostCounts,
    seedPlaylistCounts,
  } = useSocial();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/api/admin/playlists/');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const usersArr = Array.isArray(data?.users) ? data.users : [];

      // ✅ seed counts in SocialContext
      usersArr.forEach(u => {
        (u.playlists || []).forEach(p => {
          const id = Number(p?.id);
          if (!id) return;
          seedPlaylistCounts?.(
            id,
            p.likes_count ?? 0,
            (p.reposts_count ?? p.repost_count ?? 0)
          );
        });
      });

      setUsers(usersArr);
    } catch (e) {
      console.error('AdminPlaylistsPage load error', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [seedPlaylistCounts]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (playlistId) => {
    const ok = window.confirm('Удалить плейлист навсегда?');
    if (!ok) return;

    try {
      const resp = await apiFetch(`/api/admin/playlists/${playlistId}/delete/`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      setUsers(prev =>
        prev.map(u => ({ ...u, playlists: (u.playlists || []).filter(p => Number(p.id) !== Number(playlistId)) }))
      );
    } catch (e) {
      console.error('delete playlist error', e);
      alert('Не получилось удалить плейлист (ошибка в консоли).');
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return users;

    return users
      .map(u => {
        const userMatch = (u.username || '').toLowerCase().includes(q);

        const playlists = (u.playlists || []).filter(p => {
          const title = (p.title || '').toLowerCase();
          return title.includes(q);
        });

        if (userMatch) return { ...u, playlists: u.playlists || [] };
        return { ...u, playlists };
      })
      .filter(u => (u.playlists || []).length > 0);
  }, [users, query]);

  return (
    <div className="admin-playlists-page">
      <div className="admin-terminal-bg">
        <FaultyTerminal {...TERMINAL_PROPS} />
      </div>

      <div className="admin-playlists-overlay">
        <div className="admin-playlists-card">
          <div className="admin-playlists-header">
            <div className="admin-playlists-title">ADMIN: PLAYLISTS</div>

            <input
              className="admin-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users / playlists..."
            />

            <button className="admin-refresh" onClick={load}>Refresh</button>
          </div>

          {loading ? (
            <div className="admin-loading">Loading…</div>
          ) : (
            <div className="admin-list">
              {filteredUsers.map(u => (
                <div key={u.id} className="admin-user-block">
                  <div
                    className="admin-user-title"
                    onClick={() => navigate(`/profile/${encodeURIComponent(u.username)}`)}
                  >
                    {u.username} <span className="admin-user-id">#{u.id}</span>
                  </div>

                  <div className="admin-user-playlists">
                    {(u.playlists || []).length ? (u.playlists || []).map(pl => {
                      const pid = Number(pl.id);
                      const liked = !!isPlaylistLiked?.(pid);
                      const reposted = !!isPlaylistReposted?.(pid);

                      const hasLike = Object.prototype.hasOwnProperty.call(playlistLikeCounts || {}, pid);
                      const hasRepost = Object.prototype.hasOwnProperty.call(playlistRepostCounts || {}, pid);

                      const likeCount = hasLike ? Number(playlistLikeCounts[pid] ?? 0) : Number(pl.likes_count ?? 0);
                      const repostCount = hasRepost
                        ? Number(playlistRepostCounts[pid] ?? 0)
                        : Number(pl.reposts_count ?? pl.repost_count ?? 0);

                      const cover = pl.cover_url || pl.cover || 'http://localhost:8000/static/default_cover.jpg';
                      const trackCount = pl.track_count ?? pl.tracks_count ?? 0;

                      return (
                        <div key={pid} className="admin-pl-row">
                          <div className="sidebar-playlist-card admin-pl-card">
                            <div className="sidebar-playlist-left">
                              <div
                                className="sidebar-playlist-cover-wrap"
                                onClick={() => navigate(`/playlist/${pid}`)}
                                title="Open playlist"
                              >
                                <img className="sidebar-playlist-cover" src={cover} alt={pl.title} />
                                <button
                                  className="sidebar-playlist-cover-play"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/playlist/${pid}`);
                                  }}
                                  aria-label="Open playlist"
                                >
                                  ▶
                                </button>
                              </div>

                              <div className="sidebar-playlist-meta">
                                <div
                                  className="sidebar-playlist-title clickable-playlist"
                                  onClick={() => navigate(`/playlist/${pid}`)}
                                >
                                  {pl.title}
                                </div>
                                <div className="sidebar-playlist-sub">
                                  {trackCount} tracks
                                </div>
                              </div>
                            </div>

                            <div className="sidebar-playlist-actions">
                              <button
                                className={`sidebar-pl-action ${liked ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); togglePlaylistLike?.(pid); }}
                                title="Like"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  ❤ <span>{likeCount}</span>
                                </span>
                              </button>

                              <button
                                className={`sidebar-pl-action ${reposted ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); togglePlaylistRepost?.(pid); }}
                                title="Repost"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  ↻ <span>{repostCount}</span>
                                </span>
                              </button>

                              <button
                                className="admin-delete-btn"
                                onClick={(e) => { e.stopPropagation(); handleDelete(pid); }}
                                title="Delete playlist"
                                aria-label="Delete playlist"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="admin-empty">No playlists</div>
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