import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ColorBendsBackground from '../ColorBendsBackground';
import { useUser } from '../context/UserContext';
import { apiFetch } from '../api/apiFetch';
import './ReportUserPage.css';

export default function ReportUserPage() {
  const { id } = useParams(); // id нарушителя
  const navigate = useNavigate();
  const { user } = useUser?.() || {};

  const [reportedUser, setReportedUser] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const myUsername = useMemo(() => {
    return user?.username || user?.user?.username || '—';
  }, [user]);

  const reportedUsername = useMemo(() => {
    return (
      reportedUser?.username ||
      reportedUser?.user?.username ||
      reportedUser?.nickname ||
      '—'
    );
  }, [reportedUser]);

  useEffect(() => {
    let mounted = true;

    async function loadReported() {
      setLoading(true);
      setErr('');
      try {
        // В твоём проекте уже используются /api/users/:id/... (presence, liked и т.д.)
        // Поэтому берём базовый /api/users/:id/
        const res = await apiFetch(`/api/users/${id}/`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || 'Ошибка загрузки пользователя');

        if (!mounted) return;
        // иногда API отдаёт {user: {...}} — подстрахуемся
        setReportedUser(data?.user || data);
      } catch (e) {
        if (!mounted) return;
        setErr('Не удалось загрузить нарушителя. Проверь эндпоинт /api/users/:id/');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    if (id) loadReported();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setOk('');

    const text = reason.trim();
    if (!text) {
      setErr('Напиши причину жалобы.');
      return;
    }

    if (String(user?.id) === String(id)) {
      setErr('Нельзя пожаловаться на самого себя.');
      return;
    }

    setSending(true);
    try {
      const res = await apiFetch('/api/reports/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_user: Number(id),
          reason: text,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || data?.error || 'Ошибка отправки');
      }

      setOk('✅ Жалоба отправлена. Спасибо — мы разберёмся.');
      setReason('');
    } catch (e) {
      setErr(e?.message || 'Ошибка отправки жалобы.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="report-user-root report-fullscreen">
      <ColorBendsBackground />

      <div className="report-user-wrap">
        <div className={`report-user-card ${ok ? 'ok' : ''}`}>
          <div className="report-user-top">
            <div className="report-user-title">ЖАЛОБА НА ПОЛЬЗОВАТЕЛЯ</div>
            <div className="report-user-sub">
              Репорт попадёт в <span className="hl">AdminReports</span>.
            </div>
          </div>

          {loading ? (
            <div className="report-user-loading">Загрузка...</div>
          ) : (
            <form onSubmit={submit} className="report-user-form">
              <div className="report-user-grid">
                <div className="report-user-field">
                  <div className="label">ВАШ НИК</div>
                  <div className="value">{myUsername}</div>
                </div>

                <div className="report-user-field">
                  <div className="label">НИК НАРУШИТЕЛЯ</div>
                  <div className="value danger">{reportedUsername}</div>
                </div>
              </div>

              <div className="report-user-field full">
                <div className="label">ПРИЧИНА</div>
                <textarea
                  className="report-user-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Опиши, что сделал пользователь. Чем подробнее — тем лучше."
                  rows={6}
                />
              </div>

              {err && <div className="report-user-err">⚠️ {err}</div>}
              {ok && <div className="report-user-ok">{ok}</div>}

              <div className="report-user-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => navigate(-1)}
                  disabled={sending}
                >
                  НАЗАД
                </button>

                <button
                  type="submit"
                  className="btn danger"
                  disabled={sending}
                >
                  {sending ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ЖАЛОБУ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}