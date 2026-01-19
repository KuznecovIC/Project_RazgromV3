// components/WaveformVisualizer.js
import React, { useState, useEffect } from 'react';

const WaveformVisualizer = ({ trackId, width = 800, height = 80, color = '#8456ff' }) => {
  const [waveformData, setWaveformData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWaveform = async () => {
      if (!trackId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/tracks/${trackId}/waveform/`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.waveform) {
          setWaveformData(data.waveform);
        } else {
          throw new Error('Нет данных waveform');
        }
      } catch (err) {
        console.error('Ошибка загрузки waveform:', err);
        setError(err.message);
        // Генерируем демо данные при ошибке
        setWaveformData(generateDemoWaveform(trackId));
      } finally {
        setLoading(false);
      }
    };

    loadWaveform();
  }, [trackId]);

  const generateDemoWaveform = (id) => {
    // Простая демо генерация
    const points = 120;
    const data = [];
    
    for (let i = 0; i < points; i++) {
      const base = 30 + 40 * Math.sin(i * 0.1);
      const noise = Math.random() * 20 - 10;
      data.push(Math.max(10, Math.min(100, base + noise)));
    }
    
    return data;
  };

  if (loading) {
    return (
      <div style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '4px'
      }}>
        <span style={{ color: '#999', fontSize: '12px' }}>Загрузка waveform...</span>
      </div>
    );
  }

  if (error && !waveformData) {
    return (
      <div style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,0,0,0.1)',
        borderRadius: '4px'
      }}>
        <span style={{ color: '#ff6b6b', fontSize: '12px' }}>Ошибка: {error}</span>
      </div>
    );
  }

  if (!waveformData || waveformData.length === 0) {
    return (
      <div style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ color: '#999', fontSize: '12px' }}>Нет данных waveform</span>
      </div>
    );
  }

  const numBars = waveformData.length;
  const barWidth = Math.max(1, width / numBars - 1);
  
  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      background: 'rgba(0,0,0,0.05)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        height: `${height - 10}px`,
        gap: '1px',
        padding: '0 5px'
      }}>
        {waveformData.map((value, index) => (
          <div
            key={index}
            style={{
              width: `${barWidth}px`,
              height: `${value}%`,
              background: `linear-gradient(to top, ${color}, ${color}99)`,
              borderRadius: '1px',
              transition: 'height 0.1s ease',
              opacity: 0.8 + (value / 100) * 0.2
            }}
            title={`${value.toFixed(1)}%`}
          />
        ))}
      </div>
      
      {/* Информация */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '5px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        fontSize: '10px',
        padding: '2px 5px',
        borderRadius: '3px',
        opacity: 0.7
      }}>
        {numBars} точек
      </div>
    </div>
  );
};

export default WaveformVisualizer;