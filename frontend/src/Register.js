import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Turnstile from 'react-turnstile';
import ColorBendsBackground from './ColorBendsBackground';
import './Register.css';

// 🔥 Хук для определения страны через геолокацию (OpenStreetMap Nominatim)
const useGeolocationCountry = () => {
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [geoTried, setGeoTried] = useState(false);

  const fetchCountryFromCoords = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=5&addressdetails=1`;
    try {
      const resp = await fetch(url, {
        headers: { 
          'User-Agent': 'MusicPlatform (support@musicplatform.com)',
          'Accept-Language': 'en'
        },
      });
      if (!resp.ok) throw new Error(`Nominatim error ${resp.status}`);
      const data = await resp.json();
      const countryName = data.address?.country;
      if (!countryName) throw new Error('Country not found in Nominatim response');
      console.log('📍 Страна определена через геолокацию:', countryName);
      setCountry(countryName);
      setError(null);
    } catch (e) {
      console.warn('Не удалось получить страну через Nominatim:', e);
      setError(e);
    } finally {
      setLoading(false);
      setGeoTried(true);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('📍 Geolocation API не поддерживается браузером');
      setError(new Error('Geolocation API не поддерживается'));
      setLoading(false);
      setGeoTried(true);
      return;
    }

    console.log('📍 Запрашиваю геолокацию у пользователя...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log('📍 Координаты получены:', latitude, longitude);
        fetchCountryFromCoords(latitude, longitude);
      },
      (geoError) => {
        console.warn('📍 Geolocation отклонена/ошибка:', geoError.message);
        setError(geoError);
        setLoading(false);
        setGeoTried(true);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }, []);

  return { country, loading, error, geoTried };
};

// 🔥 Хук для определения страны через IP (fallback метод)
const useDetectCountryByIP = ({ enabled }) => {
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchCountryByIP = async () => {
      try {
        console.log('🌐 Запрашиваю страну через IP...');
        const response = await fetch('https://ipwho.is/');
        if (!response.ok) throw new Error('Failed to fetch country by IP');
        const data = await response.json();
        
        if (data && data.country) {
          console.log('🌐 Страна определена через IP:', data.country);
          setCountry(data.country);
        } else {
          throw new Error('Country not found in IP response');
        }
      } catch (err) {
        console.warn('⚠️ Не удалось определить страну по IP:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCountryByIP();
  }, [enabled]);

  return { country, loading, error };
};

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    country: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordProgress, setPasswordProgress] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '0x4AAAAAACLl4TSRqjeGKzqP';
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // 🔥 ГЕОЛОКАЦИЯ - основной метод
  const { 
    country: geoCountry, 
    loading: geoLoading, 
    error: geoError,
    geoTried 
  } = useGeolocationCountry();

  // 🔥 IP-определение - fallback метод
  const { 
    country: ipCountry, 
    loading: ipLoading, 
    error: ipError 
  } = useDetectCountryByIP({
    enabled: geoTried && !geoCountry && !geoLoading
  });

  // 🔥 Комбинированный результат
  const detectedCountry = geoCountry || ipCountry;
  const countryLoading = geoLoading || ipLoading;
  const countryError = geoError || ipError;

  useEffect(() => {
    if (detectedCountry && !formData.country) {
      console.log('✅ Устанавливаю определенную страну в форму:', detectedCountry);
      setFormData(prev => ({
        ...prev,
        country: detectedCountry
      }));
    }
  }, [detectedCountry, formData.country]);

  useEffect(() => {
    if (countryLoading) {
      console.log('🔄 Определение страны...');
    } else if (detectedCountry) {
      console.log('✅ Страна определена:', detectedCountry);
    } else if (countryError) {
      console.warn('⚠️ Не удалось определить страну:', countryError.message);
    }
  }, [countryLoading, detectedCountry, countryError]);

  useEffect(() => {
    validatePassword(formData.password);
  }, [formData.password]);

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password)
    };
    
    setPasswordRequirements(requirements);
    const progress = Object.values(requirements).filter(Boolean).length * 25;
    setPasswordProgress(progress);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    
    if (!formData.username) {
      newErrors.username = 'Имя пользователя обязательно';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Минимум 3 символа';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Только буквы, цифры и подчеркивания';
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (passwordProgress < 100) {
      newErrors.password = 'Пароль не соответствует требованиям';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (formData.country) {
      const countryTrim = formData.country.trim();
      if (countryTrim && !/^[A-Za-z\s-]+$/.test(countryTrim)) {
        newErrors.country = 'Страна может содержать только английские буквы, пробелы и дефисы';
      }
    }
    
    if (!captchaToken) {
      setCaptchaError('Пожалуйста, пройдите проверку "Я не робот"');
      newErrors.captcha = true;
    }
    
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (successMessage) setSuccessMessage('');
    if (captchaError && captchaToken) {
      setCaptchaError('');
    }
  };

  const handleCaptchaVerify = (token) => {
    console.log('✅ Turnstile токен получен:', token.substring(0, 20) + '...');
    setCaptchaToken(token);
    setCaptchaError('');
    setCaptchaLoading(false);
  };

  const handleCaptchaError = () => {
    console.log('❌ Ошибка Turnstile');
    setCaptchaToken('');
    setCaptchaError('Ошибка проверки безопасности. Пожалуйста, обновите страницу.');
    setCaptchaLoading(false);
  };

  const handleCaptchaExpire = () => {
    console.log('⏰ Turnstile истек');
    setCaptchaToken('');
    setCaptchaError('Время проверки истекло. Пожалуйста, пройдите проверку снова.');
  };

  const handleCaptchaLoad = () => {
    console.log('🔄 Turnstile загружен');
    setCaptchaLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    setCaptchaError('');
    
    try {
      console.log('📤 Отправка регистрации с токеном капчи:', {
        email: formData.email.toLowerCase(),
        username: formData.username,
        country: formData.country.trim() || detectedCountry || '',
        captcha_token_length: captchaToken.length
      });
      
      const response = await fetch(`${API_URL}/api/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          username: formData.username,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          country: formData.country.trim() || detectedCountry || '',
          captcha_token: captchaToken
        })
      });

      console.log('📥 Статус ответа:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('📊 Ответ сервера:', data);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (data.success) {
        setSuccessMessage('✅ Регистрация успешна! Перенаправляем на вход...');
        
        const successAnimation = document.createElement('div');
        successAnimation.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.5s ease-in-out;
          ">
            <div style="
              font-size: 5rem;
              color: #c084fc;
              margin-bottom: 30px;
              animation: bounce 1s infinite;
            ">
              🎉
            </div>
            <div style="
              font-size: 2rem;
              color: white;
              font-family: 'Press Start 2P', sans-serif;
              text-align: center;
              margin-bottom: 20px;
              background: linear-gradient(45deg, #c084fc, #a855f7);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            ">
              Добро пожаловать!
            </div>
            <div style="
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              font-family: 'Press Start 2P', sans-serif;
              text-align: center;
              max-width: 400px;
              line-height: 1.5;
            ">
              Регистрация успешно завершена.<br/>
              Перенаправляем на страницу входа...
            </div>
          </div>
        `;
        
        const animationStyle = document.createElement('style');
        animationStyle.textContent = `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `;
        
        document.head.appendChild(animationStyle);
        document.body.appendChild(successAnimation.firstChild);
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        console.error('❌ Ошибка регистрации:', data.error);
        
        if (data.error && (data.error.includes('капч') || data.error.includes('безопасност') || data.error.includes('Turnstile'))) {
          setCaptchaError(data.error);
          setCaptchaToken('');
        } else if (data.error && data.error.includes('парол')) {
          setErrors(prev => ({ ...prev, password: data.error }));
        } else if (data.error && data.error.includes('email')) {
          setErrors(prev => ({ ...prev, email: data.error }));
        } else if (data.error && data.error.includes('пользовател')) {
          setErrors(prev => ({ ...prev, username: data.error }));
        } else if (data.error && (data.error.includes('страна') || data.error.includes('country'))) {
          setErrors(prev => ({ ...prev, country: data.error }));
        } else {
          setErrors({ 
            general: data.error || 'Неизвестная ошибка регистрации' 
          });
        }
      }
    } catch (err) {
      console.error('❌ Ошибка подключения к серверу:', err);
      setErrors({ 
        general: `Ошибка подключения: ${err.message}\n\nПроверьте:\n1. Запущен ли сервер Django\n2. Правильный ли API_URL (${API_URL})` 
      });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  const getPasswordStrengthColor = () => {
    if (passwordProgress <= 25) return '#ff4757';
    if (passwordProgress <= 50) return '#ffa502';
    if (passwordProgress <= 75) return '#2ed573';
    return '#c084fc';
  };

  const getPasswordStrengthText = () => {
    if (passwordProgress <= 25) return 'Слабый';
    if (passwordProgress <= 50) return 'Средний';
    if (passwordProgress <= 75) return 'Хороший';
    return 'Отличный';
  };

  const getCountryPlaceholder = () => {
    if (countryLoading) {
      return 'Определение страны...';
    } else if (detectedCountry) {
      return detectedCountry;
    } else if (countryError && geoError && geoError.code === 1) {
      return 'Разрешите геолокацию для автоматического определения';
    } else if (countryError) {
      return 'Страна не определена';
    } else {
      return 'Например: United States, Germany';
    }
  };

  return (
    <div className="register-container">
      <ColorBendsBackground preset="register" />
      
      <div className="register-card">
        <div className="register-header">
          <h1 style={{ 
            fontSize: '2rem',
            fontFamily: "'Press Start 2P', sans-serif",
            color: '#c084fc',
            textShadow: '0 0 15px rgba(192, 132, 252, 0.7)',
            marginBottom: '10px',
            letterSpacing: '1px'
          }}>
            РЕГИСТРАЦИЯ
          </h1>
          <p style={{ 
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '30px',
            letterSpacing: '0.5px'
          }}>
            СОЗДАЙТЕ НОВЫЙ АККАУНТ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label 
              htmlFor="email"
              style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px'
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              disabled={loading}
              className={errors.email ? 'input-error' : ''}
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
            {errors.email && (
              <div className="error-text">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {errors.email}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label 
              htmlFor="username"
              style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px'
              }}
            >
              ИМЯ ПОЛЬЗОВАТЕЛЯ
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="username"
              required
              disabled={loading}
              className={errors.username ? 'input-error' : ''}
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
            {errors.username && (
              <div className="error-text">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {errors.username}
                </span>
              </div>
            )}
          </div>

          {/* ---------- ПОЛЕ СТРАНЫ ---------- */}
          <div className="form-group">
            <label 
              htmlFor="country"
              style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>СТРАНА</span>
              <span 
                style={{ 
                  fontSize: '0.7rem',
                  color: detectedCountry ? '#2ed573' : '#ffa502',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {countryLoading ? (
                  <>
                    <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                    <span>определение...</span>
                  </>
                ) : detectedCountry ? (
                  <>
                    <span>📍</span>
                    <span>определено</span>
                  </>
                ) : (
                  <>
                    <span>❓</span>
                    <span>не определено</span>
                  </>
                )}
              </span>
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder={getCountryPlaceholder()}
              disabled={loading || countryLoading}
              className={errors.country ? 'input-error' : ''}
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
            {errors.country && (
              <div className="error-text">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {errors.country}
                </span>
              </div>
            )}
            <div style={{ 
              fontSize: '0.65rem',
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '4px',
              fontFamily: "'Press Start 2P', sans-serif",
              letterSpacing: '0.5px'
            }}>
              {detectedCountry 
                ? `Автоматически определено: ${detectedCountry}. Вы можете изменить.` 
                : 'Страна может содержать только английские буквы, пробелы и дефисы'}
            </div>
          </div>

          <div className="form-group">
            <label 
              htmlFor="password"
              style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px'
              }}
            >
              ПАРОЛЬ
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              className={errors.password ? 'input-error' : ''}
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
            
            <div className="password-strength-container">
              <div className="password-strength-bar">
                <div 
                  className="password-strength-progress"
                  style={{
                    width: `${passwordProgress}%`,
                    backgroundColor: getPasswordStrengthColor(),
                    transition: 'width 0.3s ease, background-color 0.3s ease'
                  }}
                />
              </div>
              <div className="password-strength-text">
                <span style={{
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: getPasswordStrengthColor(),
                  fontWeight: 'bold',
                  letterSpacing: '0.5px'
                }}>
                  {getPasswordStrengthText()} ({passwordProgress}%)
                </span>
              </div>
            </div>

            <div className="password-requirements">
              <div className="requirement-item">
                <span className={`requirement-icon ${passwordRequirements.length ? 'requirement-met' : ''}`}>
                  {passwordRequirements.length ? '✅' : '◯'}
                </span>
                <span className={`requirement-text ${passwordRequirements.length ? 'requirement-met' : ''}`}>
                  Минимум 8 символов
                </span>
              </div>
              <div className="requirement-item">
                <span className={`requirement-icon ${passwordRequirements.hasLetter ? 'requirement-met' : ''}`}>
                  {passwordRequirements.hasLetter ? '✅' : '◯'}
                </span>
                <span className={`requirement-text ${passwordRequirements.hasLetter ? 'requirement-met' : ''}`}>
                  Хотя бы 1 буква (a-z, A-Z)
                </span>
              </div>
              <div className="requirement-item">
                <span className={`requirement-icon ${passwordRequirements.hasNumber ? 'requirement-met' : ''}`}>
                  {passwordRequirements.hasNumber ? '✅' : '◯'}
                </span>
                <span className={`requirement-text ${passwordRequirements.hasNumber ? 'requirement-met' : ''}`}>
                  Хотя бы 1 цифра (0-9)
                </span>
              </div>
              <div className="requirement-item">
                <span className={`requirement-icon ${passwordRequirements.hasSpecial ? 'requirement-met' : ''}`}>
                  {passwordRequirements.hasSpecial ? '✅' : '◯'}
                </span>
                <span className={`requirement-text ${passwordRequirements.hasSpecial ? 'requirement-met' : ''}`}>
                  Хотя бы 1 специальный символ (@$!%*?&)
                </span>
              </div>
            </div>

            {errors.password && (
              <div className="error-text">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {errors.password}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label 
              htmlFor="confirmPassword"
              style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px'
              }}
            >
              ПОДТВЕРДИТЕ ПАРОЛЬ
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              className={errors.confirmPassword ? 'input-error' : ''}
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
            {errors.confirmPassword && (
              <div className="error-text">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {errors.confirmPassword}
                </span>
              </div>
            )}
          </div>

          <div className="captcha-container">
            <div style={{ 
              fontSize: '0.7rem', 
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '10px',
              fontFamily: "'Press Start 2P', sans-serif",
              letterSpacing: '0.5px'
            }}>
              ПРОВЕРКА БЕЗОПАСНОСТИ
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '10px'
            }}>
              {captchaLoading ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 10px' }}></div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontFamily: "'Press Start 2P', sans-serif"
                  }}>
                    Загрузка проверки...
                  </div>
                </div>
              ) : (
                <Turnstile
                  sitekey={TURNSTILE_SITE_KEY}
                  onVerify={handleCaptchaVerify}
                  onError={handleCaptchaError}
                  onExpire={handleCaptchaExpire}
                  onLoad={handleCaptchaLoad}
                  theme="dark"
                  size="normal"
                  retry="auto"
                  retryInterval={3000}
                  appearance="always"
                  style={{
                    transform: 'scale(0.9)'
                  }}
                />
              )}
            </div>
            
            {captchaToken && (
              <div style={{
                textAlign: 'center',
                marginTop: '10px',
                padding: '8px',
                background: 'rgba(46, 213, 115, 0.1)',
                border: '1px solid rgba(46, 213, 115, 0.3)',
                borderRadius: '5px'
              }}>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#2ed573',
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.5px'
                }}>
                  ✅ Проверка пройдена
                </span>
              </div>
            )}
            
            {captchaError && (
              <div className="error-text captcha-error">
                <span style={{ 
                  fontSize: '0.7rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  color: '#ff6b6b',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ {captchaError}
                </span>
              </div>
            )}
            
            <div style={{
              fontSize: '0.6rem',
              color: 'rgba(255, 255, 255, 0.4)',
              textAlign: 'center',
              marginTop: '10px',
              fontFamily: "'Press Start 2P', sans-serif",
              letterSpacing: '0.5px'
            }}>
              Cloudflare Turnstile • Защита от ботов
            </div>
          </div>

          {errors.general && (
            <div className="error-message">
              <span style={{ 
                fontSize: '0.7rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: '#ff6b6b',
                letterSpacing: '0.5px',
                whiteSpace: 'pre-line'
              }}>
                ⚠️ {errors.general}
              </span>
            </div>
          )}

          {successMessage && (
            <div className="success-message">
              <span style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: '#c084fc',
                letterSpacing: '0.5px'
              }}>
                ✅ {successMessage}
              </span>
            </div>
          )}

          <button 
            type="submit" 
            className="register-button"
            disabled={loading || passwordProgress < 100 || !captchaToken}
            style={{
              opacity: (loading || passwordProgress < 100 || !captchaToken) ? 0.6 : 1,
              cursor: (loading || passwordProgress < 100 || !captchaToken) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span className="loading-spinner"></span>
                <span style={{ 
                  fontSize: '0.9rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontWeight: '700',
                  letterSpacing: '0.5px'
                }}>
                  РЕГИСТРАЦИЯ...
                </span>
              </div>
            ) : (
              <span style={{ 
                fontSize: '0.9rem',
                fontFamily: "'Press Start 2P', sans-serif",
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                {passwordProgress < 100 
                  ? 'ЗАПОЛНИТЕ ТРЕБОВАНИЯ ПАРОЛЯ' 
                  : !captchaToken
                    ? 'ПРОЙДИТЕ ПРОВЕРКУ "Я НЕ РОБОТ"'
                    : 'ЗАРЕГИСТРИРОВАТЬСЯ'
                }
              </span>
            )}
          </button>
        </form>

        <div className="register-footer">
          <span style={{ 
            fontSize: '0.8rem',
            fontFamily: "'Press Start 2P', sans-serif",
            color: 'rgba(255, 255, 255, 0.6)',
            marginRight: '10px',
            letterSpacing: '0.5px'
          }}>
            УЖЕ ЕСТЬ АККАУНТ?
          </span>
          <button 
            onClick={goToLogin}
            className="login-link"
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px'
            }}
          >
            <span style={{ 
              fontSize: '0.8rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#c084fc',
              textDecoration: 'underline',
              letterSpacing: '0.5px',
              transition: 'color 0.3s ease'
            }}>
              ВОЙТИ
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;