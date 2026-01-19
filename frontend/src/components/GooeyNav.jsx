import React, { useCallback, useEffect, useRef, useState } from 'react';
import Shuffle from './Shuffle';
import './GooeyNav.css';

const defaultPalette = ['#FF9FFC', '#FF6B6B', '#FFD93D', '#6BCF7F', '#A0F7FF', '#9B8BFF'];

const remapColors = colors =>
  (colors.length ? colors : [1, 2, 3, 4]).map(value =>
    typeof value === 'number'
      ? defaultPalette[(value - 1 + defaultPalette.length) % defaultPalette.length]
      : value
  );

const createParticles = ({
  count,
  distances,
  radius,
  animationTime,
  timeVariance,
  colors
}) => {
  if (count <= 0) return [];
  const palette = remapColors(colors);
  return Array.from({ length: count }).map((_, idx) => {
    const baseDistance = distances[idx % distances.length] ?? radius * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const distance = baseDistance + Math.random() * Math.max(12, radius - baseDistance);
    const endDistance = distance * (0.5 + Math.random() * 0.8);
    const startX = Math.cos(angle) * baseDistance;
    const startY = Math.sin(angle) * baseDistance;
    const endX = Math.cos(angle) * endDistance;
    const endY = Math.sin(angle) * endDistance;
    const rotate = angle * (180 / Math.PI);
    const duration =
      Math.max(450, animationTime + (Math.random() - 0.5) * 2 * timeVariance) / 1000;
    const scale = 0.5 + Math.random() * 1.5;
    const color = palette[idx % palette.length];

    return {
      id: `${idx}-${Date.now()}-${Math.random()}`,
      rotate,
      startX,
      startY,
      endX,
      endY,
      scale,
      duration,
      color
    };
  });
};

const GooeyNav = ({
  items = [],
  particleCount = 12,
  particleDistances = [90, 20],
  particleR = 120,
  initialActiveIndex = 0,
  activeIndex: activeIndexExternal = null,
  animationTime = 600,
  timeVariance = 300,
  colors = [],
  onNavigate
}) => {
  const containerRef = useRef(null);
  const listRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialActiveIndex, 0), Math.max(items.length - 1, 0))
  );
  const [effectStyle, setEffectStyle] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);
  const activationTimeout = useRef(null);
  const [particles, setParticles] = useState([]);
  const [navKey, setNavKey] = useState(0);

  const updateEffectBounds = useCallback(
    index => {
      const container = containerRef.current;
      const target = listRefs.current[index];
      if (!container || !target) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const left = targetRect.left - containerRect.left;
      const top = targetRect.top - containerRect.top;
      setEffectStyle({
        width: targetRect.width,
        height: targetRect.height,
        transform: `translate3d(${left}px, ${top}px, 0)`
      });
    },
    []
  );

  useEffect(() => {
    updateEffectBounds(activeIndex);
  }, [activeIndex, items.length, updateEffectBounds]);

  // Синхронизация активного индекса с внешним значением
  useEffect(() => {
    if (activeIndexExternal === null || activeIndexExternal === undefined) return;
    const clamped = Math.min(
      Math.max(activeIndexExternal, 0),
      Math.max(items.length - 1, 0)
    );
    setActiveIndex(clamped);
  }, [activeIndexExternal, items.length]);

  useEffect(() => {
    const onResize = () => updateEffectBounds(activeIndex);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeIndex, updateEffectBounds]);

  const createParticlesOnInteraction = useCallback(() => {
    const newParticles = createParticles({
      count: particleCount,
      distances: particleDistances,
      radius: particleR,
      animationTime,
      timeVariance,
      colors
    });
    setParticles(newParticles);
    setIsAnimating(true);
    const timer = window.setTimeout(() => {
      setIsAnimating(false);
      window.setTimeout(() => setParticles([]), 100);
    }, animationTime);
    return () => window.clearTimeout(timer);
  }, [
    animationTime,
    colors,
    particleCount,
    particleDistances,
    particleR,
    timeVariance
  ]);

  useEffect(
    () => () => {
      if (activationTimeout.current) window.clearTimeout(activationTimeout.current);
    },
    []
  );

  const handleActivate = (event, index, href) => {
    event?.preventDefault?.();
    if (activationTimeout.current) window.clearTimeout(activationTimeout.current);
    activationTimeout.current = window.setTimeout(() => {
      setActiveIndex(index);
      setNavKey(prev => prev + 1);
      createParticlesOnInteraction();
      
      // Вызываем действие если есть
      if (items[index]?.action) {
        items[index].action();
      } else if (href && href.startsWith('#')) {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      onNavigate?.(items[index], index);
    }, 160);
  };

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul>
          {items.map((item, index) => (
            <li
              key={item.label}
              ref={el => {
                listRefs.current[index] = el;
              }}
              className={index === activeIndex ? 'active' : ''}
            >
              <a 
                href={item.href} 
                onClick={event => handleActivate(event, index, item.href)}
              >
                <Shuffle
                  key={`${item.label}-${navKey}-${index}`}
                  text={item.label}
                  shuffleDirection={index % 2 === 0 ? "up" : "down"}
                  duration={0.2}
                  animationMode="evenodd"
                  shuffleTimes={1}
                  ease="power2.out"
                  stagger={0.008}
                  threshold={0}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={false}
                  rootMargin="0px"
                  style={{ 
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: 'inherit',
                    fontFamily: "'Press Start 2P', sans-serif",
                    display: 'block',
                    lineHeight: '1.2',
                    textDecoration: 'none'
                  }}
                />
              </a>
            </li>
          ))}
        </ul>
        <div
          className={`effect filter${isAnimating ? ' active' : ''}`}
          style={effectStyle}
        >
          <div className="effect text">
            <Shuffle
              key={`effect-${items[activeIndex]?.label}-${navKey}`}
              text={items[activeIndex]?.label || items[0]?.label || ''}
              shuffleDirection="right"
              duration={0.25}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power2.out"
              stagger={0.01}
              threshold={0}
              triggerOnce={true}
              triggerOnHover={false}
              respectReducedMotion={false}
              rootMargin="0px"
              style={{ 
                fontSize: '0.7rem',
                fontWeight: '700',
                color: 'inherit',
                fontFamily: "'Press Start 2P', sans-serif",
                display: 'block',
                lineHeight: '1.2'
              }}
            />
          </div>
          {particles.map(particle => (
            <span
              key={particle.id}
              className="particle"
              style={{
                '--start-x': `${particle.startX}px`,
                '--start-y': `${particle.startY}px`,
                '--end-x': `${particle.endX}px`,
                '--end-y': `${particle.endY}px`,
                '--rotate': `${particle.rotate}deg`,
                '--scale': particle.scale,
                '--time': `${particle.duration}s`,
                '--color': particle.color
              }}
            >
              <span className="point" />
            </span>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default GooeyNav;