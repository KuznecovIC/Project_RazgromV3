import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from './Shuffle';
import { apiFetch } from '../api/apiFetch';
import './ArtistStudioHub.css';

const fmt = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('ru-RU');
};

export default function ArtistStudioHub({ user, uploadedTracks = [], isLoadingTracks = false }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const userId = user?.id;

  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
      try {
        const resp = await apiFetch(`/api/users/${userId}/stats/`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!alive) return;
        setStats(data?.stats || null);
      } catch (_) {}
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  const computed = useMemo(() => {
    const list = Array.isArray(uploadedTracks) ? uploadedTracks : [];
    let totalPlays = 0,
      totalLikes = 0,
      totalReposts = 0,
      totalComments = 0;

    list.forEach((t) => {
      totalPlays += Number(t?.play_count || 0);
      totalLikes += Number(t?.like_count || 0);
      totalReposts += Number(t?.repost_count || 0);
      totalComments += Number(t?.comment_count || 0);
    });

    return {
      tracks: list.length,
      total_listens: totalPlays,
      total_likes: totalLikes,
      total_reposts: totalReposts,
      total_comments: totalComments,
    };
  }, [uploadedTracks]);

  const view = {
    followers: stats?.followers ?? 0,
    following: stats?.following ?? 0,
    tracks: stats?.tracks ?? computed.tracks,
    total_listens: stats?.total_listens ?? computed.total_listens,
    total_likes: stats?.total_likes ?? computed.total_likes,
    total_reposts: stats?.total_reposts ?? computed.total_reposts,
    total_comments: computed.total_comments,
  };

  const statItems = [
    { key: 'followers', label: 'Followers', value: view.followers, to: '/studio/followers' },
    { key: 'following', label: 'Following', value: view.following, to: '/studio/following' },
    { key: 'tracks', label: 'Tracks', value: isLoadingTracks ? '…' : view.tracks, to: '/studio/tracks' },
    { key: 'listens', label: 'Listens', value: view.total_listens, to: null }, // Не кликабельно
    { key: 'likes', label: 'Likes', value: view.total_likes, to: '/studio/likes' },
    { key: 'reposts', label: 'Reposts', value: view.total_reposts, to: '/studio/reposts' },
    { key: 'comments', label: 'Comments', value: view.total_comments, to: '/studio/comments' },
  ];

  return (
    <div className="studioHub">
      {/* STATS: широкая панель под навигацией */}
      <div className="studioStatsBar">
        <div className="studioStatsTitle">
          <Shuffle
            text="STATS"
            shuffleDirection="right"
            duration={0.3}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power2.out"
            stagger={0.01}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            style={{ fontSize: '0.9rem' }}
          />
        </div>

        <div className="studioStatsRow">
          {statItems.map((it) => {
            if (it.to) {
              // Кликабельная кнопка
              return (
                <button
                  key={it.key}
                  className="studioStatPill"
                  onClick={() => navigate(it.to)}
                  type="button"
                >
                  <div className="studioStatLabel">{it.label}</div>
                  <div className="studioStatValue">
                    {typeof it.value === 'string' ? it.value : fmt(it.value)}
                  </div>
                </button>
              );
            } else {
              // Не кликабельная (Listens)
              return (
                <div
                  key={it.key}
                  className="studioStatPill studioStatPillDisabled"
                >
                  <div className="studioStatLabel">{it.label}</div>
                  <div className="studioStatValue">
                    {typeof it.value === 'string' ? it.value : fmt(it.value)}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* ARTIST STUDIO: большой центрированный блок */}
      <div className="studioCenter">
        <div className="studioMainCard">
          <div className="studioMainTitle">
            <Shuffle
              text="ARTIST STUDIO"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.02}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              style={{ fontSize: '1.2rem' }}
            />
          </div>

          <div className="studioMainSub">
            Управление контентом + вся активность вокруг твоей музыки.
          </div>

          <div className="studioMainActions">
            <button className="studioMainAction" onClick={() => navigate('/upload')} type="button">
              <div className="t">Upload</div>
            </button>

            <button className="studioMainAction" onClick={() => navigate('/studio/playlists')} type="button">
              <div className="t">Create playlist</div>
            </button>

            <button className="studioMainAction" onClick={() => navigate('/studio/stats')} type="button">
              <div className="t">See full stats</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}