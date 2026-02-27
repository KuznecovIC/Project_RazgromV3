import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from './Shuffle';
import { apiFetch } from '../api/apiFetch';
import { useSocial } from '../context/SocialContext';
import './StudioUserListPage.css';

const IconUser = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"
      fill="currentColor"
    />
  </svg>
);

const normalizeAvatar = (u) => u?.avatar_url || u?.avatar || u?.profile_image || u?.image || null;

const fmt = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('ru-RU');
};

// Универсальная страница списка пользователей для Studio
export default function StudioUserListPage({
  title = 'Users',
  endpoint, // например: `/api/users/1/followers/`
  extract = (data) => data?.followers || data?.following || data?.users || [],
  getTotal = (data) => data?.pagination?.total_count,
  excludeUserId = null,   // ✅ Исключение текущего пользователя
}) {
  const navigate = useNavigate();
  const { toggleFollow, isFollowing, getFollowerCount, followsLoaded } = useSocial();

  // ✅ Refs для функций, чтобы избежать бесконечных перерендеров
  const extractRef = useRef(extract);
  const getTotalRef = useRef(getTotal);

  // ✅ Обновляем refs при изменении пропсов
  useEffect(() => {
    extractRef.current = extract;
    getTotalRef.current = getTotal;
  }, [extract, getTotal]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(null);

  // ✅ load зависит ТОЛЬКО от endpoint, использует refs для extract/getTotal
  const load = useCallback(async (pageToLoad = 1) => {
    if (!endpoint) {
      setItems([]);
      setHasNext(false);
      setTotal(null);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const url = `${endpoint}?page=${pageToLoad}&per_page=8`; // 8 элементов на страницу
      const resp = await apiFetch(url);
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setItems([]);
        setHasNext(false);
        setTotal(null);
        setError(data?.error || data?.detail || `Ошибка ${resp.status}: ${resp.statusText}`);
        return;
      }

      // ✅ Используем актуальные функции из refs
      const list = extractRef.current ? extractRef.current(data) : [];
      setItems(Array.isArray(list) ? list : []);
      setHasNext(!!data?.pagination?.has_next);
      
      const totalCount = getTotalRef.current ? getTotalRef.current(data) : null;
      setTotal(totalCount ?? null);
      
      setPage(pageToLoad);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
      setItems([]);
      setHasNext(false);
      setTotal(null);
      setError(e.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [endpoint]); // ✅ Только endpoint в зависимостях!

  // ✅ Загружаем при монтировании или изменении endpoint
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]); // ✅ Не включаем load, чтобы избежать цикла

  // подмешиваем актуальный статус подписки из SocialContext и исключаем текущего пользователя
  const resolvedItems = useMemo(() => {
    const arr = (Array.isArray(items) ? items : [])
      .filter((u) => !excludeUserId || u?.id !== excludeUserId); // ✅ Исключаем себя

    return arr.map((u) => {
      const id = u?.id;
      const followingNow = followsLoaded ? isFollowing(id) : !!u?.i_am_following;
      return { ...u, __isFollowing: followingNow };
    });
  }, [items, followsLoaded, isFollowing, excludeUserId]);

  return (
    <div className="studioListPage">
      <div className="studioListHead">
        <div className="studioListTitle">
          <Shuffle
            text={title.toUpperCase()}
            shuffleDirection="right"
            duration={0.3}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power2.out"
            stagger={0.01}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            style={{ fontSize: '1rem' }}
          />
        </div>
        <div className="studioListMeta">
          {typeof total === 'number' ? <span>{fmt(total)}</span> : null}
        </div>
      </div>

      {loading ? (
        <div className="studioListState">Загрузка…</div>
      ) : error ? (
        <div className="studioListState" style={{ color: '#ff6b6b' }}>{error}</div>
      ) : resolvedItems.length === 0 ? (
        <div className="studioListState">Пока пусто.</div>
      ) : (
        <div className="studioUserGrid">
          {resolvedItems.map((u) => {
            const avatarUrl = normalizeAvatar(u);
            const followersCount =
              (typeof u?.followers_count === 'number' ? u.followers_count : getFollowerCount(u?.id)) ?? 0;
            const isFollowingUser = !!u?.__isFollowing;

            return (
              <div className="studioUserCard" key={u?.id ?? u?.username}>
                <button
                  type="button"
                  className="studioUserAvatarBtn"
                  onClick={() => navigate(`/profile/${u?.id}`)}
                  aria-label={`Open ${u?.username || 'user'} profile`}
                >
                  <div className="studioUserAvatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={u?.username || 'user'} />
                    ) : (
                      <div className="studioUserAvatarFallback"><IconUser /></div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  className="studioUserNameBtn"
                  onClick={() => navigate(`/profile/${u?.id}`)}
                  title="Открыть профиль"
                >
                  @{u?.username || 'Unknown'}
                </button>

                <div className="studioUserFollowers">
                  {fmt(followersCount)} followers
                </div>

                <div className="studioUserActions">
                  <button
                    type="button"
                    className={`studioUserFollowBtn ${isFollowingUser ? 'is-following' : ''}`}
                    onClick={() => toggleFollow(u?.id, !isFollowingUser)}
                  >
                    {isFollowingUser ? 'Following' : 'Follow'}
                  </button>

                  <button
                    type="button"
                    className="studioUserMsgBtn"
                    onClick={() => {
                      // ✅ Открываем MessageHub и просим его стартануть диалог с этим юзером
                      if (!u?.id) return;
                      navigate(`/messagehub?start_user=${u.id}`);
                    }}
                    title="Открыть диалог"
                  >
                    Send message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="studioListPager">
        <button
          type="button"
          className="studioPagerBtn"
          onClick={() => load(Math.max(1, page - 1))}
          disabled={loading || page <= 1}
        >
          ← Prev
        </button>
        <div className="studioPagerInfo">Page {page}</div>
        <button
          type="button"
          className="studioPagerBtn"
          onClick={() => load(page + 1)}
          disabled={loading || !hasNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}