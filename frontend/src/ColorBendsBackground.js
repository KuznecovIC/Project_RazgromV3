import ColorBends from './ColorBends';
import './ColorBendsBackground.css';

const ColorBendsBackground = ({ preset = 'login' }) => {
  const presets = {
    register: {
      colors: ["#c084fc", "#8456ff", "#5a3dff", "#a855f7"],
      rotation: 25,
      speed: 0.25,
      scale: 1.4,
      frequency: 1.7,
      warpStrength: 1.2,
      mouseInfluence: 0.7,
      parallax: 0.5,
      noise: 0.06,
      transparent: true,
      autoRotate: 0.15
    },
    login: {
      colors: ["#c084fc", "#8456ff", "#5a3dff"],
      rotation: -30,
      speed: 0.15,
      scale: 1.3,
      frequency: 1.6,
      warpStrength: 1.0,
      mouseInfluence: 0.6,
      parallax: 0.4,
      noise: 0.04,
      transparent: true,
      autoRotate: -0.1
    }
  };

  return (
    <div className="color-bends-background">
      <ColorBends {...presets[preset]} />
    </div>
  );
};

export default ColorBendsBackground;