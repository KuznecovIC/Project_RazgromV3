import React from 'react';
import { useNavigate } from 'react-router-dom';
import FaultyTerminal from './FaultyTerminal';
import './AdminMenu.css';

export default function AdminMenu() {
  const navigate = useNavigate();

  return (
    <div className="admin-menu-page">
      <div className="admin-terminal-bg">
        <FaultyTerminal
          scale={1.5}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#A7EF9E"
          mouseReact
          mouseStrength={0.5}
          pageLoadAnimation
          brightness={0.6}
        />
      </div>

      <div className="admin-menu-overlay">
        <div className="admin-menu-card">
          <div className="admin-menu-header">
            <div className="admin-menu-title">ADMIN MENU</div>
            <div className="admin-menu-subtitle">moderation & tools</div>
          </div>

          <div className="admin-menu-grid">
            <button className="admin-menu-btn" onClick={() => navigate('/admin/users')}>
              Users
              <span className="admin-menu-hint">ban / roles / profile</span>
            </button>

            <button className="admin-menu-btn" onClick={() => navigate('/admin/tracks')}>
              Tracks
              <span className="admin-menu-hint">delete / status / reports</span>
            </button>

            <button className="admin-menu-btn" onClick={() => navigate('/admin/playlists')}>
              Playlists
              <span className="admin-menu-hint">visibility / delete</span>
            </button>

            <button className="admin-menu-btn" onClick={() => navigate('/admin/reports')}>
              Reports
              <span className="admin-menu-hint">complaints queue</span>
            </button>
          </div>

          <div className="admin-menu-footer">
            <button className="admin-menu-back" onClick={() => navigate('/?page=home')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}