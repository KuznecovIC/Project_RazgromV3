// StudioPlaylistsHubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GridScan from "../GridScan";
import Shuffle from "./Shuffle";
import { apiFetch } from "../api/apiFetch";
import "./StudioPlaylistsHubPage.css";

const fmtVisibility = (v) => {
  if (v === "public") return "public";
  if (v === "unlisted") return "unlisted";
  return "private";
};

export default function StudioPlaylistsHubPage({ user }) {
  const navigate = useNavigate();
  const userId = user?.id;

  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const resp = await apiFetch(`/api/users/${userId}/playlists/`);
        const data = await resp.json();
        if (!alive) return;
        setPlaylists(Array.isArray(data?.playlists) ? data.playlists : []);
      } catch (e) {
        if (!alive) return;
        setErr("Не удалось загрузить плейлисты");
        setPlaylists([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  // ✅ Функция удаления плейлиста
  const handleDeletePlaylist = async (playlistId, title) => {
    const ok = window.confirm(`Удалить плейлист "${title || 'Untitled'}" навсегда?`);
    if (!ok) return;

    try {
      const resp = await apiFetch(`/api/playlists/${playlistId}/delete/`, { method: "DELETE" });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        alert(data?.error || "Не удалось удалить плейлист");
        return;
      }

      // ✅ мгновенно убираем из списка
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (e) {
      alert("Ошибка удаления плейлиста");
    }
  };

  const sorted = useMemo(() => {
    const list = Array.isArray(playlists) ? playlists : [];
    // private сначала (как “черновики”), затем unlisted, затем public
    const order = { private: 0, unlisted: 1, public: 2 };
    return [...list].sort((a, b) => (order[a.visibility] ?? 9) - (order[b.visibility] ?? 9));
  }, [playlists]);

  return (
    <div className="sphWrap">
      {/* ✅ GridScan как fixed-фон */}
      <div className="sphGridBg">
        <GridScan dominantColor="#8456ff" linesColor="#ffffff" />
      </div>

      <div className="sphInner">
        <div className="sphTop">
          <div className="sphTitle">
            <Shuffle
              text="PLAYLISTS HUB"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.02}
              triggerOnce={true}
              triggerOnHover={true}
            />
          </div>

          <div className="sphActions">
            <button className="sphBtn" onClick={() => navigate("/studio/playlists/create")} type="button">
              + Create playlist
            </button>

            <button className="sphBtnGhost" onClick={() => navigate("/studio")} type="button">
              Back to studio
            </button>
          </div>
        </div>

        {loading && <div className="sphHint">Loading…</div>}
        {!loading && err && <div className="sphError">{err}</div>}

        {!loading && !err && (
          <div className="sphList">
            {sorted.length === 0 ? (
              <div className="sphHint">У тебя пока нет плейлистов. Нажми “Create playlist”.</div>
            ) : (
              sorted.map((pl) => (
                <div key={pl.id} className="sphCard">
                  <div className="sphCover">
                    {pl.cover_url ? <img src={pl.cover_url} alt={pl.title} /> : <div className="sphCoverStub" />}
                  </div>

                  <div className="sphMeta">
                    {/* ✅ фиолетовое кликабельное название */}
                    <button
                      className="sphName"
                      type="button"
                      onClick={() => navigate(`/studio/playlists/${pl.id}`)}
                      title="Открыть для редактирования"
                    >
                      {pl.title || "Untitled"}
                    </button>

                    <div className="sphSub">
                      <span className={`sphBadge ${pl.visibility}`}>{fmtVisibility(pl.visibility)}</span>
                      <span className="sphDot">•</span>
                      <span>{pl.track_count ?? 0} tracks</span>
                    </div>
                  </div>

                  {/* ✅ Кнопки Edit и Delete */}
                  <div className="sphRightBtns">
                    <button className="sphEdit" onClick={() => navigate(`/studio/playlists/${pl.id}`)} type="button">
                      Edit
                    </button>

                    <button
                      className="sphDelete"
                      onClick={() => handleDeletePlaylist(pl.id, pl.title)}
                      type="button"
                      title="Удалить плейлист"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}