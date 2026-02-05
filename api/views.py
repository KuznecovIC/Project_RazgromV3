# api/views.py
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
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
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

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging
from django.db import transaction
import re

# 🔥 ВАЖНО: ИМПОРТ СЕРИАЛИЗАТОРОВ
from .serializers import (
    TrackSerializer, CompactTrackSerializer, PlayerTrackSerializer,
    UserProfileSerializer, UserProfileFullSerializer, HeaderImageUploadSerializer,
    GridScanColorUpdateSerializer, UserMeSerializer, AvatarUploadSerializer,
    AvatarResponseSerializer, UserMinimalSerializer, PublicUserSerializer,
    CompactUserSerializer, UploadedTracksSerializer, TrackCreateSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()

# ==================== МОДЕЛИ ====================
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
    from .models import CustomUser
    
    try:
        from .models import Track
        HAS_TRACK = True
    except ImportError:
        pass
    
    try:
        from .models import TrackLike
        HAS_TRACK_LIKE = True
    except ImportError:
        pass
    
    try:
        from .models import UserTrackInteraction
        HAS_USER_TRACK_INTERACTION = True
    except ImportError:
        pass
    
    try:
        from .models import PasswordResetToken
        HAS_PASSWORD_RESET_TOKEN = True
    except ImportError:
        pass
    
    try:
        from .models import Follow
        HAS_FOLLOW = True
    except ImportError:
        pass
    
    try:
        from .models import TrackRepost
        HAS_TRACK_REPOST = True
    except ImportError:
        pass
    
    try:
        from .models import Hashtag
        HAS_HASHTAG = True
    except ImportError:
        pass
    
    try:
        from .models import PlayHistory
        HAS_PLAY_HISTORY = True
    except ImportError:
        pass
    
    try:
        from .models import Comment
        HAS_COMMENT = True
    except ImportError:
        pass
    
    try:
        from .models import TrackComment
        HAS_TRACK_COMMENT = True
    except ImportError:
        pass
    
except Exception as e:
    import traceback
    traceback.print_exc()

# ==================== НАСТРОЙКИ EMAIL ====================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = 'noreply@musicplatform.dev'

# ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
def verify_turnstile_token(token, remote_ip=None):
    if os.getenv('DEBUG', 'True') == 'True' or settings.DEBUG:
        return True
    
    secret_key = os.getenv('TURNSTILE_SECRET_KEY')
    
    if not secret_key:
        return False
    
    if not token or token == 'dev_token':
        return False
    
    try:
        data = {'secret': secret_key, 'response': token}
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

def generate_reset_token():
    return secrets.token_urlsafe(32)

def send_password_reset_code_email(email, code):
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

def get_time_ago_str(timestamp):
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

def generate_demo_waveform(track_id):
    import numpy as np
    
    np.random.seed(track_id)
    
    num_bars = 120
    base_frequency = 0.15 + (track_id * 0.02)
    
    base_wave = [40 + 40 * np.sin(i * base_frequency) for i in range(num_bars)]
    
    if track_id == 1:
        noise = [5 * np.random.random() for _ in range(num_bars)]
    elif track_id == 2:
        noise = [15 * np.random.random() for _ in range(num_bars)]
    else:
        noise = [10 * np.random.random() for _ in range(num_bars)]
    
    waveform = [base_wave[i] + noise[i] for i in range(num_bars)]
    
    waveform = [max(10, min(100, int(val))) for val in waveform]
    
    return waveform

def ensure_waveform_for_track(track):
    try:
        if track.waveform_generated and track.waveform_data:
            return track.waveform_data
        
        waveform_data = generate_demo_waveform(track.id)
        
        track.waveform_data = waveform_data
        track.waveform_generated = True
        track.save(update_fields=['waveform_data', 'waveform_generated'])
        
        return waveform_data
        
    except Exception:
        return generate_demo_waveform(track.id)

# ==================== ФУНКЦИИ ДЛЯ HEADER IMAGE ====================
def extract_dominant_color(image_file):
    """Извлекает доминирующий цвет из header image"""
    try:
        image_file.seek(0)
        
        img = Image.open(image_file)
        img.thumbnail((100, 100))
        
        if img.mode not in ['RGB', 'RGBA']:
            img = img.convert('RGB')
        elif img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            img = background
        
        colors = img.getcolors(maxcolors=10000)
        if colors:
            colors.sort(key=lambda x: x[0], reverse=True)
            dominant_color = colors[0][1]
        else:
            img_array = np.array(img)
            pixels = img_array.reshape(-1, 3)
            
            kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            labels = kmeans.labels_
            unique_labels, counts = np.unique(labels, return_counts=True)
            dominant_idx = unique_labels[np.argmax(counts)]
            dominant_color = kmeans.cluster_centers_[dominant_idx].astype(int)
        
        hex_color = '#{:02x}{:02x}{:02x}'.format(
            int(dominant_color[0]),
            int(dominant_color[1]),
            int(dominant_color[2])
        )
        
        return hex_color.lower()
        
    except Exception as e:
        logger.error(f"Error extracting dominant color: {e}")
        return '#7c3aed'

def hsl_to_hex(h, s, l):
    """Конвертация HSL в HEX"""
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    
    if 0 <= h < 60:
        r, g, b = c, x, 0
    elif 60 <= h < 120:
        r, g, b = x, c, 0
    elif 120 <= h < 180:
        r, g, b = 0, c, x
    elif 180 <= h < 240:
        r, g, b = 0, x, c
    elif 240 <= h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    
    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)
    
    return f'#{r:02x}{g:02x}{b:02x}'

def get_color_scheme(hex_color):
    """Генерация цветовой схемы на основе доминирующего цвета"""
    try:
        hex_color = hex_color.lstrip('#')
        if len(hex_color) != 6:
            return get_default_color_scheme()
        
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        
        r_norm = r / 255.0
        g_norm = g / 255.0
        b_norm = b / 255.0
        
        c_max = max(r_norm, g_norm, b_norm)
        c_min = min(r_norm, g_norm, b_norm)
        delta = c_max - c_min
        
        if delta == 0:
            h = 0
        elif c_max == r_norm:
            h = 60 * (((g_norm - b_norm) / delta) % 6)
        elif c_max == g_norm:
            h = 60 * (((b_norm - r_norm) / delta) + 2)
        else:
            h = 60 * (((r_norm - g_norm) / delta) + 4)
        
        l = (c_max + c_min) / 2
        
        s = 0 if delta == 0 else delta / (1 - abs(2 * l - 1))
        
        color_scheme = {
            'primary': f'#{hex_color}',
            'light': hsl_to_hex(h, s, min(l + 0.2, 1)),
            'lighter': hsl_to_hex(h, s, min(l + 0.3, 1)),
            'dark': hsl_to_hex(h, s, max(l - 0.2, 0)),
            'darker': hsl_to_hex(h, s, max(l - 0.3, 0)),
            'complementary': hsl_to_hex((h + 180) % 360, s, l),
            'analogous_1': hsl_to_hex((h + 30) % 360, s, l),
            'analogous_2': hsl_to_hex((h - 30) % 360, s, l),
            'triadic_1': hsl_to_hex((h + 120) % 360, s, l),
            'triadic_2': hsl_to_hex((h + 240) % 360, s, l),
            'monochromatic_1': hsl_to_hex(h, max(s - 0.3, 0.1), l),
            'monochromatic_2': hsl_to_hex(h, min(s + 0.3, 1), l),
        }
        
        color_scheme.update({
            'bg_primary': color_scheme['primary'],
            'bg_light': color_scheme['light'],
            'text_on_primary': '#ffffff' if l < 0.6 else '#000000',
            'text_on_light': '#000000',
            'border': color_scheme['dark'],
            'hover': color_scheme['light'],
            'active': color_scheme['darker'],
            'gradient_start': color_scheme['primary'],
            'gradient_end': color_scheme['complementary'],
        })
        
        return color_scheme
        
    except:
        return get_default_color_scheme()

def get_default_color_scheme():
    """Возвращает цветовую схему по умолчанию"""
    return {
        'primary': '#7c3aed',
        'light': '#a78bfa',
        'lighter': '#c4b5fd',
        'dark': '#5b21b6',
        'darker': '#4c1d95',
        'complementary': '#3aed7c',
        'analogous_1': '#ed7c3a',
        'analogous_2': '#7c3aed',
        'triadic_1': '#3aed7c',
        'triadic_2': '#ed3a7c',
        'monochromatic_1': '#a78bfa',
        'monochromatic_2': '#5b21b6',
        'bg_primary': '#7c3aed',
        'bg_light': '#a78bfa',
        'text_on_primary': '#ffffff',
        'text_on_light': '#000000',
        'border': '#5b21b6',
        'hover': '#a78bfa',
        'active': '#4c1d95',
        'gradient_start': '#7c3aed',
        'gradient_end': '#3aed7c',
    }

# ==================== AVATAR UPLOAD FUNCTION ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """Загрузка аватара пользователя - оптимизированная версия"""
    try:
        user = request.user
        logger.info(f"Загрузка аватара для пользователя {user.username}")
        
        # Проверяем наличие файла
        if 'avatar' not in request.FILES:
            return Response({
                'success': False,
                'error': 'Файл аватара не найден'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        avatar_file = request.FILES['avatar']
        
        # Проверяем размер файла (макс 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if avatar_file.size > max_size:
            return Response({
                'success': False,
                'error': f'Файл слишком большой. Максимальный размер: {max_size // (1024*1024)}MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Проверяем тип файла
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response({
                'success': False,
                'error': f'Неподдерживаемый формат изображения. Разрешены: {", ".join(allowed_types)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Удаляем старый аватар если существует
        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except Exception as e:
                logger.warning(f"Не удалось удалить старый аватар: {e}")
        
        # Сохраняем новый аватар
        user.avatar = avatar_file
        user.updated_at = timezone.now()
        user.save(update_fields=['avatar', 'updated_at'])
        
        # Получаем абсолютный URL
        avatar_url = request.build_absolute_uri(user.avatar.url) if user.avatar else None
        
        logger.info(f"Аватар успешно загружен для {user.username}: {avatar_url}")
        
        return Response({
            'success': True,
            'message': 'Аватар успешно загружен',
            'avatar_url': avatar_url,
            'user': {
                'id': user.id,
                'username': user.username,
                'avatar_url': avatar_url
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка загрузки аватара: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера',
            'details': str(e) if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_avatar(request):
    """Удаление аватара пользователя"""
    try:
        user = request.user
        
        if not user.avatar:
            return Response({
                'success': False,
                'error': 'У вас нет аватара для удаления'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Удаляем файл аватара
        user.avatar.delete(save=False)
        user.avatar = None
        user.save(update_fields=['avatar', 'updated_at'])
        
        logger.info(f"Аватар удален для пользователя {user.username} (ID: {user.id})")
        
        return Response({
            'success': True,
            'message': 'Аватар успешно удален',
            'user_id': user.id,
            'user': {
                'id': user.id,
                'username': user.username,
                'avatar_url': None
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка удаления аватара: {e}")
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера при удалении аватара'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_avatar(request):
    """Получение информации об аватаре текущего пользователя"""
    try:
        user = request.user
        
        avatar_url = None
        if user.avatar:
            avatar_url = request.build_absolute_uri(user.avatar.url)
        
        return Response({
            'success': True,
            'avatar': {
                'url': avatar_url,
                'has_avatar': bool(user.avatar),
                'updated_at': user.updated_at.isoformat() if user.updated_at else None
            },
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка получения аватара: {e}")
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== API ENDPOINTS ====================

@require_POST
def verify_turnstile_endpoint(request):
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
        
@csrf_exempt
@require_POST
def register_user(request):
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        captcha_token = data.get('captcha_token', '')
        
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
        
        user = CustomUser.objects.create_user(
            email=email,
            username=username,
            password=password
        )
        
        logger.info(f"Пользователь зарегистрирован: {username} ({email})")
        
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
            С любовью к музыке
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
    try:
        data = request.data
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)
        
        if not email or not password:
            return Response({
                'success': False,
                'error': 'Email и пароль обязательны'
            }, status=400)
        
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
        
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
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
                'avatar': user.avatar.url if user.avatar else None,
                'bio': user.bio,
                'header_image_url': user.get_header_image_url(),
                'gridscan_color': user.gridscan_color,
                'header_updated_at': user.header_updated_at.isoformat() if user.header_updated_at else None
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
    try:
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
    try:
        user = request.user
        
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
                'avatar': user.avatar.url if user.avatar else None,
                'bio': user.bio,
                'created_at': user.created_at.isoformat(),
                'email_verified': user.email_verified,
                'stats': {
                    'liked_tracks': liked_tracks_count,
                    'playlists': playlists_count,
                    'tracks_uploaded': 0
                },
                'header_image_url': user.get_header_image_url(),
                'gridscan_color': user.gridscan_color,
                'header_updated_at': user.header_updated_at.isoformat() if user.header_updated_at else None
            }
        })
    except Exception as e:
        logger.error(f"Ошибка при получении профиля: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@require_POST
def password_reset_request(request):
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'Email обязателен'
            }, status=400)
        
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': True,
                'message': 'Если email существует, код отправлен'
            })
        
        import random
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        if HAS_PASSWORD_RESET_TOKEN:
            PasswordResetToken.objects.filter(user=user).delete()
            expires_at = timezone.now() + timedelta(minutes=5)
            reset_token = PasswordResetToken.objects.create(
                user=user,
                token=generate_reset_token(),
                reset_code=code,
                expires_at=expires_at
            )
        
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
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            return JsonResponse({
                'success': False,
                'error': 'Email и код обязательны'
            }, status=400)
        
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
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
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
        
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Пользователь не найден'
            }, status=404)
        
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
        
        user.set_password(password)
        user.save()
        
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

@require_GET
def health_check(request):
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request):
    try:
        user = request.user
        
        data = request.data
        track_id = data.get('track_id')
        liked = data.get('liked')
        
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
            try:
                track = Track.objects.get(id=track_id_int)
            except Track.DoesNotExist:
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
                'message': f'Трек {track_id_int} успешно обработан',
                'track_id': track_id_int,
                'liked': liked_bool,
                'like_count': like_count,
                'user_has_liked': user_has_liked,
                'user': user.username,
                'timestamp': timezone.now().isoformat()
            })
        else:
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

# 🔥 ИСПРАВЛЕННЫЙ get_track_info - теперь использует PlayerTrackSerializer
@require_GET
def get_track_info(request, track_id):
    try:
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
        
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                
                if user:
                    try:
                        user_liked = TrackLike.objects.filter(user=user, track=track).exists()
                    except:
                        user_liked = False
                
                # 🔥 ИСПРАВЛЕНО: Используем PlayerTrackSerializer
                serializer = PlayerTrackSerializer(
                    track,
                    context={'request': request}
                )
                
                # Добавляем user_liked к данным
                track_data = serializer.data
                track_data['user_liked'] = user_liked
                track_data['success'] = True
                
                logger.info(f"Трек {track_id} из БД: {track.title}")
                return JsonResponse(track_data)
                
            except Track.DoesNotExist:
                logger.warning(f"Трек {track_id} не найден в БД")
                pass
        
        # Fallback для демо треков
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
                'uploaded_by': {'id': 1, 'username': 'griffinilla', 'avatar_url': None},
                'hashtags': ["#slowed", "#lofi"],
                'source': 'demo',
                'user_liked': False
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
                'uploaded_by': {'id': 2, 'username': 'Rammstein', 'avatar_url': None},
                'hashtags': ["#industrial", "#metal"],
                'source': 'demo',
                'user_liked': False
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
                'uploaded_by': {'id': 2, 'username': 'Rammstein', 'avatar_url': None},
                'hashtags': ["#industrial", "#rock"],
                'source': 'demo',
                'user_liked': False
            }
        }
        
        track_id_int = int(track_id) if str(track_id).isdigit() else 0
        
        if track_id_int in demo_data:
            track = demo_data[track_id_int]
            return JsonResponse(track)
        else:
            return JsonResponse({
                'error': 'Трек не найден',
                'message': f'Трек с ID {track_id} не существует',
                'track_id': track_id,
                'source': 'not_found'
            }, status=404)
        
    except Exception as e:
        logger.error(f"Ошибка в get_track_info: {e}")
        return JsonResponse({
            'error': str(e),
            'message': 'Ошибка при получении информации о треке'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def repost_track(request):
    try:
        user = request.user
        data = request.data
        track_id = data.get('track_id')
        comment = data.get('comment', '')
        
        if not track_id:
            return Response({
                'success': False,
                'error': 'track_id обязателен'
            }, status=400)
        
        if HAS_TRACK and HAS_TRACK_REPOST:
            track = Track.objects.get(id=track_id, status='published')
            
            if TrackRepost.objects.filter(user=user, track=track).exists():
                return Response({
                    'success': False,
                    'error': 'Вы уже репостили этот трек'
                }, status=400)
            
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

@require_POST
def record_play(request):
    try:
        data = json.loads(request.body)
        track_id = data.get('track_id')
        
        if not track_id:
            return JsonResponse({
                'success': False,
                'error': 'track_id обязателен'
            }, status=400)
        
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
            
            counted = False
            
            if user and HAS_PLAY_HISTORY:
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                has_played_today = PlayHistory.objects.filter(
                    user=user,
                    track=track,
                    played_at__gte=today_start
                ).exists()
                
                if not has_played_today:
                    track.play_count = (track.play_count if hasattr(track, 'play_count') else 0) + 1
                    track.save()
                    
                    PlayHistory.objects.create(user=user, track=track)
                    counted = True
            else:
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_track(request):
    if request.method != 'POST':
        return Response({'error': 'Метод не разрешен'}, status=405)
    
    try:
        user = request.user
        logger.info(f"Загрузка трека пользователем {user.username}")
        
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
        
        if 'audio_file' not in request.FILES:
            return Response({'error': 'Аудио файл обязателен'}, status=400)
        
        audio_file = request.FILES['audio_file']
        
        if audio_file.size > 50 * 1024 * 1024:
            return Response({'error': 'Файл слишком большой (макс 50MB)'}, status=400)
        
        allowed_extensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac']
        file_ext = os.path.splitext(audio_file.name)[1].lower()
        
        if file_ext not in allowed_extensions:
            return Response({'error': f'Неподдерживаемый формат. Разрешены: {", ".join(allowed_extensions)}'}, status=400)
        
        cover_file = request.FILES.get('cover')
        cover_url = request.POST.get('cover_url', '')
        
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
        
        if cover_file:
            track.cover = cover_file
        elif cover_url:
            track.cover_url = cover_url
        
        track.save()
        
        try:
            audio_path = track.audio_file.path
            logger.info(f"Определение длительности для файла: {audio_path}")
            
            duration_sec = 0
            
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(audio_path)
                duration_sec = len(audio) / 1000.0
                logger.info(f"Длительность определена через pydub: {duration_sec:.2f} секунд")
                
            except Exception as pydub_error:
                logger.warning(f"pydub не удался: {pydub_error}")
                
                try:
                    import librosa
                    y, sr = librosa.load(audio_path, sr=None, duration=None)
                    duration_sec = librosa.get_duration(y=y, sr=sr)
                    logger.info(f"Длительность определена через librosa: {duration_sec:.2f} секунд")
                    
                except Exception as librosa_error:
                    logger.warning(f"librosa не удался: {librosa_error}")
                    
                    if file_ext == '.wav':
                        try:
                            import wave
                            with wave.open(audio_path, 'rb') as wav_file:
                                frames = wav_file.getnframes()
                                rate = wav_file.getframerate()
                                duration_sec = frames / float(rate)
                                logger.info(f"Длительность определена через wave: {duration_sec:.2f} секунд")
                        except Exception as wave_error:
                            logger.warning(f"wave не удался: {wave_error}")
                    
                    try:
                        import subprocess
                        cmd = ['ffprobe', '-v', 'error', '-show_entries', 
                              'format=duration', '-of', 
                              'default=noprint_wrappers=1:nokey=1', audio_path]
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                        if result.returncode == 0:
                            duration_sec = float(result.stdout.strip())
                            logger.info(f"Длительность определена через ffprobe: {duration_sec:.2f} секунд")
                        else:
                            logger.warning(f"ffprobe вернул ошибку: {result.stderr}")
                    except Exception as ffprobe_error:
                        logger.warning(f"ffprobe не удался: {ffprobe_error}")
            
            if duration_sec and duration_sec > 0:
                minutes = int(duration_sec // 60)
                seconds = int(duration_sec % 60)
                track.duration = f"{minutes}:{seconds:02d}"
                
                if hasattr(track, 'duration_seconds'):
                    track.duration_seconds = int(duration_sec)
                
                track.bitrate = int(audio_file.size * 8 / duration_sec / 1000) if duration_sec > 0 else 0
                
                try:
                    import librosa
                    y, sr = librosa.load(audio_path, sr=None, duration=1)
                    track.sample_rate = sr
                except:
                    track.sample_rate = 44100
                
                logger.info(f"Длительность определена: {track.duration} ({duration_sec:.2f} секунд)")
            else:
                logger.warning(f"Длительность не определена или равна 0: {duration_sec}")
                track.duration = "0:00"
                track.bitrate = 0
                track.sample_rate = 0
                
        except Exception as e:
            logger.error(f"Ошибка определения длительности: {e}")
            track.duration = "0:00"
            track.bitrate = 0
            track.sample_rate = 0
        
        track.save(update_fields=['duration', 'duration_seconds', 'bitrate', 'sample_rate'])
        
        # ГЕНЕРАЦИЯ WAVEFORM ПРИ ЗАГРУЗКЕ
        try:
            from .waveform_utils import generate_waveform_for_track
            if track.audio_file or track.audio_url:
                generate_waveform_for_track(track)
                logger.info(f"Waveform сгенерирован для трека {track.id} при загрузке")
        except ImportError as e:
            logger.warning(f"Не удалось импортировать waveform_utils: {e}")
        except Exception as e:
            logger.error(f"Ошибка генерации waveform при загрузке: {e}")
        
        if hashtags and HAS_HASHTAG:
            tags_list = [tag.strip().replace('#', '') for tag in hashtags.split() if tag.strip()]
            for tag_name in tags_list:
                if tag_name:
                    tag, created = Hashtag.objects.get_or_create(
                        name=tag_name.lower(),
                        defaults={'slug': tag_name.lower()}
                    )
                    track.hashtags.add(tag)
        
        logger.info(f"Трек создан: ID {track.id}, статус: {track.status}, длительность: {track.duration}")
        
        # 🔥 ИСПРАВЛЕНО: Используем TrackSerializer для ответа
        serializer = TrackSerializer(
            track,
            context={'request': request}
        )
        
        response_data = {
            'success': True,
            'message': 'Трек успешно загружен',
            'track': serializer.data
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Ошибка загрузки трека: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': f'Ошибка загрузки: {str(e)}'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_track(request, track_id):
    try:
        if HAS_TRACK:
            track = Track.objects.get(id=track_id, uploaded_by=request.user)
            
            conditions = []
            
            if not track.audio_file and not track.audio_url:
                conditions.append('Добавьте аудио файл или ссылку на аудио')
            
            if conditions:
                return Response({
                    'success': False,
                    'error': 'Не выполнены условия публикации',
                    'conditions': conditions
                }, status=400)
            
            track.status = 'published'
            track.published_at = timezone.now()
            track.save()
            
            if track.cover_url and not track.cover:
                try:
                    response = requests.get(track.cover_url, timeout=10)
                    if response.status_code == 200:
                        ext = track.cover_url.split('.')[-1].split('?')[0]
                        if len(ext) > 4:
                            ext = 'jpg'
                        
                        filename = f"cover_{track.id}_{int(timezone.now().timestamp())}.{ext}"
                        track.cover.save(filename, ContentFile(response.content))
                        track.save()
                        logger.info(f"Обложка скачана и сохранена для трека {track.id}")
                except Exception as e:
                    logger.warning(f"Не удалось скачать обложку: {e}")
            
            # ГЕНЕРАЦИЯ WAVEFORM ПРИ ПУБЛИКАЦИИ
            if not track.waveform_generated:
                try:
                    from .waveform_utils import generate_waveform_for_track
                    generate_waveform_for_track(track)
                    logger.info(f"Waveform сгенерирован для трека {track.id} при публикации")
                except ImportError as e:
                    logger.warning(f"Не удалось импортировать waveform_utils: {e}")
                    # Резервный вариант - демо waveform
                    from .waveform_utils import generate_demo_waveform
                    waveform = generate_demo_waveform(track.id)
                    track.waveform_data = waveform
                    track.waveform_generated = True
                    track.save(update_fields=['waveform_data', 'waveform_generated'])
                    logger.info(f"Демо waveform создан для трека {track.id}")
                except Exception as e:
                    logger.error(f"Ошибка генерации waveform при публикации: {e}")
            
            # 🔥 ИСПРАВЛЕНО: Используем TrackSerializer для ответа
            serializer = TrackSerializer(
                track,
                context={'request': request}
            )
            
            return Response({
                'success': True,
                'message': 'Трек успешно опубликован!',
                'track': serializer.data
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

@require_GET
def get_trending_hashtags(request):
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
            
            # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
            serializer = CompactTrackSerializer(
                tracks_qs,
                many=True,
                context={'request': request}
            )
            
            tag_info = {
                'name': tag.name,
                'slug': tag.slug,
                'usage_count': tag.usage_count
            }
            
            return JsonResponse({
                'success': True,
                'hashtag': tag_info,
                'tracks': serializer.data,
                'count': len(serializer.data)
            })
        else:
            tag_info = {
                'name': hashtag,
                'slug': hashtag.lower(),
                'usage_count': 50
            }
            
            demo_tracks = []
            for i in range(1, 6):
                demo_tracks.append({
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
                        'username': 'demo_uploader',
                        'avatar_url': None
                    },
                    'hashtags': [hashtag],
                    'published_at': timezone.now().isoformat()
                })
            
            return JsonResponse({
                'success': True,
                'hashtag': tag_info,
                'tracks': demo_tracks,
                'count': len(demo_tracks)
            })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@require_GET
def get_track_comments(request, track_id):
    try:
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
                        'avatar': comment.user.avatar.url if comment.user.avatar else None
                    },
                    'text': comment.text,
                    'timestamp': get_time_ago_str(comment.created_at),
                    'likes': comment.like_count if hasattr(comment, 'like_count') else 0,
                    'is_mine': is_mine,
                    'user_liked': user_liked,
                    'created_at': comment.created_at.isoformat()
                })
        else:
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
                
                user_liked = False
                if user:
                    try:
                        user_liked = False
                    except:
                        user_liked = False
                
                comments.append({
                    'id': comment.id,
                    'user': {
                        'id': comment.user.id,
                        'username': comment.user.username,
                        'avatar': comment.user.avatar.url if comment.user.avatar else None
                    },
                    'text': comment.text,
                    'timestamp': get_time_ago_str(comment.created_at),
                    'likes': comment.likes_count,
                    'is_mine': is_mine,
                    'user_liked': user_liked,
                    'created_at': comment.created_at.isoformat()
                })
        
        if not comments:
            demo_users = [
                {'id': 1, 'username': 'musiclover42', 'avatar': None},
                {'id': 2, 'username': 'synthwavefan', 'avatar': None},
                {'id': 3, 'username': 'djproducer', 'avatar': None}
            ]
            
            demo_texts = [
                'This track is amazing! The production quality is incredible.',
                'The bassline in this is fire!',
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
    try:
        data = request.data
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
            
            comment = TrackComment.objects.create(
                user=user,
                track=track,
                text=text
            )
            
            new_comment = {
                'id': comment.id,
                'user': {
                    'username': user.username,
                    'avatar': user.avatar.url if user.avatar else None
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
            new_comment = {
                'id': int(timezone.now().timestamp()),
                'user': {
                    'username': user.username,
                    'avatar': user.avatar.url if user.avatar else None
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

@require_POST
def debug_like(request):
    try:
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

# 🔥 ИСПРАВЛЕННЫЙ get_tracks - теперь использует CompactTrackSerializer
@require_GET
def get_tracks(request):
    try:
        if HAS_TRACK:
            published_tracks = Track.objects.filter(status='published').order_by('-created_at')[:20]
            
            # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
            serializer = CompactTrackSerializer(
                published_tracks,
                many=True,
                context={'request': request}
            )
            
            return JsonResponse({
                'success': True,
                'tracks': serializer.data,
                'count': len(serializer.data),
                'fetched_at': timezone.now().isoformat()
            })
        
        # Fallback для демо
        demo_tracks = [
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
                    'username': 'demo_user',
                    'avatar_url': None
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
                    'username': 'demo_user',
                    'avatar_url': None
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
                    'username': 'demo_user',
                    'avatar_url': None
                }
            }
        ]
        
        return JsonResponse({
            'success': True,
            'tracks': demo_tracks,
            'count': len(demo_tracks),
            'fetched_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': 'Ошибка при получении списка треков'
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_comment(request, comment_id):
    try:
        user = request.user
        
        if not user.is_authenticated:
            return Response({
                'success': False,
                'error': 'Требуется авторизация'
            }, status=401)
        
        try:
            comment = TrackComment.objects.get(id=comment_id)
        except TrackComment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Комментарий не найден'
            }, status=404)
        
        if comment.is_deleted:
            return Response({
                'success': False,
                'error': 'Комментарий удален'
            }, status=410)
        
        liked_param = request.data.get('liked', None)
        
        is_currently_liked = comment.likes.filter(id=user.id).exists()
        
        if liked_param is not None:
            if liked_param and not is_currently_liked:
                comment.likes.add(user)
                liked = True
            elif not liked_param and is_currently_liked:
                comment.likes.remove(user)
                liked = False
            else:
                liked = is_currently_liked
        else:
            if is_currently_liked:
                comment.likes.remove(user)
                liked = False
            else:
                comment.likes.add(user)
                liked = True
        
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
        print(f"Ошибка в like_comment: {str(e)}")
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
    try:
        user = request.user
        
        comment = None
        deleted = False
        
        try:
            if HAS_TRACK_COMMENT:
                comment = TrackComment.objects.get(id=comment_id, user=user)
                comment.soft_delete()
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
    try:
        user = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(auth_header.split(' ')[1])
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None
        
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

# 🔥 ИСПРАВЛЕННЫЙ get_liked_tracks - теперь использует CompactTrackSerializer
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_liked_tracks(request):
    try:
        user = request.user
        
        liked_tracks = []
        
        if HAS_TRACK_LIKE:
            likes = TrackLike.objects.filter(user=user).select_related('track')
            tracks = [like.track for like in likes]
            
            # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
            serializer = CompactTrackSerializer(
                tracks,
                many=True,
                context={'request': request}
            )
            
            # Добавляем liked_at время
            tracks_data = serializer.data
            for i, track_data in enumerate(tracks_data):
                track_data['liked_at'] = likes[i].liked_at.isoformat()
            
            return Response({
                'success': True,
                'tracks': tracks_data,
                'count': len(tracks_data),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'fetched_at': timezone.now().isoformat()
            })
        
        elif HAS_USER_TRACK_INTERACTION:
            interactions = UserTrackInteraction.objects.filter(user=user, liked=True).select_related('track')
            tracks = [interaction.track for interaction in interactions]
            
            # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
            serializer = CompactTrackSerializer(
                tracks,
                many=True,
                context={'request': request}
            )
            
            # Добавляем liked_at время
            tracks_data = serializer.data
            for i, track_data in enumerate(tracks_data):
                track_data['liked_at'] = interactions[i].liked_at.isoformat()
            
            return Response({
                'success': True,
                'tracks': tracks_data,
                'count': len(tracks_data),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                },
                'fetched_at': timezone.now().isoformat()
            })
        
        # Fallback для демо
        demo_tracks = [
            {
                'id': 1,
                'title': "hard drive (slowed & muffled)",
                'artist': "griffinilla",
                'cover_url': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg",
                'audio_url': "/tracks/track1.mp3",
                'duration': "3:20",
                'play_count': 1234,
                'like_count': 56,
                'liked_at': timezone.now().isoformat(),
                'uploaded_by': {
                    'id': 1,
                    'username': 'griffinilla',
                    'avatar_url': None
                }
            },
            {
                'id': 2,
                'title': "Deutschland",
                'artist': "Rammstein",
                'cover_url': "https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg",
                'audio_url': "/tracks/track2.mp3",
                'duration': "5:22",
                'play_count': 876,
                'like_count': 34,
                'liked_at': timezone.now().isoformat(),
                'uploaded_by': {
                    'id': 2,
                    'username': 'Rammstein',
                    'avatar_url': None
                }
            }
        ]
        
        return Response({
            'success': True,
            'tracks': demo_tracks,
            'count': len(demo_tracks),
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

@require_GET
def get_track_waveform(request, track_id):
    try:
        if not HAS_TRACK:
            demo_waveform = generate_demo_waveform(track_id)
            return JsonResponse({
                'success': True,
                'track_id': track_id,
                'waveform': demo_waveform,
                'generated': False,
                'message': 'Demo waveform (Track model not available)'
            })
        
        try:
            track = Track.objects.get(id=track_id)
        except Track.DoesNotExist:
            track = create_demo_track(track_id)
        
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
        demo_waveform = generate_demo_waveform(track_id)
        return JsonResponse({
            'success': True,
            'track_id': track_id,
            'waveform': demo_waveform,
            'generated': False,
            'error': str(e),
            'message': 'Using demo waveform due to error'
        })

@require_GET
def get_uploaded_tracks(request):
    try:
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
            
            # 🔥 ИСПРАВЛЕНО: Используем UploadedTracksSerializer
            serializer = UploadedTracksSerializer(
                tracks,
                many=True,
                context={'request': request}
            )
            
            return JsonResponse({
                'success': True,
                'tracks': serializer.data,
                'count': len(serializer.data)
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

# 🔥 ИСПРАВЛЕННЫЙ get_uploaded_tracks_jwt - теперь использует UploadedTracksSerializer
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_uploaded_tracks_jwt(request):
    try:
        user = request.user
        
        logger.info(f"JWT аутентификация успешна для пользователя: {user.username} (ID: {user.id})")
        
        if HAS_TRACK:
            try:
                tracks = Track.objects.filter(
                    uploaded_by=user,
                    status='published'
                ).order_by('-created_at')
                
                logger.info(f"Найдено {tracks.count()} треков пользователя {user.username}")
                
                # 🔥 ИСПРАВЛЕНО: Используем UploadedTracksSerializer
                serializer = UploadedTracksSerializer(
                    tracks,
                    many=True,
                    context={'request': request}
                )
                
                return Response({
                    'success': True,
                    'tracks': serializer.data,
                    'count': len(serializer.data),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'total_uploaded': tracks.count() if HAS_TRACK else len(serializer.data)
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
                logger.error(f"Ошибка при получении треков пользователя {user.username}: {e}")
                return Response({
                    'success': False,
                    'error': f'Ошибка при получении треков: {str(e)}',
                    'user_id': user.id
                }, status=500)
        else:
            logger.warning("Модель Track не доступна")
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
        logger.error(f"Общая ошибка в get_uploaded_tracks: {e}")
        return Response({
            'success': False,
            'error': f'Внутренняя ошибка сервера: {str(e)}',
            'message': 'Пожалуйста, попробуйте позже'
        }, status=500)

# 🔥 ИСПРАВЛЕННЫЙ recently_played_tracks - теперь использует CompactTrackSerializer
@require_GET
def recently_played_tracks(request):
    try:
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
            play_history = PlayHistory.objects.filter(
                user=user
            ).select_related('track').order_by('-played_at')[:10]
            
            tracks = [history.track for history in play_history]
            
            # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
            serializer = CompactTrackSerializer(
                tracks,
                many=True,
                context={'request': request}
            )
            
            # Добавляем last_played время
            tracks_data = serializer.data
            for i, track_data in enumerate(tracks_data):
                track_data['last_played'] = play_history[i].played_at.isoformat()
                track_data['play_history_id'] = play_history[i].id
            
            return JsonResponse({
                'success': True,
                'tracks': tracks_data,
                'count': len(tracks_data),
                'user': user.username if user else None,
                'fetched_at': timezone.now().isoformat()
            })
        
        # Fallback для демо
        demo_tracks = [
            {
                'id': 1,
                'title': "hard drive (slowed & muffled)",
                'artist': "griffinilla",
                'cover': "https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGF8gEyh_MA8=&amp;rs=AOn4CLDjiyHGoELcWa2t37NenbmBQ-JlSw",
                'audio_url': "/tracks/track1.mp3",
                'duration': "3:20",
                'last_played': timezone.now().isoformat(),
                'play_count': 15,
                'like_count': 56,
                'uploaded_by': {
                    'id': 1,
                    'username': 'griffinilla',
                    'avatar_url': None
                }
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
                'like_count': 34,
                'uploaded_by': {
                    'id': 2,
                    'username': 'Rammstein',
                    'avatar_url': None
                }
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
                'like_count': 23,
                'uploaded_by': {
                    'id': 2,
                    'username': 'Rammstein',
                    'avatar_url': None
                }
            }
        ]
        
        return JsonResponse({
            'success': True,
            'tracks': demo_tracks,
            'count': len(demo_tracks),
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

@require_GET
def debug_all_likes(request):
    try:
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
    try:
        track_id = request.GET.get('track_id')
        
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
    try:
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id)
                
                if not track.waveform_generated or not track.waveform_data:
                    from .waveform_utils import generate_waveform_for_track
                    from django.utils import timezone
                    
                    waveform = generate_waveform_for_track(track)
                    if waveform:
                        track.waveform_data = waveform
                        track.waveform_generated = True
                        track.waveform_generated_at = timezone.now()
                        track.save(update_fields=['waveform_data', 'waveform_generated', 'waveform_generated_at'])
                
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
        logger.error(f"Ошибка в get_waveform: {e}")
        
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
    try:
        user = request.user
        
        if HAS_TRACK:
            track = Track.objects.get(id=track_id, uploaded_by=user)
            
            if track.audio_file:
                try:
                    from .audio_utils import determine_duration_from_file
                    duration_sec = determine_duration_from_file(track.audio_file.path)
                    
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_track_waveform(request, track_id):
    try:
        user = request.user
        
        if not HAS_TRACK:
            return Response({
                'success': False,
                'error': 'Модель Track не доступна'
            }, status=500)
        
        track = Track.objects.get(id=track_id)
        
        # Проверяем права доступа
        if track.uploaded_by != user and not user.is_staff:
            return Response({
                'success': False,
                'error': 'У вас нет прав для генерации waveform этого трека'
            }, status=403)
        
        try:
            from .waveform_utils import generate_waveform_for_track
            
            waveform = generate_waveform_for_track(track)
            
            if waveform:
                track.waveform_data = waveform
                track.waveform_generated = True
                track.waveform_generated_at = timezone.now()
                track.save(update_fields=['waveform_data', 'waveform_generated', 'waveform_generated_at'])
                
                return Response({
                    'success': True,
                    'message': 'Waveform успешно сгенерирован',
                    'track_id': track_id,
                    'waveform_generated': True,
                    'waveform_length': len(waveform) if waveform else 0
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Не удалось сгенерировать waveform'
                }, status=500)
                
        except ImportError as e:
            logger.error(f"Не удалось импортировать waveform_utils: {e}")
            return Response({
                'success': False,
                'error': f'Модуль waveform_utils не найден: {str(e)}'
            }, status=500)
        except Exception as e:
            logger.error(f"Ошибка генерации waveform для трека {track_id}: {e}")
            return Response({
                'success': False,
                'error': f'Ошибка генерации waveform: {str(e)}'
            }, status=500)
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        logger.error(f"Ошибка в generate_track_waveform: {e}")
        return Response({
            'success': False,
            'error': f'Внутренняя ошибка сервера: {str(e)}'
        }, status=500)

# ==================== HEADER IMAGE ENDPOINTS ====================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def upload_header(request):
    """
    Единый эндпоинт для обновления header image и/или gridscan_color
    """
    try:
        user = request.user
        
        serializer = HeaderImageUploadSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        header_file = validated_data.get('header_image')
        gridscan_color = validated_data.get('gridscan_color')
        
        update_fields = []
        
        # Обработка header image
        if header_file:
            user.header_image = header_file
            user.header_updated_at = timezone.now()
            update_fields.extend(['header_image', 'header_updated_at'])
            logger.info(f"Header image uploaded for user {user.id}")
        
        # Обработка gridscan_color
        if gridscan_color:
            user.gridscan_color = gridscan_color
            user.header_updated_at = timezone.now()
            update_fields.extend(['gridscan_color', 'header_updated_at'])
            logger.info(f"GridScan color updated for user {user.id}: {gridscan_color}")
        
        # Сохраняем изменения
        if update_fields:
            update_fields.append('updated_at')
            user.save(update_fields=update_fields)
        
        response_serializer = UserMeSerializer(
            user,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'message': 'Данные успешно обновлены',
            'user': response_serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка загрузки header/gridscan: {e}")
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_gridscan_color(request):
    user = request.user
    color = request.data.get("color")

    if not color:
        return Response({"error": "No color provided"}, status=400)

    user.gridscan_color = color
    user.save()

    return Response({
        "success": True,
        "gridscan_color": user.gridscan_color
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_header_image(request):
    user = request.user

    if user.header_image:
        user.header_image.delete(save=False)
        user.header_image = None

    user.gridscan_color = "#000000"

    user.save(update_fields=[
        "header_image",
        "gridscan_color"
    ])

    return Response({
        "success": True,
        "header_image": None,
        "gridscan_color": user.gridscan_color
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserMeSerializer(request.user)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_header_info(request):
    """
    Получение информации о header и GridScan текущего пользователя
    """
    try:
        user = request.user
        
        serializer = UserMeSerializer(
            user,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка получения header info: {e}")
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_me(request):
    """
    Получение профиля текущего пользователя
    URL: /api/users/me/
    """
    try:
        serializer = UserMeSerializer(
            request.user,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка получения профиля текущего пользователя: {e}")
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== НОВЫЕ ФУНКЦИИ ДЛЯ ПУБЛИЧНОГО ПРОФИЛЯ ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_public_profile(request, user_id):
    """
    Получение публичного профиля пользователя по ID
    URL: /api/users/<id>/
    """
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        serializer = PublicUserSerializer(
            user,
            context={'request': request}
        )
        
        data = serializer.data
        
        # Добавляем информацию о подписке
        if request.user and request.user.is_authenticated:
            try:
                from .models import Follow
                data['is_following'] = Follow.objects.filter(
                    follower=request.user,
                    following=user
                ).exists()
            except:
                data['is_following'] = False
            
            data['is_current_user'] = request.user.id == user.id
        else:
            data['is_following'] = False
            data['is_current_user'] = False
        
        return Response({
            'success': True,
            'user': data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка получения публичного профиля: {e}")
        return Response({
            'success': False,
            'error': 'Пользователь не найден'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_by_username(request, username):
    """
    Получение профиля пользователя по username
    URL: /api/users/by-username/<username>/
    """
    try:
        user = get_object_or_404(CustomUser, username=username)
        
        return Response({
            'success': True,
            'redirect': True,
            'user_id': user.id,
            'username': user.username,
            'url': f'/api/users/{user.id}/'
        }, status=status.HTTP_302_FOUND)
        
    except CustomUser.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Пользователь не найден'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_tracks(request, user_id):
    """
    Получение треков пользователя
    URL: /api/users/<id>/tracks/
    """
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        if not HAS_TRACK:
            return Response({
                'success': True,
                'tracks': [],
                'message': 'Модель Track не доступна'
            })
        
        tracks = Track.objects.filter(
            uploaded_by=user,
            status='published'
        ).order_by('-created_at')
        
        # 🔥 ИСПРАВЛЕНО: Используем CompactTrackSerializer
        serializer = CompactTrackSerializer(
            tracks,
            many=True,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'tracks': serializer.data,
            'count': len(serializer.data),
            'user': {
                'id': user.id,
                'username': user.username
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка получения треков пользователя {user_id}: {e}")
        return Response({
            'success': False,
            'error': 'Не удалось получить треки пользователя'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_stats(request, user_id):
    """
    Получение статистики пользователя
    URL: /api/users/<id>/stats/
    """
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        stats = {
            'followers': 0,
            'following': 0,
            'tracks': 0,
            'playlists': 0,
            'total_listens': 0,
            'total_likes': 0,
            'total_reposts': 0
        }
        
        if HAS_FOLLOW:
            stats['followers'] = Follow.objects.filter(following=user).count()
            stats['following'] = Follow.objects.filter(follower=user).count()
        
        if HAS_TRACK:
            tracks = Track.objects.filter(uploaded_by=user, status='published')
            stats['tracks'] = tracks.count()
            stats['total_listens'] = sum(track.play_count for track in tracks)
            stats['total_likes'] = sum(track.like_count for track in tracks)
            stats['total_reposts'] = sum(track.repost_count for track in tracks)
        
        return Response({
            'success': True,
            'user_id': user_id,
            'username': user.username,
            'stats': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики пользователя {user_id}: {e}")
        return Response({
            'success': False,
            'error': 'Не удалось получить статистику'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================== 🔴🔴🔴 КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ: FOLLOW/UNFOLLOW API ====================

# views.py - ФУНКЦИИ СИСТЕМЫ ПОДПИСОК (ИСПРАВЛЕННЫЕ)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import CustomUser, Follow
import logging

logger = logging.getLogger(__name__)

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def follow_unfollow_user(request, user_id):
    """
    Единый эндпоинт для подписки/отписки
    POST /api/users/<user_id>/follow/ - подписаться
    DELETE /api/users/<user_id>/follow/ - отписаться
    
    ✅ ИСПРАВЛЕНО: follower=request.user, following=target_user
    """
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)
        
        # Нельзя подписаться на себя
        if target_user == request.user:
            return Response({
                'success': False,
                'error': 'Нельзя подписаться на себя'
            }, status=400)
        
        if request.method == 'POST':
            # Проверяем, не подписаны ли уже
            already_following = Follow.objects.filter(
                follower=request.user,      # ✅ Я - подписчик
                following=target_user       # ✅ Он - тот, на кого подписываюсь
            ).exists()
            
            if already_following:
                return Response({
                    'success': False,
                    'error': 'Вы уже подписаны на этого пользователя'
                }, status=400)
            
            # ✅ СОЗДАЕМ ПОДПИСКУ С ПРАВИЛЬНЫМ ПОРЯДКОМ
            follow = Follow.objects.create(
                follower=request.user,      # ✅ Я - тот, кто нажал кнопку Follow
                following=target_user       # ✅ Он - на кого нажали
            )
            
            # Обновляем статистику ВРУЧНУЮ
            request.user.update_stats()
            target_user.update_stats()
            
            return Response({
                'success': True,
                'message': f'Вы подписались на {target_user.username}',
                'action': 'followed',
                'follow_id': follow.id,
                'user_stats': {
                    'current_user': {
                        'following_count': request.user.following_count
                    },
                    'target_user': {
                        'followers_count': target_user.followers_count
                    }
                }
            })
            
        elif request.method == 'DELETE':
            # ✅ ИЩЕМ ПОДПИСКУ С ПРАВИЛЬНЫМ ПОРЯДКОМ
            follow_exists = Follow.objects.filter(
                follower=request.user,      # ✅ Ищем где Я - подписчик
                following=target_user       # ✅ Он - на кого я подписан
            ).exists()
            
            if not follow_exists:
                return Response({
                    'success': True,
                    'message': 'Вы не были подписаны на этого пользователя',
                    'action': 'not_followed',
                    'deleted_count': 0
                })
            
            # ✅ УДАЛЯЕМ ПОДПИСКУ С ПРАВИЛЬНЫМ ПОРЯДКОМ
            deleted_count, _ = Follow.objects.filter(
                follower=request.user,      # ✅ Я - подписчик
                following=target_user       # ✅ Он - на кого я подписан
            ).delete()
            
            # Обновляем статистику ВРУЧНУЮ
            request.user.update_stats()
            target_user.update_stats()
            
            return Response({
                'success': True,
                'message': f'Вы отписались от {target_user.username}',
                'action': 'unfollowed',
                'deleted_count': deleted_count,
                'user_stats': {
                    'current_user': {
                        'following_count': request.user.following_count
                    },
                    'target_user': {
                        'followers_count': target_user.followers_count
                    }
                }
            })
                
    except Exception as e:
        logger.error(f"Ошибка в follow_unfollow_user: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Внутренняя ошибка сервера'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_followers(request, user_id):
    """Получение подписчиков пользователя"""
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        # ✅ Правильно: кто подписан НА этого пользователя (following=user)
        followers_relations = Follow.objects.filter(
            following=user  # ✅ Этот пользователь - цель подписки
        ).select_related('follower').order_by('-created_at')
        
        # Пагинация
        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 20)), 50)
        
        from django.core.paginator import Paginator
        paginator = Paginator(followers_relations, per_page)
        
        try:
            followers_page = paginator.page(page)
        except:
            followers_page = paginator.page(1)
        
        followers = []
        for follow in followers_page:
            follower_data = {
                'id': follow.follower.id,
                'username': follow.follower.username,
                'bio': follow.follower.bio,
                'is_artist': follow.follower.is_artist,
                'is_pro': follow.follower.is_pro,
                'followed_at': follow.created_at.isoformat(),
                'notifications_enabled': follow.notifications_enabled
            }
            
            # Добавляем URL аватара
            avatar_url = follow.follower.get_avatar_url()
            if avatar_url:
                follower_data['avatar_url'] = request.build_absolute_uri(avatar_url) if avatar_url.startswith('/') else avatar_url
            else:
                follower_data['avatar_url'] = None
            
            # Проверяем взаимную подписку (если запрос от аутентифицированного пользователя)
            if request.user and request.user.is_authenticated:
                # Подписан ли этот пользователь на меня (request.user)?
                # ✅ Правильно: follower=follow.follower, following=request.user
                follower_data['is_following_back'] = Follow.objects.filter(
                    follower=follow.follower,      # ✅ Он - подписчик
                    following=request.user         # ✅ Я - цель
                ).exists()
                
                # Я подписан на этого пользователя?
                # ✅ Правильно: follower=request.user, following=follow.follower
                follower_data['i_am_following'] = Follow.objects.filter(
                    follower=request.user,         # ✅ Я - подписчик
                    following=follow.follower      # ✅ Он - цель
                ).exists()
            else:
                follower_data['is_following_back'] = False
                follower_data['i_am_following'] = False
            
            followers.append(follower_data)
        
        return Response({
            'success': True,
            'followers': followers,
            'pagination': {
                'current_page': followers_page.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': followers_page.has_next(),
                'has_previous': followers_page.has_previous(),
                'per_page': per_page
            },
            'user': {
                'id': user.id,
                'username': user.username,
                'followers_count': user.followers_count
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка в get_user_followers: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'followers': [],
            'count': 0
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_following(request, user_id):
    """Получение подписок пользователя"""
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        # ✅ Правильно: на кого подписан этот пользователь (follower=user)
        following_relations = Follow.objects.filter(
            follower=user  # ✅ Этот пользователь - подписчик
        ).select_related('following').order_by('-created_at')
        
        # Пагинация
        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 20)), 50)
        
        from django.core.paginator import Paginator
        paginator = Paginator(following_relations, per_page)
        
        try:
            following_page = paginator.page(page)
        except:
            following_page = paginator.page(1)
        
        following = []
        for follow in following_page:
            following_data = {
                'id': follow.following.id,
                'username': follow.following.username,
                'bio': follow.following.bio,
                'is_artist': follow.following.is_artist,
                'is_pro': follow.following.is_pro,
                'followed_at': follow.created_at.isoformat(),
                'notifications_enabled': follow.notifications_enabled
            }
            
            # Добавляем URL аватара
            avatar_url = follow.following.get_avatar_url()
            if avatar_url:
                following_data['avatar_url'] = request.build_absolute_uri(avatar_url) if avatar_url.startswith('/') else avatar_url
            else:
                following_data['avatar_url'] = None
            
            # Проверяем, подписан ли этот пользователь на меня (если запрос от аутентифицированного пользователя)
            if request.user and request.user.is_authenticated:
                # Этот пользователь подписан на меня?
                # ✅ Правильно: follower=follow.following, following=request.user
                following_data['follows_you'] = Follow.objects.filter(
                    follower=follow.following,     # ✅ Он - подписчик
                    following=request.user         # ✅ Я - цель
                ).exists()
                
                # Я подписан на этого пользователя? (должно быть true, но проверяем)
                # ✅ Правильно: follower=request.user, following=follow.following
                following_data['i_am_following'] = Follow.objects.filter(
                    follower=request.user,         # ✅ Я - подписчик
                    following=follow.following     # ✅ Он - цель
                ).exists()
            else:
                following_data['follows_you'] = False
                following_data['i_am_following'] = False
            
            following.append(following_data)
        
        return Response({
            'success': True,
            'following': following,
            'pagination': {
                'current_page': following_page.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': following_page.has_next(),
                'has_previous': following_page.has_previous(),
                'per_page': per_page
            },
            'user': {
                'id': user.id,
                'username': user.username,
                'following_count': user.following_count
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка в get_user_following: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'following': [],
            'count': 0
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_follow_status(request, user_id):
    """Проверяет, подписан ли текущий пользователь на другого пользователя"""
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)
        
        # ✅ Правильно: проверяем подписан ли Я на него
        is_following = Follow.objects.filter(
            follower=request.user,      # ✅ Я - подписчик
            following=target_user       # ✅ Он - цель
        ).exists()
        
        # ✅ Правильно: проверяем подписан ли ОН на меня
        follows_you = Follow.objects.filter(
            follower=target_user,       # ✅ Он - подписчик
            following=request.user      # ✅ Я - цель
        ).exists()
        
        return Response({
            'success': True,
            'is_following': is_following,
            'follows_you': follows_you,
            'mutual_follow': is_following and follows_you,
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'followers_count': target_user.followers_count,
                'following_count': target_user.following_count
            },
            'current_user': {
                'id': request.user.id,
                'username': request.user.username
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка в check_follow_status: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'is_following': False,
            'follows_you': False
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_follow_stats(request, user_id):
    """
    Статистика подписок для конкретного пользователя
    Используется для отладки и проверки
    """
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)
        
        # ✅ Сколько подписчиков у target_user (кто подписан НА него)
        followers_count = Follow.objects.filter(following=target_user).count()
        
        # ✅ На сколько подписан target_user (на кого подписан ОН)
        following_count = Follow.objects.filter(follower=target_user).count()
        
        # ✅ Подписан ли текущий пользователь на target_user
        is_following = Follow.objects.filter(
            follower=request.user,      # ✅ Я - подписчик
            following=target_user       # ✅ Он - цель
        ).exists()
        
        # ✅ Подписан ли target_user на меня
        follows_me = Follow.objects.filter(
            follower=target_user,       # ✅ Он - подписчик
            following=request.user      # ✅ Я - цель
        ).exists()
        
        return Response({
            "success": True,
            "user_id": target_user.id,
            "username": target_user.username,
            "stats": {
                "followers": followers_count,
                "following": following_count,
                "is_following": is_following,
                "follows_me": follows_me,
                "mutual": is_following and follows_me
            },
            "database_counts": {
                "actual_followers": followers_count,
                "actual_following": following_count,
                "cached_followers": target_user.followers_count,
                "cached_following": target_user.following_count
            }
        })
        
    except Exception as e:
        logger.error(f"Ошибка в user_follow_stats: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_follow_suggestions(request):
    """Получение рекомендаций для подписки"""
    try:
        if not request.user.is_authenticated:
            # Для неаутентифицированных пользователей - популярные пользователи
            suggestions = CustomUser.objects.filter(
                is_active=True
            ).order_by('-followers_count')[:10]
        else:
            # Для аутентифицированных - рекомендации на основе подписок друзей
            # Получаем пользователей, на которых подписаны мои подписки
            my_following = Follow.objects.filter(
                follower=request.user      # ✅ Я - подписчик
            ).values_list('following', flat=True)
            
            # Получаем пользователей, на которых подписаны мои подписки, но не я
            from django.db.models import Count
            
            suggestions = CustomUser.objects.exclude(
                id=request.user.id
            ).exclude(
                id__in=my_following
            ).filter(
                is_active=True,
                followers__follower__in=my_following  # ✅ followers (following=user)
            ).annotate(
                mutual_followers=Count('followers')
            ).order_by('-mutual_followers', '-followers_count')[:20]
        
        # Если мало рекомендаций, добавляем популярных пользователей
        if suggestions.count() < 10:
            popular_users = CustomUser.objects.exclude(
                id__in=[u.id for u in suggestions] if suggestions.exists() else []
            ).exclude(
                id=request.user.id if request.user.is_authenticated else None
            ).filter(
                is_active=True
            ).order_by('-followers_count')[:10]
            
            suggestions = list(suggestions) + list(popular_users)
        
        suggestions_data = []
        for user in suggestions[:20]:
            user_data = {
                'id': user.id,
                'username': user.username,
                'bio': user.bio[:100] if user.bio else '',
                'is_artist': user.is_artist,
                'is_pro': user.is_pro,
                'followers_count': user.followers_count,
                'tracks_count': user.tracks_count
            }
            
            # Добавляем URL аватара
            avatar_url = user.get_avatar_url()
            if avatar_url:
                user_data['avatar_url'] = request.build_absolute_uri(avatar_url) if avatar_url.startswith('/') else avatar_url
            else:
                user_data['avatar_url'] = None
            
            # Для аутентифицированных пользователей проверяем, подписан ли я
            if request.user.is_authenticated:
                # ✅ Правильно: проверяем подписан ли Я на него
                user_data['is_following'] = Follow.objects.filter(
                    follower=request.user,   # ✅ Я - подписчик
                    following=user           # ✅ Он - цель
                ).exists()
            else:
                user_data['is_following'] = False
            
            suggestions_data.append(user_data)
        
        return Response({
            'success': True,
            'suggestions': suggestions_data,
            'count': len(suggestions_data)
        })
        
    except Exception as e:
        logger.error(f"Ошибка в get_follow_suggestions: {e}")
        return Response({
            'success': False,
            'error': str(e),
            'suggestions': [],
            'count': 0
        }, status=500)


# 🛠️ ФУНКЦИЯ ДЛЯ ОЧИСТКИ И ПЕРЕСОЗДАНИЯ ПОДПИСОК (ДЛЯ ТЕСТИРОВАНИЯ)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def debug_fix_follows(request):
    """
    Отладочная функция для очистки и пересоздания подписок
    Используй только в разработке!
    """
    if not settings.DEBUG:
        return Response({"error": "Доступно только в режиме разработки"}, status=403)
    
    try:
        from .models import Follow
        
        # Удаляем все подписки
        count, _ = Follow.objects.all().delete()
        
        # Пересчитываем статистику всех пользователей
        for user in CustomUser.objects.all():
            user.update_stats()
        
        return Response({
            "success": True,
            "message": f"Удалено {count} подписок",
            "user_count": CustomUser.objects.count(),
            "stats_updated": True
        })
        
    except Exception as e:
        logger.error(f"Ошибка в debug_fix_follows: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)