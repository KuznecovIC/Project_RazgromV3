// frontend/src/components/AdminReportsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { apiFetch } from '../api/apiFetch';
import FaultyTerminal from './FaultyTerminal';
import './AdminReportsPage.css';

// 🔥 Стабильные константы для FaultyTerminal (чтобы избежать лишних ререндеров)
const FT_GRID_MUL = [2.2, 1.15];
const FT_STYLE = { opacity: 0.7 };

function prettyStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'pending') return 'PENDING';
  if (v === 'rejected' || v === 'denied') return 'ОТКАЗАНО';
  if (v === 'approved' || v === 'accepted' || v === 'unbanned') return 'РАЗБАНЕН';
  return s || '—';
}

function statusClass(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'pending') return 'st-pending';
  if (v === 'rejected' || v === 'denied') return 'st-rejected';
  if (v === 'approved' || v === 'accepted' || v === 'unbanned') return 'st-approved';
  return 'st-unknown';
}

export default function AdminReportsPage() {
  const { user } = useUser?.() || {};
  const isAdmin = !!(user?.is_staff || user?.is_superuser);

  const [tab, setTab] = useState('appeals'); // 'reports' | 'appeals'
  const [appeals, setAppeals] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ✅ modal
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [rejectReason, setRejectReason] = useState('');
  const [unbanReason, setUnbanReason] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);

  // ✅ AI (appeal)
  const [aiOn, setAiOn] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [aiData, setAiData] = useState(null);

  // ✅ report modal
  const [reportSelected, setReportSelected] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalErr, setReportModalErr] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  // ✅ AI для репортов (НОВЫЕ СТЕЙТЫ)
  const [reportAiOn, setReportAiOn] = useState(false);
  const [reportAiLoading, setReportAiLoading] = useState(false);
  const [reportAiErr, setReportAiErr] = useState('');
  const [reportAi, setReportAi] = useState(null);

  const [reportBanReason, setReportBanReason] = useState('');
  const [reportBanPermanent, setReportBanPermanent] = useState(false);
  const [reportBanDays, setReportBanDays] = useState('1');
  const [reportRejectReason, setReportRejectReason] = useState('');
  const [reportDeleteArmed, setReportDeleteArmed] = useState(false);

  const fetchAppeals = useCallback(async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await apiFetch('/api/admin/appeals/', { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Ошибка загрузки апелляций');
      setAppeals(data?.appeals || []);
    } catch (e) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await apiFetch('/api/admin/reports/', { method: 'GET' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(data?.detail || 'Ошибка загрузки репортов');
      // бэк может вернуть массив или объект
      if (Array.isArray(data)) setReports(data);
      else setReports(data?.reports || []);
    } catch (e) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Функция запроса AI для репорта
  const fetchReportAI = useCallback(async (id) => {
    if (!id) return;
    try {
      setReportAiErr('');
      setReportAiLoading(true);

      const res = await apiFetch(`/api/admin/reports/${id}/ai/`, { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'AI ошибка');

      setReportAi(data);
    } catch (e) {
      setReportAiErr(e?.message || 'AI ошибка');
    } finally {
      setReportAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'appeals') fetchAppeals();
    if (tab === 'reports') fetchReports();
  }, [tab, isAdmin, fetchAppeals, fetchReports]);

  const sortedAppeals = useMemo(() => {
    const arr = Array.isArray(appeals) ? [...appeals] : [];
    // новые выше
    arr.sort((a, b) => (b?.id || 0) - (a?.id || 0));
    return arr;
  }, [appeals]);

  // ✅ Быстрые функции удаления
  const quickDeleteAppeal = useCallback(async (appealId) => {
    if (!appealId) return;
    if (!window.confirm('Удалить апелляцию?')) return;
    if (!window.confirm('ТОЧНО удалить апелляцию?')) return;

    try {
      setBusy(true);
      const res = await apiFetch(`/api/admin/appeals/${appealId}/delete/`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось удалить апелляцию');

      setAppeals(prev => (prev || []).filter(x => x?.id !== appealId));
    } catch (e) {
      alert(e?.message || 'Ошибка удаления');
    } finally {
      setBusy(false);
    }
  }, []);

  const quickDeleteReport = useCallback(async (reportId) => {
    if (!reportId) return;
    if (!window.confirm('Удалить репорт?')) return;
    if (!window.confirm('ТОЧНО удалить репорт?')) return;

    try {
      setReportBusy(true);
      const res = await apiFetch(`/api/admin/reports/${reportId}/delete/`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось удалить репорт');

      setReports(prev => (Array.isArray(prev) ? prev.filter(x => x?.id !== reportId) : prev));
    } catch (e) {
      alert(e?.message || 'Ошибка удаления');
    } finally {
      setReportBusy(false);
    }
  }, []);

  const openModal = useCallback((a) => {
    setSelected(a);
    setModalOpen(true);
    setModalErr('');
    setBusy(false);
    setRejectReason('');
    setUnbanReason('');
    setDeleteArmed(false);
    // ✅ Сброс AI при открытии
    setAiOn(false);
    setAiLoading(false);
    setAiErr('');
    setAiData(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelected(null);
    setModalErr('');
    setBusy(false);
    setRejectReason('');
    setUnbanReason('');
    setDeleteArmed(false);
    // ✅ Сброс AI при закрытии
    setAiOn(false);
    setAiLoading(false);
    setAiErr('');
    setAiData(null);
  }, []);

  const openReportModal = useCallback((r) => {
    setReportSelected(r);
    setReportModalOpen(true);
    setReportModalErr('');
    setReportBusy(false);
    setReportBanReason('');
    setReportBanPermanent(false);
    setReportBanDays('1');
    setReportRejectReason('');
    setReportDeleteArmed(false);
    
    // ✅ Сброс AI репорта при открытии
    setReportAiOn(false);
    setReportAiLoading(false);
    setReportAiErr('');
    setReportAi(null);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalOpen(false);
    setReportSelected(null);
    setReportModalErr('');
    setReportBusy(false);
    setReportBanReason('');
    setReportBanPermanent(false);
    setReportBanDays('1');
    setReportRejectReason('');
    setReportDeleteArmed(false);
    
    // ✅ Сброс AI репорта при закрытии
    setReportAiOn(false);
    setReportAiLoading(false);
    setReportAiErr('');
    setReportAi(null);
  }, []);

  // ✅ блокируем скролл под модалкой
  useEffect(() => {
    if (!(modalOpen || reportModalOpen)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [modalOpen, reportModalOpen]);

  const patchLocalAppeal = useCallback((id, patch) => {
    setAppeals(prev => (prev || []).map(x => (x?.id === id ? { ...x, ...patch } : x)));
    setSelected(prev => (prev?.id === id ? { ...prev, ...patch } : prev));
  }, []);

  // ✅ Функция запроса AI
  const runAiForAppeal = useCallback(async (appealId) => {
    if (!appealId) return;
    try {
      setAiErr('');
      setAiLoading(true);

      const res = await apiFetch(`/api/admin/appeals/${appealId}/ai/`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'AI ошибка');

      setAiData(data || null);

      // чтобы в списке и в selected появились AI поля (для бейджа)
      patchLocalAppeal(appealId, {
        ai_status: data?.ai_status || 'ready',
        ai_risk: data?.ai_risk ?? 0,
        ai_recommendation: data?.ai_recommendation || '',
        ai_summary: data?.ai_summary || '',
      });
    } catch (e) {
      setAiErr(e?.message || 'AI ошибка');
    } finally {
      setAiLoading(false);
    }
  }, [patchLocalAppeal]);

  // ✅ Автозапуск AI при включении
  useEffect(() => {
    if (!aiOn) return;
    if (!selected?.id) return;
    runAiForAppeal(selected.id);
  }, [aiOn, selected?.id, runAiForAppeal]);

  // ✅ Автозапуск AI для репорта при включении
  useEffect(() => {
    if (!reportAiOn) return;
    if (!reportSelected?.id) return;
    if (!reportAi && !reportAiLoading) {
      fetchReportAI(reportSelected.id);
    }
  }, [reportAiOn, reportSelected?.id, reportAi, reportAiLoading, fetchReportAI]);

  // ================== ACTIONS ==================
  // ⚠️ Эндпоинты ниже — новые/ожидаемые:
  // POST /api/admin/appeals/{id}/reject/ {reason}
  // POST /api/admin/appeals/{id}/unban/  {reason}
  // DELETE /api/admin/appeals/{id}/delete/
  //
  // Если у тебя в бэке пути другие — просто поменяй URL тут.

  const doReject = async () => {
    if (!selected?.id) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setModalErr('Нужно указать причину отказа.');
      return;
    }
    try {
      setBusy(true);
      setModalErr('');
      const res = await apiFetch(`/api/admin/appeals/${selected.id}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось отклонить апелляцию');

      patchLocalAppeal(selected.id, {
        status: data?.status || 'rejected',
        reject_reason: data?.reject_reason || reason,
        decided_at: data?.decided_at || new Date().toISOString(),
      });
    } catch (e) {
      setModalErr(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const doUnban = async () => {
    if (!selected?.id) return;
    const reason = unbanReason.trim();
    if (!reason) {
      setModalErr('Нужно указать причину разбана.');
      return;
    }
    try {
      setBusy(true);
      setModalErr('');
      const res = await apiFetch(`/api/admin/appeals/${selected.id}/unban/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось разбанить');

      patchLocalAppeal(selected.id, {
        status: data?.status || 'approved',
        unban_reason: data?.unban_reason || reason,
        decided_at: data?.decided_at || new Date().toISOString(),
      });

      // ⚡ после разбана апелляция считается рассмотренной (статус изменили)
      // пользователь сам выйдет из бана, потому что /users/me/profile/ больше не вернет ban
    } catch (e) {
      setModalErr(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!selected?.id) return;

    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }

    try {
      setBusy(true);
      setModalErr('');
      const res = await apiFetch(`/api/admin/appeals/${selected.id}/delete/`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось удалить апелляцию');

      setAppeals(prev => (prev || []).filter(x => x?.id !== selected.id));
      closeModal();
    } catch (e) {
      setModalErr(e?.message || 'Ошибка');
    } finally {
      setBusy(false);
      setDeleteArmed(false);
    }
  }

  // ✅ REPORT actions
  const patchLocalReport = useCallback((id, patch) => {
    setReports(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.findIndex(x => String(x?.id) === String(id));
      if (idx === -1) return prev;
      arr[idx] = { ...arr[idx], ...patch };
      return arr;
    });
  }, []);

  const doReportBan = async () => {
    if (!reportSelected?.id) return;
    const ban_reason = reportBanReason.trim();
    if (!ban_reason) {
      setReportModalErr('Нужно указать причину бана.');
      return;
    }

    const permanent = !!reportBanPermanent;
    let days = parseInt(String(reportBanDays || '1'), 10);
    if (!permanent && (!days || days < 1)) days = 1;

    try {
      setReportBusy(true);
      setReportModalErr('');
      const res = await apiFetch(`/api/admin/reports/${reportSelected.id}/ban/`, {
        method: 'POST',
        body: JSON.stringify({ ban_reason, permanent, days: permanent ? null : days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось забанить');

      // backend может вернуть report/status
      const r = data?.report || data?.data || {};
      patchLocalReport(reportSelected.id, {
        status: r?.status || 'reviewed',
        admin_comment: r?.admin_comment || ban_reason,
        decided_at: r?.decided_at || new Date().toISOString(),
        ban_reason_admin: r?.ban_reason_admin || ban_reason,
        ban_days: r?.ban_days ?? (permanent ? null : days),
        ban_permanent: r?.ban_permanent ?? permanent,
      });

      setReportSelected(prev => prev ? ({ ...prev, status: r?.status || 'reviewed', admin_comment: r?.admin_comment || ban_reason, ban_reason_admin: r?.ban_reason_admin || ban_reason, ban_days: r?.ban_days ?? (permanent ? null : days), ban_permanent: r?.ban_permanent ?? permanent }) : prev);

      // обновим список для уверенности
      fetchReports();
    } catch (e) {
      setReportModalErr(e?.message || 'Ошибка');
    } finally {
      setReportBusy(false);
    }
  };

  const doReportReject = async () => {
    if (!reportSelected?.id) return;
    const reason = reportRejectReason.trim();
    if (!reason) {
      setReportModalErr('Нужно указать причину отказа.');
      return;
    }
    try {
      setReportBusy(true);
      setReportModalErr('');
      const res = await apiFetch(`/api/admin/reports/${reportSelected.id}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось отказать');

      patchLocalReport(reportSelected.id, {
        status: data?.status || 'rejected',
        admin_comment: data?.admin_comment || reason,
        decided_at: data?.decided_at || new Date().toISOString(),
      });

      setReportSelected(prev => prev ? ({ ...prev, status: data?.status || 'rejected', admin_comment: data?.admin_comment || reason }) : prev);
      fetchReports();
    } catch (e) {
      setReportModalErr(e?.message || 'Ошибка');
    } finally {
      setReportBusy(false);
    }
  };

  const doReportDelete = async () => {
    if (!reportSelected?.id) return;
    try {
      if (!reportDeleteArmed) {
        setReportDeleteArmed(true);
        return;
      }
      setReportBusy(true);
      setReportModalErr('');
      const res = await apiFetch(`/api/admin/reports/${reportSelected.id}/delete/`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Не удалось удалить');

      setReports(prev => (Array.isArray(prev) ? prev.filter(x => x?.id !== reportSelected.id) : prev));
      closeReportModal();
      fetchReports();
    } catch (e) {
      setReportModalErr(e?.message || 'Ошибка');
    } finally {
      setReportBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-reports-wrap">
        <div className="admin-reports-card">
          <div className="admin-reports-title">⛔ Доступ запрещён</div>
          <div className="admin-reports-sub">Эта страница доступна только администрации.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-reports-wrap admin-reports-wrap--ft">
      {/* 🔥 Фон FaultyTerminal в fullscreen режиме */}
      <div className="admin-reports-ft-bg" aria-hidden="true">
        <FaultyTerminal
          fullscreen
          scale={1.25}
          gridMul={FT_GRID_MUL}
          digitSize={1.35}
          timeScale={0.28}
          scanlineIntensity={0.35}
          glitchAmount={1.05}
          flickerAmount={1.0}
          noiseAmp={0.12}
          chromaticAberration={1.2}
          dither={1}
          curvature={0.18}
          tint="#7CFFB4"
          brightness={0.95}
          mouseReact={true}
          mouseStrength={0.18}
          pageLoadAnimation={true}
          style={FT_STYLE}
        />
        <div className="admin-reports-ft-overlay" />
      </div>

      <div className="admin-reports-card admin-reports-card--neon">
        <div className="admin-reports-top">
          <div className="admin-reports-title colorbends-text">ADMIN / REPORTS</div>

          <div className="admin-reports-tabs">
            <button
              className={`tab-btn ${tab === 'reports' ? 'active' : ''}`}
              onClick={() => setTab('reports')}
            >
              РЕПОРТЫ
            </button>
            <button
              className={`tab-btn ${tab === 'appeals' ? 'active' : ''}`}
              onClick={() => setTab('appeals')}
            >
              АПЕЛЛЯЦИИ
            </button>
          </div>

          {/* ✅ Кнопка обновления списка */}
          <div className="admin-reports-actions">
            <button
              className="admin-icon-btn"
              title="Обновить список"
              onClick={() => (tab === 'reports' ? fetchReports() : fetchAppeals())}
              disabled={loading}
            >
              ↻
            </button>
          </div>
        </div>

        {tab === 'reports' ? (
          <>
            {err ? <div className="admin-reports-err">{err}</div> : null}

            <div className="admin-reports-list">
              {loading ? (
                <div className="admin-reports-empty">
                  <div className="empty-big">Загрузка…</div>
                  <div className="empty-sub">Получаем репорты</div>
                </div>
              ) : (Array.isArray(reports) ? reports.length : 0) === 0 ? (
                <div className="admin-reports-empty">
                  <div className="empty-big">Репортов пока нет</div>
                  <div className="empty-sub">Когда юзеры начнут жаловаться — они появятся тут</div>
                </div>
              ) : (
                (reports || [])
                  .slice()
                  .sort((a, b) => (b?.id || 0) - (a?.id || 0))
                  .map((r) => (
                    <div
                      className="appeal-row appeal-row--clickable"
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openReportModal(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openReportModal(r);
                      }}
                      title="Открыть репорт"
                    >
                      <div className="appeal-row-left">
                        <div className="appeal-row-title">
                          REPORT #{r.id} — {r.reported_username || r.reported_user || 'user'}
                          <span className={`status-pill ${statusClass(r.status)}`}>
                            {prettyStatus(r.status)}
                          </span>
                          {/* ✅ AI бейдж в списке репортов (если есть) */}
                          {String(r?.ai_status || '').toLowerCase() === 'ready' ? (
                            <span className="ai-badge">AI</span>
                          ) : null}
                        </div>

                        <div className="appeal-row-meta">
                          <span>От: <b>{r.reporter_username || r.reporter || '—'}</b></span>
                          <span>На: <b>{r.reported_username || r.reported_user || '—'}</b></span>
                          <span>Дата: <b>{r.created_at ? new Date(r.created_at).toLocaleString('ru-RU') : '—'}</b></span>
                        </div>

                        <div className="appeal-row-snippet">
                          {r.reason || '—'}
                        </div>
                      </div>

                      {/* ✅ Кнопка быстрого удаления репорта */}
                      <div className="appeal-row-right">
                        <button
                          className="row-icon-btn row-icon-delete"
                          title="Удалить репорт"
                          onClick={(e) => {
                            e.stopPropagation();
                            quickDeleteReport(r.id);
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        ) : (
          <>
            {err ? <div className="admin-reports-err">{err}</div> : null}

            <div className="admin-reports-list">
              {loading ? (
                <div className="admin-reports-empty">
                  <div className="empty-big">Загрузка…</div>
                </div>
              ) : sortedAppeals.length === 0 ? (
                <div className="admin-reports-empty">
                  <div className="empty-big">Пока нет апелляций</div>
                  <div className="empty-sub">Здесь появятся обращения забаненных пользователей.</div>
                </div>
              ) : (
                sortedAppeals.map((a) => (
                  <div
                    className="appeal-row appeal-row--clickable"
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openModal(a)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openModal(a);
                    }}
                    title="Открыть на полный экран"
                  >
                    <div className="appeal-row-left">
                      <div className="appeal-row-title">
                        #{a.id} — {a.username_snapshot || `user:${a.user}`}
                        <span className={`status-pill ${statusClass(a.status)}`}>
                          {prettyStatus(a.status)}
                        </span>
                        {/* ✅ AI бейдж в списке */}
                        {String(a?.ai_status || '').toLowerCase() === 'ready' ? (
                          <span className="ai-badge">AI</span>
                        ) : null}
                      </div>

                      <div className="appeal-row-meta">
                        <span>Забанил: {a.banned_by_snapshot || '—'}</span>
                        <span>До: {a.ban_until_snapshot || '—'}</span>
                        <span>Статус: {a.status}</span>
                        <span>Дата: {new Date(a.created_at).toLocaleString('ru-RU')}</span>
                      </div>

                      <div className="appeal-row-reason">
                        <div className="mini-label">Причина бана</div>
                        <div className="mini-text">{a.ban_reason_snapshot || '—'}</div>
                      </div>

                      <div className="appeal-row-text">
                        <div className="mini-label">Почему не согласен</div>
                        <div className="mini-text">{a.disagree_text}</div>
                      </div>
                    </div>

                    {/* ✅ Кнопка быстрого удаления апелляции */}
                    <div className="appeal-row-right">
                      <button
                        className="row-icon-btn row-icon-delete"
                        title="Удалить апелляцию"
                        onClick={(e) => {
                          e.stopPropagation();
                          quickDeleteAppeal(a.id);
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ================= FULLSCREEN MODAL ================= */}
      
      {/* ✅ Report modal с AI панелью */}
      {reportModalOpen && reportSelected ? (
        <div className="appeal-modal-backdrop" onMouseDown={closeReportModal}>
          <div className="appeal-modal-wrap" onMouseDown={(e) => e.stopPropagation()}>
            <div className="appeal-modal-card">
              <div className="appeal-modal-top">
                <div className="appeal-modal-title">
                  REPORT #{reportSelected.id} — {reportSelected.reported_username || reportSelected.reported_user || 'user'}
                  <span className={`status-pill big ${statusClass(reportSelected.status)}`}>
                    {prettyStatus(reportSelected.status)}
                  </span>
                  {/* ✅ Кнопка AI ON для репорта */}
                  <button
                    className={`ai-toggle-btn ${reportAiOn ? 'on' : ''}`}
                    onClick={() => {
                      const next = !reportAiOn;
                      setReportAiOn(next);
                      if (next && !reportAi && reportSelected?.id) {
                        fetchReportAI(reportSelected.id);
                      }
                    }}
                    type="button"
                  >
                    AI ON
                  </button>
                </div>
                <button className="appeal-modal-close" onClick={closeReportModal} aria-label="Закрыть">✕</button>
              </div>

              <div className="appeal-modal-meta">
                <div className="meta-chip">От: <b>{reportSelected.reporter_username || reportSelected.reporter || '—'}</b></div>
                <div className="meta-chip">На: <b>{reportSelected.reported_username || reportSelected.reported_user || '—'}</b></div>
                <div className="meta-chip">Дата: <b>{reportSelected.created_at ? new Date(reportSelected.created_at).toLocaleString('ru-RU') : '—'}</b></div>
              </div>

              <div className="appeal-modal-grid">
                <div className="appeal-box">
                  <div className="mini-label">Причина репорта</div>
                  <div className="mini-text">{reportSelected.reason || '—'}</div>
                </div>
                <div className="appeal-box">
                  <div className="mini-label">Статус</div>
                  <div className="mini-text">{prettyStatus(reportSelected.status)}</div>
                </div>
              </div>

              {reportSelected.message ? (
                <div className="appeal-box" style={{ gridColumn: 'span 2' }}>
                  <div className="mini-label">Дополнительное сообщение</div>
                  <div className="mini-text">{reportSelected.message}</div>
                </div>
              ) : null}

              {reportSelected.admin_comment ? (
                <div className={`appeal-decision ${String(reportSelected.status).toLowerCase() === 'rejected' ? 'appeal-decision--bad' : 'appeal-decision--ok'}`}>
                  <div className="mini-label">Решение админа</div>
                  <div className="mini-text">{reportSelected.admin_comment}</div>
                </div>
              ) : null}

              {reportModalErr ? <div className="appeal-modal-err">{reportModalErr}</div> : null}

              {/* 🔥 Контейнер с двумя колонками для репорта */}
              <div className={`appeal-review-grid ${reportAiOn ? 'two' : 'one'}`}>
                <div className="appeal-review-col">
                  <div className="appeal-actions">
                    <div className="action-col">
                      <div className="action-title">ЗАБАНИТЬ</div>
                      <div className="action-sub">Укажи причину бана (и срок, если не перманент)</div>

                      <textarea
                        className="action-textarea"
                        value={reportBanReason}
                        onChange={(e) => setReportBanReason(e.target.value)}
                        placeholder="Причина бана..."
                        rows={4}
                      />

                      <div className="report-ban-row">
                        <label className="report-check">
                          <input
                            type="checkbox"
                            checked={reportBanPermanent}
                            onChange={(e) => setReportBanPermanent(e.target.checked)}
                            disabled={reportBusy}
                          />
                          <span>Перманент</span>
                        </label>

                        {!reportBanPermanent ? (
                          <div className="report-days">
                            <span className="mini-label">Дней</span>
                            <input
                              className="report-days-input"
                              value={reportBanDays}
                              onChange={(e) => setReportBanDays(e.target.value)}
                              disabled={reportBusy}
                            />
                          </div>
                        ) : null}
                      </div>

                      <button
                        className="adm-act-btn danger"
                        onClick={doReportBan}
                        disabled={reportBusy || !reportBanReason.trim()}
                      >
                        {reportBusy ? '...' : 'ЗАБАНИТЬ'}
                      </button>
                    </div>

                    <div className="action-col">
                      <div className="action-title">ОТКАЗАТЬ</div>
                      <div className="action-sub">Если репорт фейк — укажи причину отказа</div>

                      <textarea
                        className="action-textarea"
                        value={reportRejectReason}
                        onChange={(e) => setReportRejectReason(e.target.value)}
                        placeholder="Причина отказа..."
                        rows={4}
                      />

                      <button
                        className="adm-act-btn ghost danger"
                        onClick={doReportReject}
                        disabled={reportBusy || !reportRejectReason.trim()}
                      >
                        {reportBusy ? '...' : 'ОТКАЗАТЬ'}
                      </button>
                    </div>
                  </div>

                  <div className="appeal-bottom-actions">
                    <button
                      className={`adm-act-btn ghost danger ${reportDeleteArmed ? 'armed' : ''}`}
                      onClick={doReportDelete}
                      disabled={reportBusy}
                      title="Удалить репорт (исчезнет из списка)"
                    >
                      {reportDeleteArmed ? 'ТОЧНО УДАЛИТЬ?' : 'УДАЛИТЬ РЕПОРТ'}
                    </button>

                    <button className="adm-act-btn ghost" onClick={() => fetchReports()} disabled={reportBusy}>
                      ОБНОВИТЬ СПИСОК
                    </button>
                  </div>

                  <div className="appeal-hint">
                    Клик по фону — закрыть. Delete требует двойного клика.
                  </div>
                </div>

                {/* ✅ AI панель для репорта */}
                {reportAiOn ? (
                  <div className="appeal-review-col ai">
                    <div className="ai-panel">
                      <div className="ai-panel-title">
                        AI РЕЗЮМЕ
                        {reportAi ? <span className="ai-badge">AI ON</span> : null}
                      </div>

                      {reportAiLoading ? (
                        <div className="ai-muted">AI думает...</div>
                      ) : reportAiErr ? (
                        <div className="ai-error">{reportAiErr}</div>
                      ) : reportAi ? (
                        <>
                          <div className="ai-block">
                            <div className="mini-label">КРАТКО</div>
                            <div className="mini-text">{reportAi.summary || '—'}</div>
                          </div>

                          <div className="ai-block">
                            <div className="mini-label">РЕКОМЕНДАЦИЯ</div>
                            <div className="mini-text">{reportAi.recommendation || '—'}</div>
                          </div>

                          <div className="ai-block">
                            <div className="mini-label">РИСК</div>
                            <div className="mini-text">{String(reportAi.risk ?? 0)} / 100</div>
                          </div>

                          <div className="ai-block">
                            <div className="mini-label">ТЕГИ</div>
                            <div className="mini-text">
                              {(reportAi.tags || []).length ? (reportAi.tags || []).join(', ') : '—'}
                            </div>
                          </div>

                          <div className="ai-footnote">
                            AI не принимает решения. Только рекомендация модератору.
                          </div>
                        </>
                      ) : (
                        <div className="ai-muted">Нажми AI ON, чтобы получить анализ.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen && selected ? (
        <div className="appeal-modal-backdrop" onMouseDown={closeModal}>
          <div className="appeal-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="appeal-modal-card">
              <div className="appeal-modal-top">
                <div className="appeal-modal-title">
                  АПЕЛЛЯЦИЯ #{selected.id} — {selected.username_snapshot || `user:${selected.user}`}
                  <span className={`status-pill big ${statusClass(selected.status)}`}>
                    {prettyStatus(selected.status)}
                  </span>
                  {/* ✅ Кнопка AI ON/OFF */}
                  <button
                    className={`ai-toggle-btn ${aiOn ? 'on' : ''}`}
                    onClick={() => setAiOn(v => !v)}
                    type="button"
                    title="AI подсказки (только рекомендации)"
                  >
                    AI {aiOn ? 'ON' : 'OFF'}
                  </button>
                </div>
                <button className="appeal-modal-close" onClick={closeModal} aria-label="Закрыть">✕</button>
              </div>

              <div className="appeal-modal-meta">
                <div className="meta-chip">Забанил: <b>{selected.banned_by_snapshot || '—'}</b></div>
                <div className="meta-chip">До: <b>{selected.ban_until_snapshot || '—'}</b></div>
                <div className="meta-chip">Дата: <b>{new Date(selected.created_at).toLocaleString('ru-RU')}</b></div>
              </div>

              {/* 🔥 Контейнер с двумя колонками */}
              <div className={`appeal-review-grid ${aiOn ? 'two' : 'one'}`}>
                {/* Левая колонка (оригинальный контент) */}
                <div className="appeal-review-col">
                  <div className="appeal-modal-grid">
                    <div className="appeal-box">
                      <div className="mini-label">Причина бана</div>
                      <div className="mini-text">{selected.ban_reason_snapshot || '—'}</div>
                    </div>
                    <div className="appeal-box">
                      <div className="mini-label">Почему не согласен</div>
                      <div className="mini-text">{selected.disagree_text}</div>
                    </div>
                  </div>

                  {/* показываем, если уже решено */}
                  {selected.reject_reason ? (
                    <div className="appeal-decision appeal-decision--bad">
                      <div className="mini-label">Причина отказа</div>
                      <div className="mini-text">{selected.reject_reason}</div>
                    </div>
                  ) : null}

                  {selected.unban_reason ? (
                    <div className="appeal-decision appeal-decision--ok">
                      <div className="mini-label">Причина разбана</div>
                      <div className="mini-text">{selected.unban_reason}</div>
                    </div>
                  ) : null}

                  {modalErr ? <div className="appeal-modal-err">{modalErr}</div> : null}

                  <div className="appeal-actions">
                    <div className="action-col">
                      <div className="action-title">РАЗБАНИТЬ</div>
                      <div className="action-sub">Обязательно укажи причину разбана</div>
                      <textarea
                        className="action-textarea"
                        value={unbanReason}
                        onChange={(e) => setUnbanReason(e.target.value)}
                        placeholder="Причина разбана..."
                        rows={4}
                      />
                      <button
                        className="adm-act-btn ok"
                        onClick={doUnban}
                        disabled={busy || !unbanReason.trim()}
                      >
                        {busy ? '...' : 'РАЗБАНИТЬ'}
                      </button>
                    </div>

                    <div className="action-col">
                      <div className="action-title">ОТКАЗАТЬ</div>
                      <div className="action-sub">Обязательно укажи причину отказа</div>
                      <textarea
                        className="action-textarea"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Причина отказа..."
                        rows={4}
                      />
                      <button
                        className="adm-act-btn danger"
                        onClick={doReject}
                        disabled={busy || !rejectReason.trim()}
                      >
                        {busy ? '...' : 'ОТКАЗАТЬ'}
                      </button>
                    </div>
                  </div>

                  <div className="appeal-bottom-actions">
                    <button
                      className={`adm-act-btn ghost danger ${deleteArmed ? 'armed' : ''}`}
                      onClick={doDelete}
                      disabled={busy}
                      title="Удалить апелляцию (исчезнет из списка)"
                    >
                      {deleteArmed ? 'ТОЧНО УДАЛИТЬ?' : 'УДАЛИТЬ АПЕЛЛЯЦИЮ'}
                    </button>

                    <button className="adm-act-btn ghost" onClick={() => fetchAppeals()} disabled={busy}>
                      ОБНОВИТЬ СПИСОК
                    </button>
                  </div>

                  <div className="appeal-hint">
                    Клик по фону — закрыть. Delete требует двойного клика.
                  </div>
                </div>

                {/* Правая колонка (AI панель) — показываем только когда AI включён */}
                {aiOn ? (
                  <div className="appeal-review-col ai">
                    <div className="ai-panel">
                      <div className="ai-panel-title">AI РЕЗЮМЕ</div>

                      {aiLoading ? <div className="ai-muted">Анализирую…</div> : null}
                      {aiErr ? <div className="ai-error">{aiErr}</div> : null}

                      {!aiLoading && !aiErr ? (
                        <>
                          <div className="ai-block">
                            <div className="mini-label">Кратко</div>
                            <div className="mini-text">{aiData?.ai_summary || selected?.ai_summary || '—'}</div>
                          </div>

                          <div className="ai-block">
                            <div className="mini-label">Рекомендация</div>
                            <div className="mini-text">{aiData?.ai_recommendation || selected?.ai_recommendation || '—'}</div>
                          </div>

                          <div className="ai-block">
                            <div className="mini-label">Риск</div>
                            <div className="mini-text">{String(aiData?.ai_risk ?? selected?.ai_risk ?? 0)} / 100</div>
                          </div>

                          <div className="ai-footnote">
                            AI не принимает решений. Только рекомендация модератору.
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div> {/* закрытие appeal-review-grid */}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}