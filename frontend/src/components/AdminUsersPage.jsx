import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaultyTerminal from './FaultyTerminal';
import { apiFetch } from '../api/apiFetch';
import './AdminUsersPage.css';

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

function fmtBanUntil(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');

  // формы на каждую строку
  const [daysById, setDaysById] = useState({});
  const [reasonById, setReasonById] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await apiFetch('/api/admin/users/');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      console.error('AdminUsersPage load error', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => {
      return (
        (u.username || '').toLowerCase().includes(q) ||
        String(u.id || '').includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const updateUserRow = useCallback((userId, patch) => {
    setUsers(prev => prev.map(u => (Number(u.id) === Number(userId) ? { ...u, ...patch } : u)));
  }, []);

  const canBanThisUser = useCallback((u) => {
    // ✅ безопасность: нельзя банить staff/superuser
    if (u?.is_staff || u?.is_superuser) return false;
    return true;
  }, []);

  const banDays = useCallback(async (u) => {
    if (!canBanThisUser(u)) return;

    const userId = u.id;
    const daysRaw = daysById[userId];
    const reason = (reasonById[userId] || '').trim();

    const days = parseInt(daysRaw, 10);
    if (!Number.isFinite(days) || days <= 0) {
      alert('Введи количество дней (целое число > 0).');
      return;
    }

    setBusyId(userId);
    try {
      const resp = await apiFetch(`/api/admin/users/${userId}/ban/`, {
        method: 'POST',
        body: JSON.stringify({ days, reason, permanent: false })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      updateUserRow(userId, {
        is_banned: true,
        ban_reason: data?.ban_reason ?? reason,
        ban_until: data?.ban_until ?? null,
        ban_permanent: !!data?.ban_permanent,
        ban_days_left: data?.ban_days_left ?? null,
      });
    } catch (e) {
      console.error(e);
      alert('Не получилось забанить (ошибка в консоли).');
    } finally {
      setBusyId(null);
    }
  }, [daysById, reasonById, updateUserRow, canBanThisUser]);

  const banForever = useCallback(async (u) => {
    if (!canBanThisUser(u)) return;

    const userId = u.id;
    const reason = (reasonById[userId] || '').trim();

    setBusyId(userId);
    try {
      const resp = await apiFetch(`/api/admin/users/${userId}/ban/`, {
        method: 'POST',
        body: JSON.stringify({ permanent: true, reason })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      updateUserRow(userId, {
        is_banned: true,
        ban_reason: data?.ban_reason ?? reason,
        ban_until: null,
        ban_permanent: true,
        ban_days_left: null,
      });
    } catch (e) {
      console.error(e);
      alert('Не получилось забанить навсегда (ошибка в консоли).');
    } finally {
      setBusyId(null);
    }
  }, [reasonById, updateUserRow, canBanThisUser]);

  const unban = useCallback(async (u) => {
    const userId = u.id;
    setBusyId(userId);
    try {
      const resp = await apiFetch(`/api/admin/users/${userId}/unban/`, { method: 'POST' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      updateUserRow(userId, {
        is_banned: false,
        ban_reason: '',
        ban_until: null,
        ban_permanent: false,
        ban_days_left: null,
      });
    } catch (e) {
      console.error(e);
      alert('Не получилось разбанить (ошибка в консоли).');
    } finally {
      setBusyId(null);
    }
  }, [updateUserRow]);

  // Базовый URL для медиа
  const mediaBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  return (
    <div className="admin-users-page">
      <div className="admin-terminal-bg">
        <FaultyTerminal {...TERMINAL_PROPS} />
      </div>

      <div className="admin-users-overlay">
        <div className="admin-users-card">
          <div className="admin-users-header">
            <div className="admin-users-title">ADMIN: USERS</div>

            <input
              className="admin-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
            />

            <button className="admin-refresh" onClick={load}>Refresh</button>
          </div>

          {loading ? (
            <div className="admin-loading">Loading…</div>
          ) : (
            <div className="admin-users-table">
              <div className="admin-users-row admin-users-head">
                <div>ID</div>
                <div>User</div>
                <div>Status</div>
                <div>Days</div>
                <div>Reason</div>
                <div>Actions</div>
              </div>

              {filtered.map(u => {
                const locked = !canBanThisUser(u);
                const busy = busyId === u.id;

                return (
                  <div key={u.id} className={`admin-users-row ${u.is_banned ? 'banned' : ''}`}>
                    <div className="cell mono">#{u.id}</div>

                    {/* User column с аватаркой */}
                    <div className="cell user-cell">
                      <div className="user-left">
                        <div className="user-avatar">
                          <img
                            src={
                              u.avatar_url
                                ? (u.avatar_url.startsWith('http') 
                                    ? u.avatar_url 
                                    : `${mediaBaseUrl}${u.avatar_url}`)
                                : `${mediaBaseUrl}/static/default_avatar.png`
                            }
                            alt={u.username}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `${mediaBaseUrl}/static/default_avatar.png`;
                            }}
                          />
                        </div>

                        <div className="user-meta">
                          <div
                            className="user-link"
                            onClick={() => navigate(`/profile/${encodeURIComponent(u.username)}`)}
                            title="Open profile"
                          >
                            {u.username}
                          </div>
                          <div className="muted">{u.email || ''}</div>
                          {(u.is_staff || u.is_superuser) && (
                            <div className="tag">ADMIN</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status column - красивый бан */}
                    <div className="cell">
                      {u.is_banned ? (
                        <div className="ban-box">
                          <div className="ban-badge">BANNED</div>

                          <div className="ban-lines">
                            {u.ban_permanent ? (
                              <div className="ban-line">
                                <span className="ban-k">Type:</span> 
                                <span className="ban-v">Permanent</span>
                              </div>
                            ) : (
                              <>
                                <div className="ban-line">
                                  <span className="ban-k">Left:</span> 
                                  <span className="ban-v">{u.ban_days_left ?? '?'} days</span>
                                </div>
                                {u.ban_until ? (
                                  <div className="ban-line">
                                    <span className="ban-k">Until:</span> 
                                    <span className="ban-v">{fmtBanUntil(u.ban_until)}</span>
                                  </div>
                                ) : null}
                              </>
                            )}

                            <div className="ban-line">
                              <span className="ban-k">Reason:</span> 
                              <span className="ban-v">{u.ban_reason || '—'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="ok-box">
                          <div className="ok-badge">OK</div>
                        </div>
                      )}
                    </div>

                    <div className="cell">
                      <input
                        className="mini-input"
                        placeholder="days"
                        value={daysById[u.id] ?? ''}
                        onChange={(e) => setDaysById(prev => ({ ...prev, [u.id]: e.target.value }))}
                        disabled={busy || locked}
                      />
                    </div>

                    <div className="cell">
                      <input
                        className="mini-input"
                        placeholder="reason"
                        value={reasonById[u.id] ?? ''}
                        onChange={(e) => setReasonById(prev => ({ ...prev, [u.id]: e.target.value }))}
                        disabled={busy}
                      />
                    </div>

                    <div className="cell actions">
                      <button
                        className="btn warn"
                        onClick={() => banDays(u)}
                        disabled={busy || locked}
                        title={locked ? 'Нельзя банить админов' : 'Ban N days'}
                      >
                        Ban days
                      </button>

                      <button
                        className="btn danger"
                        onClick={() => banForever(u)}
                        disabled={busy || locked}
                        title={locked ? 'Нельзя банить админов' : 'Ban forever'}
                      >
                        Ban forever
                      </button>

                      <button
                        className="btn"
                        onClick={() => unban(u)}
                        disabled={busy}
                      >
                        Unban
                      </button>
                    </div>
                  </div>
                );
              })}

              {!filtered.length && (
                <div className="admin-empty">No users</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}