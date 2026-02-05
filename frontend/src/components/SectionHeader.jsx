import React from 'react';
import Shuffle from './Shuffle';

const SectionHeader = ({ title, subtitle, isShuffleText = false }) => {
  return (
    <div className="section-header-soundcloud">
      <div className="section-title-row">
        <div className="section-title-wrapper">
          <div className="section-title">
            <Shuffle
              text={title}
              shuffleDirection="right"
              duration={0.4}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
              style={{ 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: 'white',
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
          </div>
          {isShuffleText ? (
            <div className="section-subtitle-shuffle">
              <Shuffle
                text={subtitle}
                shuffleDirection="right"
                duration={0.4}
                animationMode="evenodd"
                shuffleTimes={1}
                ease="power3.out"
                stagger={0.02}
                threshold={0.1}
                triggerOnce={true}
                triggerOnHover={true}
                respectReducedMotion={true}
                style={{ 
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.3px'
                }}
              />
            </div>
          ) : subtitle ? (
            <p className="section-subtitle">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;