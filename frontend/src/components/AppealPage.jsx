// frontend/src/components/AppealPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorBendsBackground from '../ColorBendsBackground';
import { useUser } from '../context/UserContext';
import { apiFetch } from '../api/apiFetch';
import './AppealPage.css';

export default function AppealPage() {
  const navigate = useNavigate();
  const { user } = useUser?.() || {};
  const ban = user?.ban;

  // 🔥 Премиум-анимация входа
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 10); // micro-delay для запуска transition
    return () => clearTimeout(t);
  }, []);

  const nick = user?.username || '—';
  const bannedBy = ban?.banned_by || '—';
  const banReason = (ban?.ban_reason || '').trim() || 'Причина не указана.';

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSend = useMemo(() => text.trim().length >= 10 && !sending, [text, sending]);

  const submit = async () => {
    setError('');
    if (!canSend) return;

    try {
      setSending(true);
      
      // ✅ ПРАВИЛЬНЫЙ ФОРМАТ: отправляем { "disagree_text": "текст" }
      const payload = { 
        disagree_text: text.trim() 
      };
      
      console.log('📤 Отправка апелляции:', payload);

      const res = await apiFetch('/api/appeals/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Статус ответа:', res.status);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('❌ Ошибка сервера:', data);
        throw new Error(data?.detail || 'Ошибка отправки апелляции');
      }

      const responseData = await res.json();
      console.log('✅ Апелляция отправлена:', responseData);

      setDone(true);
      setTimeout(() => navigate('/banned', { replace: true }), 1400);
    } catch (e) {
      console.error('❌ Ошибка:', e);
      setError(e?.message || 'Ошибка при отправке. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="appeal-page appeal-pixel">
      <div className="appeal-bg">
        <ColorBendsBackground />
      </div>

      <div className="appeal-center">
        <div className={`appeal-card ${enter ? 'enter' : ''}`}>
          <div className="appeal-title colorbends-text">АПЕЛЛЯЦИЯ</div>
          <div className="appeal-sub">
            Заполните форму. Мы передадим её администрации.
          </div>

          <div className="appeal-grid">
            <div className="appeal-field">
              <div className="appeal-label colorbends-text">ВАШ НИК</div>
              <div className="appeal-value">{nick}</div>
            </div>

            <div className="appeal-field">
              <div className="appeal-label colorbends-text">КТО ВАС ЗАБАНИЛ</div>
              <div className="appeal-value">{bannedBy}</div>
            </div>

            <div className="appeal-field appeal-field-wide">
              <div className="appeal-label colorbends-text">ПРИЧИНА БАНА</div>
              <div className="appeal-value appeal-reason">{banReason}</div>
            </div>

            <div className="appeal-field appeal-field-wide">
              <div className="appeal-label colorbends-text">ПОЧЕМУ ВЫ НЕ СОГЛАСНЫ</div>
              <textarea
                className="appeal-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Опишите ситуацию. Чем подробнее — тем лучше."
                maxLength={1500}
              />
              <div className="appeal-hint">
                Минимум 10 символов. Осталось: {1500 - text.length}
              </div>
            </div>
          </div>

          {error ? <div className="appeal-error">{error}</div> : null}

          <div className="appeal-actions">
            <button className="appeal-btn ghost" onClick={() => navigate('/banned')}>
              НАЗАД
            </button>

            <button 
              className={`appeal-btn ${canSend ? '' : 'disabled'}`} 
              onClick={submit} 
              disabled={!canSend || sending}
            >
              {sending ? 'ОТПРАВКА…' : 'ОТПРАВИТЬ'}
            </button>
          </div>

          {done ? (
            <div className="appeal-done">
              Спасибо! Апелляция отправлена. Мы рассмотрим её и свяжемся с вами.
            </div>
          ) : (
            <div className="appeal-note">
              После отправки вы вернётесь на страницу блокировки.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}