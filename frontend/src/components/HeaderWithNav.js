// components/HeaderWithNav.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shuffle from './Shuffle';
import GooeyNav from './GooeyNav';
import FloatingLinesDropdown from './FloatingLinesDropdown';

// Иконки (такие же как были в MainLayout)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z" fill="currentColor" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 18h12l-1.3-2.2a6.8 6.8 0 0 1-.9-3.4V11a4.8 4.8 0 0 0-9.6 0v1.4a6.8 6.8 0 0 1-.9 3.4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);

const IconMessage = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8A2.5 2.5 0 0 1 18.5 17H7l-4 3V6.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="m6 8 6 4 6-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

const IconUserCircle = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="12" cy="9" r="3" fill="currentColor" />
    <path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5" stroke="currentColor" strokeWidth="2" fill="none" />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path 
      d="M14.08 15.59L16.67 13H7v-2h9.67l-2.59-2.59L15.5 7l5 5-5 5-1.42-1.41zM19 3a2 2 0 012 2v4h-2V5H5v14h14v-4h2v4a2 2 0 01-2 2H5a2 01-2-2h14z"
      fill="currentColor"
    />
  </svg>
);

const IconProfile = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path
      d="M4.5 21c1.4-3.1 4.3-5 7.5-5s6.1 1.9 7.5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const IconDots = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

const HeaderWithNav = ({ user, onLogout, showNav = true }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  
  const primaryNav = [
    { label: 'Home', path: '/' },
    { label: 'Feed', path: '/feed' },
    { label: 'Library', path: '/library' },
  ];
  
  const actionIcons = [
    { label: 'Upload', Icon: IconUpload, onClick: () => navigate('/upload') },
    { label: 'Notifications', Icon: IconBell },
    { label: 'Messages', Icon: IconMessage }
  ];
  
  const handleNavNavigate = (item) => {
    navigate(item.path);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = () => {
    if (onLogout) onLogout();
    setShowUserMenu(false);
    navigate('/');
  };
  
  return (
    <header className="site-header">
      <nav className="sound-nav">
        <div className="nav-left">
          <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <Shuffle
              text="MUSIC"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              style={{ 
                fontSize: '1.2rem',
                fontFamily: "'Press Start 2P', sans-serif"
              }}
            />
          </a>
          
          {showNav && (
            <GooeyNav
              items={primaryNav}
              particleCount={12}
              particleDistances={[90, 20]}
              particleR={120}
              initialActiveIndex={0}
              activeIndex={0}
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 4, 5, 6]}
              onNavigate={handleNavNavigate}
            />
          )}
        </div>

        <div className="nav-center" role="search">
          <div className="nav-search">
            <input
              type="text"
              placeholder="Search for tracks, artists, playlists, and more..."
              aria-label="Search tracks"
              className="nav-search-input"
            />
            <button type="button" aria-label="Search" className="nav-search-btn">
              <IconSearch />
            </button>
          </div>
        </div>

        <div className="nav-right">
          <button className="nav-pill" type="button" onClick={() => navigate('/upload')}>
            Upload Track
          </button>
          
          <div className="icon-group">
            {actionIcons.map(({ label, Icon, onClick }) => (
              <button
                key={label}
                className="icon-button"
                type="button"
                aria-label={label}
                onClick={onClick}
              >
                <Icon />
              </button>
            ))}
          </div>
          
          <div className="user-avatar-container" ref={userMenuRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
            >
              <div className="user-avatar-circle">
                <IconUserCircle />
              </div>
            </button>
            
            {showUserMenu && (
              <div className="user-dropdown-menu">
                <FloatingLinesDropdown
                  linesGradient={['#ff00ff', '#ff00cc', '#8456ff', '#00ccff', '#ff00ff']}
                  enabledWaves={['top', 'middle', 'bottom']}
                  lineCount={[8, 15, 22]}
                  lineDistance={[1.5, 0.8, 0.3]}
                  animationSpeed={1.5}
                  interactive={true}
                  opacity={1.0}
                  brightness={2.8}
                  showOverlay={false}
                />
                
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar">
                    <IconUserCircle />
                  </div>
                  <div className="user-dropdown-info">
                    <div className="user-dropdown-username">
                      {user?.username || 'User'}
                    </div>
                    <div className="user-dropdown-email">
                      {user?.email || 'user@example.com'}
                    </div>
                  </div>
                </div>
                
                <div className="user-dropdown-divider" />
                
                <div className="user-dropdown-items">
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/profile");
                    }}
                  >
                    <IconProfile />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                  >
                    <IconDots />
                    <span>Settings</span>
                  </button>
                  
                  <div className="user-dropdown-divider" />
                  
                  <button
                    className="user-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <IconLogout />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default HeaderWithNav;