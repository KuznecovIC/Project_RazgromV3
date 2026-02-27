import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimationFrame } from 'framer-motion';
import { apiFetch } from '../api/apiFetch';
import ScrollVelocity from './ScrollVelocity';
import './StudioStatsPage.css';

const fmt = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('ru-RU');
};

const getTodayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const readDailyMap = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    return {};
  }
};

// Функция для построения серии из totals (только если совсем нет данных)
const buildSeriesFromTotal = (total, months = 6) => {
  const labels = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const now = new Date();
  const points = [];
  const totalNum = Math.max(0, Number(total || 0));

  // распределяем totalNum по месяцам “волной”
  let remaining = totalNum;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = labels[d.getMonth()];
    // кусок: чем ближе к текущему месяцу — тем чуть больше
    const base = Math.max(0, Math.round((totalNum / months) * (0.75 + (months - i) * 0.08)));
    const value = i === 0 ? remaining : Math.min(remaining, base);
    remaining = Math.max(0, remaining - value);
    points.push({ label, value });
  }
  return points;
};

const buildSeriesFromDailySeconds = (dailyMap, days = 14) => {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const sec = Number(dailyMap?.[key] || 0);
    out.push({ label: `${dd}.${mm}`, value: Math.round((sec / 3600) * 100) / 100 }); // часы (2 знака)
  }
  return out;
};

// Функция для расчета процента по последним двум точкам
const calcPercent = (data = []) => {
  if (!data || data.length < 2) return 0;
  
  const prev = Number(data[data.length - 2]?.value || 0);
  const last = Number(data[data.length - 1]?.value || 0);
  
  if (prev <= 0) return last > 0 ? 100 : 0;
  if (last === prev) return 0;  // Если значения равны, возвращаем 0
  
  return Math.round(((last - prev) / prev) * 100);
};

// Улучшенный LineChart с заливкой, сеткой, осями и подписями
const LineChart = ({
  data = [],
  height = 180,
  animate = false,
  onDone,
  showAxes = false,        // ✅ оси (слева/снизу)
  showPointValues = false, // ✅ цифры возле точек
  xLabelsMode = 'auto'     // ✅ auto | dayIndex
}) => {
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(1);
  const [ready, setReady] = useState(false);
  
  // Состояния для управления анимацией
  const [isDone, setIsDone] = useState(!animate);
  const [drawn, setDrawn] = useState(!animate);

  const W = 1000; // виртуальная ширина
  const H = height;
  
  // ✅ Умные отступы под оси
  const padTop = 18;
  const padRight = 18;
  const padBottom = showAxes ? 42 : 18;  // снизу место под даты
  const padLeft = showAxes ? 52 : 18;    // слева место под числа
  
  const DURATION = 1.25; // длительность анимации

  const values = data.map((d) => Number(d.value || 0));
  
  // ✅ Умный масштаб с запасом, чтобы линия не была плоской
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  
  if (minVal === maxVal) {
    minVal = minVal - 1;
    maxVal = maxVal + 1;
  } else {
    const pad = (maxVal - minVal) * 0.15;
    minVal = minVal - pad;
    maxVal = maxVal + pad;
  }

  // Функции для преобразования координат
  const x = (i) => {
    const n = Math.max(1, data.length - 1);
    return padLeft + (i / n) * (W - padLeft - padRight);
  };

  const y = (v) => {
    const t = (v - minVal) / (maxVal - minVal || 1);
    return padTop + (1 - t) * (H - padTop - padBottom);
  };

  // ✅ Единый массив точек для всего графика
  const points = data.map((point, i) => ({
    x: x(i),
    y: y(Number(point.value || 0))
  }));

  // ✅ Путь для линии строится из тех же points
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Путь для заливки (до нижнего края)
  const areaD = points.length > 0 
    ? `${d} L ${points[points.length - 1].x} ${H - padBottom} L ${points[0].x} ${H - padBottom} Z`
    : '';

  // ✅ Функция для получения подписей оси X
  const getXLabel = (row, idx) => {
    if (xLabelsMode === 'dayIndex') return `Day ${idx + 1}`;

    const raw = row?.label || row?.date || row?.day || null;
    if (!raw) return `Day ${idx + 1}`;

    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    }
    return String(raw);
  };

  // ✅ Тики для оси X
  const xTicksCount = 6;
  const xTickIdx = data?.length > 1
    ? Array.from({ length: xTicksCount }, (_, i) =>
        Math.round((i * (data.length - 1)) / (xTicksCount - 1))
      )
    : [0];

  // ✅ Тики для оси Y
  const yTicksCount = 4;
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
    const t = i / yTicksCount; // 0..1
    const v = minVal + (maxVal - minVal) * (1 - t); // сверху max
    const yPos = padTop + (H - padTop - padBottom) * t;
    return { value: v, y: yPos };
  });

  // ✅ Функция для определения, показывать ли цифру у точки
  const shouldShowPointValue = (vals, i) => {
    if (i === 0 || i === vals.length - 1) return true;
    const prev = Number(vals[i - 1] ?? 0);
    const cur = Number(vals[i] ?? 0);
    const next = Number(vals[i + 1] ?? cur);
    return cur !== prev || cur !== next;
  };

  const valuesArr = (data || []).map((r) => Number(r?.value ?? 0));

  // ✅ Измеряем длину пути
  useLayoutEffect(() => {
    if (!animate) return;

    setReady(false);

    try {
      const len = pathRef.current?.getTotalLength?.() || 1;
      const ceilLen = Math.max(1, Math.ceil(len));
      setPathLen(ceilLen);
      setReady(true);
    } catch {
      setPathLen(1);
      setReady(true);
    }
  }, [animate, d]);

  // ✅ Управление состояниями при изменении данных или animate
  useEffect(() => {
    if (!animate) {
      setIsDone(true);
      setDrawn(true);
      return;
    }
    setIsDone(false);
    setDrawn(false);
  }, [animate, d]);

  return (
    <svg 
      className="statsLineSvg" 
      viewBox={`0 0 ${W} ${H}`} 
      width="100%" 
      height={height}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="rgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(192,132,252,0.28)" />
          <stop offset="100%" stopColor="rgba(192,132,252,0.00)" />
        </linearGradient>
      </defs>

      {/* Невидимый path — для измерения длины */}
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth="4"
      />

      {/* ✅ ОСИ (только если showAxes) */}
      {showAxes && (
        <>
          {/* Y grid + числа слева */}
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={t.y}
                y2={t.y}
                className="statsGridLine"
                opacity={i === yTicks.length - 1 ? 0.35 : 0.18}
              />
              <text
                x={padLeft - 10}
                y={t.y + 4}
                textAnchor="end"
                className="statsAxisText"
              >
                {Math.round(t.value)}
              </text>
            </g>
          ))}

          {/* X подписи времени снизу */}
          {xTickIdx.map((idx) => {
            const p = points[idx];
            if (!p) return null;
            return (
              <text
                key={`xt-${idx}`}
                x={p.x}
                y={height - padBottom + 22}
                textAnchor="middle"
                className="statsAxisText"
              >
                {getXLabel(data[idx], idx)}
              </text>
            );
          })}
        </>
      )}

      {/* Сетка горизонтальная (всегда, но полупрозрачная) */}
      {!showAxes && [0.25, 0.5, 0.75].map((k, idx) => (
        <line
          key={idx}
          x1={padLeft}
          x2={W - padRight}
          y1={padTop + k * (H - padTop - padBottom)}
          y2={padTop + k * (H - padTop - padBottom)}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          strokeDasharray={idx === 1 ? "none" : "4 4"}
        />
      ))}

      {/* Базовая линия (ось X) */}
      <line
        x1={padLeft}
        x2={W - padRight}
        y1={H - padBottom}
        y2={H - padBottom}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />

      {/* Заливка под линией - анимируем появление */}
      {points.length > 1 && (
        <motion.path 
          d={areaD} 
          fill="url(#rgArea)" 
          initial={{ opacity: 0 }}
          animate={{ opacity: animate ? 1 : 1 }}
          transition={{ duration: DURATION * 0.8, delay: 0.2 }}
        />
      )}

      {/* Анимированная линия — рисуем ДО КОНЦА, а после complete сами переключаемся */}
      {animate ? (
        <>
          {ready && pathLen > 0 && (
            <motion.path
              key={`dash_${d}_${pathLen}`}   // чтобы не было “залипания” в strict-mode
              d={d}
              fill="none"
              stroke="rgba(192, 132, 252, 0.95)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${pathLen} ${pathLen}`}
              initial={{ strokeDashoffset: pathLen, opacity: 1 }}
              animate={{ strokeDashoffset: 0, opacity: isDone ? 0 : 1 }}
              transition={{
                strokeDashoffset: { duration: DURATION, ease: 'easeInOut' },
                opacity: { duration: 0.18, ease: 'linear' }
              }}
              onAnimationComplete={() => {
                // ВАЖНО: завершение по факту, не по таймеру
                setIsDone(true);
                setDrawn(true);      // чтобы точки появились
                onDone?.();          // цифры после анимации
              }}
            />
          )}

          {/* Статичная линия — появляется ТОЛЬКО после фактического конца */}
          <motion.path
            d={d}
            fill="none"
            stroke="rgba(192, 132, 252, 0.95)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: isDone ? 1 : 0 }}
            transition={{ duration: 0.18, ease: 'linear' }}
          />
        </>
      ) : (
        <path
          d={d}
          fill="none"
          stroke="rgba(192, 132, 252, 0.95)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Точки — показываем только после дорисовки */}
      {(!animate || drawn) && (
        <>
          {/* Промежуточные точки */}
          {points.slice(0, -1).map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="rgba(255,255,255,0.85)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
              {/* ✅ Цифры на точках (только если showPointValues) */}
              {showPointValues && shouldShowPointValue(valuesArr, i) && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  className="statsPointText"
                >
                  {valuesArr[i]}
                </text>
              )}
            </g>
          ))}
          
          {/* Последняя большая точка */}
          {points.length > 0 && (
            <g>
              <motion.circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="8"
                fill="rgba(192,132,252,0.95)"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="2.5"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
              {/* ✅ Цифра на последней точке */}
              {showPointValues && valuesArr.length > 0 && (
                <text
                  x={points[points.length - 1].x}
                  y={points[points.length - 1].y - 14}
                  textAnchor="middle"
                  className="statsPointText"
                >
                  {valuesArr[valuesArr.length - 1]}
                </text>
              )}
            </g>
          )}
        </>
      )}
    </svg>
  );
};

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      if (ref.current) setWidth(ref.current.offsetWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return width;
}

function wrap(min, max, v) {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

function StatsMarquee({ cards, onOpen }) {
  const baseX = useMotionValue(0);
  const copyRef = useRef(null);
  const copyWidth = useElementWidth(copyRef);

  const baseVelocity = 55;

  const x = useTransform(baseX, (v) => {
    if (!copyWidth) return '0px';
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  useAnimationFrame((t, delta) => {
    const moveBy = baseVelocity * (delta / 1000);
    baseX.set(baseX.get() - moveBy);
  });

  const copies = 8;

  const renderCopy = (copyIndex, isFirst) => (
    <div
      key={copyIndex}
      className="studioStatsCarouselCopy"
      ref={isFirst ? copyRef : null}
    >
      {cards.map((c) => (
        <button
          key={`${copyIndex}_${c.key}`}
          className="studioStatsMiniCard studioStatsMiniCardBig"
          onClick={() => onOpen?.(c.key)}
          type="button"
        >
          <div className="miniTop">
            <div className="miniTitle">{c.title}</div>
            <div className="miniValue">
              {typeof c.value === 'number' ? String(c.value) : c.value}
              {c.unit ? <span className="miniUnit"> {c.unit}</span> : null}
            </div>
          </div>

          <div className="miniChart miniChartBig">
            <LineChart 
              data={c.data} 
              height={170} 
              showAxes={false} 
              showPointValues={false}
            />
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="studioStatsMarquee">
      <motion.div className="studioStatsMarqueeScroller" style={{ x }}>
        {Array.from({ length: copies }).map((_, i) => renderCopy(i, i === 0))}
      </motion.div>
    </div>
  );
}

export default function StudioStatsPage({ user }) {
  const userId = user?.id;

  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [expandedKey, setExpandedKey] = useState(null);
  const [numbersReady, setNumbersReady] = useState(false);
  const expandedRef = useRef(null);

  // Блокировка скролла при открытом графике
  useEffect(() => {
    if (!expandedKey) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [expandedKey]);

  // Загружаем данные с сервера
  useEffect(() => {
    let alive = true;
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        const statsResp = await apiFetch(`/api/users/${userId}/stats/`);
        if (!statsResp.ok) throw new Error('Failed to fetch stats');
        
        const statsData = await statsResp.json();
        if (!alive) return;
        
        setStats(statsData?.stats || null);

        const historyResp = await apiFetch(`/api/users/${userId}/stats/history/?days=30`);
        
        if (!alive) return;
        
        if (historyResp.ok) {
          const historyData = await historyResp.json();
          if (alive) setHistory(historyData?.series || null);
        }
        
      } catch (error) {
        console.error('Error fetching stats:', error);
        if (alive) {
          setStats(null);
          setHistory(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchData();

    return () => {
      alive = false;
    };
  }, [userId]);

  const siteDaily = useMemo(() => {
    if (!userId) return {};
    return readDailyMap(`rg_site_seconds_${userId}`);
  }, [userId]);

  const listenDaily = useMemo(() => {
    if (!userId) return {};
    return readDailyMap(`rg_listen_seconds_${userId}`);
  }, [userId]);

  const today = getTodayKey();
  const hoursOnSiteToday = Math.round(((Number(siteDaily?.[today] || 0) / 3600) * 100)) / 100;
  const hoursListeningToday = Math.round(((Number(listenDaily?.[today] || 0) / 3600) * 100)) / 100;

  const cards = useMemo(() => {
    if (loading) return [];

    const followers = stats?.followers ?? 0;
    const following = stats?.following ?? 0;
    const tracks = stats?.tracks ?? 0;
    const listens = stats?.total_listens ?? 0;
    const likes = stats?.total_likes ?? 0;
    const reposts = stats?.total_reposts ?? 0;
    const comments = stats?.total_comments ?? 0;

    const series = {
      followers: history?.followers || [],
      following: history?.following || [],
      tracks: history?.tracks || [],
      listens: history?.listens || [],
      likes: history?.likes || [],
      reposts: history?.reposts || [],
      comments: history?.comments || [],
      hours_site: buildSeriesFromDailySeconds(siteDaily, 14),
      hours_listen: buildSeriesFromDailySeconds(listenDaily, 14),
    };

    const getDeltaText = (data) => {
      if (!data || data.length < 2) return '';
      const prev = data[data.length - 2]?.value || 0;
      const last = data[data.length - 1]?.value || 0;
      const percent = calcPercent(data);
      
      if (percent === 0) return 'без изменений';
      const direction = percent > 0 ? '↑' : '↓';
      return `${direction} ${Math.abs(percent)}% за день`;
    };

    return [
      { 
        key: 'followers', 
        title: 'Followers', 
        value: followers, 
        unit: '', 
        data: series.followers,
        percent: calcPercent(series.followers),
        deltaText: getDeltaText(series.followers)
      },
      { 
        key: 'following', 
        title: 'Following', 
        value: following, 
        unit: '', 
        data: series.following,
        percent: calcPercent(series.following),
        deltaText: getDeltaText(series.following)
      },
      { 
        key: 'tracks', 
        title: 'Tracks', 
        value: tracks, 
        unit: '', 
        data: series.tracks,
        percent: calcPercent(series.tracks),
        deltaText: getDeltaText(series.tracks)
      },
      { 
        key: 'listens', 
        title: 'Listens', 
        value: listens, 
        unit: '', 
        data: series.listens,
        percent: calcPercent(series.listens),
        deltaText: getDeltaText(series.listens)
      },
      { 
        key: 'likes', 
        title: 'Likes', 
        value: likes, 
        unit: '', 
        data: series.likes,
        percent: calcPercent(series.likes),
        deltaText: getDeltaText(series.likes)
      },
      { 
        key: 'reposts', 
        title: 'Reposts', 
        value: reposts, 
        unit: '', 
        data: series.reposts,
        percent: calcPercent(series.reposts),
        deltaText: getDeltaText(series.reposts)
      },
      { 
        key: 'comments', 
        title: 'Comments', 
        value: comments, 
        unit: '', 
        data: series.comments,
        percent: calcPercent(series.comments),
        deltaText: getDeltaText(series.comments)
      },
      { 
        key: 'hours_site', 
        title: 'Hours on site', 
        value: hoursOnSiteToday, 
        unit: 'h today', 
        data: series.hours_site,
        percent: calcPercent(series.hours_site),
        deltaText: getDeltaText(series.hours_site)
      },
      { 
        key: 'hours_listen', 
        title: 'Hours listening', 
        value: hoursListeningToday, 
        unit: 'h today', 
        data: series.hours_listen,
        percent: calcPercent(series.hours_listen),
        deltaText: getDeltaText(series.hours_listen)
      },
    ];
  }, [stats, history, siteDaily, listenDaily, hoursOnSiteToday, hoursListeningToday, loading]);

  if (loading) {
    return (
      <div className="studioStatsPage">
        <div className="studioStatsHeader">
          <ScrollVelocity
            texts={['LOADING STATS • PLEASE WAIT • LOADING STATS • PLEASE WAIT • LOADING STATS • PLEASE WAIT']}
            velocity={70}
            numCopies={24}
            className="custom-scroll-text"
          />
        </div>
        <div className="studioStatsLoading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!stats && !history) {
    return (
      <div className="studioStatsPage">
        <div className="studioStatsHeader">
          <ScrollVelocity
            texts={['NO DATA AVAILABLE • NO DATA AVAILABLE • NO DATA AVAILABLE •']}
            velocity={70}
            numCopies={24}
            className="custom-scroll-text"
          />
        </div>
        <div className="studioStatsNoData">
          <p>Статистика пока недоступна</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studioStatsPage">
      <div className="studioStatsHeader">
        <ScrollVelocity
          texts={['FULL STATS • SCROLL DOWN • FULL STATS • SCROLL DOWN • FULL STATS • SCROLL DOWN •']}
          velocity={70}
          numCopies={24}
          className="custom-scroll-text"
        />
      </div>

      <div className="studioStatsCarousel" role="list">
        <StatsMarquee
          cards={cards}
          onOpen={(key) => {
            setExpandedKey(key);
            setNumbersReady(false);
            setTimeout(() => expandedRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            }), 50);
          }}
        />
      </div>

      {/* FULL PANEL внутри страницы */}
      {expandedKey && (() => {
        const card = cards.find(c => c.key === expandedKey);
        if (!card) return null;

        return (
          <div ref={expandedRef} className="studioStatsExpandedWrap">
            <div className="studioStatsExpandedGlass">
              <button
                className="studioStatsExpandedClose"
                onClick={() => setExpandedKey(null)}
                type="button"
              >
                ✕
              </button>

              <div className="studioStatsExpandedTop">
                <div className="studioStatsExpandedTitle">{card.title}</div>

                <div className={`studioStatsExpandedNumbers ${numbersReady ? 'show' : ''}`}>
                  <div className="now">Сейчас: <b>{fmt(card.value)}</b></div>
                  {card.deltaText && (
                    <div className="delta">{card.deltaText}</div>
                  )}
                </div>
              </div>

              <div className="studioStatsExpandedChart">
                <LineChart
                  key={expandedKey}
                  data={card.data}
                  height={520}
                  animate
                  onDone={() => setNumbersReady(true)}
                  showAxes={true}
                  showPointValues={true}
                  xLabelsMode="auto"
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}