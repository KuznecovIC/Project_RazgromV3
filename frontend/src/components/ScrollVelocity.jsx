import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'framer-motion';
import './ScrollVelocity.css';

// ✅ Улучшенная версия с ResizeObserver и requestAnimationFrame
function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // offsetWidth возвращает целое число (меньше субпиксельного "двоения")
        const w = el.offsetWidth || 0;
        setWidth((prev) => (prev !== w ? w : prev));
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);

  return width;
}

export const ScrollVelocity = ({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxClassName = 'parallax',
  scrollerClassName = 'scroller',
  parallaxStyle,
  scrollerStyle
}) => {
  function VelocityText({
    children,
    baseVelocity = velocity,
    scrollContainerRef,
    className = '',
    damping,
    stiffness,
    numCopies,
    velocityMapping,
    parallaxClassName,
    scrollerClassName,
    parallaxStyle,
    scrollerStyle
  }) {
    const baseX = useMotionValue(0);
    const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
    const { scrollY } = useScroll(scrollOptions);
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
      damping: damping ?? 50,
      stiffness: stiffness ?? 400
    });
    const velocityFactor = useTransform(
      smoothVelocity,
      velocityMapping?.input || [0, 1000],
      velocityMapping?.output || [0, 5],
      { clamp: false }
    );

    const copyRef = useRef(null);
    const copyWidth = useElementWidth(copyRef);
    
    // ✅ Состояние для отслеживания загрузки шрифтов
    const [fontsReady, setFontsReady] = useState(false);
    
    // ✅ Ref для актуального состояния готовности (чтобы useAnimationFrame видел свежие значения)
    const readyRef = useRef(false);

    // ✅ Эффект для ожидания загрузки шрифтов
    useEffect(() => {
      let cancelled = false;

      // если браузер поддерживает загрузку шрифтов
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          if (!cancelled) setFontsReady(true);
        });
      } else {
        // fallback для старых браузеров
        setFontsReady(true);
      }

      return () => {
        cancelled = true;
      };
    }, []);

    // ✅ Обновляем ref при изменении fontsReady или copyWidth
    useEffect(() => {
      readyRef.current = !!(fontsReady && copyWidth > 0);
    }, [fontsReady, copyWidth]);

    function wrap(min, max, v) {
      const range = max - min;
      const mod = (((v - min) % range) + range) % range;
      return mod + min;
    }

    // ✅ Округляем до целых пикселей, чтобы избежать "двоения" у пиксельных шрифтов
    const x = useTransform(baseX, (v) => {
      if (copyWidth === 0) return '0px';
      const wrapped = wrap(-copyWidth, 0, v);
      return `${Math.round(wrapped)}px`;
    });

    const directionFactor = useRef(1);
    
    // ✅ Анимация с чтением из ref (всегда актуальное значение)
    useAnimationFrame((t, delta) => {
      // ✅ Читаем из ref, а не из state (чтобы не было устаревших значений)
      if (!readyRef.current) return;

      let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

      if (velocityFactor.get() < 0) {
        directionFactor.current = -1;
      } else if (velocityFactor.get() > 0) {
        directionFactor.current = 1;
      }

      moveBy += directionFactor.current * moveBy * velocityFactor.get();
      baseX.set(baseX.get() + moveBy);
    });

    const isReady = fontsReady && copyWidth > 0;

    return (
      <div className={parallaxClassName} style={parallaxStyle}>
        <motion.div
          className={scrollerClassName}
          style={{
            x,
            opacity: isReady ? 1 : 0,   // ✅ пока не готово — не видно, но ширина уже меряется
            ...scrollerStyle
          }}
        >
          {/* ✅ первый span обязательно с ref (всегда рендерится для измерения ширины) */}
          <span className={className} ref={copyRef}>
            {children}
          </span>

          {/* ✅ вторую копию показываем только когда готовы */}
          {isReady && (
            <span className={className}>
              {children}
            </span>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <section>
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxClassName={parallaxClassName}
          scrollerClassName={scrollerClassName}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
        >
          {text}&nbsp;
        </VelocityText>
      ))}
    </section>
  );
};

export default ScrollVelocity;