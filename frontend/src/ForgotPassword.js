import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ColorBendsBackground from './ColorBendsBackground';
import './Register.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New password
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [passwordProgress, setPasswordProgress] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    hasLetter: false,
    hasNumber: false,
    hasSpecial: false
  });
  
  // ФИКС: Убрали /api из API_URL
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Таймер для кода
  useEffect(() => {
    if (step === 2 && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  // Проверяем наличие токена в URL (для прямого перехода)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      console.log('Token from URL:', token);
      setSuccessMessage('✅ Ссылка для сброса пароля получена. Пожалуйста, введите новый пароль.');
      setStep(3);
    }
  }, [location]);

  // Валидация пароля при изменении
  useEffect(() => {
    if (step === 3) {
      validatePassword(formData.password);
    }
  }, [formData.password, step]);

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
    
    if (step === 1) {
      if (!formData.email) {
        newErrors.email = 'Email обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Некорректный email';
      }
    }
    
    if (step === 2) {
      if (!formData.code) {
        newErrors.code = 'Код подтверждения обязателен';
      } else if (formData.code.length !== 6) {
        newErrors.code = 'Код должен содержать 6 цифр';
      }
    }
    
    if (step === 3) {
      if (!formData.password) {
        newErrors.password = 'Пароль обязателен';
      } else if (passwordProgress < 100) {
        newErrors.password = 'Пароль не соответствует требованиям';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Пароли не совпадают';
      }
    }
    
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'code') {
      // Только цифры, максимум 6
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue.slice(0, 6)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
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

  const handleSendCode = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const email = formData.email.toLowerCase();
      console.log('📤 Отправка запроса на сброс пароля:', email);
      console.log('📤 URL запроса:', `${API_URL}/api/auth/password-reset/request/`);
      
      const response = await fetch(`${API_URL}/api/auth/password-reset/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      console.log('📤 Статус ответа:', response.status);
      
      // Сначала читаем ответ как текст
      const responseText = await response.text();
      console.log('📤 Ответ как текст (первые 500 символов):', responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Ошибка парсинга JSON:', jsonError);
        console.error('❌ Полный ответ:', responseText);
        
        // Если это HTML (404 страница)
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('Not Found')) {
          throw new Error(`Путь не найден (404). Проверьте URL: ${API_URL}/api/auth/password-reset/request/\n\nУбедитесь что:\n1. Django сервер запущен\n2. Путь зарегистрирован в urls.py\n3. Вы перезапустили сервер после изменений`);
        }
        
        throw new Error(`Сервер вернул невалидный JSON. Статус: ${response.status}`);
      }

      console.log('📊 Ответ сервера:', data);

      if (response.ok) {
        setStep(2);
        setTimer(300); // 5 минут
        setCanResend(false);
        setSuccessMessage('✅ Код отправлен! Проверьте MailHog: http://localhost:8025');
        
        // Автоочистка сообщения
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrors({ 
          general: data.error || 'Ошибка при отправке кода. Проверьте email.' 
        });
      }
    } catch (err) {
      console.error('❌ Ошибка подключения:', err);
      setErrors({ 
        general: `Ошибка подключения: ${err.message}\n\nПроверьте:\n1. Запущен ли сервер Django (http://localhost:8000)\n2. Запущен ли MailHog (http://localhost:8025)\n3. Правильный ли API_URL (${API_URL})` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const email = formData.email.toLowerCase();
      const code = formData.code;
      console.log('🔐 Проверка кода:', code, 'для:', email);
      console.log('🔐 URL запроса:', `${API_URL}/api/auth/password-reset/verify/`);
      
      const response = await fetch(`${API_URL}/api/auth/password-reset/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code
        })
      });

      console.log('🔐 Статус ответа:', response.status);
      
      // Сначала читаем ответ как текст
      const responseText = await response.text();
      console.log('🔐 Ответ как текст:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Ошибка парсинга JSON:', jsonError);
        throw new Error('Сервер вернул невалидный JSON');
      }

      console.log('📊 Ответ сервера:', data);

      if (response.ok) {
        setStep(3);
        setSuccessMessage('✅ Код подтвержден! Установите новый пароль.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ 
          general: data.error || 'Неверный код или код истек.' 
        });
      }
    } catch (err) {
      console.error('❌ Ошибка подключения:', err);
      setErrors({ 
        general: `Ошибка подключения: ${err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const email = formData.email.toLowerCase();
      const code = formData.code;
      const password = formData.password;
      const confirmPassword = formData.confirmPassword;
      
      console.log('🔄 Сброс пароля для:', email);
      console.log('🔄 URL запроса:', `${API_URL}/api/auth/password-reset/confirm/`);
      console.log('🔄 Отправляемые данные:', {
        email: email,
        code: code,
        password: password,
        confirm_password: confirmPassword
      });
      
      const response = await fetch(`${API_URL}/api/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code,
          password: password,
          confirm_password: confirmPassword
        })
      });

      console.log('🔄 Статус ответа:', response.status);
      
      // Сначала читаем ответ как текст
      const responseText = await response.text();
      console.log('🔄 Ответ как текст:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Ошибка парсинга JSON:', jsonError);
        throw new Error('Сервер вернул невалидный JSON');
      }

      console.log('📊 Ответ сервера:', data);

      if (response.ok) {
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
              color: #2ed573;
              margin-bottom: 30px;
              animation: bounce 1s infinite;
            ">
              ✅
            </div>
            <div style="
              font-size: 2rem;
              color: white;
              font-family: 'Press Start 2P', sans-serif;
              text-align: center;
              margin-bottom: 20px;
              background: linear-gradient(45deg, #2ed573, #c084fc);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            ">
              ПАРОЛЬ ИЗМЕНЕН!
            </div>
            <div style="
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              font-family: 'Press Start 2P', sans-serif;
              text-align: center;
              max-width: 400px;
              line-height: 1.5;
            ">
              Пароль успешно изменен.<br/>
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
        
        // Перенаправление через 2 секунды
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setErrors({ 
          general: data.error || 'Ошибка при сбросе пароля.' 
        });
      }
    } catch (err) {
      console.error('❌ Ошибка подключения:', err);
      setErrors({ 
        general: `Ошибка подключения: ${err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    if (!canResend) return;
    
    setLoading(true);
    setErrors({});
    
    // Простая имитация повторной отправки
    setTimeout(() => {
      setLoading(false);
      setTimer(300);
      setCanResend(false);
      setSuccessMessage('✅ Новый код отправлен! Проверьте MailHog.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                EMAIL
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                disabled={loading}
                style={{
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.5px',
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.email ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: errors.email ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  marginTop: '8px'
                }}
              />
              {errors.email && (
                <div style={{ marginTop: '8px' }}>
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

            <button 
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '20px auto 0 auto',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: loading 
                  ? 'linear-gradient(135deg, #2a1d66, #3a2966)' 
                  : 'linear-gradient(135deg, #5a3dff, #c084fc)',
                color: loading ? 'rgba(255, 255, 255, 0.5)' : 'white',
                fontFamily: "'Press Start 2P', sans-serif",
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                minHeight: '50px',
                position: 'relative',
                overflow: 'hidden',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #c084fc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    ОТПРАВКА...
                  </span>
                </div>
              ) : (
                <span style={{ 
                  fontSize: '0.9rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  ОТПРАВИТЬ КОД
                </span>
              )}
            </button>
          </>
        );

      case 2:
        return (
          <>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                6-ЗНАЧНЫЙ КОД
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="123456"
                maxLength="6"
                disabled={loading}
                style={{
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  letterSpacing: '5px',
                  fontFamily: "'Press Start 2P', sans-serif",
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.code ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: errors.code ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  marginTop: '8px'
                }}
              />
              {errors.code && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ 
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: '#ff6b6b',
                    letterSpacing: '0.5px'
                  }}>
                    ⚠️ {errors.code}
                  </span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <span style={{ 
                fontSize: '0.7rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: timer > 0 ? '#ff6b6b' : '#2ed573',
                letterSpacing: '0.5px'
              }}>
                {timer > 0 
                  ? `Код действителен: ${formatTime(timer)}`
                  : 'Код истек'
                }
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={handleVerifyCode}
                disabled={loading || formData.code.length !== 6}
                style={{ 
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading || formData.code.length !== 6
                    ? 'linear-gradient(135deg, #2a1d66, #3a2966)' 
                    : 'linear-gradient(135deg, #5a3dff, #c084fc)',
                  color: loading || formData.code.length !== 6 ? 'rgba(255, 255, 255, 0.5)' : 'white',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: loading || formData.code.length !== 6 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '50px',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: loading || formData.code.length !== 6 ? 0.6 : 1
                }}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid #c084fc',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ 
                      fontSize: '0.9rem',
                      fontFamily: "'Press Start 2P', sans-serif",
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      position: 'relative',
                      zIndex: 2
                    }}>
                      ПРОВЕРКА...
                    </span>
                  </div>
                ) : (
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    ПОДТВЕРДИТЬ КОД
                  </span>
                )}
              </button>

              <button 
                type="button"
                onClick={handleResendCode}
                disabled={loading || !canResend}
                style={{ 
                  flex: 0.5,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading || !canResend
                    ? 'linear-gradient(135deg, #2a1d66, #3a2966)' 
                    : 'linear-gradient(135deg, #3498db, #2980b9)',
                  color: loading || !canResend ? 'rgba(255, 255, 255, 0.5)' : 'white',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: loading || !canResend ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '50px',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: loading || !canResend ? 0.6 : 1
                }}
              >
                <span style={{ 
                  fontSize: '0.8rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  ПОВТОРИТЬ
                </span>
              </button>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                НОВЫЙ ПАРОЛЬ
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.5px',
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.password ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: errors.password ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  marginTop: '8px'
                }}
              />
              
              {/* Прогресс-бар пароля */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginTop: '12px'
              }}>
                <div style={{ 
                  flex: 1,
                  height: '8px',
                  background: 'rgba(192, 132, 252, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div 
                    style={{
                      height: '100%',
                      borderRadius: '4px',
                      width: `${passwordProgress}%`,
                      backgroundColor: getPasswordStrengthColor(),
                      transition: 'width 0.3s ease, background-color 0.3s ease'
                    }}
                  />
                </div>
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    color: getPasswordStrengthColor(),
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    textShadow: '0 0 5px rgba(192, 132, 252, 0.5)'
                  }}>
                    {getPasswordStrengthText()} ({passwordProgress}%)
                  </span>
                </div>
              </div>

              {errors.password && (
                <div style={{ marginTop: '8px' }}>
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
              
              {/* Требования к паролю */}
              <div style={{ 
                marginTop: '15px',
                padding: '12px',
                background: 'rgba(192, 132, 252, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(192, 132, 252, 0.1)'
              }}>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Требования:
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: passwordRequirements.length ? '#c084fc' : 'rgba(192, 132, 252, 0.3)',
                      textShadow: passwordRequirements.length ? '0 0 3px rgba(192, 132, 252, 0.3)' : 'none'
                    }}>
                      {passwordRequirements.length ? '✅' : '◯'}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem',
                      color: passwordRequirements.length ? '#c084fc' : 'rgba(192, 132, 252, 0.5)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      textShadow: passwordRequirements.length ? '0 0 2px rgba(192, 132, 252, 0.5)' : 'none'
                    }}>
                      Минимум 8 символов
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: passwordRequirements.hasLetter ? '#c084fc' : 'rgba(192, 132, 252, 0.3)',
                      textShadow: passwordRequirements.hasLetter ? '0 0 3px rgba(192, 132, 252, 0.3)' : 'none'
                    }}>
                      {passwordRequirements.hasLetter ? '✅' : '◯'}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem',
                      color: passwordRequirements.hasLetter ? '#c084fc' : 'rgba(192, 132, 252, 0.5)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      textShadow: passwordRequirements.hasLetter ? '0 0 2px rgba(192, 132, 252, 0.5)' : 'none'
                    }}>
                      Хотя бы 1 буква (a-z, A-Z)
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: passwordRequirements.hasNumber ? '#c084fc' : 'rgba(192, 132, 252, 0.3)',
                      textShadow: passwordRequirements.hasNumber ? '0 0 3px rgba(192, 132, 252, 0.3)' : 'none'
                    }}>
                      {passwordRequirements.hasNumber ? '✅' : '◯'}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem',
                      color: passwordRequirements.hasNumber ? '#c084fc' : 'rgba(192, 132, 252, 0.5)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      textShadow: passwordRequirements.hasNumber ? '0 0 2px rgba(192, 132, 252, 0.5)' : 'none'
                    }}>
                      Хотя бы 1 цифра (0-9)
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '0.8rem',
                      color: passwordRequirements.hasSpecial ? '#c084fc' : 'rgba(192, 132, 252, 0.3)',
                      textShadow: passwordRequirements.hasSpecial ? '0 0 3px rgba(192, 132, 252, 0.3)' : 'none'
                    }}>
                      {passwordRequirements.hasSpecial ? '✅' : '◯'}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem',
                      color: passwordRequirements.hasSpecial ? '#c084fc' : 'rgba(192, 132, 252, 0.5)',
                      fontFamily: "'Press Start 2P', sans-serif",
                      textShadow: passwordRequirements.hasSpecial ? '0 0 2px rgba(192, 132, 252, 0.5)' : 'none'
                    }}>
                      Хотя бы 1 специальный символ (@$!%*?&)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                fontSize: '0.8rem',
                fontFamily: "'Press Start 2P', sans-serif",
                color: 'rgba(255, 255, 255, 0.9)',
                letterSpacing: '0.5px',
                marginBottom: '8px',
                display: 'block'
              }}>
                ПОДТВЕРДИТЕ ПАРОЛЬ
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  fontFamily: "'Press Start 2P', sans-serif",
                  letterSpacing: '0.5px',
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: errors.confirmPassword ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: errors.confirmPassword ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  marginTop: '8px'
                }}
              />
              {errors.confirmPassword && (
                <div style={{ marginTop: '8px' }}>
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

            <button 
              type="button"
              onClick={handleResetPassword}
              disabled={loading || passwordProgress < 100}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: loading || passwordProgress < 100
                  ? 'linear-gradient(135deg, #2a1d66, #3a2966)' 
                  : 'linear-gradient(135deg, #5a3dff, #c084fc)',
                color: loading || passwordProgress < 100 ? 'rgba(255, 255, 255, 0.5)' : 'white',
                fontFamily: "'Press Start 2P', sans-serif",
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: loading || passwordProgress < 100 ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                minHeight: '50px',
                position: 'relative',
                overflow: 'hidden',
                opacity: loading || passwordProgress < 100 ? 0.6 : 1
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #c084fc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ 
                    fontSize: '0.9rem',
                    fontFamily: "'Press Start 2P', sans-serif",
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    СБРОС ПАРОЛЯ...
                  </span>
                </div>
              ) : (
                <span style={{ 
                  fontSize: '0.9rem',
                  fontFamily: "'Press Start 2P', sans-serif",
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {passwordProgress < 100 
                    ? 'ЗАПОЛНИТЕ ТРЕБОВАНИЯ ПАРОЛЯ' 
                    : 'СБРОСИТЬ ПАРОЛЬ'
                  }
                </span>
              )}
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'ВОССТАНОВЛЕНИЕ ПАРОЛЯ';
      case 2: return 'ВВЕДИТЕ КОД ИЗ ПИСЬМА';
      case 3: return 'НОВЫЙ ПАРОЛЬ';
      default: return 'ВОССТАНОВЛЕНИЕ ПАРОЛЯ';
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
            letterSpacing: '0.5px',
            textAlign: 'center',
            marginLeft: '-15px'
          }}>
            {getStepTitle()}
          </h1>
          <p style={{ 
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: "'Press Start 2P', sans-serif",
            marginBottom: '30px',
            letterSpacing: '0.3px',
            textAlign: 'center',
            marginLeft: '-10px'
          }}>
            {step === 1 && 'ВВЕДИТЕ EMAIL ДЛЯ ОТПРАВКИ КОДА'}
            {step === 2 && 'ПРОВЕРЬТЕ ПОЧТУ'}
            {step === 3 && 'УСТАНОВИТЕ НОВЫЙ ПАРОЛЬ'}
          </p>
        </div>

        {/* Индикатор прогресса */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '30px',
          gap: '10px'
        }}>
          {[1, 2, 3].map((stepNum) => (
            <div
              key={stepNum}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: step >= stepNum ? '#c084fc' : 'rgba(255, 255, 255, 0.2)',
                boxShadow: step >= stepNum ? '0 0 10px rgba(192, 132, 252, 0.5)' : 'none'
              }}
            />
          ))}
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(192, 132, 252, 0.1)',
            border: '1px solid rgba(192, 132, 252, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
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

        {errors.general && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <span style={{ 
              fontSize: '0.7rem',
              fontFamily: "'Press Start 2P', sans-serif",
              color: '#ff6b6b',
              whiteSpace: 'pre-line',
              letterSpacing: '0.5px'
            }}>
              ⚠️ {errors.general}
            </span>
          </div>
        )}

        {renderStep()}

        <div style={{ 
          marginTop: '30px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '5px'
        }}>
          <span style={{ 
            fontSize: '0.8rem',
            fontFamily: "'Press Start 2P', sans-serif",
            color: 'rgba(255, 255, 255, 0.6)',
            marginRight: '10px',
            letterSpacing: '0.5px'
          }}>
            ВСПОМНИЛИ ПАРОЛЬ?
          </span>
          <button 
            onClick={() => navigate('/login')}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0'
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

      {/* Стили для анимаций */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        /* Стили для кнопок при наведении */
        button:not(:disabled) {
          position: relative;
          overflow: hidden;
        }
        
        button:not(:disabled)::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #c084fc, #5a3dff);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1;
        }
        
        button:hover:not(:disabled)::before {
          opacity: 1;
        }
        
        button:not(:disabled) span {
          position: relative;
          z-index: 2;
        }
        
        /* Стили для полей ввода */
        input:focus {
          outline: none;
          border-color: #c084fc !important;
          background: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.1);
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;