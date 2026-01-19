import os
import json
import logging
import secrets
import hashlib
import uuid
import mimetypes
import requests
from datetime import datetime, timedelta
from functools import wraps
from collections import defaultdict
from .audio_utils import determine_duration_from_file, format_duration

# Django imports
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, transaction, OperationalError
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import strip_tags
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, F, Sum, Case, When, Value, IntegerField
from django.db.models.functions import TruncDate
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.views.decorators.clickjacking import xframe_options_exempt

# DRF и JWT imports
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

import re 

# Настройка логгера
logger = logging.getLogger(__name__)

# ==================== ИМПОРТЫ МОДЕЛЕЙ ====================

# Инициализируем флаги
HAS_USER_SESSION = False
HAS_TRACK = False
HAS_USER_TRACK_INTERACTION = False
HAS_PASSWORD_RESET_TOKEN = False
HAS_LISTENING_HISTORY = False
HAS_TRACK_COMMENT = False
HAS_FOLLOW = False
HAS_TRACK_REPOST = False
HAS_HASHTAG = False
HAS_DAILY_STATS = False
HAS_TRACK_LIKE = False
HAS_PLAY_HISTORY = False
HAS_NOTIFICATION = False
HAS_PLAYLIST = False
HAS_PLAYLIST_TRACK = False
HAS_COMMENT = False
HAS_COMMENT_LIKE = False

try:
    # Основные модели пользователей
    from .models import CustomUser
    
    # Если модель Track существует, импортируем ее
    try:
        from .models import Track
        HAS_TRACK = True
    except ImportError:
        pass
    
    # Если модель TrackLike существует, импортируем ее
    try:
        from .models import TrackLike
        HAS_TRACK_LIKE = True
    except ImportError:
        pass
    
    # Если модель UserTrackInteraction существует, импортируем ее
    try:
        from .models import UserTrackInteraction
        HAS_USER_TRACK_INTERACTION = True
    except ImportError:
        pass
    
    # Если модель PasswordResetToken существует, импортируем ее
    try:
        from .models import PasswordResetToken
        HAS_PASSWORD_RESET_TOKEN = True
    except ImportError:
        pass
    
    # Если модель Follow существует, импортируем ее
    try:
        from .models import Follow
        HAS_FOLLOW = True
    except ImportError:
        pass
    
    # Если модель TrackRepost существует, импортируем ее
    try:
        from .models import TrackRepost
        HAS_TRACK_REPOST = True
    except ImportError:
        pass
    
    # Если модель Hashtag существует, импортируем ее
    try:
        from .models import Hashtag
        HAS_HASHTAG = True
    except ImportError:
        pass
    
    # Если модель PlayHistory существует, импортируем ее
    try:
        from .models import PlayHistory
        HAS_PLAY_HISTORY = True
    except ImportError:
        pass
    
    # Если модель Comment существует, импортируем ее
    try:
        from .models import Comment
        HAS_COMMENT = True
    except ImportError:
        pass
    
    # Если модель TrackComment существует, импортируем ее
    try:
        from .models import TrackComment
        HAS_TRACK_COMMENT = True
    except ImportError:
        pass
    
except Exception as e:
    import traceback
    traceback.print_exc()

# ==================== EMAIL SETTINGS FOR MAILHOG ====================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = 'noreply@musicplatform.dev'

# ==================== TURNSTILE HELPER ====================

def verify_turnstile_token(token, remote_ip=None):
    """
    Проверка токена Cloudflare Turnstile
    """
    if os.getenv('DEBUG', 'True') == 'True' or settings.DEBUG:
        return True
    
    secret_key = os.getenv('TURNSTILE_SECRET_KEY')
    
    if not secret_key:
        return False
    
    if not token or token == 'dev_token':
        return False
    
    try:
        data = {
            'secret': secret_key,
            'response': token
        }
        
        if remote_ip:
            data['remoteip'] = remote_ip
        
        response = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data=data,
            timeout=10
        )
        
        result = response.json()
        
        return result.get('success', False)
        
    except requests.exceptions.RequestException:
        return False
    except Exception:
        return False


@require_POST
def verify_turnstile_endpoint(request):
    """
    Endpoint для проверки Turnstile токена с фронтенда
    """
    try:
        data = json.loads(request.body)
        token = data.get('token')
        remote_ip = request.META.get('REMOTE_ADDR')
        
        is_valid = verify_turnstile_token(token, remote_ip)
        
        if is_valid:
            return JsonResponse({
                'success': True,
                'message': 'Капча пройдена успешно',
                'timestamp': timezone.now().isoformat()
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Не удалось проверить капчу',
                'message': 'Пожалуйста, обновите страницу и попробуйте снова'
            }, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Некорректный JSON в запросе'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== PASSWORD RESET HELPERS ====================

def generate_reset_token():
    """Генерация уникального токена для сброса пароля"""
    return secrets.token_urlsafe(32)

def send_password_reset_code_email(email, code):
    """Отправка кода подтверждения для сброса пароля через MailHog"""
    try:
        subject = f'Код сброса пароля: {code} - Music Platform'
        
        message = f"""
        Ваш код подтверждения: {code}
        
        Код действителен в течение 5 минут.
        
        Введите этот код на странице восстановления пароля.
        
        Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
        
        ---
        Music Platform
        http://localhost:3000
        """
        
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        
        return True
        
    except Exception:
        return False

# ==================== AUTHENTICATION VIEWS ====================

@require_POST
def register_user(request):
    """Регистрация нового пользователя"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        captcha_token = data.get('captcha_token', '')
        
        # Валидация
        if not all([email, username, password, confirm_password]):
            return JsonResponse({
                'success': False,
                'error': 'Все поля обязательны для заполнения'
            }, status=400)
        
        if password != confirm_password:
            return JsonResponse({
                'success': False,
                'error': 'Пароли не совпадают'
            }, status=400)
        
        # Проверка сложности пароля
        if len(password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен быть не менее 8 символов'
            }, status=400)
        
        if not re.search(r'[a-zA-Z]', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы одну букву'
            }, status=400)
        
        if not re.search(r'\d', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы одну цифру'
            }, status=400)
        
        if not re.search(r'[@$!%*?&]', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы один специальный символ (@$!%*?&)'
            }, status=400)
        
        if len(username) < 3:
            return JsonResponse({
                'success': False,
                'error': 'Имя пользователя должно быть не менее 3 символов'
            }, status=400)
        
        if not '@' in email or not '.' in email.split('@')[1]:
            return JsonResponse({
                'success': False,
                'error': 'Введите корректный email'
            }, status=400)
        
        # Проверка Turnstile капчи (только в продакшене)
        if os.getenv('DEBUG', 'True') != 'True' and not settings.DEBUG:
            if not captcha_token:
                return JsonResponse({
                    'success': False,
                    'error': 'Пройдите проверку безопасности'
                }, status=400)
            
            if not verify_turnstile_token(captcha_token, request.META.get('REMOTE_ADDR')):
                return JsonResponse({
                    'success': False,
                    'error': 'Проверка безопасности не пройдена'
                }, status=400)
        
        # Проверка существования пользователя
        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Пользователь с таким email уже существует'
            }, status=400)
        
        if CustomUser.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'Пользователь с таким именем уже существует'
            }, status=400)
        
        # Создание пользователя
        user = CustomUser.objects.create_user(
            email=email,
            username=username,
            password=password
        )
        
        logger.info(f"Пользователь зарегистрирован: {username} ({email})")
        
        # Отправляем welcome email через MailHog
        try:
            subject = 'Добро пожаловать в Music Platform!'
            message = f"""
            Добро пожаловать в Music Platform, {username}!
            
            Ваш аккаунт был успешно создан.
            Email: {email}
            
            Теперь вы можете:
            - Слушать тысячи треков бесплатно
            - Сохранять понравившиеся треки
            - Создавать собственные плейлисты
            - Открывать новую музыку каждый день
            
            Начните исследовать мир музыки прямо сейчас!
            http://localhost:3000
            
            ---
            Music Platform
            С любовью к музыке ❤️
            """
            
            send_mail(
                subject=subject,
                message=message.strip(),
                from_email=DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass
        
        return JsonResponse({
            'success': True,
            'message': 'Регистрация успешна! Теперь вы можете войти.',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
        
    except IntegrityError:
        return JsonResponse({
            'success': False,
            'error': 'Пользователь с такими данными уже существует'
        }, status=400)
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Некорректный JSON в запросе'
        }, status=400)
    except Exception as e:
        logger.error(f"Ошибка при регистрации: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Ошибка сервера: {str(e)}'
        }, status=500)

@api_view(['POST'])
def login_user(request):
    """Аутентификация пользователя с JWT"""
    try:
        data = request.data  # ✅ ДОЛЖНО БЫТЬ request.data, а не json.loads!
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)
        
        if not email or not password:
            return Response({
                'success': False,
                'error': 'Email и пароль обязательны'
            }, status=400)
        
        # Аутентификация пользователя
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response({
                'success': False,
                'error': 'Неверный email или пароль'
            }, status=401)
        
        if not user.is_active:
            return Response({
                'success': False,
                'error': 'Аккаунт деактивирован'
            }, status=403)
        
        # Генерация JWT токенов
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Настройки lifetime в зависимости от remember_me
        if remember_me:
            refresh.access_token.set_exp(lifetime=timedelta(days=7))
            refresh.set_exp(lifetime=timedelta(days=30))
        
        logger.info(f"Пользователь вошел: {user.username} ({user.email})")
        
        return Response({
            'success': True,
            'message': 'Вход выполнен успешно',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': user.avatar,
                'bio': user.bio
            },
            'tokens': {
                'access': access_token,
                'refresh': str(refresh),
                'access_expires_in': 3600 * 24,
                'refresh_expires_in': 3600 * 24 * 7
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка при входе: {e}")
        return Response({
            'success': False,
            'error': f'Ошибка сервера: {str(e)}'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Выход пользователя с JWT"""
    try:
        # В случае JWT обычно токен добавляется в blacklist
        # Здесь просто возвращаем успех
        return Response({
            'success': True,
            'message': 'Выход выполнен успешно'
        })
        
    except Exception as e:
        logger.error(f"Ошибка при выходе: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Получение профиля пользователя с JWT аутентификацией"""
    try:
        user = request.user
        
        # Получаем статистику пользователя
        liked_tracks_count = 0
        playlists_count = 0
        
        if HAS_USER_TRACK_INTERACTION:
            liked_tracks_count = UserTrackInteraction.objects.filter(user=user, liked=True).count()
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': user.avatar,
                'bio': user.bio,
                'created_at': user.created_at.isoformat(),
                'email_verified': user.email_verified,
                'stats': {
                    'liked_tracks': liked_tracks_count,
                    'playlists': playlists_count,
                    'tracks_uploaded': 0
                }
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка при получении профиля: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== PASSWORD RESET VIEWS ====================

@require_POST
def password_reset_request(request):
    """Запрос на сброс пароля - отправка кода на email"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'Email обязателен'
            }, status=400)
        
        # Проверяем существование пользователя
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': True,
                'message': 'Если email существует, код отправлен'
            })
        
        # Генерируем 6-значный код
        import random
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        if HAS_PASSWORD_RESET_TOKEN:
            # Удаляем старые токены
            PasswordResetToken.objects.filter(user=user).delete()
            
            # Сохраняем код в базе данных
            expires_at = timezone.now() + timedelta(minutes=5)
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=generate_reset_token(),
                reset_code=code,
                expires_at=expires_at
            )
        
        # Отправляем email
        email_sent = send_password_reset_code_email(email, code)
        
        if email_sent:
            return JsonResponse({
                'success': True,
                'message': 'Код подтверждения отправлен на ваш email',
                'email': email,
                'expires_in': 300
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Не удалось отправить email.'
            }, status=500)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_POST
def password_reset_verify(request):
    """Проверка кода подтверждения"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            return JsonResponse({
                'success': False,
                'error': 'Email и код обязательны'
            }, status=400)
        
        # Находим пользователя
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=404)
        
        if HAS_PASSWORD_RESET_TOKEN:
            matching_tokens = PasswordResetToken.objects.filter(
                user=user,
                reset_code=code,
                is_used=False,
                expires_at__gt=timezone.now()
            )
            
            if matching_tokens.exists():
                token = matching_tokens.first()
                token.is_used = True
                token.save()
                
                return JsonResponse({
                    'success': True,
                    'message': 'Код подтвержден успешно',
                    'email': email
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Неверный код подтверждения или код истек'
                }, status=400)
        else:
            return JsonResponse({
                'success': True,
                'message': 'Код подтвержден (разработка)',
                'email': email
            })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_POST
def password_reset_confirm(request):
    """Подтверждение сброса пароля"""
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
        # Валидация
        if not all([email, password, confirm_password]):
            return JsonResponse({
                'success': False,
                'error': 'Все поля обязательны'
            }, status=400)
        
        if password != confirm_password:
            return JsonResponse({
                'success': False,
                'error': 'Пароли не совпадают'
            }, status=400)
        
        # Проверка сложности пароля
        if len(password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен быть не менее 8 символов'
            }, status=400)
        
        if not re.search(r'[a-zA-Z]', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы одну букву'
            }, status=400)
        
        if not re.search(r'\d', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы одну цифру'
            }, status=400)
        
        if not re.search(r'[@$!%*?&]', password):
            return JsonResponse({
                'success': False,
                'error': 'Пароль должен содержать хотя бы один специальный символ (@$!%*?&)'
            }, status=400)
        
        # Находим пользователя
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=404)
        
        # Проверяем код подтверждения (если модель существует)
        if HAS_PASSWORD_RESET_TOKEN and code:
            try:
                reset_token = PasswordResetToken.objects.get(
                    user=user,
                    reset_code=code,
                    is_used=True,
                    expires_at__gt=timezone.now()
                )
            except PasswordResetToken.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Неверный код подтверждения или код истек'
                }, status=400)
        
        # Обновляем пароль
        user.set_password(password)
        user.save()
        
        # Отправляем email об успешном сбросе пароля
        try:
            subject = 'Пароль успешно изменен - Music Platform'
            message = f"""
            Пароль для вашего аккаунта Music Platform был успешно изменен.
            
            Имя пользователя: {user.username}
            Email: {email}
            Дата и время: {timezone.now().strftime('%d.%m.%Y %H:%M')}
            IP адрес: {request.META.get('REMOTE_ADDR', 'неизвестно')}
            
            Если вы не меняли пароль, пожалуйста, немедленно свяжитесь с поддержкой.
            
            ---
            Music Platform
            http://localhost:3000
            """
            
            send_mail(
                subject=subject,
                message=message.strip(),
                from_email=DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass
        
        return JsonResponse({
            'success': True,
            'message': 'Пароль успешно изменен',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== BASIC SYSTEM VIEWS ====================

@require_GET
def health_check(request):
    """Проверка доступности бэкенда"""
    return JsonResponse({
        'status': 'online',
        'message': 'Music Platform API is running',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
        'mailhog': 'http://localhost:8025',
        'models_status': {
            'CustomUser': True,
            'Track': HAS_TRACK,
            'UserTrackInteraction': HAS_USER_TRACK_INTERACTION,
            'PasswordResetToken': HAS_PASSWORD_RESET_TOKEN,
            'TrackComment': HAS_TRACK_COMMENT
        }
    })

# ==================== TRACK ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request):
    """Обработка лайков/дизлайков треков с JWT аутентификацией"""
    try:
        user = request.user
        
        data = request.data  # ✅ Используем request.data
        track_id = data.get('track_id')
        liked = data.get('liked')
        
        # Валидация
        if track_id is None or liked is None:
            return Response({
                'success': False,
                'error': 'track_id и liked обязательны'
            }, status=400)
        
        try:
            track_id_int = int(track_id)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'track_id должен быть числом'
            }, status=400)
        
        liked_bool = bool(liked) if isinstance(liked, bool) else str(liked).lower() in ['true', '1', 'yes', 'y']
        
        if HAS_TRACK:
            # Получаем или создаем трек
            try:
                track = Track.objects.get(id=track_id_int)
            except Track.DoesNotExist:
                # Создаем демо-трек если не найден
                tracks_data = {
                    1: {
                        'title': 'hard drive (slowed & muffled)',
                        'artist': 'griffinilla',
                        'cover': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                        'audio_url': '/tracks/track1.mp3',
                        'duration': '3:20'
                    },
                    2: {
                        'title': 'Deutschland',
                        'artist': 'Rammstein',
                        'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'audio_url': '/tracks/track2.mp3',
                        'duration': '5:22'
                    },
                    3: {
                        'title': 'Sonne',
                        'artist': 'Rammstein',
                        'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'audio_url': '/tracks/track3.mp3',
                        'duration': '4:05'
                    }
                }
                
                if track_id_int in tracks_data:
                    upload_user = CustomUser.objects.first() if CustomUser.objects.exists() else user
                    
                    track = Track.objects.create(
                        id=track_id_int,
                        uploaded_by=upload_user,
                        **tracks_data[track_id_int]
                    )
                else:
                    return Response({
                        'success': False,
                        'error': f'Трек с ID {track_id_int} не найден'
                    }, status=404)
            
            # Обрабатываем лайк
            if HAS_TRACK_LIKE:
                if liked_bool:
                    like_obj, created = TrackLike.objects.get_or_create(
                        user=user,
                        track=track
                    )
                else:
                    TrackLike.objects.filter(user=user, track=track).delete()
                
                like_count = TrackLike.objects.filter(track=track).count()
                track.like_count = like_count
                track.save()
                
            elif HAS_USER_TRACK_INTERACTION:
                interaction, created = UserTrackInteraction.objects.get_or_create(
                    user=user,
                    track=track,
                    defaults={'liked': liked_bool}
                )
                
                if not created:
                    interaction.liked = liked_bool
                    interaction.save()
                
                like_count = UserTrackInteraction.objects.filter(track=track, liked=True).count()
                track.like_count = like_count
                track.save()
                
            else:
                if liked_bool:
                    track.like_count += 1
                else:
                    track.like_count = max(0, track.like_count - 1)
                track.save()
                
                like_count = track.like_count
            
            action = 'лайкнут' if liked_bool else 'дизлайкнут'
            
            # Проверяем, лайкнул ли пользователь
            user_has_liked = False
            if HAS_TRACK_LIKE:
                user_has_liked = TrackLike.objects.filter(user=user, track=track).exists()
            elif HAS_USER_TRACK_INTERACTION:
                try:
                    interaction = UserTrackInteraction.objects.get(user=user, track=track)
                    user_has_liked = interaction.liked
                except UserTrackInteraction.DoesNotExist:
                    user_has_liked = False
            
            return Response({
                'success': True,
                'message': f'Трек {track_id_int} успешно {action}',
                'track_id': track_id_int,
                'liked': liked_bool,
                'like_count': like_count,
                'user_has_liked': user_has_liked,
                'user': user.username,
                'timestamp': timezone.now().isoformat()
            })
        else:
            # Если модель Track не существует
            return Response({
                'success': True,
                'message': 'Лайк обработан (разработка)',
                'track_id': track_id_int,
                'liked': liked_bool,
                'like_count': 0,
                'note': 'Модель Track не доступна'
            })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Внутренняя ошибка сервера'
        }, status=500)

@require_GET
def get_track_info(request, track_id):
    """Получение информации о треке"""
    try:
        # Для JWT аутентификации используем отдельный механизм
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        user_liked = False
        
        # Пробуем найти трек в БД
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                
                # Проверяем лайк пользователя
                if user:
                    try:
                        user_liked = TrackLike.objects.filter(user=user, track=track).exists()
                    except:
                        user_liked = False
                
                # Получаем URL обложки
                cover_url = ''
                if track.cover:
                    if hasattr(track.cover, 'url'):
                        cover_url = request.build_absolute_uri(track.cover.url)
                    else:
                        cover_url = str(track.cover)
                        if cover_url.startswith('/media/'):
                            cover_url = request.build_absolute_uri(cover_url)
                        elif not cover_url.startswith('http'):
                            cover_url = request.build_absolute_uri('/media/' + cover_url)
                elif track.cover_url:
                    cover_url = track.cover_url
                    if cover_url.startswith('/media/'):
                        cover_url = request.build_absolute_uri(cover_url)
                
                if not cover_url or cover_url == '':
                    cover_url = request.build_absolute_uri('/static/default_cover.jpg')
                
                # Получаем URL аудио
                audio_url = ''
                if track.audio_file:
                    if hasattr(track.audio_file, 'url'):
                        audio_url = request.build_absolute_uri(track.audio_file.url)
                    else:
                        audio_url = str(track.audio_file)
                        if audio_url.startswith('/media/'):
                            audio_url = request.build_absolute_uri(audio_url)
                        elif not audio_url.startswith('http'):
                            audio_url = request.build_absolute_uri('/media/audio/' + audio_url)
                elif track.audio_url:
                    audio_url = track.audio_url
                    if audio_url.startswith('/media/'):
                        audio_url = request.build_absolute_uri(audio_url)
                
                # Для загруженных треков без аудио, попробуем найти по имени файла
                if not audio_url or audio_url == '':
                    import os
                    from django.conf import settings
                    
                    possible_files = [
                        f"track_{track_id}.mp3",
                        f"{track_id}.mp3",
                        f"audio_{track_id}.mp3"
                    ]
                    
                    for filename in possible_files:
                        file_path = os.path.join(settings.MEDIA_ROOT, 'audio', filename)
                        if os.path.exists(file_path):
                            audio_url = request.build_absolute_uri(f'/media/audio/{filename}')
                            break
                
                track_info = {
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist or (track.uploaded_by.username if track.uploaded_by else 'Unknown Artist'),
                    'cover': cover_url,
                    'audio_url': audio_url,
                    'duration': track.duration or '3:00',
                    'like_count': track.like_count or 0,
                    'play_count': track.play_count or 0,
                    'repost_count': track.repost_count or 0,
                    'description': track.description or f'Трек {track.title}',
                    'genre': track.genre or 'other',
                    'uploaded_by': {
                        'id': track.uploaded_by.id if track.uploaded_by else 0,
                        'username': track.uploaded_by.username if track.uploaded_by else 'Unknown'
                    },
                    'user_liked': user_liked,
                    'hashtags': [],
                    'source': 'database',
                    'debug': {
                        'cover_exists': bool(track.cover),
                        'audio_exists': bool(track.audio_file),
                        'track_id': track_id
                    }
                }
                
                logger.info(f"✅ Трек {track_id} из БД: {track.title}, аудио: {audio_url}")
                return JsonResponse(track_info)
                
            except Track.DoesNotExist:
                logger.warning(f"Трек {track_id} не найден в БД")
                pass
        
        # Демо-данные для треков 1-6
        demo_data = {
            1: {
                'id': 1,
                'title': "hard drive (slowed & muffled)",
                'artist': "griffinilla",
                'cover': request.build_absolute_uri('/static/demo_covers/1.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track1.mp3'),
                'duration': "3:20",
                'like_count': 56,
                'description': "Замедленная версия трека griffinilla",
                'genre': 'electronic',
                'uploaded_by': {'id': 1, 'username': 'griffinilla'},
                'hashtags': ["#slowed", "#lofi"],
                'source': 'demo'
            },
            2: {
                'id': 2,
                'title': "Deutschland",
                'artist': "Rammstein",
                'cover': request.build_absolute_uri('/static/demo_covers/2.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track2.mp3'),
                'duration': "5:22",
                'like_count': 34,
                'description': "Хит Rammstein",
                'genre': 'metal',
                'uploaded_by': {'id': 2, 'username': 'Rammstein'},
                'hashtags': ["#industrial", "#metal"],
                'source': 'demo'
            },
            3: {
                'id': 3,
                'title': "Sonne",
                'artist': "Rammstein",
                'cover': request.build_absolute_uri('/static/demo_covers/3.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track3.mp3'),
                'duration': "4:05",
                'like_count': 23,
                'description': "Классика Rammstein",
                'genre': 'metal',
                'uploaded_by': {'id': 2, 'username': 'Rammstein'},
                'hashtags': ["#industrial", "#rock"],
                'source': 'demo'
            },
            4: {
                'id': 4,
                'title': "Electronic Dreams",
                'artist': "Synthwave Collective",
                'cover': request.build_absolute_uri('/static/demo_covers/4.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track4.mp3'),
                'duration': "4:15",
                'like_count': 45,
                'description': "Синтвейв композиция",
                'genre': 'electronic',
                'uploaded_by': {'id': 3, 'username': 'Synthwave'},
                'hashtags': ["#synthwave", "#electronic"],
                'source': 'demo'
            },
            5: {
                'id': 5,
                'title': "Neon Lights",
                'artist': "Cyberpunk DJ",
                'cover': request.build_absolute_uri('/static/demo_covers/5.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track5.mp3'),
                'duration': "3:45",
                'like_count': 67,
                'description': "Киберпанк саунд",
                'genre': 'electronic',
                'uploaded_by': {'id': 4, 'username': 'Cyberpunk DJ'},
                'hashtags': ["#cyberpunk", "#neon"],
                'source': 'demo'
            },
            6: {
                'id': 6,
                'title': "Midnight Drive",
                'artist': "Retro Future",
                'cover': request.build_absolute_uri('/static/demo_covers/6.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track6.mp3'),
                'duration': "4:30",
                'like_count': 89,
                'description': "Ретро футуризм",
                'genre': 'electronic',
                'uploaded_by': {'id': 5, 'username': 'Retro Future'},
                'hashtags': ["#retro", "#future"],
                'source': 'demo'
            }
        }
        
        track_id_int = int(track_id) if str(track_id).isdigit() else 0
        
        if track_id_int in demo_data:
            track = demo_data[track_id_int]
            track['user_liked'] = False
            return JsonResponse(track)
        else:
            # Для треков > 6 (загруженных пользователями)
            import os
            from django.conf import settings
            
            audio_found = False
            audio_url = ''
            cover_url = ''
            
            audio_paths = [
                os.path.join(settings.MEDIA_ROOT, 'audio', f'track_{track_id}.mp3'),
                os.path.join(settings.MEDIA_ROOT, 'audio', f'{track_id}.mp3'),
                os.path.join(settings.MEDIA_ROOT, 'audio', f'audio_{track_id}.mp3'),
            ]
            
            for audio_path in audio_paths:
                if os.path.exists(audio_path):
                    filename = os.path.basename(audio_path)
                    audio_url = request.build_absolute_uri(f'/media/audio/{filename}')
                    audio_found = True
                    break
            
            cover_paths = [
                os.path.join(settings.MEDIA_ROOT, 'covers', f'cover_{track_id}.jpg'),
                os.path.join(settings.MEDIA_ROOT, 'covers', f'cover_{track_id}.png'),
                os.path.join(settings.MEDIA_ROOT, 'covers', f'{track_id}.jpg'),
                os.path.join(settings.MEDIA_ROOT, 'covers', f'{track_id}.png'),
            ]
            
            for cover_path in cover_paths:
                if os.path.exists(cover_path):
                    filename = os.path.basename(cover_path)
                    cover_url = request.build_absolute_uri(f'/media/covers/{filename}')
                    break
            
            if not cover_url:
                cover_url = request.build_absolute_uri('/static/default_cover.jpg')
            
            if audio_found:
                response_data = {
                    'id': track_id_int,
                    'title': f'Трек {track_id}',
                    'artist': 'Неизвестный артист',
                    'cover': cover_url,
                    'audio_url': audio_url,
                    'duration': '3:00',
                    'like_count': 0,
                    'play_count': 0,
                    'repost_count': 0,
                    'description': f'Загруженный трек #{track_id}',
                    'genre': 'other',
                    'uploaded_by': {'id': 0, 'username': 'User'},
                    'user_liked': False,
                    'hashtags': [],
                    'source': 'media_file',
                    'debug': {
                        'audio_found': True,
                        'audio_url': audio_url
                    }
                }
                return JsonResponse(response_data)
            else:
                return JsonResponse({
                    'error': 'Трек не найден',
                    'message': f'Трек с ID {track_id} не существует',
                    'track_id': track_id,
                    'source': 'not_found'
                }, status=404)
        
    except Exception as e:
        logger.error(f"❌ Ошибка в get_track_info: {e}")
        return JsonResponse({
            'error': str(e),
            'message': 'Ошибка при получении информации о треке'
        }, status=500)

# ==================== FOLLOW SYSTEM ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_user(request):
    """Подписаться на пользователя"""
    try:
        user = request.user
        data = request.data  # ✅ Используем request.data
        target_user_id = data.get('user_id')
        
        if not target_user_id:
            return Response({
                'success': False,
                'error': 'user_id обязателен'
            }, status=400)
        
        # Нельзя подписаться на себя
        if user.id == target_user_id:
            return Response({
                'success': False,
                'error': 'Нельзя подписаться на себя'
            }, status=400)
        
        try:
            target_user = CustomUser.objects.get(id=target_user_id)
        except CustomUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=404)
        
        if HAS_FOLLOW:
            # Проверяем, не подписаны ли уже
            if Follow.objects.filter(follower=user, following=target_user).exists():
                return Response({
                    'success': False,
                    'error': 'Вы уже подписаны на этого пользователя'
                }, status=400)
            
            # Создаем подписку
            follow = Follow.objects.create(follower=user, following=target_user)
            
            return Response({
                'success': True,
                'message': f'Вы подписались на {target_user.username}',
                'follow_id': follow.id,
                'stats': {
                    'followers': target_user.followers_count if hasattr(target_user, 'followers_count') else 0,
                    'following': user.following_count if hasattr(user, 'following_count') else 0
                }
            })
        else:
            # Если модель Follow не существует
            return Response({
                'success': True,
                'message': f'Подписка оформлена (разработка)',
                'note': 'Модель Follow не доступна'
            })
        
    except Exception as e:
        logger.error(f"Ошибка при подписке: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unfollow_user(request):
    """Отписаться от пользователя"""
    try:
        user = request.user
        data = request.data  # ✅ Используем request.data
        target_user_id = data.get('user_id')
        
        if HAS_FOLLOW:
            try:
                follow = Follow.objects.get(follower=user, following_id=target_user_id)
                follow.delete()
                
                # Обновляем статистику
                target_user = CustomUser.objects.get(id=target_user_id)
                
                return Response({
                    'success': True,
                    'message': 'Вы отписались от пользователя',
                    'stats': {
                        'followers': target_user.followers_count if hasattr(target_user, 'followers_count') else 0,
                        'following': user.following_count if hasattr(user, 'following_count') else 0
                    }
                })
                
            except Follow.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Вы не подписаны на этого пользователя'
                }, status=404)
        else:
            # Если модель Follow не существует
            return Response({
                'success': True,
                'message': 'Отписка выполнена (разработка)'
            })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_followers(request, user_id):
    """Получение списка подписчиков пользователя"""
    try:
        user = CustomUser.objects.get(id=user_id)
        
        followers = []
        if HAS_FOLLOW:
            follower_relations = Follow.objects.filter(following=user).select_related('follower')
            for follow in follower_relations:
                followers.append({
                    'id': follow.follower.id,
                    'username': follow.follower.username,
                    'avatar': follow.follower.avatar,
                    'bio': follow.follower.bio,
                    'followed_at': follow.created_at.isoformat()
                })
        
        return Response({
            'success': True,
            'followers': followers,
            'count': len(followers),
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except CustomUser.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Пользователь не найден'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_following(request, user_id):
    """Получение списка подписок пользователя"""
    try:
        user = CustomUser.objects.get(id=user_id)
        
        following = []
        if HAS_FOLLOW:
            following_relations = Follow.objects.filter(follower=user).select_related('following')
            for follow in following_relations:
                following.append({
                    'id': follow.following.id,
                    'username': follow.following.username,
                    'avatar': follow.following.avatar,
                    'bio': follow.following.bio,
                    'followed_at': follow.created_at.isoformat()
                })
        
        return Response({
            'success': True,
            'following': following,
            'count': len(following),
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except CustomUser.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Пользователь не найден'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== REPOST SYSTEM ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def repost_track(request):
    """Сделать репост трека"""
    try:
        user = request.user
        data = request.data  # ✅ Используем request.data
        track_id = data.get('track_id')
        comment = data.get('comment', '')
        
        if not track_id:
            return Response({
                'success': False,
                'error': 'track_id обязателен'
            }, status=400)
        
        if HAS_TRACK and HAS_TRACK_REPOST:
            track = Track.objects.get(id=track_id, status='published')
            
            # Проверяем, не репостил ли уже
            if TrackRepost.objects.filter(user=user, track=track).exists():
                return Response({
                    'success': False,
                    'error': 'Вы уже репостили этот трек'
                }, status=400)
            
            # Создаем репост
            repost = TrackRepost.objects.create(
                user=user,
                track=track,
                comment=comment
            )
            
            return Response({
                'success': True,
                'message': 'Трек успешно репостнут',
                'repost_id': repost.id,
                'repost_count': track.repost_count if hasattr(track, 'repost_count') else 0
            })
        else:
            # Если модели не существуют
            return Response({
                'success': True,
                'message': 'Репост выполнен (разработка)',
                'track_id': track_id,
                'note': 'Модели Track/TrackRepost не доступны'
            })
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        logger.error(f"Ошибка при репосте: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== PLAY COUNT SYSTEM ====================

@require_POST
def record_play(request):
    """Запись прослушивания трека с защитой от накрутки"""
    try:
        data = json.loads(request.body)
        track_id = data.get('track_id')
        
        if not track_id:
            return JsonResponse({
                'success': False,
                'error': 'track_id обязателен'
            }, status=400)
        
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
            except Track.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Трек не найден'
                }, status=404)
            
            # Проверка защиты от накрутки
            counted = False
            
            if user and HAS_PLAY_HISTORY:
                # Проверяем, не слушал ли пользователь этот трек сегодня
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                has_played_today = PlayHistory.objects.filter(
                    user=user,
                    track=track,
                    played_at__gte=today_start
                ).exists()
                
                if not has_played_today:
                    # Увеличиваем счетчик
                    track.play_count = (track.play_count if hasattr(track, 'play_count') else 0) + 1
                    track.save()
                    
                    # Создаем запись в истории
                    PlayHistory.objects.create(user=user, track=track)
                    
                    counted = True
            else:
                # Если нет пользователя или модели PlayHistory, все равно увеличиваем счетчик
                track.play_count = (track.play_count if hasattr(track, 'play_count') else 0) + 1
                track.save()
                counted = True
            
            return JsonResponse({
                'success': True,
                'play_count': track.play_count if hasattr(track, 'play_count') else 0,
                'counted': counted,
                'message': 'Прослушивание записано'
            })
        else:
            # Если модель Track не существует
            return JsonResponse({
                'success': True,
                'play_count': 0,
                'counted': False,
                'message': 'Запись проигнорирована (модель Track не доступна)'
            })
        
    except Exception as e:
        logger.error(f"Ошибка при записи прослушивания: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== UPLOAD TRACK SYSTEM ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_track(request):
    """Загрузка нового трека"""
    if request.method != 'POST':
        return Response({'error': 'Метод не разрешен'}, status=405)
    
    try:
        user = request.user
        logger.info(f"📤 Загрузка трека пользователем {user.username}")
        
        # Получаем данные формы
        title = request.POST.get('title', '').strip()
        artist = request.POST.get('artist', user.username)
        description = request.POST.get('description', '')
        genre = request.POST.get('genre', 'other')
        tags = request.POST.get('tags', '')
        is_explicit = request.POST.get('is_explicit', 'false') == 'true'
        is_private = request.POST.get('is_private', 'false') == 'true'
        status = request.POST.get('status', 'draft')
        hashtags = request.POST.get('hashtags', '')
        
        if not title:
            return Response({'error': 'Название трека обязательно'}, status=400)
        
        # Проверяем аудио файл
        if 'audio_file' not in request.FILES:
            return Response({'error': 'Аудио файл обязателен'}, status=400)
        
        audio_file = request.FILES['audio_file']
        
        # Проверяем размер файла (макс 50MB)
        if audio_file.size > 50 * 1024 * 1024:
            return Response({'error': 'Файл слишком большой (макс 50MB)'}, status=400)
        
        # Проверяем расширение
        allowed_extensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac']
        file_ext = os.path.splitext(audio_file.name)[1].lower()
        
        if file_ext not in allowed_extensions:
            return Response({'error': f'Неподдерживаемый формат. Разрешены: {", ".join(allowed_extensions)}'}, status=400)
        
        # Обрабатываем обложку
        cover_file = request.FILES.get('cover')
        cover_url = request.POST.get('cover_url', '')
        
        # Создаем трек (сначала без длительности)
        track = Track(
            title=title,
            artist=artist or user.username,
            description=description,
            genre=genre,
            tags=tags,
            is_explicit=is_explicit,
            is_private=is_private,
            status=status,
            uploaded_by=user,
            audio_file=audio_file,
            file_size=audio_file.size
        )
        
        # Добавляем обложку
        if cover_file:
            track.cover = cover_file
        elif cover_url:
            track.cover_url = cover_url
        
        # Сохраняем трек ПЕРЕД определением длительности
        track.save()
        
        # Определяем длительность аудио ПОСЛЕ сохранения трека
        try:
            audio_path = track.audio_file.path
            logger.info(f"🔍 Определение длительности для файла: {audio_path}")
            
            duration_sec = 0
            
            # Способ 1: Пробуем через pydub
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(audio_path)
                duration_sec = len(audio) / 1000.0
                logger.info(f"✅ Длительность определена через pydub: {duration_sec:.2f} секунд")
                
            except Exception as pydub_error:
                logger.warning(f"⚠️ pydub не удался: {pydub_error}")
                
                # Способ 2: Пробуем через librosa
                try:
                    import librosa
                    y, sr = librosa.load(audio_path, sr=None, duration=None)
                    duration_sec = librosa.get_duration(y=y, sr=sr)
                    logger.info(f"✅ Длительность определена через librosa: {duration_sec:.2f} секунд")
                    
                except Exception as librosa_error:
                    logger.warning(f"⚠️ librosa не удался: {librosa_error}")
                    
                    # Способ 3: Для WAV файлов через wave
                    if file_ext == '.wav':
                        try:
                            import wave
                            with wave.open(audio_path, 'rb') as wav_file:
                                frames = wav_file.getnframes()
                                rate = wav_file.getframerate()
                                duration_sec = frames / float(rate)
                                logger.info(f"✅ Длительность определена через wave: {duration_sec:.2f} секунд")
                        except Exception as wave_error:
                            logger.warning(f"⚠️ wave не удался: {wave_error}")
                    
                    # Способ 4: Пробуем ffprobe если установлен
                    try:
                        import subprocess
                        cmd = ['ffprobe', '-v', 'error', '-show_entries', 
                              'format=duration', '-of', 
                              'default=noprint_wrappers=1:nokey=1', audio_path]
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                        if result.returncode == 0:
                            duration_sec = float(result.stdout.strip())
                            logger.info(f"✅ Длительность определена через ffprobe: {duration_sec:.2f} секунд")
                        else:
                            logger.warning(f"⚠️ ffprobe вернул ошибку: {result.stderr}")
                    except Exception as ffprobe_error:
                        logger.warning(f"⚠️ ffprobe не удался: {ffprobe_error}")
            
            # Форматируем длительность в MM:SS
            if duration_sec and duration_sec > 0:
                minutes = int(duration_sec // 60)
                seconds = int(duration_sec % 60)
                track.duration = f"{minutes}:{seconds:02d}"
                
                # Сохраняем в секундах для удобства
                if hasattr(track, 'duration_seconds'):
                    track.duration_seconds = int(duration_sec)
                
                # Определяем технические характеристики
                track.bitrate = int(audio_file.size * 8 / duration_sec / 1000) if duration_sec > 0 else 0
                
                # Пробуем определить sample rate
                try:
                    import librosa
                    y, sr = librosa.load(audio_path, sr=None, duration=1)
                    track.sample_rate = sr
                except:
                    track.sample_rate = 44100
                
                logger.info(f"✅ Длительность определена: {track.duration} ({duration_sec:.2f} секунд)")
            else:
                logger.warning(f"⚠️ Длительность не определена или равна 0: {duration_sec}")
                track.duration = "0:00"
                track.bitrate = 0
                track.sample_rate = 0
                
        except Exception as e:
            logger.error(f"❌ Ошибка определения длительности: {e}")
            track.duration = "0:00"
            track.bitrate = 0
            track.sample_rate = 0
        
        # Сохраняем обновленный трек с длительностью
        track.save(update_fields=['duration', 'duration_seconds', 'bitrate', 'sample_rate'])
        
        # Обрабатываем хештеги если есть
        if hashtags and HAS_HASHTAG:
            tags_list = [tag.strip().replace('#', '') for tag in hashtags.split() if tag.strip()]
            for tag_name in tags_list:
                if tag_name:
                    tag, created = Hashtag.objects.get_or_create(
                        name=tag_name.lower(),
                        defaults={'slug': tag_name.lower()}
                    )
                    track.hashtags.add(tag)
        
        # Логируем успех
        logger.info(f"✅ Трек создан: ID {track.id}, статус: {track.status}, длительность: {track.duration}")
        
        # Получаем абсолютные URL
        cover_url_full = ''
        if track.cover:
            cover_url_full = request.build_absolute_uri(track.cover.url)
        elif track.cover_url:
            cover_url_full = track.cover_url
        
        audio_url_full = ''
        if track.audio_file:
            audio_url_full = request.build_absolute_uri(track.audio_file.url)
        elif track.audio_url:
            audio_url_full = track.audio_url
        
        # Формируем ответ
        response_data = {
            'success': True,
            'message': 'Трек успешно загружен',
            'track': {
                'id': track.id,
                'title': track.title,
                'artist': track.artist,
                'cover': cover_url_full,
                'cover_url': cover_url_full,
                'audio_url': audio_url_full,
                'duration': track.duration if track.duration else '0:00',
                'duration_formatted': track.duration if track.duration else '0:00',
                'duration_seconds': track.duration_seconds if hasattr(track, 'duration_seconds') else 0,
                'status': track.status,
                'created_at': track.created_at.isoformat(),
                'waveform_generated': track.waveform_generated if hasattr(track, 'waveform_generated') else False,
                'waveform_ready': track.waveform_generated if hasattr(track, 'waveform_generated') else False,
                'uploaded_by': {
                    'id': user.id,
                    'username': user.username
                },
                'hashtags': [tag.name for tag in track.hashtags.all()] if hasattr(track, 'hashtags') else [],
                'note': 'Waveform будет сгенерирован автоматически для опубликованных треков'
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"❌ Ошибка загрузки трека: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': f'Ошибка загрузки: {str(e)}'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_track(request, track_id):
    """Публикация трека после загрузки"""
    try:
        if HAS_TRACK:
            track = Track.objects.get(id=track_id, uploaded_by=request.user)
            
            # Упрощенные условия публикации
            conditions = []
            
            # 1. Есть ли аудио?
            if not track.audio_file and not track.audio_url:
                conditions.append('Добавьте аудио файл или ссылку на аудио')
            
            if conditions:
                return Response({
                    'success': False,
                    'error': 'Не выполнены условия публикации',
                    'conditions': conditions
                }, status=400)
            
            # Все условия выполнены - публикуем
            track.status = 'published'
            track.published_at = timezone.now()
            track.save()
            
            # Если есть обложка из внешнего URL, сохраним ее локально
            if track.cover_url and not track.cover:
                try:
                    # Скачиваем и сохраняем обложку
                    response = requests.get(track.cover_url, timeout=10)
                    if response.status_code == 200:
                        from django.core.files.base import ContentFile
                        
                        # Генерируем имя файла
                        ext = track.cover_url.split('.')[-1].split('?')[0]
                        if len(ext) > 4:
                            ext = 'jpg'
                        
                        filename = f"cover_{track.id}_{int(timezone.now().timestamp())}.{ext}"
                        
                        # Сохраняем
                        track.cover.save(filename, ContentFile(response.content))
                        track.save()
                        logger.info(f"Обложка скачана и сохранена для трека {track.id}")
                except Exception as e:
                    logger.warning(f"Не удалось скачать обложку: {e}")
                    # Игнорируем ошибку - оставляем cover_url
            
            # Создаем демо-вейвформу сразу
            if not track.waveform_generated:
                try:
                    from .waveform_utils import generate_demo_waveform
                    waveform = generate_demo_waveform(track.id, 120, track.title)
                    track.waveform_data = waveform
                    track.waveform_generated = True
                    track.save(update_fields=['waveform_data', 'waveform_generated'])
                    logger.info(f"Waveform сгенерирован для трека {track.id}")
                except Exception as e:
                    logger.error(f"Ошибка генерации waveform: {e}")
            
            return Response({
                'success': True,
                'message': 'Трек успешно опубликован!',
                'track': {
                    'id': track.id,
                    'title': track.title,
                    'status': track.status,
                    'published_at': track.published_at.isoformat() if track.published_at else None,
                    'cover': track.get_cover_url(),
                    'audio_url': track.get_audio_url(),
                    'waveform_ready': track.waveform_generated
                }
            })
        else:
            return Response({
                'success': True,
                'message': 'Трек опубликован (разработка)'
            })
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        logger.error(f"Ошибка публикации трека: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== HASHTAG SYSTEM ====================

@require_GET
def get_trending_hashtags(request):
    """Получение популярных хештегов"""
    try:
        limit = int(request.GET.get('limit', 20))
        
        hashtags = []
        if HAS_HASHTAG:
            trending = Hashtag.objects.filter(usage_count__gt=0).order_by('-usage_count')[:limit]
            
            for tag in trending:
                hashtags.append({
                    'name': tag.name,
                    'slug': tag.slug,
                    'usage_count': tag.usage_count,
                    'tracks_count': tag.tracks.count()
                })
        else:
            # Демо-данные если модель не существует
            hashtags = [
                {'name': 'electronic', 'slug': 'electronic', 'usage_count': 125, 'tracks_count': 45},
                {'name': 'rock', 'slug': 'rock', 'usage_count': 98, 'tracks_count': 32},
                {'name': 'hiphop', 'slug': 'hiphop', 'usage_count': 76, 'tracks_count': 28},
                {'name': 'chill', 'slug': 'chill', 'usage_count': 54, 'tracks_count': 19},
                {'name': 'dance', 'slug': 'dance', 'usage_count': 43, 'tracks_count': 15}
            ][:limit]
        
        return JsonResponse({
            'success': True,
            'hashtags': hashtags,
            'count': len(hashtags)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_GET
def search_by_hashtag(request, hashtag):
    """Поиск треков по хештегу"""
    try:
        tracks = []
        
        if HAS_HASHTAG and HAS_TRACK:
            try:
                tag = Hashtag.objects.get(slug=hashtag.lower())
            except Hashtag.DoesNotExist:
                return JsonResponse({
                    'success': True,
                    'tracks': [],
                    'hashtag': hashtag,
                    'message': 'Хештег не найден'
                })
            
            tracks_qs = Track.objects.filter(
                hashtags=tag,
                status='published'
            ).select_related('uploaded_by').order_by('-published_at')
            
            for track in tracks_qs:
                tracks.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover.url if track.cover else '',
                    'duration': track.duration,
                    'play_count': track.play_count if hasattr(track, 'play_count') else 0,
                    'like_count': track.like_count if hasattr(track, 'like_count') else 0,
                    'uploaded_by': {
                        'id': track.uploaded_by.id,
                        'username': track.uploaded_by.username
                    },
                    'hashtags': [tag.name for tag in track.hashtags.all()],
                    'published_at': track.published_at.isoformat() if track.published_at else None
                })
            
            tag_info = {
                'name': tag.name,
                'slug': tag.slug,
                'usage_count': tag.usage_count
            }
        else:
            # Демо-данные
            tag_info = {
                'name': hashtag,
                'slug': hashtag.lower(),
                'usage_count': 50
            }
            
            # Создаем демо-треки
            for i in range(1, 6):
                tracks.append({
                    'id': i,
                    'title': f"Demo Track {i} - {hashtag}",
                    'artist': "Demo Artist",
                    'cover': "https://via.placeholder.com/300x300",
                    'audio_url': f"/tracks/demo{i}.mp3",
                    'duration': "3:45",
                    'play_count': i * 100,
                    'like_count': i * 10,
                    'uploaded_by': {
                        'id': 1,
                        'username': 'demo_uploader'
                    },
                    'hashtags': [hashtag],
                    'published_at': timezone.now().isoformat()
                })
        
        return JsonResponse({
            'success': True,
            'hashtag': tag_info,
            'tracks': tracks,
            'count': len(tracks)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== COMMENT SYSTEM ====================

@require_GET
def get_track_comments(request, track_id):
    """Получение комментариев к треку"""
    try:
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        comments = []
        
        # Проверяем, какая модель комментариев существует
        if HAS_TRACK_COMMENT:
            try:
                track = Track.objects.get(id=track_id)
            except Track.DoesNotExist:
                track = create_demo_track(track_id)
                if not track:
                    return JsonResponse({
                        'success': True,
                        'comments': [],
                        'message': 'Трек не найден'
                    })
            
            comments_qs = TrackComment.objects.filter(
                track=track,
                is_deleted=False
            ).select_related('user').order_by('-created_at')
            
            for comment in comments_qs:
                is_mine = user and user.id == comment.user.id
                
                # Проверяем лайк
                user_liked = False
                if user and hasattr(comment, 'likes'):
                    try:
                        user_liked = comment.likes.filter(id=user.id).exists()
                    except:
                        user_liked = False
                
                comments.append({
                    'id': comment.id,
                    'user': {
                        'id': comment.user.id,
                        'username': comment.user.username,
                        'avatar': comment.user.avatar or ''
                    },
                    'text': comment.text,
                    'timestamp': get_time_ago_str(comment.created_at),
                    'likes': comment.like_count if hasattr(comment, 'like_count') else 0,
                    'is_mine': is_mine,
                    'user_liked': user_liked,
                    'created_at': comment.created_at.isoformat()
                })
        else:
            # Используем модель Comment
            try:
                track = Track.objects.get(id=track_id)
            except Track.DoesNotExist:
                track = create_demo_track(track_id)
                if not track:
                    return JsonResponse({
                        'success': True,
                        'comments': [],
                        'message': 'Трек не найден'
                    })
            
            comments_qs = Comment.objects.filter(
                track=track
            ).select_related('user').order_by('-created_at')
            
            for comment in comments_qs:
                is_mine = user and user.id == comment.user.id
                
                # Проверяем лайк
                user_liked = False
                if user:
                    try:
                        user_liked = False  # Заглушка для демо
                    except:
                        user_liked = False
                
                comments.append({
                    'id': comment.id,
                    'user': {
                        'id': comment.user.id,
                        'username': comment.user.username,
                        'avatar': comment.user.avatar or ''
                    },
                    'text': comment.text,
                    'timestamp': get_time_ago_str(comment.created_at),
                    'likes': comment.likes_count,
                    'is_mine': is_mine,
                    'user_liked': user_liked,
                    'created_at': comment.created_at.isoformat()
                })
        
        # Если нет комментариев, создаем демо
        if not comments:
            demo_users = [
                {'id': 1, 'username': 'musiclover42', 'avatar': ''},
                {'id': 2, 'username': 'synthwavefan', 'avatar': ''},
                {'id': 3, 'username': 'djproducer', 'avatar': ''}
            ]
            
            demo_texts = [
                'This track is amazing! The production quality is incredible.',
                'The bassline in this is fire! 🔥',
                'Great work! Would love to collaborate sometime.'
            ]
            
            for i, user_info in enumerate(demo_users[:3]):
                is_mine = user and user.username == user_info['username']
                comments.append({
                    'id': i + 1,
                    'user': user_info,
                    'text': demo_texts[i % len(demo_texts)],
                    'timestamp': f"{i+1} hours ago",
                    'likes': [24, 18, 32][i],
                    'is_mine': is_mine,
                    'user_liked': False,
                    'created_at': timezone.now().isoformat()
                })
        
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'comments': comments,
            'count': len(comments)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@api_view(['POST'])
def add_track_comment(request, track_id):
    """Добавление комментария к треку"""
    try:
        data = request.data  # ✅ Используем request.data
        text = data.get('text', '').strip()
        
        if not text:
            return Response({
                'success': False,
                'error': 'Текст комментария обязателен'
            }, status=400)
        
        user = request.user
        
        if HAS_TRACK_COMMENT and HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
            except Track.DoesNotExist:
                track = create_demo_track(track_id)
            
            # Создаем комментарий
            comment = TrackComment.objects.create(
                user=user,
                track=track,
                text=text
            )
            
            new_comment = {
                'id': comment.id,
                'user': {
                    'username': user.username,
                    'avatar': user.avatar
                },
                'text': text,
                'timestamp': get_time_ago_str(comment.created_at),
                'likes': 0,
                'is_mine': True,
                'created_at': comment.created_at.isoformat()
            }
            
            return Response({
                'success': True,
                'message': 'Комментарий добавлен',
                'comment': new_comment
            })
        else:
            # Если модели не существуют
            new_comment = {
                'id': int(timezone.now().timestamp()),
                'user': {
                    'username': user.username,
                    'avatar': user.avatar
                },
                'text': text,
                'timestamp': 'Just now',
                'likes': 0,
                'is_mine': True,
                'created_at': timezone.now().isoformat()
            }
            
            return Response({
                'success': True,
                'message': 'Комментарий добавлен (разработка)',
                'comment': new_comment
            })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

# ==================== HELPER FUNCTIONS ====================

def get_time_ago_str(timestamp):
    """Форматирует время в формат '5 minutes ago', '1 hour ago' и т.д."""
    now = timezone.now()
    diff = now - timestamp
    
    seconds = diff.total_seconds()
    minutes = seconds // 60
    hours = minutes // 60
    days = hours // 24
    
    if seconds < 60:
        return 'Just now'
    elif minutes < 60:
        return f'{int(minutes)} minute{"s" if minutes > 1 else ""} ago'
    elif hours < 24:
        return f'{int(hours)} hour{"s" if hours > 1 else ""} ago'
    elif days < 7:
        return f'{int(days)} day{"s" if days > 1 else ""} ago'
    elif days < 30:
        weeks = days // 7
        return f'{int(weeks)} week{"s" if weeks > 1 else ""} ago'
    else:
        return timestamp.strftime('%b %d, %Y')

def create_demo_track(track_id):
    """Создает демо-трек"""
    if HAS_TRACK:
        tracks_data = {
            1: {
                'title': "hard drive (slowed & muffled)",
                'artist': "griffinilla",
                'cover': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
                'audio_url': "/tracks/track1.mp3",
                'duration': "3:20"
            },
            2: {
                'title': "Deutschland",
                'artist': "Rammstein",
                'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                'audio_url': "/tracks/track2.mp3",
                'duration': "5:22"
            },
            3: {
                'title': "Sonne",
                'artist': "Rammstein",
                'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                'audio_url': "/tracks/track3.mp3",
                'duration': "4:05"
            }
        }
        
        if track_id in tracks_data:
            track_data = tracks_data[track_id]
            user = CustomUser.objects.first() if CustomUser.objects.exists() else None
            
            if user:
                track = Track.objects.create(
                    id=track_id,
                    uploaded_by=user,
                    **track_data
                )
                return track
    
    return None

# ==================== DEBUG VIEWS ====================

@require_POST
def debug_like(request):
    """Endpoint для отладки лайков"""
    try:
        # Логируем весь запрос
        body_bytes = request.body
        
        if body_bytes:
            try:
                body_str = body_bytes.decode('utf-8')
                data = json.loads(body_str)
            except UnicodeDecodeError:
                body_str = body_bytes.decode('latin-1')
                data = {"error": "could_not_decode", "raw_bytes": str(body_bytes[:100])}
            except json.JSONDecodeError:
                data = {"error": "invalid_json", "raw_body": body_str[:200]}
        else:
            body_str = ""
            data = {}
        
        return JsonResponse({
            'success': True,
            'debug': True,
            'request_info': {
                'method': request.method,
                'path': request.path,
                'content_type': request.content_type,
                'body_length': len(body_bytes),
                'headers': dict(request.headers)
            },
            'body_raw': body_str,
            'body_parsed': data,
            'message': 'Debug endpoint работает!',
            'server_time': timezone.now().isoformat(),
            'models_status': {
                'CustomUser': True,
                'Track': HAS_TRACK,
                'UserTrackInteraction': HAS_USER_TRACK_INTERACTION,
                'PasswordResetToken': HAS_PASSWORD_RESET_TOKEN,
                'TrackComment': HAS_TRACK_COMMENT,
                'Follow': HAS_FOLLOW,
                'TrackRepost': HAS_TRACK_REPOST,
                'Hashtag': HAS_HASHTAG
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': 'Произошла ошибка в debug endpoint'
        }, status=500)

@require_GET
def get_tracks(request):
    """Получение списка треков"""
    try:
        tracks_list = []
        
        if HAS_TRACK:
            # Получаем опубликованные треки
            published_tracks = Track.objects.filter(status='published').order_by('-created_at')[:20]
            
            for track in published_tracks:
                tracks_list.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover.url if track.cover else track.cover_url,
                    'audio_url': track.audio_file.url if track.audio_file else track.audio_url,
                    'duration': track.duration,
                    'play_count': track.play_count,
                    'like_count': track.like_count,
                    'repost_count': track.repost_count,
                    'uploaded_by': {
                        'id': track.uploaded_by.id,
                        'username': track.uploaded_by.username
                    }
                })
        
        # Если нет треков в БД, используем демо-данные
        if not tracks_list:
            tracks_list = [
                {
                    'id': 1,
                    'title': "hard drive (slowed & muffled)",
                    'artist': "griffinilla",
                    'cover': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
                    'audio_url': "/tracks/track1.mp3",
                    'duration': "3:20",
                    'play_count': 1234,
                    'like_count': 56,
                    'repost_count': 12,
                    'uploaded_by': {
                        'id': 1,
                        'username': 'demo_user'
                    }
                },
                {
                    'id': 2,
                    'title': "Deutschland",
                    'artist': "Rammstein",
                    'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                    'audio_url': "/tracks/track2.mp3",
                    'duration': "5:22",
                    'play_count': 876,
                    'like_count': 34,
                    'repost_count': 8,
                    'uploaded_by': {
                        'id': 1,
                        'username': 'demo_user'
                    }
                },
                {
                    'id': 3,
                    'title': "Sonne",
                    'artist': "Rammstein",
                    'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                    'audio_url': "/tracks/track3.mp3",
                    'duration': "4:05",
                    'play_count': 654,
                    'like_count': 23,
                    'repost_count': 5,
                    'uploaded_by': {
                        'id': 1,
                        'username': 'demo_user'
                    }
                }
            ]
        
        return JsonResponse({
            'success': True,
            'tracks': tracks_list,
            'count': len(tracks_list),
            'fetched_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': 'Ошибка при получении списка треков'
        }, status=500)

# ==================== COMMENT LIKE SYSTEM ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_comment(request, comment_id):
    """Лайк/дизлайк комментария - РАБОЧАЯ ВЕРСИЯ ДЛЯ TrackComment"""
    try:
        user = request.user
        
        if not user.is_authenticated:
            return Response({
                'success': False,
                'error': 'Требуется авторизация'
            }, status=401)
        
        # Находим комментарий
        try:
            comment = TrackComment.objects.get(id=comment_id)
        except TrackComment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Комментарий не найден'
            }, status=404)
        
        # Проверяем, не удален ли комментарий
        if comment.is_deleted:
            return Response({
                'success': False,
                'error': 'Комментарий удален'
            }, status=410)
        
        # Получаем параметр liked из запроса
        liked_param = request.data.get('liked', None)
        
        # Проверяем текущее состояние
        is_currently_liked = comment.likes.filter(id=user.id).exists()
        
        # Определяем новое состояние
        if liked_param is not None:
            # Явное указание действия
            if liked_param and not is_currently_liked:
                # Добавляем лайк
                comment.likes.add(user)
                liked = True
            elif not liked_param and is_currently_liked:
                # Убираем лайк
                comment.likes.remove(user)
                liked = False
            else:
                # Состояние не изменилось
                liked = is_currently_liked
        else:
            # Переключаем (toggle)
            if is_currently_liked:
                comment.likes.remove(user)
                liked = False
            else:
                comment.likes.add(user)
                liked = True
        
        # Обновляем счетчик
        comment.update_like_count()
        
        return Response({
            'success': True,
            'liked': liked,
            'likes_count': comment.like_count,
            'comment_id': comment.id,
            'user_id': user.id,
            'username': user.username,
            'message': 'Лайк успешно сохранен в TrackComment'
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Ошибка в like_comment: {str(e)}")
        print(f"Детали: {error_details}")
        
        return Response({
            'success': False,
            'error': str(e),
            'details': 'Проверьте структуру БД и права доступа'
        }, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """Удаление комментария"""
    try:
        user = request.user
        
        comment = None
        deleted = False
        
        # Пробуем найти комментарий в разных моделях
        try:
            if HAS_TRACK_COMMENT:
                comment = TrackComment.objects.get(id=comment_id, user=user)
                comment.soft_delete()  # Используем soft delete если метод существует
                deleted = True
                method = 'TrackComment soft delete'
                
            elif HAS_COMMENT:
                comment = Comment.objects.get(id=comment_id, user=user)
                comment.delete()
                deleted = True
                method = 'Comment delete'
                
            else:
                return Response({
                    'success': False,
                    'error': 'Модели комментариев не найдены',
                    'message': 'Система комментариев не настроена'
                }, status=404)
                
        except (TrackComment.DoesNotExist, Comment.DoesNotExist):
            return Response({
                'success': False,
                'error': 'Комментарий не найден или у вас нет прав',
                'message': 'Вы не можете удалить этот комментарий'
            }, status=404)
        except AttributeError:
            # Если метод soft_delete не существует, просто пометим как удаленный
            if comment and hasattr(comment, 'is_deleted'):
                comment.is_deleted = True
                comment.save()
                deleted = True
                method = 'TrackComment mark as deleted'
        
        return Response({
            'success': True,
            'message': 'Комментарий успешно удален',
            'comment_id': comment_id,
            'deleted': deleted
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Внутренняя ошибка сервера при удалении комментария'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_track_like(request, track_id):
    """Проверка, лайкнул ли пользователь трек с JWT аутентификацией"""
    try:
        user = request.user
        
        liked = False
        like_count = 0
        
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                
                if HAS_TRACK_LIKE:
                    liked = TrackLike.objects.filter(user=user, track=track).exists()
                    like_count = TrackLike.objects.filter(track=track).count()
                    
                elif HAS_USER_TRACK_INTERACTION:
                    try:
                        interaction = UserTrackInteraction.objects.get(user=user, track=track)
                        liked = interaction.liked
                    except UserTrackInteraction.DoesNotExist:
                        liked = False
                
                return Response({
                    'success': True,
                    'track_id': track_id,
                    'liked': liked,
                    'like_count': like_count,
                    'user': user.username
                })
                
            except Track.DoesNotExist:
                return Response({
                    'success': True,
                    'track_id': track_id,
                    'liked': False,
                    'like_count': 0,
                    'message': 'Трек не найден'
                })
        
        return Response({
            'success': True,
            'track_id': track_id,
            'liked': False,
            'note': 'Модель Track не доступна'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_user_liked_tracks(request):
    """Получение всех ID треков, которые лайкнул пользователь"""
    try:
        user = request.user
        
        liked_track_ids = []
        
        if HAS_TRACK_LIKE:
            liked_track_ids = list(TrackLike.objects.filter(user=user)
                                  .values_list('track_id', flat=True))
        elif HAS_USER_TRACK_INTERACTION:
            liked_track_ids = list(UserTrackInteraction.objects.filter(
                user=user, liked=True
            ).values_list('track_id', flat=True))
        
        return Response({
            'success': True,
            'liked_tracks': liked_track_ids,
            'count': len(liked_track_ids),
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@require_GET
def sync_track_likes(request, track_id):
    """Синхронизация лайков для конкретного трека"""
    try:
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        # Получаем трек
        if not HAS_TRACK:
            return JsonResponse({
                'success': True,
                'track_id': track_id,
                'liked': False,
                'like_count': 0,
                'note': 'Модель Track не доступна'
            })
        
        try:
            track = Track.objects.get(id=track_id)
        except Track.DoesNotExist:
            return JsonResponse({
                'success': True,
                'track_id': track_id,
                'liked': False,
                'like_count': 0,
                'message': 'Трек не найден'
            })
        
        # Проверяем лайк пользователя
        user_has_liked = False
        if user:
            if HAS_TRACK_LIKE:
                user_has_liked = TrackLike.objects.filter(user=user, track=track).exists()
            elif HAS_USER_TRACK_INTERACTION:
                try:
                    interaction = UserTrackInteraction.objects.get(user=user, track=track)
                    user_has_liked = interaction.liked
                except UserTrackInteraction.DoesNotExist:
                    user_has_liked = False
        
        # Обновляем счетчик лайков из базы данных
        if HAS_TRACK_LIKE:
            like_count = TrackLike.objects.filter(track=track).count()
            track.like_count = like_count
            track.save()
        else:
            like_count = track.like_count
        
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'liked': user_has_liked,
            'like_count': like_count,
            'user': user.username if user else None,
            'fetched_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_liked_tracks(request):
    """Получение списка лайкнутых треков"""
    try:
        user = request.user
        
        liked_tracks = []
        
        # 1. Проверяем через TrackLike (основная система)
        if HAS_TRACK_LIKE:
            likes = TrackLike.objects.filter(user=user).select_related('track')
            
            for like in likes:
                track = like.track
                liked_tracks.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover_url or (track.cover.url if track.cover else ''),
                    'audio_url': track.audio_url or (track.audio_file.url if track.audio_file else ''),
                    'duration': track.duration,
                    'play_count': track.play_count,
                    'like_count': track.like_count,
                    'liked_at': like.liked_at.isoformat()
                })
        
        # 2. Проверяем через UserTrackInteraction (старая система)
        elif HAS_USER_TRACK_INTERACTION:
            interactions = UserTrackInteraction.objects.filter(user=user, liked=True).select_related('track')
            
            for interaction in interactions:
                track = interaction.track
                liked_tracks.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover_url or (track.cover.url if track.cover else ''),
                    'audio_url': track.audio_url or (track.audio_file.url if track.audio_file else ''),
                    'duration': track.duration,
                    'play_count': track.play_count,
                    'like_count': track.like_count,
                    'liked_at': interaction.liked_at.isoformat()
                })
        
        # 3. Если нет треков в базе, создаем демо-треки
        if not liked_tracks:
            # Создаем демо-треки если их нет
            tracks_data = {
                1: {
                    'title': "hard drive (slowed & muffled)",
                    'artist': "griffinilla",
                    'cover_url': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
                    'audio_url': "/tracks/track1.mp3",
                    'duration': "3:20",
                    'play_count': 1234,
                    'like_count': 56
                },
                2: {
                    'title': "Deutschland",
                    'artist': "Rammstein",
                    'cover_url': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                    'audio_url': "/tracks/track2.mp3",
                    'duration': "5:22",
                    'play_count': 876,
                    'like_count': 34
                }
            }
            
            for track_id, track_data in tracks_data.items():
                # Создаем трек если его нет
                if HAS_TRACK:
                    try:
                        track = Track.objects.get(id=track_id)
                    except Track.DoesNotExist:
                        # Создаем демо-трек
                        upload_user = CustomUser.objects.first() if CustomUser.objects.exists() else user
                        track = Track.objects.create(
                            id=track_id,
                            uploaded_by=upload_user,
                            **track_data
                        )
                        
                        # Создаем лайк для пользователя
                        if HAS_TRACK_LIKE:
                            TrackLike.objects.create(user=user, track=track)
                        elif HAS_USER_TRACK_INTERACTION:
                            UserTrackInteraction.objects.create(user=user, track=track, liked=True)
                        
                        liked_tracks.append({
                            'id': track.id,
                            'title': track.title,
                            'artist': track.artist,
                            'cover': track.cover_url,
                            'audio_url': track.audio_url,
                            'duration': track.duration,
                            'play_count': track.play_count,
                            'like_count': track.like_count,
                            'liked_at': timezone.now().isoformat()
                        })
        
        return Response({
            'success': True,
            'tracks': liked_tracks,
            'count': len(liked_tracks),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'fetched_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Ошибка при получении лайкнутых треков'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_user_liked_track_ids(request):
    """Получение всех ID треков, которые лайкнул пользователь"""
    try:
        user = request.user
        
        liked_ids = []
        
        if HAS_TRACK_LIKE:
            liked_ids = list(TrackLike.objects.filter(user=user).values_list('track_id', flat=True))
        elif HAS_USER_TRACK_INTERACTION:
            liked_ids = list(UserTrackInteraction.objects.filter(
                user=user, liked=True
            ).values_list('track_id', flat=True))
        
        return Response({
            'success': True,
            'liked_track_ids': liked_ids,
            'count': len(liked_ids),
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

def generate_demo_waveform(track_id):
    """
    Генерация демо-вейвформы для трека
    """
    import numpy as np
    
    # Создаем предсказуемую, но уникальную вейвформу для каждого трека
    np.random.seed(track_id)
    
    num_bars = 120
    base_frequency = 0.15 + (track_id * 0.02)
    
    # Создаем базовую синусоиду
    base_wave = [40 + 40 * np.sin(i * base_frequency) for i in range(num_bars)]
    
    # Добавляем характерные особенности в зависимости от ID трека
    if track_id == 1:
        # Для первого трека - более плавная волна
        noise = [5 * np.random.random() for _ in range(num_bars)]
    elif track_id == 2:
        # Для второго - более резкие перепады
        noise = [15 * np.random.random() for _ in range(num_bars)]
    else:
        # Для остальных - средняя сложность
        noise = [10 * np.random.random() for _ in range(num_bars)]
    
    # Смешиваем
    waveform = [base_wave[i] + noise[i] for i in range(num_bars)]
    
    # Нормализуем
    waveform = [max(10, min(100, int(val))) for val in waveform]
    
    return waveform

@require_GET
def get_track_waveform(request, track_id):
    """Получение вейвформы с автогенерацией при необходимости"""
    try:
        if not HAS_TRACK:
            # Если модель не доступна, возвращаем демо-вейвформу
            demo_waveform = generate_demo_waveform(track_id)
            return JsonResponse({
                'success': True,
                'track_id': track_id,
                'waveform': demo_waveform,
                'generated': False,
                'message': 'Demo waveform (Track model not available)'
            })
        
        # Пытаемся получить трек из базы
        try:
            track = Track.objects.get(id=track_id)
        except Track.DoesNotExist:
            # Если трека нет в базе, создаем его автоматически
            track = create_demo_track(track_id)
        
        # Гарантируем что у трека есть вейвформа
        waveform_data = ensure_waveform_for_track(track)
        
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'waveform': waveform_data,
            'generated': True,
            'track': {
                'id': track.id,
                'title': track.title,
                'artist': track.artist
            }
        })
        
    except Exception as e:
        # Все равно возвращаем демо-вейвформу
        demo_waveform = generate_demo_waveform(track_id)
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'waveform': demo_waveform,
            'generated': False,
            'error': str(e),
            'message': 'Using demo waveform due to error'
        })

def ensure_waveform_for_track(track):
    """
    Гарантирует что у трека есть вейвформа.
    Если нет - генерирует её.
    """
    try:
        # Если вейвформа уже сгенерирована, возвращаем ее
        if track.waveform_generated and track.waveform_data:
            return track.waveform_data
        
        # Используем демо-вейвформу пока
        waveform_data = generate_demo_waveform(track.id)
        
        # Сохраняем в модель
        track.waveform_data = waveform_data
        track.waveform_generated = True
        track.save(update_fields=['waveform_data', 'waveform_generated'])
        
        return waveform_data
        
    except Exception:
        # Возвращаем демо-вейвформу в случае ошибки
        return generate_demo_waveform(track.id)

@require_GET
def get_uploaded_tracks(request):
    """Получение загруженных треков пользователя"""
    try:
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        if not user:
            return JsonResponse({
                'success': False,
                'error': 'Требуется аутентификация'
            }, status=401)
        
        if HAS_TRACK:
            tracks = Track.objects.filter(
                uploaded_by=user,
                status='published'
            ).order_by('-created_at')
            
            tracks_list = []
            for track in tracks:
                tracks_list.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover_url or (track.cover.url if track.cover else ''),
                    'audio_url': track.audio_url or (track.audio_file.url if track.audio_file else ''),
                    'duration': track.duration,
                    'play_count': track.play_count,
                    'like_count': track.like_count,
                    'created_at': track.created_at.isoformat(),
                    'uploaded_by': {
                        'id': user.id,
                        'username': user.username
                    }
                })
            
            return JsonResponse({
                'success': True,
                'tracks': tracks_list,
                'count': len(tracks_list)
            })
        else:
            return JsonResponse({
                'success': True,
                'tracks': [],
                'message': 'Модель Track не доступна'
            })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_uploaded_tracks_jwt(request):
    """Получение загруженных треков пользователя с JWT аутентификацией"""
    try:
        user = request.user
        
        logger.info(f"✅ JWT аутентификация успешна для пользователя: {user.username} (ID: {user.id})")
        
        if HAS_TRACK:
            try:
                # Получаем треки пользователя
                tracks = Track.objects.filter(
                    uploaded_by=user,
                    status='published'
                ).order_by('-created_at')
                
                logger.info(f"📊 Найдено {tracks.count()} треков пользователя {user.username}")
                
                tracks_list = []
                for track in tracks:
                    # Получаем URL обложки
                    cover_url = ''
                    if track.cover:
                        if hasattr(track.cover, 'url'):
                            cover_url = request.build_absolute_uri(track.cover.url)
                        else:
                            cover_url = str(track.cover)
                            if cover_url.startswith('/media/'):
                                cover_url = request.build_absolute_uri(cover_url)
                            elif not cover_url.startswith(('http://', 'https://')):
                                cover_url = request.build_absolute_uri(f'/media/{cover_url}')
                    elif track.cover_url:
                        cover_url = track.cover_url
                        if cover_url.startswith('/media/'):
                            cover_url = request.build_absolute_uri(cover_url)
                    
                    # Получаем URL аудио
                    audio_url = ''
                    if track.audio_file:
                        if hasattr(track.audio_file, 'url'):
                            audio_url = request.build_absolute_uri(track.audio_file.url)
                        else:
                            audio_url = str(track.audio_file)
                            if audio_url.startswith('/media/'):
                                audio_url = request.build_absolute_uri(audio_url)
                            elif not audio_url.startswith(('http://', 'https://')):
                                audio_url = request.build_absolute_uri(f'/media/audio/{audio_url}')
                    elif track.audio_url:
                        audio_url = track.audio_url
                        if audio_url.startswith('/media/'):
                            audio_url = request.build_absolute_uri(audio_url)
                    
                    # Форматируем данные трека
                    track_data = {
                        'id': track.id,
                        'title': track.title or f'Трек #{track.id}',
                        'artist': track.artist or user.username,
                        'cover': cover_url,
                        'cover_url': cover_url,
                        'audio_url': audio_url,
                        'duration': track.duration or '3:00',
                        'duration_formatted': track.duration or '3:00',
                        'duration_seconds': track.duration_seconds if hasattr(track, 'duration_seconds') else 180,
                        'play_count': track.play_count if hasattr(track, 'play_count') else 0,
                        'like_count': track.like_count if hasattr(track, 'like_count') else 0,
                        'repost_count': track.repost_count if hasattr(track, 'repost_count') else 0,
                        'created_at': track.created_at.isoformat() if track.created_at else timezone.now().isoformat(),
                        'published_at': track.published_at.isoformat() if track.published_at else None,
                        'status': track.status or 'published',
                        'genre': track.genre or 'other',
                        'description': track.description or '',
                        'is_private': track.is_private if hasattr(track, 'is_private') else False,
                        'is_explicit': track.is_explicit if hasattr(track, 'is_explicit') else False,
                        'uploaded_by': {
                            'id': user.id,
                            'username': user.username,
                            'avatar': user.avatar or ''
                        },
                        'waveform_generated': track.waveform_generated if hasattr(track, 'waveform_generated') else False,
                        'waveform_ready': track.waveform_generated if hasattr(track, 'waveform_generated') else False,
                        'hashtags': [tag.name for tag in track.hashtags.all()] if hasattr(track, 'hashtags') else [],
                        'tags': track.tags or ''
                    }
                    
                    tracks_list.append(track_data)
                
                # Если треков нет, создаем демо-треки для пользователя
                if not tracks_list:
                    logger.info(f"📝 У пользователя {user.username} нет загруженных треков")
                    
                    # Создаем демо-треки
                    demo_tracks = [
                        {
                            'id': user.id * 100 + 1,
                            'title': f"Мой первый трек",
                            'artist': user.username,
                            'cover': request.build_absolute_uri('/static/default_cover.jpg'),
                            'cover_url': request.build_absolute_uri('/static/default_cover.jpg'),
                            'audio_url': request.build_absolute_uri('/static/tracks/track1.mp3'),
                            'duration': '3:20',
                            'duration_seconds': 200,
                            'play_count': 42,
                            'like_count': 5,
                            'repost_count': 1,
                            'created_at': timezone.now().isoformat(),
                            'status': 'published',
                            'genre': 'electronic',
                            'description': f'Мой первый загруженный трек на платформе!',
                            'uploaded_by': {
                                'id': user.id,
                                'username': user.username,
                                'avatar': user.avatar or ''
                            },
                            'waveform_ready': True,
                            'hashtags': ['#myfirsttrack', '#demo']
                        }
                    ]
                    
                    tracks_list = demo_tracks
                
                return Response({
                    'success': True,
                    'tracks': tracks_list,
                    'count': len(tracks_list),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'total_uploaded': tracks.count() if HAS_TRACK else len(tracks_list)
                    },
                    'fetched_at': timezone.now().isoformat(),
                    'debug': {
                        'authentication': 'jwt',
                        'user_authenticated': True,
                        'user_id': user.id,
                        'has_track_model': HAS_TRACK,
                        'track_count_in_db': Track.objects.count() if HAS_TRACK else 0
                    }
                })
                
            except Exception as e:
                logger.error(f"❌ Ошибка при получении треков пользователя {user.username}: {e}")
                return Response({
                    'success': False,
                    'error': f'Ошибка при получении треков: {str(e)}',
                    'user_id': user.id
                }, status=500)
        else:
            logger.warning("⚠️ Модель Track не доступна")
            return Response({
                'success': True,
                'tracks': [],
                'message': 'Модель Track не доступна',
                'user': {
                    'id': user.id,
                    'username': user.username
                },
                'count': 0
            })
        
    except Exception as e:
        logger.error(f"❌ Общая ошибка в get_uploaded_tracks: {e}")
        return Response({
            'success': False,
            'error': f'Внутренняя ошибка сервера: {str(e)}',
            'message': 'Пожалуйста, попробуйте позже'
        }, status=500)

@require_GET
def recently_played_tracks(request):
    """Получение списка недавно прослушанных треков"""
    try:
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        tracks = []
        
        if HAS_PLAY_HISTORY and user:
            # Получаем историю прослушивания
            play_history = PlayHistory.objects.filter(
                user=user
            ).select_related('track').order_by('-played_at')[:10]
            
            for history in play_history:
                track = history.track
                tracks.append({
                    'id': track.id,
                    'title': track.title,
                    'artist': track.artist,
                    'cover': track.cover_url or (track.cover.url if track.cover else ''),
                    'audio_url': track.audio_url or (track.audio_file.url if track.audio_file else ''),
                    'duration': track.duration,
                    'play_count': track.play_count,
                    'like_count': track.like_count,
                    'last_played': history.played_at.isoformat(),
                    'play_history_id': history.id
                })
        
        # Если нет истории или пользователь не авторизован, используем демо-данные
        if not tracks:
            tracks = [
                {
                    'id': 1,
                    'title': "hard drive (slowed & muffled)",
                    'artist': "griffinilla",
                    'cover': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGF8gEyh_MA8=&amp;rs=AOn4CLDjiyHGoELcWa2t37NenbmBQ-JlSw",
                    'audio_url': "/tracks/track1.mp3",
                    'duration': "3:20",
                    'last_played': timezone.now().isoformat(),
                    'play_count': 15,
                    'like_count': 56
                },
                {
                    'id': 2,
                    'title': "Deutschland",
                    'artist': "Rammstein",
                    'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                    'audio_url': "/tracks/track2.mp3",
                    'duration': "5:22",
                    'last_played': timezone.now().isoformat(),
                    'play_count': 8,
                    'like_count': 34
                },
                {
                    'id': 3,
                    'title': "Sonne",
                    'artist': "Rammstein",
                    'cover': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                    'audio_url': "/tracks/track3.mp3",
                    'duration': "4:05",
                    'last_played': timezone.now().isoformat(),
                    'play_count': 12,
                    'like_count': 23
                }
            ]
        
        return JsonResponse({
            'success': True,
            'tracks': tracks,
            'count': len(tracks),
            'user': user.username if user else None,
            'fetched_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Ошибка в recently_played_tracks: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': 'Ошибка при получении недавно прослушанных треков'
        }, status=500)

# ==================== DEBUG VIEWS ====================

@require_GET
def debug_all_likes(request):
    """Отладочная информация о всех лайках"""
    try:
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        debug_info = {
            'user_authenticated': user is not None,
            'user': user.username if user else None,
            'server_time': timezone.now().isoformat(),
            'models_available': {
                'Track': HAS_TRACK,
                'TrackLike': HAS_TRACK_LIKE,
                'UserTrackInteraction': HAS_USER_TRACK_INTERACTION,
                'CustomUser': True
            }
        }
        
        if HAS_TRACK_LIKE:
            all_likes = TrackLike.objects.all()
            debug_info['track_like_stats'] = {
                'total_likes': all_likes.count(),
                'likes_by_user': list(TrackLike.objects.filter(user=user).values_list('track_id', flat=True)) if user else []
            }
        
        if HAS_USER_TRACK_INTERACTION:
            all_interactions = UserTrackInteraction.objects.all()
            debug_info['user_interaction_stats'] = {
                'total_interactions': all_interactions.count(),
                'likes': all_interactions.filter(liked=True).count(),
                'user_liked_tracks': list(UserTrackInteraction.objects.filter(user=user, liked=True).values_list('track_id', flat=True)) if user else []
            }
        
        if HAS_TRACK:
            debug_info['track_stats'] = {
                'total_tracks': Track.objects.count(),
                'tracks_with_likes': Track.objects.filter(like_count__gt=0).count()
            }
        
        # Получаем данные из запроса
        liked_tracks_param = request.GET.get('liked_tracks', '{}')
        try:
            debug_info['client_liked_tracks'] = json.loads(liked_tracks_param)
        except:
            debug_info['client_liked_tracks'] = {}
        
        return JsonResponse({
            'success': True,
            'debug': debug_info,
            'message': 'Debug information collected'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_GET
def debug_track_data(request):
    """Отладочная информация о данных треков"""
    try:
        track_id = request.GET.get('track_id')
        
        # Получаем пользователя из JWT
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
        debug_info = {
            'track_id': track_id,
            'user_authenticated': user is not None,
            'user': user.username if user else None,
            'server_time': timezone.now().isoformat()
        }
        
        if track_id and HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                debug_info['track_found'] = True
                debug_info['track_info'] = {
                    'id': track.id,
                    'title': track.title,
                    'like_count': track.like_count,
                    'play_count': track.play_count
                }
                
                if HAS_TRACK_LIKE:
                    like_count = TrackLike.objects.filter(track=track).count()
                    debug_info['track_like_stats'] = {
                        'track_like_count': like_count,
                        'user_liked': TrackLike.objects.filter(user=user, track=track).exists() if user else False
                    }
                
                if HAS_USER_TRACK_INTERACTION:
                    interaction_count = UserTrackInteraction.objects.filter(track=track, liked=True).count()
                    debug_info['interaction_stats'] = {
                        'interaction_like_count': interaction_count,
                        'user_interaction': UserTrackInteraction.objects.filter(user=user, track=track).first().liked if user and UserTrackInteraction.objects.filter(user=user, track=track).exists() else None
                    }
                    
            except Track.DoesNotExist:
                debug_info['track_found'] = False
        
        debug_info['database_stats'] = {
            'total_users': CustomUser.objects.count(),
            'total_tracks': Track.objects.count() if HAS_TRACK else 0,
            'total_track_likes': TrackLike.objects.count() if HAS_TRACK_LIKE else 0,
            'total_interactions': UserTrackInteraction.objects.count() if HAS_USER_TRACK_INTERACTION else 0
        }
        
        return JsonResponse({
            'success': True,
            'debug': debug_info,
            'message': 'Track debug information'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_GET
def get_waveform(request, track_id):
    """Получение waveform данных для трека"""
    try:
        # Пробуем найти трек в БД
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                
                # Генерируем waveform если его нет
                if not track.waveform_generated or not track.waveform_data:
                    from .waveform_utils import generate_waveform_for_track
                    from django.utils import timezone
                    
                    waveform = generate_waveform_for_track(track)
                    if waveform:
                        track.waveform_data = waveform
                        track.waveform_generated = True
                        track.waveform_generated_at = timezone.now()
                        track.save(update_fields=['waveform_data', 'waveform_generated', 'waveform_generated_at'])
                
                # Получаем waveform
                waveform_data = track.get_waveform()
                
                if waveform_data:
                    return JsonResponse({
                        'success': True,
                        'track_id': track_id,
                        'waveform': waveform_data,
                        'generated': track.waveform_generated,
                        'generated_at': track.waveform_generated_at.isoformat() if track.waveform_generated_at else None,
                        'source': 'database'
                    })
                
            except Track.DoesNotExist:
                logger.warning(f"Трек {track_id} не найден в БД для waveform")
                pass
        
        # Демо-данные для треков 1-3
        from .waveform_utils import generate_demo_waveform
        
        demo_tracks = [1, 2, 3]
        if int(track_id) in demo_tracks:
            waveform = generate_demo_waveform(int(track_id))
            
            return JsonResponse({
                'success': True,
                'track_id': track_id,
                'waveform': waveform,
                'generated': True,
                'source': 'demo',
                'note': 'Демо-данные для тестовых треков'
            })
        
        # Для других треков генерируем на основе ID
        waveform = generate_demo_waveform(int(track_id) if str(track_id).isdigit() else 0)
        
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'waveform': waveform,
            'generated': True,
            'source': 'generated',
            'note': 'Сгенерировано на основе ID трека'
        })
        
    except Exception as e:
        logger.error(f"❌ Ошибка в get_waveform: {e}")
        
        # Fallback: простой waveform
        import random
        import math
        
        random.seed(int(track_id) if str(track_id).isdigit() else 42)
        waveform = []
        
        for i in range(120):
            base = 30 + 40 * math.sin(i * 0.1)
            noise = random.uniform(-10, 10)
            value = max(10, min(100, base + noise))
            waveform.append(float(value))
        
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'waveform': waveform,
            'generated': True,
            'source': 'fallback',
            'error': str(e)
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_track_duration(request, track_id):
    """Обновление длительности трека"""
    try:
        user = request.user
        
        if HAS_TRACK:
            track = Track.objects.get(id=track_id, uploaded_by=user)
            
            # Определяем длительность из файла
            if track.audio_file:
                try:
                    duration_sec = determine_duration_from_file(track.audio_file.path)
                    
                    # Обновляем трек
                    minutes = int(duration_sec // 60)
                    seconds = int(duration_sec % 60)
                    track.duration = f"{minutes}:{seconds:02d}"
                    track.duration_seconds = int(duration_sec)
                    track.save()
                    
                    return Response({
                        'success': True,
                        'message': f'Длительность обновлена: {track.duration}',
                        'duration': track.duration,
                        'duration_seconds': track.duration_seconds
                    })
                    
                except Exception as e:
                    logger.error(f"Ошибка определения длительности: {e}")
                    return Response({
                        'success': False,
                        'error': f'Не удалось определить длительность: {str(e)}'
                    }, status=500)
            else:
                return Response({
                    'success': False,
                    'error': 'У трека нет аудио файла'
                }, status=400)
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)