// frontend/src/components/BannedScreen.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorBendsBackground from '../ColorBendsBackground';
import { useUser } from '../context/UserContext';
import './BannedScreen.css';

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

export default function BannedScreen() {
  const navigate = useNavigate();
  const { user } = useUser?.() || {};
  const ban = user?.ban;

  // 🔥 Премиум-анимация входа
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 10);
    return () => clearTimeout(t);
  }, []);

  // ✅ Определяем статус апелляции
  const appealStatusRaw = ban?.appeal_status || ban?.appeal?.status || '';
  const appealStatus = String(appealStatusRaw).toLowerCase();

  const appealRejectReason =
    ban?.appeal_reject_reason ||
    ban?.appeal_denied_reason ||
    ban?.appeal?.reject_reason ||
    ban?.appeal?.decision_reason ||
    '';

  const appealPending = appealStatus === 'pending' || appealStatus === 'on_review';
  const appealRejected = 
    appealStatus === 'rejected' || 
    appealStatus === 'denied' || 
    !!appealRejectReason?.trim(); // Если есть причина отказа, считаем что отказано

  // ✅ блокируем только пока рассматривают (pending)
  const appealLocked = appealPending;

  // ✅ если отказано — снова даём подать
  const appealBtnText = appealPending
    ? 'АПЕЛЛЯЦИЯ НА РАССМОТРЕНИИ'
    : 'ПОДАТЬ АПЕЛЛЯЦИЮ';

  const title = useMemo(() => {
    if (ban?.ban_permanent) return 'ВЫ ЗАБАНЕНЫ НАВСЕГДА';
    if (ban?.ban_days_left != null) return `ДОСТУП ЗАБЛОКИРОВАН (осталось ${ban.ban_days_left} дн.)`;
    return 'ДОСТУП ЗАБЛОКИРОВАН';
  }, [ban]);

  const reason = ban?.ban_reason?.trim() ? ban.ban_reason.trim() : 'Причина не указана.';
  const until = ban?.ban_until ? fmt(ban.ban_until) : '—';
  const bannedBy = ban?.banned_by || '—';
  const createdAt = ban?.ban_created_at ? fmt(ban.ban_created_at) : '—';

  return (
    <div className="banned-page">
      <div className="banned-bg">
        <ColorBendsBackground />
      </div>

      <div className="banned-center">
        <div className={`banned-card ${enter ? 'enter' : ''}`}>
          <div className="banned-title colorbends-text">{title}</div>
          
          <div className="banned-sub">
            Доступ к платформе временно ограничен.
          </div>

          <div className="banned-reason-box">
            <div className="banned-reason-label colorbends-text">ПРИЧИНА БЛОКИРОВКИ</div>
            <div className="banned-reason-text">{reason}</div>
          </div>

          {/* ✅ Блок статуса апелляции — показываем и для pending, и для rejected */}
          {(appealPending || appealRejected) ? (
            <div className={`banned-appeal-box ${appealRejected ? 'rejected' : 'pending'}`}>
              <div className="banned-appeal-label colorbends-text">
                {appealRejected ? 'ВАМ ОТКАЗАНО' : 'АПЕЛЛЯЦИЯ ОТПРАВЛЕНА'}
              </div>

              <div className="banned-appeal-text">
                {appealRejected
                  ? (appealRejectReason?.trim() ? appealRejectReason : 'Причина отказа не указана.')
                  : 'Администрация рассматривает вашу апелляцию.'}
              </div>
            </div>
          ) : null}

          <div className="banned-mini">
            {!ban?.ban_permanent && (
              <div className="mini-row">
                <div className="mini-k colorbends-text">До</div>
                <div className="mini-v">{until}</div>
              </div>
            )}

            <div className="mini-row">
              <div className="mini-k colorbends-text">Забанил</div>
              <div className="mini-v">{bannedBy}</div>
            </div>

            <div className="mini-row">
              <div className="mini-k colorbends-text">Дата бана</div>
              <div className="mini-v">{createdAt}</div>
            </div>
          </div>

          <div className="banned-actions">
            <button
              className={`banned-btn ${appealLocked ? 'disabled' : ''}`}
              onClick={() => !appealLocked && navigate('/appeal')}
              disabled={appealLocked}
              title={appealLocked ? 'Апелляция уже на рассмотрении' : 'Подать апелляцию'}
            >
              {appealBtnText}
            </button>

            <div className="banned-note">
              Если вы считаете, что бан выдан ошибочно — подайте апелляцию. 
              Администрация рассмотрит ваше обращение в течение 24 часов.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}