import React, { useRef, useEffect, useCallback } from 'react';
import './FloatingLinesDropdown.css';

const FloatingLinesDropdown = ({
  linesGradient = ['#ff9ffc', '#8456ff', '#4facfe'],
  enabledWaves = ['top', 'middle', 'bottom'],
  lineCount = [6, 12, 18], // Увеличил количество линий
  lineDistance = [4, 3, 2],
  animationSpeed = 1.2, // Увеличил скорость
  interactive = true,
  opacity = 0.9, // Увеличил непрозрачность
  brightness = 1.5, // Добавил яркость
  className = '',
  style = {},
  showOverlay = true
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const hexToRgb = useCallback((hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 159, b: 252 };
  }, []);

  const getGradientColor = useCallback((progress, alpha = 1) => {
    if (!linesGradient || linesGradient.length === 0) {
      return { r: 255, g: 159, b: 252, a: alpha };
    }
    
    if (linesGradient.length === 1) {
      const color = hexToRgb(linesGradient[0]);
      return { ...color, a: alpha };
    }
    
    const scaledProgress = progress * (linesGradient.length - 1);
    const index1 = Math.floor(scaledProgress);
    const index2 = Math.min(index1 + 1, linesGradient.length - 1);
    const localProgress = scaledProgress - index1;
    
    const color1 = hexToRgb(linesGradient[index1]);
    const color2 = hexToRgb(linesGradient[index2]);
    
    return {
      r: color1.r + (color2.r - color1.r) * localProgress,
      g: color1.g + (color2.g - color1.g) * localProgress,
      b: color1.b + (color2.b - color1.b) * localProgress,
      a: alpha
    };
  }, [linesGradient, hexToRgb]);

  const drawGlowingLine = useCallback((ctx, x1, y1, x2, y2, color, width) => {
    // Основная линия
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Свечение
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a * 0.3})`;
    ctx.lineWidth = width * 3;
    ctx.stroke();
  }, []);

  const animate = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(dpr, dpr);
    
    // Очистка с темным фоном
    ctx.clearRect(0, 0, width, height);
    
    // Темный градиентный фон для контраста
    const bgGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    bgGradient.addColorStop(0, 'rgba(15, 15, 30, 0.8)');
    bgGradient.addColorStop(1, 'rgba(5, 5, 15, 0.95)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    timeRef.current = timestamp * 0.001 * animationSpeed;
    
    // ЯРКИЕ ВОЛНЫ
    enabledWaves.forEach((waveType, waveIndex) => {
      const count = Array.isArray(lineCount) ? lineCount[waveIndex] || 8 : lineCount;
      const distance = Array.isArray(lineDistance) ? lineDistance[waveIndex] || 3 : lineDistance;
      
      for (let i = 0; i < count; i++) {
        const progress = i / Math.max(count - 1, 1);
        const alpha = 0.4 + progress * 0.4; // Более яркие прозрачности
        const color = getGradientColor(progress, alpha);
        const lineWidth = 1.2 + progress * 1.5; // Толще линии
        
        ctx.beginPath();
        
        // Разные типы волн для разнообразия
        let amplitude, frequency, speed, yOffset;
        switch(waveType) {
          case 'top':
            amplitude = height * 0.04;
            frequency = 0.02;
            speed = 0.0008;
            yOffset = height * 0.2 + i * distance * 5;
            break;
          case 'middle':
            amplitude = height * 0.05;
            frequency = 0.015;
            speed = 0.001;
            yOffset = height * 0.5 + i * distance * 4;
            break;
          case 'bottom':
            amplitude = height * 0.06;
            frequency = 0.025;
            speed = 0.0007;
            yOffset = height * 0.8 + i * distance * 3;
            break;
          default:
            amplitude = height * 0.04;
            frequency = 0.02;
            speed = 0.0006;
            yOffset = height * 0.5 + i * distance * 4;
        }
        
        // Создаем сложную волну
        for (let x = 0; x <= width; x += 3) {
          const wave1 = Math.sin(x * frequency + timeRef.current * speed + i * 0.3) * amplitude;
          const wave2 = Math.cos(x * frequency * 0.7 + timeRef.current * speed * 1.5 + i) * amplitude * 0.5;
          const wave3 = Math.sin(x * frequency * 0.3 + timeRef.current * speed * 0.8 + i * 2) * amplitude * 0.3;
          
          let y = yOffset + wave1 + wave2 + wave3;
          
          // Интерактивность - эффект от мыши
          if (interactive && mousePosRef.current.x > 0 && mousePosRef.current.y > 0) {
            const dx = x - mousePosRef.current.x;
            const dy = y - mousePosRef.current.y;
            const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.exp(-distanceToMouse / 80) * 30;
            y += Math.sin(timeRef.current * 2 + x * 0.05) * influence;
          }
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        // ЯРКАЯ линия с свечением
        ctx.strokeStyle = `rgba(${Math.round(color.r * brightness)}, ${Math.round(color.g * brightness)}, ${Math.round(color.b * brightness)}, ${color.a})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.7)`;
        ctx.stroke();
        
        // Сбрасываем тень для следующих линий
        ctx.shadowBlur = 0;
        
        // Добавляем точки/круги на волне
        if (i % 2 === 0) {
          const pointX = width * 0.5 + Math.sin(timeRef.current * 0.5 + i) * width * 0.4;
          const pointY = yOffset + 
            Math.sin(pointX * frequency + timeRef.current * speed + i * 0.3) * amplitude;
          
          // ЯРКАЯ точка
          ctx.beginPath();
          ctx.fillStyle = `rgba(${Math.round(color.r * 1.5)}, ${Math.round(color.g * 1.5)}, ${Math.round(color.b * 1.5)}, 0.8)`;
          ctx.arc(pointX, pointY, 1.5 + progress, 0, Math.PI * 2);
          ctx.shadowBlur = 20;
          ctx.shadowColor = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.9)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
    
    // ЯРКИЕ ПАРТИКУЛЫ
    for (let i = 0; i < 15; i++) {
      const progress = (Math.sin(timeRef.current * 0.3 + i) + 1) / 2;
      const color = getGradientColor(progress, 0.7);
      const x = (Math.sin(timeRef.current * 0.4 + i * 0.5) * 0.5 + 0.5) * width;
      const y = (Math.cos(timeRef.current * 0.3 + i * 0.7) * 0.5 + 0.5) * height;
      const size = 0.8 + Math.sin(timeRef.current * 2 + i) * 0.5;
      
      // Партикулы с свечением
      ctx.beginPath();
      ctx.fillStyle = `rgba(${Math.round(color.r * 1.8)}, ${Math.round(color.g * 1.8)}, ${Math.round(color.b * 1.8)}, 0.6)`;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.shadowBlur = 25;
      ctx.shadowColor = `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, 0.8)`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Маленькие партикулы вокруг
      for (let j = 0; j < 3; j++) {
        const angle = timeRef.current * 0.5 + i + j;
        const px = x + Math.cos(angle) * size * 2;
        const py = y + Math.sin(angle) * size * 2;
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(${Math.round(color.r * 1.5)}, ${Math.round(color.g * 1.5)}, ${Math.round(color.b * 1.5)}, 0.4)`;
        ctx.arc(px, py, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // ПУЛЬСИРУЮЩЕЕ СВЕЧЕНИЕ ПО ЦЕНТРУ
    const pulse = Math.sin(timeRef.current * 0.5) * 0.3 + 0.7;
    const centerGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.min(width, height) * 0.4
    );
    centerGradient.addColorStop(0, `rgba(255, 159, 252, ${0.1 * pulse})`);
    centerGradient.addColorStop(1, 'rgba(132, 86, 255, 0)');
    
    ctx.beginPath();
    ctx.fillStyle = centerGradient;
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enabledWaves, lineCount, lineDistance, animationSpeed, interactive, getGradientColor, brightness]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mousePosRef.current = { x: -1000, y: -1000 };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Добавляем обработчики мыши
    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (interactive && canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [animate, interactive, handleMouseMove, handleMouseLeave]);

  return (
    <div 
      className={`floating-lines-dropdown ${className}`} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: opacity,
          filter: `brightness(${brightness}) contrast(1.3) blur(0.5px)`
        }}
      />
      {showOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(20, 20, 35, 0.4)', // Более прозрачный оверлей
          backdropFilter: 'blur(1px)',
          borderRadius: 'inherit',
          mixBlendMode: 'multiply'
        }} />
      )}
    </div>
  );
};

export default FloatingLinesDropdown;