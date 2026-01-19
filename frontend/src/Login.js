import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorBendsBackground from './ColorBendsBackground';
import './Login.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Состояния для капчи
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaScriptLoaded, setCaptchaScriptLoaded] = useState(false);
  const captchaWidgetId = useRef(null);
  const captchaContainerRef = useRef(null);
  
  // Ключи Cloudflare Turnstile
  const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || '0x4AAAAAACLl4TSRqjeGKzqP';
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const DEBUG_MODE = process.env.REACT_APP_DEBUG === 'true';

  useEffect(() => {
    // Загружаем Cloudflare Turnstile скрипт
    const loadTurnstileScript = () => {
      // Проверяем, не загружен ли уже скрипт
      if (window.turnstile) {
        console.log('✅ Cloudflare Turnstile уже загружен');
        setCaptchaScriptLoaded(true);
        return;
      }

      console.log('📥 Загрузка Cloudflare Turnstile скрипта...');
      
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Cloudflare Turnstile скрипт загружен');
        setCaptchaScriptLoaded(true);
        // Даем время для инициализации
        setTimeout(() => {
          if (window.turnstile && captchaContainerRef.current) {
            renderTurnstile();
          }
        }, 500);
      };
      
      script.onerror = () => {
        console.error('❌ Ошибка загрузки Cloudflare Turnstile скрипта');
        setCaptchaError('Не удалось загрузить проверку безопасности. Пожалуйста, обновите страницу.');
        setCaptchaScriptLoaded(false);
      };
      
      document.head.appendChild(script);
    };

    // Функция для рендеринга Turnstile
    const renderTurnstile = () => {
      if (!window.turnstile || !captchaContainerRef.current) {
        console.log('⏳ Ожидание загрузки Turnstile...');
        return;
      }

      console.log('🎨 Рендеринг Turnstile виджета...');
      
      // Очищаем контейнер перед рендерингом
      if (captchaContainerRef.current) {
        captchaContainerRef.current.innerHTML = '';
      }

      // Уничтожаем предыдущий виджет если есть
      if (captchaWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(captchaWidgetId.current);
        } catch (e) {
          console.log('Не удалось удалить предыдущий виджет:', e);
        }
      }

      // Рендерим новый виджет
      try {
        const widgetId = window.turnstile.render(captchaContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'normal',
          callback: (token) => {
            console.log('✅ Turnstile токен получен:', token.substring(0, 20) + '...');
            setCaptchaToken(token);
            setCaptchaError('');
            setCaptchaLoading(false);
          },
          'error-callback': () => {
            console.log('❌ Ошибка Turnstile');
            setCaptchaToken('');
            setCaptchaError('Ошибка проверки безопасности. Пожалуйста, попробуйте снова.');
            setCaptchaLoading(false);
          },
          'expired-callback': () => {
            console.log('⏰ Turnstile истек');
            setCaptchaToken('');
            setCaptchaError('Время проверки истекло. Пожалуйста, пройдите проверку снова.');
          }
        });
        
        captchaWidgetId.current = widgetId;
        console.log(`✅ Turnstile виджет создан с ID: ${widgetId}`);
        setCaptchaLoading(false);
        
      } catch (error) {
        console.error('❌ Ошибка при рендеринге Turnstile:', error);
        setCaptchaError('Ошибка загрузки проверки безопасности. Пожалуйста, обновите страницу.');
        setCaptchaLoading(false);
      }
    };

    // Загружаем скрипт при монтировании компонента
    loadTurnstileScript();

    // Рендерим Turnstile когда скрипт загружен
    if (captchaScriptLoaded && captchaContainerRef.current) {
      renderTurnstile();
    }

    // Очистка при размонтировании
    return () => {
      if (captchaWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(captchaWidgetId.current);
        } catch (e) {
          console.log('Ошибка при удалении Turnstile виджета:', e);
        }
      }
    };
  }, [captchaScriptLoaded, TURNSTILE_SITE_KEY]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
    if (captchaError && captchaToken) {
      setCaptchaError('');
    }
  };

  // Функция для обновления капчи
  const refreshCaptcha = () => {
    console.log('🔄 Обновление капчи...');
    
    setCaptchaToken('');
    setCaptchaError('');
    setCaptchaLoading(true);
    
    // Уничтожаем текущий виджет
    if (captchaWidgetId.current && window.turnstile) {
      try {
        window.turnstile.remove(captchaWidgetId.current);
        captchaWidgetId.current = null;
      } catch (e) {
        console.log('Не удалось удалить виджет:', e);
      }
    }
    
    // Очищаем контейнер
    if (captchaContainerRef.current) {
      captchaContainerRef.current.innerHTML = '';
    }
    
    // Перезагружаем скрипт если он не загружен
    if (!window.turnstile) {
      console.log('📥 Перезагрузка Turnstile скрипта...');
      const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      setCaptchaScriptLoaded(false);
      
      // Даем время для очистки
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('✅ Turnstile скрипт перезагружен');
          setCaptchaScriptLoaded(true);
        };
        
        script.onerror = () => {
          console.error('❌ Ошибка перезагрузки Turnstile скрипта');
          setCaptchaError('Ошибка загрузки проверки. Пожалуйста, перезагрузите страницу.');
          setCaptchaLoading(false);
        };
        
        document.head.appendChild(script);
      }, 100);
    } else {
      // Если скрипт уже загружен, просто рендерим заново
      setTimeout(() => {
        if (captchaContainerRef.current) {
          try {
            const widgetId = window.turnstile.render(captchaContainerRef.current, {
              sitekey: TURNSTILE_SITE_KEY,
              theme: 'dark',
              size: 'normal',
              callback: (token) => {
                console.log('✅ Turnstile токен получен после обновления:', token.substring(0, 20) + '...');
                setCaptchaToken(token);
                setCaptchaError('');
                setCaptchaLoading(false);
              },
              'error-callback': () => {
                setCaptchaToken('');
                setCaptchaError('Ошибка проверки безопасности. Пожалуйста, попробуйте снова.');
                setCaptchaLoading(false);
              }
            });
            
            captchaWidgetId.current = widgetId;
            setCaptchaLoading(false);
            
          } catch (error) {
            console.error('❌ Ошибка при перерендеринге Turnstile:', error);
            setCaptchaError('Ошибка обновления проверки. Пожалуйста, перезагрузите страницу.');
            setCaptchaLoading(false);
          }
        }
      }, 300);
    }
    
    // Показываем сообщение об успехе
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #3498db, #2980b9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-family: 'Press Start 2P', sans-serif;
        font-size: 0.7rem;
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-in 2s forwards;
      ">
        🔄 Проверка обновлена!
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(message.firstChild);
    
    setTimeout(() => {
      if (message.firstChild && document.body.contains(message.firstChild)) {
        document.body.removeChild(message.firstChild);
      }
      if (style && document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (!formData.email || !formData.password) {
      setError('Email и пароль обязательны');
      return;
    }
    
    // Проверка капчи (только если не режим разработки)
    if (!DEBUG_MODE && !captchaToken) {
      setCaptchaError('Пожалуйста, пройдите проверку "Я не робот"');
      return;
    }
    
    setError('');
    setCaptchaError('');
    setLoading(true);

    try {
      console.log('📤 Отправка входа:', {
        email: formData.email.toLowerCase(),
        captcha_token_length: captchaToken.length
      });
      
      // Используем dev_token в режиме разработки или реальный токен
      const captchaToSend = DEBUG_MODE && !captchaToken ? 'dev_token' : captchaToken;
      
      const response = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          remember_me: formData.rememberMe,
          captcha_token: captchaToSend
        })
      });

      console.log('📥 Статус ответа (логин):', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('📊 Ответ сервера (логин):', data);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (data.success) {
        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильное сохранение JWT токенов
        if (data.tokens) {
          // Сохраняем access токен для авторизации API запросов
          localStorage.setItem('access', data.tokens.access);
          console.log('✅ Access токен сохранен в localStorage:', 
            data.tokens.access.substring(0, 20) + '...');
          
          // Сохраняем refresh токен если есть
          if (data.tokens.refresh) {
            localStorage.setItem('refresh', data.tokens.refresh);
            console.log('✅ Refresh токен сохранен в localStorage');
          }
        } else {
          console.warn('⚠️ Сервер не вернул JWT токены в ответе');
        }
        
        // Сохраняем информацию о пользователе
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('✅ Информация о пользователе сохранена');
        }
        
        // Вызываем колбэк если есть
        if (onLogin) {
          // Передаем пользователя и токены в App.js
          onLogin(data.user, {
            access: data.tokens?.access,
            refresh: data.tokens?.refresh
          });
        }
        
        // Показываем анимацию успеха
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
              👋
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
              Вход выполнен успешно.<br/>
              Перенаправляем на главную страницу...
            </div>
          </div>
        `;
        
        // Добавляем стили анимации
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
        
        // Перенаправление через 2 секунды
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Обработка ошибок
        console.error('❌ Ошибка входа:', data.error);
        
        if (data.error && (data.error.includes('капч') || data.error.includes('безопасност') || data.error.includes('Turnstile'))) {
          setCaptchaError(`${data.error} Нажмите "Обновить проверку" и попробуйте снова.`);
          setCaptchaToken('');
          refreshCaptcha(); // Автоматически обновляем капчу при ошибке
        } else {
          setError(data.error || 'Ошибка входа');
        }
      }
    } catch (err) {
      console.error('❌ Ошибка подключения к серверу:', err);
      setError(`Ошибка подключения: ${err.message}\n\nПроверьте:\n1. Запущен ли сервер Django\n2. Правильный ли API_URL (${API_URL})`);
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    navigate('/register');
  };

  const goToForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="login-container">
      <ColorBendsBackground preset="login" />
      
      <div className="login-card">
        <div className="login-header">
          <h1 style={{ 
            fontSize: '2rem',
            fontFamily: "'Press Start 2P', sans-serif",
            color: '#c084fc',
            textShadow: '0 0 15px rgba(192, 132, 252, 0.7)',
            marginBottom: '10px',
            letterSpacing: '1px'
          }}>
            SOUNDCLOUD
          </h1>
          <p style={{ 
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '30px',
            letterSpacing: '0.5px'
          }}>
            ВХОД В АККАУНТ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
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
              style={{
                fontFamily: "'Press Start 2P', sans-serif",
                letterSpacing: '0.5px'
              }}
            />
          </div>

          <div className="form-options" style={{ justifyContent: 'space-between' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={loading}
              />
              <span style={{ 
                fontSize: '0.7rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.7)',
                letterSpacing: '0.5px'
              }}>
                ЗАПОМНИТЬ МЕНЯ
              </span>
            </label>
          </div>

          {/* Cloudflare Turnstile - ПРЯМАЯ ИНТЕГРАЦИЯ */}
          <div className="captcha-container">
            <div style={{ 
              fontSize: '0.7rem', 
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '10px',
              fontFamily: "'Press Start 2P', sans-serif",
              letterSpacing: '0.5px'
            }}>
              ПРОВЕРКА БЕЗОПАСНОСТИ CLOUDFLARE
            </div>
            
            {/* Контейнер для Turnstile */}
            <div 
              ref={captchaContainerRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '15px',
                minHeight: '78px',
                alignItems: 'center'
              }}
            >
              {captchaLoading && !captchaScriptLoaded ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  width: '100%'
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
              ) : null}
            </div>
            
            {/* Если Turnstile не загрузился, показываем альтернативу */}
            {!captchaScriptLoaded && !captchaLoading && (
              <div style={{
                textAlign: 'center',
                padding: '15px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px dashed rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontFamily: "'Press Start 2P', sans-serif",
                  marginBottom: '10px'
                }}>
                  Не удалось загрузить проверку безопасности
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(45deg, #3498db, #2980b9)',
                    border: 'none',
                    borderRadius: '5px',
                    color: 'white',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontSize: '0.6rem'
                  }}
                >
                  ПЕРЕЗАГРУЗИТЬ СТРАНИЦУ
                </button>
              </div>
            )}
            
            {captchaToken && (
              <div style={{
                textAlign: 'center',
                marginBottom: '10px',
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

          {error && (
            <div className="error-message">
              <span style={{ 
                fontSize: '0.7rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: '#ff6b6b',
                letterSpacing: '0.5px',
                whiteSpace: 'pre-line'
              }}>
                ⚠️ {error}
              </span>
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading || (!DEBUG_MODE && !captchaToken && captchaScriptLoaded)}
            style={{
              opacity: (loading || (!DEBUG_MODE && !captchaToken && captchaScriptLoaded)) ? 0.6 : 1,
              cursor: (loading || (!DEBUG_MODE && !captchaToken && captchaScriptLoaded)) ? 'not-allowed' : 'pointer'
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
                  ВХОД...
                </span>
              </div>
            ) : (
              <span style={{ 
                fontSize: '0.9rem',
                fontFamily: "'Press Start 2P', sans-serif",
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                {!DEBUG_MODE && !captchaToken && captchaScriptLoaded
                  ? 'ПРОЙДИТЕ ПРОВЕРКУ "Я НЕ РОБОТ"'
                  : 'ВОЙТИ'
                }
              </span>
            )}
          </button>
        </form>

        <div className="login-footer" style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0px',
          marginTop: '20px'
        }}>
          {/* "НЕТ АККАУНТА?" - в отдельной строке выше */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: '-10px' // Поднимаем ближе к кнопке
          }}>
            <span style={{ 
              fontSize: '0.8rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '0.5px',
              position: 'relative',
              top: '-15px' // Поднимаем еще выше
            }}>
              НЕТ АККАУНТА?
            </span>
          </div>
          
          {/* "ЗАРЕГИСТРИРОВАТЬСЯ" - в отдельной строке ниже */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginBottom: '5px'
          }}>
            <button 
              onClick={goToRegister}
              className="register-link"
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                position: 'relative',
                top: '0'
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
                ЗАРЕГИСТРИРОВАТЬСЯ
              </span>
            </button>
          </div>

          {/* Кнопка ЗАБЫЛИ ПАРОЛЬ? теперь под ЗАРЕГИСТРИРОВАТЬСЯ */}
          <button 
            type="button"
            onClick={goToForgotPassword}
            className="forgot-password-link"
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px',
              textDecoration: 'none',
              position: 'relative',
              marginTop: '0px'
            }}
          >
            <span style={{ 
              fontSize: '0.7rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#c084fc',
              textDecoration: 'underline',
              letterSpacing: '0.5px',
              transition: 'color 0.3s ease'
            }}>
              ЗАБЫЛИ ПАРОЛЬ?
            </span>
          </button>
        </div>
      </div>

      {/* Глобальные стили для анимаций */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default Login;