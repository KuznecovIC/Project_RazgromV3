// frontend/src/components/SettingsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/apiFetch';
import './SettingsPage.css';

function fmtDate(s) {
  if (!s) return '—';
  try { 
    const date = new Date(s);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch { 
    return s; 
  }
}

function Badge({ status }) {
  const v = String(status || '').toLowerCase();
  
  let cls = 'badge';
  let text = (status || '—').toUpperCase();
  
  if (v === 'pending') {
    cls = 'badge pending';
  } else if (v === 'approved' || v === 'accepted') {
    cls = 'badge ok';
  } else if (v === 'rejected' || v === 'denied') {
    cls = 'badge bad';
  }
  
  // Красивые названия статусов
  if (v === 'pending') text = '⏳ ОЖИДАЕТ';
  else if (v === 'approved') text = '✅ ПРИНЯТО';
  else if (v === 'accepted') text = '✅ ПРИНЯТО';
  else if (v === 'rejected') text = '❌ ОТКЛОНЕНО';
  else if (v === 'denied') text = '❌ ОТКЛОНЕНО';
  
  return <span className={cls}>{text}</span>;
}

function ActionBadge({ type }) {
  const v = String(type || '').toLowerCase();
  
  let cls = 'badge';
  let icon = '';
  let text = (type || '—').toUpperCase();
  
  if (v === 'ban') {
    cls = 'badge ban';
    icon = '🚫';
    text = 'БАН';
  } else if (v === 'unban') {
    cls = 'badge ok';
    icon = '✅';
    text = 'РАЗБАН';
  } else if (v === 'warning') {
    cls = 'badge warning';
    icon = '⚠️';
    text = 'ПРЕДУПРЕЖДЕНИЕ';
  } else if (v === 'mute') {
    cls = 'badge mute';
    icon = '🔇';
    text = 'МУТ';
  }
  
  return <span className={cls}>{icon} {text}</span>;
}

// ✅ Вспомогательная функция для получения JSON из apiFetch
async function apiJson(path, options) {
  const res = await apiFetch(path, options);

  // если сервер вернул ошибку — вытащим текст красиво
  if (!res.ok) {
    let msg = '';
    try {
      const j = await res.json();
      msg = j?.detail || j?.error || JSON.stringify(j);
    } catch {
      try { 
        msg = await res.text(); 
      } catch {}
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return await res.json();
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  // 🔥 НОВЫЙ STATE: режим присутствия
  const [presenceMode, setPresenceMode] = useState('auto');
  const [savingPresence, setSavingPresence] = useState(false);

  const [punishments, setPunishments] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [reports, setReports] = useState([]);

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  // Активная вкладка в истории
  const [activeHistoryTab, setActiveHistoryTab] = useState('punishments');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      // ✅ Используем apiJson вместо apiFetch для получения данных
      const data = await apiJson('/api/settings/overview/');
      console.log('Settings data:', data); // Для отладки
      
      setEmail(data.email || '');
      setUsername(data.username || '');
      
      // 🔥 ДОБАВЛЕНО: загружаем режим присутствия
      setPresenceMode(data.presence_mode || 'auto');

      setPunishments(Array.isArray(data.punishments) ? data.punishments : []);
      setAppeals(Array.isArray(data.appeals) ? data.appeals : []);
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (e) {
      setErr(e?.message || 'Ошибка загрузки настроек');
      console.error('Settings load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const onChangePassword = async () => {
    // Валидация
    if (newPass !== confirmPass) {
      setErr('Новые пароли не совпадают');
      return;
    }
    
    if (newPass.length < 8) {
      setErr('Новый пароль должен быть минимум 8 символов');
      return;
    }

    setSavingPass(true);
    setErr('');
    setSuccess('');
    
    try {
      // ✅ Используем apiJson вместо apiFetch
      await apiJson('/api/settings/change-password/', {
        method: 'POST',
        body: JSON.stringify({ 
          old_password: oldPass, 
          new_password: newPass 
        }),
      });
      
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      setSuccess('Пароль успешно изменен');
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setErr(e?.message || 'Ошибка смены пароля');
    } finally {
      setSavingPass(false);
    }
  };

  // 🔥 Функция для смены режима присутствия
  const onChangePresenceMode = async (mode) => {
    setSavingPresence(true);
    setErr('');
    
    try {
      const res = await apiJson('/api/settings/presence-mode/', {
        method: 'PATCH',
        body: JSON.stringify({ presence_mode: mode }),
      });
      
      setPresenceMode(res.presence_mode || mode);
      setSuccess('Статус активности обновлен');
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setErr(e?.message || 'Ошибка смены статуса активности');
    } finally {
      setSavingPresence(false);
    }
  };

  const hasAny = useMemo(
    () => punishments.length || appeals.length || reports.length,
    [punishments, appeals, reports]
  );

  // Получаем количество для каждой вкладки
  const counts = {
    punishments: punishments.length,
    appeals: appeals.length,
    reports: reports.length
  };

  return (
    <div className="settings-wrap">
      <div className="settings-card">
        <div className="settings-head">
          <div className="settings-title">⚙️ SETTINGS</div>
          <div className="settings-sub">личный кабинет • приватная информация • модерация</div>
        </div>

        {err ? (
          <div className="settings-error">
            <span>❌ {err}</span>
          </div>
        ) : null}
        
        {success ? (
          <div className="settings-success">
            <span>✅ {success}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="settings-loading">
            <div className="spinner"></div>
            <div>Загрузка данных...</div>
          </div>
        ) : (
          <>
            <div className="settings-grid">
              {/* Блок конфиденциальной информации */}
              <div className="settings-block">
                <div className="block-title">
                  <span>🔐 КОНФИДЕНЦИАЛЬНО</span>
                </div>

                <div className="info-row">
                  <div className="info-label">USERNAME</div>
                  <div className="info-value mono">{username || '—'}</div>
                </div>

                <div className="info-row">
                  <div className="info-label">EMAIL</div>
                  <div className="info-value mono">{email || '—'}</div>
                </div>

                <div className="divider" />

                <div className="password-section">
                  <div className="password-label">🔑 СМЕНА ПАРОЛЯ</div>

                  <input
                    className="settings-input"
                    placeholder="Старый пароль"
                    type="password"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                  />
                  
                  <input
                    className="settings-input"
                    placeholder="Новый пароль (мин. 8 символов)"
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                  
                  <input
                    className="settings-input"
                    placeholder="Подтверждение нового пароля"
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />

                  <button
                    className="settings-button"
                    disabled={savingPass || !oldPass || !newPass || !confirmPass || newPass.length < 8}
                    onClick={onChangePassword}
                  >
                    {savingPass ? '🔄 СОХРАНЕНИЕ...' : '🔒 ОБНОВИТЬ ПАРОЛЬ'}
                  </button>
                </div>
              </div>

              {/* Блок статуса активности */}
              <div className="settings-block">
                <div className="block-title">
                  <span>🟢 СТАТУС АКТИВНОСТИ</span>
                </div>

                <div className="status-section">
                  <div className="presence-row">
                    {[
                      ['auto', 'AUTO', '🤖'],
                      ['online', 'ONLINE', '🟢'],
                      ['afk', 'AFK', '💤'],
                      ['dnd', 'DND', '🔴'],
                      ['offline', 'OFFLINE', '⚫'],
                    ].map(([key, title, emoji]) => (
                      <button
                        key={key}
                        className={`presence-btn ${presenceMode === key ? 'active' : ''}`}
                        onClick={() => onChangePresenceMode(key)}
                        disabled={savingPresence}
                      >
                        <span className="presence-emoji">{emoji}</span>
                        <span className="presence-title">{title}</span>
                      </button>
                    ))}
                  </div>

                  {presenceMode !== 'auto' && (
                    <div className="presence-warning">
                      ⚠️ Ручной режим <strong>{presenceMode.toUpperCase()}</strong> переопределяет автоматическое определение статуса
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Блок истории модерации */}
            <div className="settings-block wide">
              <div className="block-title">
                <span>⚖️ АПЕЛЛЯЦИИ • РЕПОРТЫ • ИСТОРИЯ НАКАЗАНИЙ</span>
              </div>

              {!hasAny ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-text">Пока пусто</div>
                  <div className="empty-hint">
                    Здесь появятся ваши апелляции, репорты и история наказаний
                  </div>
                </div>
              ) : (
                <>
                  {/* Табы для переключения между разделами */}
                  <div className="history-tabs">
                    <button 
                      className={`history-tab ${activeHistoryTab === 'punishments' ? 'active' : ''}`}
                      onClick={() => setActiveHistoryTab('punishments')}
                    >
                      <span>🚫 НАКАЗАНИЯ</span>
                      {counts.punishments > 0 && (
                        <span className="tab-count">{counts.punishments}</span>
                      )}
                    </button>
                    
                    <button 
                      className={`history-tab ${activeHistoryTab === 'appeals' ? 'active' : ''}`}
                      onClick={() => setActiveHistoryTab('appeals')}
                    >
                      <span>📝 АПЕЛЛЯЦИИ</span>
                      {counts.appeals > 0 && (
                        <span className="tab-count">{counts.appeals}</span>
                      )}
                    </button>
                    
                    <button 
                      className={`history-tab ${activeHistoryTab === 'reports' ? 'active' : ''}`}
                      onClick={() => setActiveHistoryTab('reports')}
                    >
                      <span>🚨 РЕПОРТЫ</span>
                      {counts.reports > 0 && (
                        <span className="tab-count">{counts.reports}</span>
                      )}
                    </button>
                  </div>

                  <div className="history-content">
                    {/* Вкладка НАКАЗАНИЯ */}
                    {activeHistoryTab === 'punishments' && (
                      <div className="history-panel">
                        {punishments.length ? (
                          punishments.map((p) => (
                            <div className="history-item punishment" key={p.id}>
                              <div className="item-header">
                                <ActionBadge type={p.action_type} />
                                <div className="item-date">{fmtDate(p.created_at)}</div>
                              </div>

                              <div className="punish-meta">
                                <div className="punish-meta-row">
                                  <span className="footer-label">Администратор:</span>
                                  <span className="mono">{p.admin_username || 'system'}</span>
                                </div>

                                {p.id ? (
                                  <div className="punish-meta-row">
                                    <span className="footer-label">ID:</span>
                                    <span className="mono">#{p.id}</span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="punish-reason">
                                <div className="reason-label">Причина</div>
                                <div className="reason-text">{p.reason || '—'}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state small">
                            <div className="empty-text">Нет записей о наказаниях</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Вкладка АПЕЛЛЯЦИИ */}
                    {activeHistoryTab === 'appeals' && (
                      <div className="history-panel">
                        {appeals.length ? (
                          appeals.map((a) => (
                            <div className="history-item" key={a.id}>
                              <div className="item-header">
                                <Badge status={a.status} />
                                <div className="item-date">{fmtDate(a.created_at)}</div>
                              </div>
                              
                              <div className="appeal-message">
                                <span className="message-label">Текст апелляции:</span>
                                <div className="message-text">{a.message || '—'}</div>
                              </div>
                              
                              {a.admin_response ? (
                                <div className="admin-response">
                                  <span className="response-label">Ответ администратора:</span>
                                  <div className="response-text">{a.admin_response}</div>
                                </div>
                              ) : null}
                              
                              {a.responded_by_username && (
                                <div className="item-footer">
                                  <span className="footer-label">Ответил:</span>
                                  <span className="mono">{a.responded_by_username}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="empty-state small">
                            <div className="empty-text">Нет апелляций</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Вкладка РЕПОРТЫ */}
                    {activeHistoryTab === 'reports' && (
                      <div className="history-panel">
                        {reports.length ? (
                          reports.map((r) => (
                            <div className="history-item report-card" key={r.id}>
                              <div className="report-grid">
                                {/* LEFT */}
                                <div className="report-left">
                                  <div className="item-header">
                                    <Badge status={r.status} />
                                  </div>

                                  <div className="report-meta">
                                    <div className="meta-row">
                                      <span className="meta-label">Дата:</span>
                                      <span className="meta-value">{fmtDate(r.created_at)}</span>
                                    </div>

                                    <div className="meta-row">
                                      <span className="meta-label">На:</span>
                                      <span className="meta-value">{r.target_username || '—'}</span>
                                    </div>

                                    <div className="meta-row">
                                      <span className="meta-label">ID:</span>
                                      <span className="meta-value">#{r.id}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* RIGHT */}
                                <div className="report-right">
                                  <div className="report-reason">
                                    <div className="reason-label">Причина</div>
                                    <div className="reason-text">{r.reason || '—'}</div>
                                  </div>

                                  <div className="report-message">
                                    <div className="reason-label">Сообщение</div>
                                    <div className="reason-text">{r.message || '—'}</div>
                                  </div>

                                  <div className="report-admin-answer">
                                    <div className="reason-label">Ответ администратора</div>
                                    <div className="reason-text">{r.admin_response || 'нет'}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state small">
                            <div className="empty-text">Нет репортов</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}