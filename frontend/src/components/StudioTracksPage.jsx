// StudioTracksPage.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from './Shuffle';
import { useSocial } from '../context/SocialContext'; // ✅ Добавлен импорт SocialContext
import './StudioTracksPage.css';

const fmt = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('ru-RU');
};

const formatDuration = (seconds) => {
  const s = Math.max(0, Number(seconds || 0));
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const getCover = (t) =>
  t?.cover_url ||
  t?.cover ||
  t?.cover_image ||
  t?.image ||
  'http://localhost:8000/static/default_cover.jpg';

const IconHeart = () => (
  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7-4.6-9.5-8.4C.3 9.3 2.1 6 5.6 6c1.8 0 3.2 1 4 2 0 0 1.8-2 4.8-2C18 6 20 9 19.5 12.6 19 16.4 12 21 12 21z"/></svg>
);

const IconShare = () => (
  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2L8.9 13.7a3.2 3.2 0 0 0 0-3.4l6.6-3.5A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.5 9.2A3 3 0 1 0 9 15l6.1 3.2A3 3 0 1 0 18 16z"/></svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
);

const IconComment = () => (
  <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 6h-18v12h4v4l4-4h10V6z"/></svg>
);

export default function StudioTracksPage({ tracks = [], isLoading = false }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const perPage = 8; // ✅ 4 + 4

  // ✅ Получаем методы из SocialContext
  const {
    toggleLike,
    toggleRepost,
    toggleFollow,
    isLiked,
    isReposted,
    isFollowing,
    likeCounts,
    repostCounts,
    getFollowerCount
  } = useSocial();

  const sorted = useMemo(() => {
    const arr = Array.isArray(tracks) ? [...tracks] : [];
    arr.sort((a, b) => {
      const da = new Date(a?.created_at || 0).getTime();
      const db = new Date(b?.created_at || 0).getTime();
      return db - da;
    });
    return arr;
  }, [tracks]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const slice = sorted.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  return (
    <div className="studioTracksPage">
      <div className="studioTracksHead">
        <div className="studioTracksTitle">
          <Shuffle
            text="TRACKS"
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
        <div className="studioTracksMeta">{fmt(sorted.length)}</div>
      </div>

      {isLoading ? (
        <div className="studioTracksState">Загрузка…</div>
      ) : slice.length === 0 ? (
        <div className="studioTracksState">У тебя пока нет треков.</div>
      ) : (
        <div className="studioTracksList">
          {slice.map((t) => {
            const trackId = t?.id;

            // ✅ автор (для follow)
            const authorId =
              t?.uploaded_by_id ||
              t?.user_id ||
              t?.owner_id ||
              t?.artist_id ||
              t?.uploaded_by?.id ||
              t?.user?.id ||
              null;

            const authorName =
              t?.uploaded_by_username ||
              t?.username ||
              t?.artist_name ||
              t?.uploaded_by?.username ||
              t?.user?.username ||
              'Unknown';

            // ✅ счетчики: если контекст уже знает — берем оттуда, иначе из API
            const hasLike = likeCounts && Object.prototype.hasOwnProperty.call(likeCounts, trackId);
            const hasRepost = repostCounts && Object.prototype.hasOwnProperty.call(repostCounts, trackId);

            const likeCount = hasLike ? (likeCounts[trackId] ?? 0) : Number(t?.like_count || 0);
            const repostCount = hasRepost ? (repostCounts[trackId] ?? 0) : Number(t?.repost_count || 0);

            const playCount = Number(t?.play_count || 0);
            const commentCount = Number(t?.comment_count || 0);

            const dur = Number(t?.duration_seconds || t?.duration || 0);

            const liked = typeof isLiked === "function" ? isLiked(trackId) : false;
            const reposted = typeof isReposted === "function" ? isReposted(trackId) : false;

            const following = authorId && typeof isFollowing === "function" ? isFollowing(authorId) : false;
            const followers = authorId && typeof getFollowerCount === "function" ? getFollowerCount(authorId) : null;

            return (
              <div key={trackId} className="studioTrackRow">
                {/* cover */}
                <button
                  type="button"
                  className="studioTrackCoverBtn"
                  onClick={() => navigate(`/track/${trackId}`)}
                  title="Открыть страницу трека"
                >
                  <img className="studioTrackCoverImg" src={getCover(t)} alt={t?.title || 'track'} />
                </button>

                {/* info */}
                <div className="studioTrackMain">
                  <button
                    type="button"
                    className="studioTrackTitleLink"
                    onClick={() => navigate(`/track/${trackId}`)}
                    title={t?.title || 'Untitled'}
                  >
                    {t?.title || 'Untitled'}
                  </button>

                  <div className="studioTrackSubRow">
                    <span className="studioTrackAuthor">{authorName}</span>
                    <span className="studioTrackDot">•</span>
                    <span className="studioTrackDur">{dur > 0 ? formatDuration(dur) : '0:00'}</span>

                    {followers !== null && (
                      <>
                        <span className="studioTrackDot">•</span>
                        <span className="studioTrackFollowers">{fmt(followers)} followers</span>
                      </>
                    )}
                  </div>

                  {/* stats (views/comments остаются инфой) */}
                  <div className="studioTrackMetaRow">
                    <span className="studioMeta"><IconEye /> {fmt(playCount)}</span>
                    <span className="studioMeta"><IconComment /> {fmt(commentCount)}</span>
                  </div>
                </div>

                {/* actions */}
                <div className="studioTrackActions">
                  {/* Follow */}
                  {authorId && (
                    <button
                      type="button"
                      className={`studioActionBtn follow ${following ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow?.(authorId);
                      }}
                      title="Подписка"
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  )}

                  {/* Like */}
                  <button
                    type="button"
                    className={`studioActionBtn ${liked ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike?.(trackId);
                    }}
                    title="Like"
                  >
                    <IconHeart /> <span>{fmt(likeCount)}</span>
                  </button>

                  {/* Repost */}
                  <button
                    type="button"
                    className={`studioActionBtn ${reposted ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRepost?.(trackId);
                    }}
                    title="Repost"
                  >
                    <IconShare /> <span>{fmt(repostCount)}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="studioTracksPager">
        <button
          type="button"
          className="studioPagerBtn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe <= 1}
        >
          ← Prev
        </button>

        <div className="studioPagerInfo">Page {pageSafe}</div>

        <button
          type="button"
          className="studioPagerBtn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={pageSafe >= totalPages}
        >
          Next →
        </button>
      </div>
    </div>
  );
}