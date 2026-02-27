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
from django.shortcuts import get_object_or_404
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Conversation, Message, CustomUser, Track
from .serializers import DialogListSerializer, MessageSerializer
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from django.views.decorators.clickjacking import xframe_options_exempt
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
from django.core.paginator import Paginator
from django.contrib.auth import get_user_model
import re

# ==================== ИМПОРТЫ МОДЕЛЕЙ ====================
from .models import (
    # Пользователи и профили
    CustomUser, UserProfile, UserSession, PasswordResetToken,
    
    # Треки и связанное
    Track, Hashtag, TrackLike, TrackRepost, TrackComment,
    ListeningHistory, PlayHistory, UserTrackInteraction, TrackAnalytics,
    
    # Плейлисты
    Playlist, PlaylistTrack, PlaylistLike, PlaylistRepost,
    
    # Комментарии
    Comment, CommentLike,
    
    # Социальное
    Follow, Notification, Message,
    
    # Статистика и логи
    DailyStats, SystemLog, WaveformGenerationTask
)

# ==================== ИМПОРТЫ СЕРИАЛИЗАТОРОВ ====================
from .serializers import (
    # Пользователи
    CompactUserSerializer, SimpleUserSerializer, UserMinimalSerializer,
    PublicUserSerializer, UserMeSerializer, UserProfileSerializer,
    UserProfileFullSerializer, UserWithGridScanSerializer, UserExportSerializer,
    
    # Треки
    TrackSerializer, CompactTrackSerializer, PlayerTrackSerializer,
    TrackCreateSerializer, UploadedTracksSerializer,
    
    # Лайки и репосты треков
    TrackLikeSerializer, TrackRepostSerializer,
    
    # Плейлисты
    PlaylistSerializer, PlaylistTrackSerializer,
    PlaylistLikeSerializer, PlaylistRepostSerializer,
    
    # Комментарии
    TrackCommentSerializer, CommentLikeSerializer,
    
    # Социальное
    FollowSerializer, FollowResponseSerializer, FollowStatusSerializer,
    UserFollowersSerializer, UserFollowingSerializer, FollowListResponseSerializer,
    BatchFollowSerializer, BatchFollowResponseSerializer, FollowNotificationSettingsSerializer,
    NotificationSerializer, MessageSerializer,
    
    # История и статистика
    ListeningHistorySerializer, PlayHistorySerializer,
    DailyStatsSerializer, UserTrackInteractionSerializer,
    TrackAnalyticsSerializer, UserStatsSerializer,
    
    # Системное
    SystemLogSerializer, WaveformGenerationTaskSerializer,
    
    # Аутентификация и загрузка файлов
    RegisterSerializer, LoginSerializer,
    AvatarUploadSerializer, AvatarResponseSerializer,
    HeaderImageUploadSerializer, GridScanColorUpdateSerializer,
    ImageValidationSerializer, ColorAnalysisSerializer,
    
    # Дополнительные
    FollowerDetailSerializer, FollowingDetailSerializer, UserMeSerializer
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
    """
    Получение профиля текущего пользователя
    """
    try:
        user = request.user
        
        # 🔥 Авто-разбан если срок истек (через _ban_payload)
        ban_info = _ban_payload(user)
        
        # Подсчет статистики
        liked_tracks_count = 0
        playlists_count = 0
        tracks_uploaded_count = 0
        
        # Используем правильные имена related_name из моделей
        try:
            # Лайкнутые треки (через TrackLike)
            if hasattr(user, 'track_likes'):
                liked_tracks_count = user.track_likes.count()
            
            # Плейлисты пользователя
            if hasattr(user, 'playlists'):
                playlists_count = user.playlists.count()
            
            # Загруженные треки
            if hasattr(user, 'uploaded_tracks'):
                tracks_uploaded_count = user.uploaded_tracks.filter(status='published').count()
        except Exception as e:
            logger.error(f"Ошибка при подсчете статистики: {e}")
        
        # ✅ флаги админки (нужны фронту, чтобы показать иконку админа)
        is_staff = bool(getattr(user, 'is_staff', False))
        is_superuser = bool(getattr(user, 'is_superuser', False))
        is_admin = is_staff or is_superuser
        
        # Проверка PRO статуса
        is_pro = bool(getattr(user, 'is_pro', False))
        pro_expires_at = user.pro_expires_at.isoformat() if user.pro_expires_at else None
        
        # Проверка на истечение PRO
        if is_pro and user.pro_expires_at and user.pro_expires_at <= timezone.now():
            is_pro = False
            pro_expires_at = None
        
        # ⛔ ДОПОЛНИТЕЛЬНАЯ БАН-ИНФОРМАЦИЯ (для отладки и гарантии)
        banned_by_obj = getattr(user, 'banned_by', None)
        banned_by_name = None
        try:
            if banned_by_obj:
                banned_by_name = getattr(banned_by_obj, 'username', None) or str(banned_by_obj)
        except Exception:
            banned_by_name = None

        # Расширенная бан-информация на случай если _ban_payload не всё вернул
        ban_payload = {
            'is_banned': bool(getattr(user, 'is_banned', False)),
            'ban_reason': getattr(user, 'ban_reason', '') or '',
            'ban_until': getattr(user, 'ban_until', None),
            'ban_permanent': bool(getattr(user, 'ban_permanent', False)),
            'ban_days_left': getattr(user, 'ban_days_left', None),
            'banned_by': banned_by_name,
            'ban_created_at': getattr(user, 'ban_created_at', None),
        }

        # Конвертируем datetime в ISO формат если нужно
        if ban_payload['ban_until'] is not None and hasattr(ban_payload['ban_until'], 'isoformat'):
            ban_payload['ban_until'] = ban_payload['ban_until'].isoformat()
        if ban_payload['ban_created_at'] is not None and hasattr(ban_payload['ban_created_at'], 'isoformat'):
            ban_payload['ban_created_at'] = ban_payload['ban_created_at'].isoformat()
        
        # Объединяем с ban_info (приоритет у ban_info так как там авто-разбан)
        final_ban_info = ban_info.copy()
        # Если ban_info не содержит каких-то полей, дополняем из ban_payload
        for key, value in ban_payload.items():
            if key not in final_ban_info or final_ban_info[key] is None:
                final_ban_info[key] = value
        
        # ✅ ДОБАВЛЯЕМ ИНФУ ПО АПЕЛЛЯЦИИ (для BannedScreen)
        try:
            from .models import BanAppeal  # если модель в api/models.py

            last_appeal = (
                BanAppeal.objects
                .filter(user=user)
                .order_by('-created_at')
                .first()
            )

            if last_appeal:
                final_ban_info['appeal_status'] = last_appeal.status

                # Причина отказа — это admin_comment (мы туда писали reason)
                if str(last_appeal.status).lower() in ('rejected', 'denied'):
                    final_ban_info['appeal_reject_reason'] = (last_appeal.admin_comment or '').strip()
                else:
                    final_ban_info['appeal_reject_reason'] = ''

                # (на всякий) общий коммент админа
                final_ban_info['appeal_admin_comment'] = (last_appeal.admin_comment or '').strip()
            else:
                final_ban_info['appeal_status'] = None
                final_ban_info['appeal_reject_reason'] = ''
                final_ban_info['appeal_admin_comment'] = ''

        except Exception as e:
            # ничего не ломаем, если вдруг модель/импорт не там
            logger.warning(f"BanAppeal attach failed: {e}")
            # Убедимся, что поля есть даже при ошибке
            if 'appeal_status' not in final_ban_info:
                final_ban_info['appeal_status'] = None
            if 'appeal_reject_reason' not in final_ban_info:
                final_ban_info['appeal_reject_reason'] = ''
            if 'appeal_admin_comment' not in final_ban_info:
                final_ban_info['appeal_admin_comment'] = ''
        
        response_data = {
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'avatar': user.avatar.url if user.avatar else None,
                'avatar_url': user.avatar_url or None,
                'bio': user.bio,
                'country': user.country or '',
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'updated_at': user.updated_at.isoformat() if user.updated_at else None,
                'email_verified': user.email_verified,
                
                # Статистика
                'stats': {
                    'followers': user.followers_count,
                    'following': user.following_count,
                    'tracks': tracks_uploaded_count,
                    'liked_tracks': liked_tracks_count,
                    'playlists': playlists_count,
                    'reposts': user.reposts_count,
                },
                
                # Статусы
                'is_artist': user.is_artist,
                'is_pro': is_pro,
                'pro_expires_at': pro_expires_at,
                
                # ✅ флаги админки
                'is_staff': is_staff,
                'is_superuser': is_superuser,
                'is_admin': is_admin,
                
                # 🚫 BAN INFO - ПОЛНАЯ ИНФОРМАЦИЯ (включая апелляции)
                'ban': final_ban_info,
                
                # Социальные ссылки
                'website': user.website or '',
                'instagram': user.instagram or '',
                'twitter': user.twitter or '',
                'soundcloud': user.soundcloud or '',
                
                # Визуальные настройки
                'header_image_url': user.get_header_image_url(),
                'gridscan_color': user.get_gridscan_color(),
                'header_updated_at': user.header_updated_at.isoformat() if user.header_updated_at else None,
                
                # 🎧 NOW PLAYING информация
                'now_playing': {
                    'track_id': user.now_playing_track.id if user.now_playing_track else None,
                    'track_title': user.now_playing_track.title if user.now_playing_track else None,
                    'track_artist': user.now_playing_track.artist if user.now_playing_track else None,
                    'updated_at': user.now_playing_at.isoformat() if user.now_playing_at else None,
                    'is_playing': user.now_playing_is_playing,
                } if user.now_playing_track else None,
            }
        }
        
        # Добавляем информацию о том, что пользователь забанен (для отладки)
        if final_ban_info.get('is_banned'):
            logger.info(f"User {user.username} is banned. Reason: {final_ban_info.get('ban_reason')}")
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Ошибка при получении профиля: {e}", exc_info=True)
        return Response({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request, track_id=None):
    """
    Обрабатывает лайк/анлайк трека.
    Поддерживает два способа вызова:
    1. /api/like/toggle/ - track_id передаётся в теле запроса
    2. /api/track/<track_id>/toggle-like/ - track_id передаётся в URL
    """
    try:
        user = request.user
        
        # ========== 1️⃣ ПОЛУЧАЕМ track_id ==========
        data = request.data
        
        # Если track_id передан в URL (через path parameter)
        if track_id is not None:
            logger.info(f"✅ toggle_like: track_id из URL: {track_id}")
            # Проверяем, не переопределяется ли track_id в теле запроса
            body_track_id = data.get('track_id')
            if body_track_id and int(body_track_id) != track_id:
                logger.warning(f"⚠️ toggle_like: конфликт ID. URL: {track_id}, тело: {body_track_id}")
                # Используем ID из URL, так как он приоритетный для этого пути
                track_id_int = track_id
            else:
                track_id_int = track_id
        else:
            # Если track_id не передан в URL, берём из тела запроса
            track_id_int = data.get('track_id')
            if track_id_int is None:
                return Response({
                    'success': False,
                    'error': 'track_id обязателен'
                }, status=400)
        
        # ========== 2️⃣ ПРОВЕРЯЕМ И ПРЕОБРАЗУЕМ ДАННЫЕ ==========
        try:
            track_id_int = int(track_id_int)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'track_id должен быть числом'
            }, status=400)
        
        # Получаем статус лайка
        liked = data.get('liked')
        if liked is None:
            # Если liked не указан, определяем автоматически
            # Проверяем, лайкнут ли уже этот трек
            liked_bool = False  # по умолчанию ставим лайк
            if HAS_TRACK_LIKE:
                liked_bool = not TrackLike.objects.filter(user=user, track__id=track_id_int).exists()
            elif HAS_USER_TRACK_INTERACTION:
                try:
                    interaction = UserTrackInteraction.objects.get(user=user, track__id=track_id_int)
                    liked_bool = not interaction.liked
                except UserTrackInteraction.DoesNotExist:
                    liked_bool = True
            else:
                # Если нельзя определить текущий статус, считаем что ставим лайк
                liked_bool = True
            logger.info(f"✅ toggle_like: liked не указан, автоматически: {liked_bool}")
        else:
            # Преобразуем liked в boolean
            liked_bool = bool(liked) if isinstance(liked, bool) else str(liked).lower() in ['true', '1', 'yes', 'y']
            logger.info(f"✅ toggle_like: liked из запроса: {liked_bool}")
        
        logger.info(f"🔄 toggle_like: пользователь {user.username}, трек {track_id_int}, действие: {'лайк' if liked_bool else 'анлайк'}")
        
        # ========== 3️⃣ РАБОТАЕМ С ТРЕКОМ ==========
        if HAS_TRACK:
            try:
                track = Track.objects.get(id=track_id_int)
                logger.info(f"✅ toggle_like: трек найден: {track.title}")
            except Track.DoesNotExist:
                # Создаём демо-трек если не найден
                logger.warning(f"⚠️ toggle_like: трек {track_id_int} не найден, создаём демо")
                tracks_data = {
                    1: {
                        'title': 'hard drive (slowed & muffled)',
                        'artist': 'griffinilla',
                        'cover': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                        'audio_url': '/tracks/track1.mp3',
                        'duration': '3:20',
                        'duration_seconds': 200
                    },
                    2: {
                        'title': 'Deutschland',
                        'artist': 'Rammstein',
                        'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'audio_url': '/tracks/track2.mp3',
                        'duration': '5:22',
                        'duration_seconds': 322
                    },
                    3: {
                        'title': 'Sonne',
                        'artist': 'Rammstein',
                        'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                        'audio_url': '/tracks/track3.mp3',
                        'duration': '4:05',
                        'duration_seconds': 245
                    }
                }
                
                if track_id_int in tracks_data:
                    upload_user = CustomUser.objects.first() if CustomUser.objects.exists() else user
                    
                    track_data = tracks_data[track_id_int].copy()
                    duration_seconds = track_data.pop('duration_seconds', None)
                    
                    track = Track.objects.create(
                        id=track_id_int,
                        uploaded_by=upload_user,
                        **track_data
                    )
                    
                    if duration_seconds:
                        track.duration_seconds = duration_seconds
                        track.save()
                    
                    logger.info(f"✅ toggle_like: создан демо-трек {track_id_int}")
                else:
                    return Response({
                        'success': False,
                        'error': f'Трек с ID {track_id_int} не найден'
                    }, status=404)
            
            # ========== 4️⃣ ОБРАБОТКА ЛАЙКОВ ==========
            like_count = 0
            user_has_liked = False
            
            if HAS_TRACK_LIKE:
                if liked_bool:
                    like_obj, created = TrackLike.objects.get_or_create(
                        user=user,
                        track=track
                    )
                    logger.info(f"✅ toggle_like: {'создан' if created else 'уже есть'} лайк")
                else:
                    deleted_count, _ = TrackLike.objects.filter(user=user, track=track).delete()
                    logger.info(f"✅ toggle_like: удалено {deleted_count} лайков")
                
                like_count = TrackLike.objects.filter(track=track).count()
                track.like_count = like_count
                track.save()
                
                user_has_liked = TrackLike.objects.filter(user=user, track=track).exists()
                
            elif HAS_USER_TRACK_INTERACTION:
                interaction, created = UserTrackInteraction.objects.get_or_create(
                    user=user,
                    track=track,
                    defaults={'liked': liked_bool}
                )
                
                if not created:
                    interaction.liked = liked_bool
                    interaction.save()
                    logger.info(f"✅ toggle_like: обновлено взаимодействие")
                else:
                    logger.info(f"✅ toggle_like: создано новое взаимодействие")
                
                like_count = UserTrackInteraction.objects.filter(track=track, liked=True).count()
                track.like_count = like_count
                track.save()
                
                try:
                    interaction = UserTrackInteraction.objects.get(user=user, track=track)
                    user_has_liked = interaction.liked
                except UserTrackInteraction.DoesNotExist:
                    user_has_liked = False
                    
            else:
                # Резервный вариант без моделей лайков
                if liked_bool:
                    track.like_count += 1
                else:
                    track.like_count = max(0, track.like_count - 1)
                track.save()
                
                like_count = track.like_count
                user_has_liked = liked_bool
                logger.info(f"✅ toggle_like: обновлён счётчик лайков: {like_count}")
            
            # ========== 5️⃣ ОТВЕТ ==========
            response_data = {
                'success': True,
                'message': f'Трек {track_id_int} успешно обработан',
                'track_id': track_id_int,
                'liked': liked_bool,
                'like_count': like_count,
                'user_has_liked': user_has_liked,
                'user': user.username,
                'timestamp': timezone.now().isoformat(),
                'track_title': track.title,
                'track_artist': track.artist or track.uploaded_by.username if track.uploaded_by else 'Unknown'
            }
            
            logger.info(f"✅ toggle_like: успешный ответ для трека {track_id_int}")
            return Response(response_data)
            
        else:
            # Если модель Track недоступна
            logger.warning(f"⚠️ toggle_like: модель Track недоступна")
            return Response({
                'success': True,
                'message': 'Лайк обработан (разработка)',
                'track_id': track_id_int,
                'liked': liked_bool,
                'like_count': 0,
                'note': 'Модель Track не доступна'
            })
        
    except Exception as e:
        logger.error(f"❌ toggle_like: ошибка: {str(e)}", exc_info=True)
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Внутренняя ошибка сервера'
        }, status=500)


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

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
        user_reposted = False
        
        if HAS_TRACK:
            try:
                # 🔥 ИСПРАВЛЕНО: Предзагружаем связи uploaded_by и hashtags
                track = Track.objects.select_related('uploaded_by').prefetch_related('hashtags').get(id=track_id)
                
                if user:
                    try:
                        user_liked = TrackLike.objects.filter(user=user, track=track).exists()
                    except:
                        user_liked = False
                    
                    try:
                        user_reposted = TrackRepost.objects.filter(user=user, track=track).exists()
                    except:
                        user_reposted = False
                
                # 🔥 ИСПРАВЛЕНО: Используем PlayerTrackSerializer (который теперь отдаёт теги)
                serializer = PlayerTrackSerializer(
                    track,
                    context={'request': request}
                )
                
                # Добавляем user_liked к данным
                track_data = serializer.data
                track_data['user_liked'] = user_liked
                
                # ✅ ДОБАВЛЕНО: Явно добавляем user_reposted (хотя уже есть в сериализаторе)
                track_data['is_reposted'] = user_reposted
                
                track_data['success'] = True
                
                logger.info(f"Трек {track_id} из БД: {track.title}")
                logger.info(f"Теги трека: {track_data.get('hashtag_list', [])}")  # для отладки
                
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
                'duration_seconds': 200,
                'like_count': 56,
                'repost_count': 12,
                'comment_count': 8,
                'description': "Замедленная версия трека griffinilla",
                'genre': 'electronic',
                'uploaded_by': {'id': 1, 'username': 'griffinilla', 'avatar_url': None},
                # ✅ ДОБАВЛЕНО: теги для демо-треков
                'tags': 'slowed,lofi,electronic',
                'tag_list': ['slowed', 'lofi', 'electronic'],
                'hashtag_list': ['slowed', 'lofi', 'electronic'],
                'source': 'demo',
                'user_liked': False,
                'is_reposted': False
            },
            2: {
                'id': 2,
                'title': "Deutschland",
                'artist': "Rammstein",
                'cover': request.build_absolute_uri('/static/demo_covers/2.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track2.mp3'),
                'duration': "5:22",
                'duration_seconds': 322,
                'like_count': 34,
                'repost_count': 8,
                'comment_count': 15,
                'description': "Хит Rammstein",
                'genre': 'metal',
                'uploaded_by': {'id': 2, 'username': 'Rammstein', 'avatar_url': None},
                # ✅ ДОБАВЛЕНО: теги для демо-треков
                'tags': 'industrial,metal,german',
                'tag_list': ['industrial', 'metal', 'german'],
                'hashtag_list': ['industrial', 'metal', 'german'],
                'source': 'demo',
                'user_liked': False,
                'is_reposted': False
            },
            3: {
                'id': 3,
                'title': "Sonne",
                'artist': "Rammstein",
                'cover': request.build_absolute_uri('/static/demo_covers/3.jpg'),
                'audio_url': request.build_absolute_uri('/static/tracks/track3.mp3'),
                'duration': "4:05",
                'duration_seconds': 245,
                'like_count': 23,
                'repost_count': 5,
                'comment_count': 7,
                'description': "Классика Rammstein",
                'genre': 'metal',
                'uploaded_by': {'id': 2, 'username': 'Rammstein', 'avatar_url': None},
                # ✅ ДОБАВЛЕНО: теги для демо-треков
                'tags': 'industrial,rock,german',
                'tag_list': ['industrial', 'rock', 'german'],
                'hashtag_list': ['industrial', 'rock', 'german'],
                'source': 'demo',
                'user_liked': False,
                'is_reposted': False
            }
        }
        
        track_id_int = int(track_id) if str(track_id).isdigit() else 0
        
        if track_id_int in demo_data:
            track = demo_data[track_id_int]
            
            # ✅ ДОБАВЛЕНО: Проверяем реальные репосты для демо-треков, если пользователь авторизован
            if user and HAS_TRACK_REPOST and HAS_TRACK:
                try:
                    real_track = Track.objects.get(id=track_id_int)
                    track['is_reposted'] = TrackRepost.objects.filter(
                        user=user, track=real_track
                    ).exists()
                    track['repost_count'] = real_track.repost_count
                except Track.DoesNotExist:
                    pass
            
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

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def repost_track(request):
    """
    ✅ ОБНОВЛЕННАЯ ВЕРСИЯ: создает или удаляет репост трека
    POST - создает репост
    DELETE - удаляет репост
    """
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
        
        if not HAS_TRACK or not HAS_TRACK_REPOST:
            return Response({
                'success': True,
                'message': 'Репост выполнен (разработка)',
                'track_id': track_id,
                'note': 'Модели Track/TrackRepost не доступны'
            })
        
        # Получаем трек
        track = Track.objects.get(id=track_id, status='published')
        
        # Проверяем существующий репост
        existing_repost = TrackRepost.objects.filter(
            user=user, 
            track=track
        ).first()
        
        if request.method == 'POST':
            # 🔴 СОЗДАНИЕ РЕПОСТА
            if existing_repost:
                return Response({
                    'success': False,
                    'error': 'Вы уже репостили этот трек',
                    'is_reposted': True
                }, status=400)
            
            # Создаем репост
            repost = TrackRepost.objects.create(
                user=user,
                track=track,
                comment=comment
            )
            
            # Обновляем счетчик репостов у трека
            track.repost_count = TrackRepost.objects.filter(track=track).count()
            track.save(update_fields=['repost_count'])
            
            message = 'Трек успешно репостнут'
            is_reposted = True
            
        elif request.method == 'DELETE':
            # 🔴 УДАЛЕНИЕ РЕПОСТА
            if not existing_repost:
                return Response({
                    'success': False,
                    'error': 'Вы еще не репостили этот трек',
                    'is_reposted': False
                }, status=400)
            
            # Удаляем репост
            repost_id = existing_repost.id
            existing_repost.delete()
            
            # Обновляем счетчик репостов у трека
            track.repost_count = TrackRepost.objects.filter(track=track).count()
            track.save(update_fields=['repost_count'])
            
            message = 'Репост успешно удален'
            is_reposted = False
        
        # 🔥 ОБНОВЛЕНО: Формируем ответ с сериализатором плеера
        serializer = PlayerTrackSerializer(
            track,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'message': message,
            'repost_count': track.repost_count,
            'is_reposted': is_reposted,
            'track': serializer.data,          # ← полный объект трека с актуальными данными
            'user': {
                'id': user.id,
                'username': user.username,
                'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None
            }
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_play(request, track_id):
    """
    Записывает факт прослушивания трека.
    - listened_seconds < 30: не считается в play_count
    - PlayHistory: пишем КАЖДЫЙ раз (для истории)
    - ListeningHistory: одна запись на пользователя, но обновляем listened_at всегда
    """
    try:
        listened_seconds = int(request.data.get('listened_seconds', 0) or 0)
        
        print(f"🎯 record_play: track_id={track_id}, listened_seconds={listened_seconds}, user={request.user.id}")

        track = get_object_or_404(Track, id=track_id)
        user = request.user

        # Если меньше 30 сек — ничего не считаем и не пишем историю
        if listened_seconds < 30:
            print(f"⚠️ Менее 30 сек ({listened_seconds}) - пропускаем")
            return Response({
                'success': True,
                'play_count': track.play_count or 0,
                'counted': False,
                'message': 'Прослушивание менее 30 сек – не считается'
            }, status=status.HTTP_200_OK)

        # ✅ 1) ВСЕГДА пишем детальную историю (PlayHistory)
        try:
            ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', '') or ''

            total_sec = int(getattr(track, 'duration_seconds', 0) or 0)
            is_full = False
            if total_sec > 0:
                is_full = listened_seconds >= int(total_sec * 0.9)

            print(f"📝 Создаём PlayHistory: track={track_id}, user={user.id}, sec={listened_seconds}")
            
            PlayHistory.objects.create(
                user=user,
                track=track,
                ip_address=ip,
                user_agent=ua,
                duration_listened=listened_seconds,
                is_full_play=is_full
            )
        except Exception as e:
            print(f"❌ Ошибка создания PlayHistory: {e}")
            logger.error(f"PlayHistory create failed: {e}")

        # ✅ 2) ListeningHistory: одна запись на пользователя, но listened_at обновляем всегда
        lh, created = ListeningHistory.objects.get_or_create(
            user=user,
            track=track,
            defaults={
                'listened_seconds': listened_seconds,
                'listened_at': timezone.now()
            }
        )

        if not created:
            lh.listened_at = timezone.now()
            lh.listened_seconds = max(lh.listened_seconds or 0, listened_seconds)
            lh.save(update_fields=['listened_at', 'listened_seconds'])

        # play_count увеличиваем только 1 раз
        if created:
            track.play_count = (track.play_count or 0) + 1
            track.save(update_fields=['play_count'])
            counted = True
            print(f"✅ Увеличили play_count: теперь {track.play_count}")
        else:
            counted = False
            print(f"⚠️ play_count не увеличен (уже учтено)")

        return Response({
            'success': True,
            'play_count': track.play_count or 0,
            'counted': counted,
            'message': 'Прослушивание записано'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"🔥 Критическая ошибка в record_play: {e}")
        logger.error(f"Ошибка при записи прослушивания: {e}")
        return Response({
            'success': False, 
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tracks_history(request):
    """
    Полная история прослушиваний пользователя.
    Возвращает:
      - history: список событий (track_id + played_at + duration_listened + is_full_play)
      - tracks: данные треков (чтобы фронт мог addTracks)
    """
    print(f"📚 tracks_history запрос от пользователя {request.user.id}")
    
    # Проверяем, существует ли модель PlayHistory

    per_page = min(int(request.GET.get('per_page', 200) or 200), 500)
    page = max(int(request.GET.get('page', 1) or 1), 1)
    offset = (page - 1) * per_page

    qs = PlayHistory.objects.filter(user=request.user).select_related('track', 'track__uploaded_by').order_by('-played_at')
    total = qs.count()
    
    print(f"📊 Найдено записей в истории: {total}")
    
    plays = list(qs[offset:offset + per_page])

    history = []
    uniq_track_ids = []
    seen = set()

    for p in plays:
        history.append({
            'id': p.id,
            'track_id': p.track_id,
            'played_at': p.played_at.isoformat(),
            'duration_listened': p.duration_listened,
            'is_full_play': p.is_full_play
        })
        if p.track_id not in seen:
            seen.add(p.track_id)
            uniq_track_ids.append(p.track_id)

    # Треки для addTracks (уникальные, в порядке как в истории)
    tracks_qs = Track.objects.filter(id__in=uniq_track_ids).select_related('uploaded_by')
    tracks_by_id = {t.id: t for t in tracks_qs}
    ordered_tracks = [tracks_by_id[i] for i in uniq_track_ids if i in tracks_by_id]

    tracks_data = CompactTrackSerializer(ordered_tracks, many=True, context={'request': request}).data

    print(f"✅ Отправляем историю: {len(history)} записей, {len(tracks_data)} треков")
    
    return Response({
        'success': True,
        'history': history,
        'tracks': tracks_data,
        'page': page,
        'per_page': per_page,
        'total': total
    })


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

# --------------------  ЛЕНТА НОВОСТЕЙ (FEED) --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feed(request):
    """
    Лента новостей: треки от авторов, на которых подписан текущий пользователь
    """
    user = request.user

    # 1) Получаем ID авторов, на которых подписан пользователь
    try:
        # Используем модель Follow
        from .models import Follow
        following_ids = Follow.objects.filter(
            follower=user
        ).values_list('following_id', flat=True)
    except:
        try:
            # Альтернатива: если есть поле following
            following_ids = user.following.values_list('id', flat=True)
        except:
            following_ids = []

    if not following_ids:
        # Если пользователь ни на кого не подписан, возвращаем пустой список
        return Response([])

    # 2) ✅ ИСПРАВЛЕНО: uploaded_by_id__in вместо user_id__in
    #    ✅ Добавлены фильтры: только опубликованные и не приватные треки
    from .models import Track
    tracks = Track.objects.filter(
        uploaded_by_id__in=following_ids,  # 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
        status='published',                # ✅ Только опубликованные
        is_private=False                  # ✅ Не приватные
    ).order_by('-created_at')[:100]        # Лимит 100 треков

    # 3) Определяем, какие треки "новые" (не прослушаны)
    from .models import ListeningHistory
    listened_ids = set(
        ListeningHistory.objects.filter(
            user=user
        ).values_list('track_id', flat=True)
    )

    # 4) Сериализуем данные
    from .serializers import TrackSerializer
    
    data = []
    for track in tracks:
        serialized = TrackSerializer(track, context={'request': request}).data
        serialized['is_new'] = track.id not in listened_ids
        data.append(serialized)

    return Response(data)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feed_playlists(request):
    """
    Лента плейлистов: новые плейлисты от авторов, на которых подписан пользователь
    """
    user = request.user

    # 1) кто у нас в following
    try:
        from .models import Follow
        following_ids = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
    except:
        try:
            following_ids = user.following.values_list('id', flat=True)
        except:
            following_ids = []

    if not following_ids:
        return Response([])

    from .models import Playlist
    playlists = Playlist.objects.filter(
        created_by_id__in=following_ids,
        visibility__in=['public', 'unlisted']
    ).select_related('created_by').order_by('-created_at')[:60]

    from django.utils import timezone
    from datetime import timedelta
    border = timezone.now() - timedelta(days=3)  # “новые” за последние 3 дня

    from .serializers import PlaylistSerializer
    data = []
    for pl in playlists:
        item = PlaylistSerializer(pl, context={'request': request}).data
        item['is_new'] = pl.created_at >= border
        data.append(item)

    return Response(data)

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
                if not track:
                    return Response({
                        'success': False,
                        'error': 'Трек не найден'
                    }, status=404)

            # ✅ СОЗДАЁМ КОММЕНТАРИЙ
            comment = TrackComment.objects.create(
                user=user,
                track=track,
                text=text
            )

            # 🔥 ВАЖНОЕ МЕСТО: ОБНОВЛЯЕМ СЧЁТЧИК КОММЕНТАРИЕВ
            track.comment_count = TrackComment.objects.filter(
                track=track,
                is_deleted=False
            ).count()
            track.save(update_fields=['comment_count'])

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
            }, status=201)

        # ⚠️ fallback (если нет моделей — режим разработки)
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
            'message': 'Комментарий добавлен (dev mode)',
            'comment': new_comment
        }, status=201)

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

@api_view(['GET'])
@permission_classes([AllowAny])
def track_likes_users(request, track_id):
    if not (HAS_TRACK and HAS_TRACK_LIKE):
        return Response({'users': [], 'count': 0})

    track = get_object_or_404(Track, id=track_id)
    user_qs = CustomUser.objects.filter(track_likes__track=track).distinct()
    serializer = SimpleUserSerializer(user_qs, many=True, context={'request': request})
    return Response({'users': serializer.data, 'count': user_qs.count()})


@api_view(['GET'])
@permission_classes([AllowAny])
def track_reposts_users(request, track_id):
    if not (HAS_TRACK and HAS_TRACK_REPOST):
        return Response({'users': [], 'count': 0})

    track = get_object_or_404(Track, id=track_id)
    user_qs = CustomUser.objects.filter(reposts__track=track).distinct()
    serializer = SimpleUserSerializer(user_qs, many=True, context={'request': request})
    return Response({'users': serializer.data, 'count': user_qs.count()})

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

# ==================== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ====================
@api_view(['GET', 'PATCH'])  # ✅ Добавлен PATCH метод
@permission_classes([IsAuthenticated])
def get_user_me(request):
    """
    Получение и обновление профиля текущего пользователя
    URL: /api/users/me/
    Методы: GET, PATCH
    """
    try:
        user = request.user

        # ---------------------------------------------------------
        # PATCH – изменение bio и country (используется в UI «Edit About»)
        # ---------------------------------------------------------
        if request.method == 'PATCH':
            data = request.data
            # Принимаем только разрешённые поля
            allowed = {'bio', 'country'}
            to_update = {}
            for key in allowed:
                if key in data:
                    to_update[key] = data[key]

            if not to_update:
                return Response({
                    'success': False,
                    'error': 'No updatable fields provided'
                }, status=400)

            for key, value in to_update.items():
                setattr(user, key, value)

            # Сохраняем только изменённые поля
            user.save(update_fields=list(to_update.keys()))

            serializer = UserMeSerializer(user, context={'request': request})
            return Response({
                'success': True,
                'message': 'Profile updated',
                'user': serializer.data
            })

        # ---------------------------------------------------------
        # GET – обычный запрос текущего профиля
        # ---------------------------------------------------------
        serializer = UserMeSerializer(
            user,
            context={'request': request}
        )
        
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Ошибка при работе с /users/me/: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            }, status=status.HTTP_200_OK)

        # ✅ ВАЖНО: никаких author, никаких Count — всё уже есть в модели
        tracks = (
            Track.objects
            .filter(
                uploaded_by_id=user.id,
                status='published'
            )
            .order_by('-created_at')
        )

        # ✅ CompactTrackSerializer УЖЕ отдает comment_count
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
    
    Возвращает:
    - followers: количество подписчиков
    - following: количество подписок
    - tracks: количество треков
    - playlists: количество плейлистов
    - total_listens: суммарное количество прослушиваний всех треков
    - total_likes: суммарное количество лайков всех треков
    - total_reposts: суммарное количество репостов всех треков
    - total_comments: суммарное количество комментариев под всеми треками
    """
    try:
        user = get_object_or_404(CustomUser, id=user_id)
        
        # Базовая статистика
        stats = {
            'followers': 0,
            'following': 0,
            'tracks': 0,
            'playlists': 0,
            'total_listens': 0,
            'total_likes': 0,
            'total_reposts': 0,
            'total_comments': 0  # ✅ Добавлено поле для комментариев
        }
        
        # Подписчики и подписки
        if HAS_FOLLOW:
            stats['followers'] = Follow.objects.filter(following=user).count()
            stats['following'] = Follow.objects.filter(follower=user).count()
        
        # Статистика по трекам
        if HAS_TRACK:
            # Получаем все опубликованные треки пользователя
            tracks = Track.objects.filter(uploaded_by=user, status='published')
            
            # Количество треков
            stats['tracks'] = tracks.count()
            
            if stats['tracks'] > 0:
                # Суммируем метрики по всем трекам
                # Используем aggregate для лучшей производительности
                from django.db.models import Sum
                
                track_stats = tracks.aggregate(
                    total_listens=Sum('play_count'),
                    total_likes=Sum('like_count'),
                    total_reposts=Sum('repost_count'),
                    total_comments=Sum('comment_count')
                )
                
                stats['total_listens'] = track_stats['total_listens'] or 0
                stats['total_likes'] = track_stats['total_likes'] or 0
                stats['total_reposts'] = track_stats['total_reposts'] or 0
                stats['total_comments'] = track_stats['total_comments'] or 0
                
                # Дополнительно можно посчитать комментарии через TrackComment
                # для перекрестной проверки (опционально)
                # comments_count = TrackComment.objects.filter(
                #     track__uploaded_by=user,
                #     is_deleted=False
                # ).count()
                # if comments_count != stats['total_comments']:
                #     logger.warning(f"Несоответствие комментариев для user {user_id}: "
                #                  f"track.comment_count={stats['total_comments']}, "
                #                  f"TrackComment={comments_count}")
        
        # Количество плейлистов пользователя
        from .models import Playlist
        stats['playlists'] = Playlist.objects.filter(created_by=user).count()
        
        # Получаем сегодняшнюю дату для информации
        today = timezone.localdate().strftime('%Y-%m-%d')
        
        # Пытаемся получить или создать запись в UserDailyStats для сегодня
        try:
            from .models import UserDailyStats
            
            # Проверяем, есть ли запись за сегодня
            daily_stats, created = UserDailyStats.objects.get_or_create(
                user=user,
                date=today,
                defaults={
                    'followers': stats['followers'],
                    'following': stats['following'],
                    'tracks': stats['tracks'],
                    'total_listens': stats['total_listens'],
                    'total_likes': stats['total_likes'],
                    'total_reposts': stats['total_reposts'],
                    'total_comments': stats['total_comments'],
                }
            )
            
            # Если запись уже существовала, обновляем её
            if not created:
                daily_stats.followers = stats['followers']
                daily_stats.following = stats['following']
                daily_stats.tracks = stats['tracks']
                daily_stats.total_listens = stats['total_listens']
                daily_stats.total_likes = stats['total_likes']
                daily_stats.total_reposts = stats['total_reposts']
                daily_stats.total_comments = stats['total_comments']
                daily_stats.save()
                
        except Exception as e:
            # Логируем ошибку, но не прерываем выполнение
            logger.error(f"Ошибка при обновлении UserDailyStats для user {user_id}: {e}")
        
        # Формируем успешный ответ
        return Response({
            'success': True,
            'user_id': user_id,
            'username': user.username,
            'stats': stats,
            'date': today,
            'last_updated': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)
        
    except CustomUser.DoesNotExist:
        logger.error(f"Пользователь {user_id} не найден")
        return Response({
            'success': False,
            'error': 'Пользователь не найден'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики пользователя {user_id}: {e}")
        return Response({
            'success': False,
            'error': 'Не удалось получить статистику'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _end_of_day_dt(day_date):
    tz = timezone.get_current_timezone()
    # конец дня = начало следующего дня
    return timezone.make_aware(datetime.combine(day_date + timedelta(days=1), time.min), tz)

def _compute_user_totals_as_of(user, day_date):
    end_dt = _end_of_day_dt(day_date)

    followers = Follow.objects.filter(following=user, created_at__lt=end_dt).count()
    following = Follow.objects.filter(follower=user, created_at__lt=end_dt).count()

    tracks_qs = Track.objects.filter(uploaded_by=user, status='published', created_at__lt=end_dt)

    tracks = tracks_qs.count()

    # ✅ totals по трекам (как у тебя в get_user_stats)
    total_listens = 0
    total_likes = 0
    total_reposts = 0

    for t in tracks_qs.only('id', 'play_count', 'like_count', 'repost_count'):
        total_listens += int(getattr(t, 'play_count', 0) or 0)
        total_likes += int(getattr(t, 'like_count', 0) or 0)
        total_reposts += int(getattr(t, 'repost_count', 0) or 0)

    # ✅ comments: считаем реальные комменты под треками до конца дня
    total_comments = TrackComment.objects.filter(
        track__uploaded_by=user,
        is_deleted=False,
        created_at__lt=end_dt
    ).count()

    return {
        'followers': followers,
        'following': following,
        'tracks': tracks,
        'total_listens': total_listens,
        'total_likes': total_likes,
        'total_reposts': total_reposts,
        'total_comments': total_comments,
    }

from datetime import datetime, timedelta, time
from django.utils import timezone
from .models import UserDailyStats, Follow, Track, TrackLike, TrackRepost, TrackAnalytics, TrackComment


@api_view(['GET'])
def get_user_stats_history(request, user_id):
    """
    GET /api/users/<id>/stats/history/?days=14
    Возвращает реальные точки по дням (totals на конец каждого дня).
    """
    user = get_object_or_404(CustomUser, id=user_id)

    try:
        days = int(request.GET.get('days', 14))
    except:
        days = 14
    days = max(3, min(days, 120))

    today = timezone.localdate()
    start = today - timedelta(days=days - 1)

    points = []
    cur = start
    while cur <= today:
        obj = UserDailyStats.objects.filter(user=user, date=cur).first()

        # если нет снимка за этот день — вычисляем и сохраняем (backfill)
        if not obj:
            totals = _compute_user_totals_as_of(user, cur)
            obj = UserDailyStats.objects.create(user=user, date=cur, **totals)
        else:
            # если это сегодня — обновляем (чтобы прямо сейчас было актуально)
            if cur == today:
                totals = _compute_user_totals_as_of(user, cur)
                for k, v in totals.items():
                    setattr(obj, k, v)
                obj.save()

        label = cur.strftime('%d.%m')
        points.append({
            'date': str(cur),
            'label': label,
            'followers': obj.followers,
            'following': obj.following,
            'tracks': obj.tracks,
            'total_listens': obj.total_listens,
            'total_likes': obj.total_likes,
            'total_reposts': obj.total_reposts,
            'total_comments': obj.total_comments,
        })

        cur += timedelta(days=1)

    # распакуем в серии для фронта
    series = {
        'followers': [{'label': p['label'], 'value': p['followers']} for p in points],
        'following': [{'label': p['label'], 'value': p['following']} for p in points],
        'tracks': [{'label': p['label'], 'value': p['tracks']} for p in points],
        'listens': [{'label': p['label'], 'value': p['total_listens']} for p in points],
        'likes': [{'label': p['label'], 'value': p['total_likes']} for p in points],
        'reposts': [{'label': p['label'], 'value': p['total_reposts']} for p in points],
        'comments': [{'label': p['label'], 'value': p['total_comments']} for p in points],
    }

    return Response({
        'success': True,
        'user_id': user_id,
        'days': days,
        'series': series,
    })

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
                'notifications_enabled': follow.notifications_enabled,
                
                # ✅ ДОБАВЛЕНО: Счётчики подписчиков и подписок
                'followers_count': getattr(follow.following, 'followers_count', 0),
                'following_count': getattr(follow.following, 'following_count', 0),
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
@permission_classes([AllowAny])
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


# ==================== 🔥 НОВЫЙ ЭНДПОИНТ: ПОЛУЧЕНИЕ РЕПОСТОВ ПОЛЬЗОВАТЕЛЯ ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_reposts(request, user_id):
    """
    ✅ НОВЫЙ ЭНДПОИНТ: Возвращает список треков, которые пользователь <user_id> репостил.
    URL: /api/users/<user_id>/reposts/
    """
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        # Записи репостов самого пользователя
        repost_qs = TrackRepost.objects.filter(
            user=target_user
        ).select_related('track', 'track__uploaded_by').order_by('-reposted_at')

        # Сериализуем только трек (весь объект репоста нам не нужен)
        tracks = [r.track for r in repost_qs]

        serializer = CompactTrackSerializer(
            tracks,
            many=True,
            context={'request': request}
        )

        return Response({
            'success': True,
            'user_id': target_user.id,
            'username': target_user.username,
            'reposts': serializer.data,
            'count': len(serializer.data)
        })
    except Exception as e:
        logger.error(f"Ошибка в get_user_reposts: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_track_reposters(request, track_id):
    """
    ✅ Возвращает массив пользователей, которые репостнули заданный трек
    """
    try:
        track = Track.objects.get(id=track_id)
        
        # Получаем репосты с информацией о пользователях
        reposts = TrackRepost.objects.filter(
            track=track
        ).select_related('user').order_by('-reposted_at')
        
        # Формируем список пользователей
        users = []
        for repost in reposts:
            user_data = {
                'id': repost.user.id,
                'username': repost.user.username,
                'name': repost.user.username,
                'reposted_at': repost.reposted_at
            }
            
            # Добавляем аватар, если есть
            if repost.user.avatar:
                user_data['avatar'] = request.build_absolute_uri(repost.user.avatar.url)
            elif repost.user.avatar_url:
                user_data['avatar'] = repost.user.avatar_url
            else:
                user_data['avatar'] = None
                
            users.append(user_data)
        
        return Response({
            'success': True,
            'track_id': track_id,
            'track_title': track.title,
            'users': users,
            'count': len(users)
        })
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        logger.error(f"Ошибка при получении репостеров трека: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_repost_status(request, track_id):
    """
    ✅ Проверяет, репостил ли текущий пользователь трек
    """
    try:
        user = request.user
        track = Track.objects.get(id=track_id)
        
        is_reposted = TrackRepost.objects.filter(
            user=user,
            track=track
        ).exists()
        
        repost_count = TrackRepost.objects.filter(track=track).count()
        
        return Response({
            'success': True,
            'track_id': track_id,
            'is_reposted': is_reposted,
            'repost_count': repost_count,
            'user': {
                'id': user.id,
                'username': user.username
            }
        })
        
    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден'
        }, status=404)
    except Exception as e:
        logger.error(f"Ошибка при проверке статуса репоста: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_track_repost(request, track_id):
    """
    Возвращает, репостил ли текущий пользователь данный трек,
    и общее количество репостов трека.
    """
    try:
        # 1️⃣ Попытка получить текущего пользователя (JWT)
        user = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(
                    auth_header.split(' ')[1]
                )
                user = jwt_auth.get_user(validated_token)
            except (InvalidToken, TokenError):
                user = None

        # 2️⃣ Находим трек (или демо, если модель отключена)
        if HAS_TRACK:
            track = Track.objects.get(id=track_id)
        else:
            # демо‑данные – достаточно идентификатора
            track = None

        # 3️⃣ Считаем количество репостов
        if HAS_TRACK_REPOST and track:
            repost_cnt = TrackRepost.objects.filter(track=track).count()
        else:
            repost_cnt = 0

        # 4️⃣ Проверяем, репостил ли текущий пользователь
        is_reposted = False
        if user and HAS_TRACK_REPOST and track:
            try:
                is_reposted = TrackRepost.objects.filter(
                    user=user,
                    track=track
                ).exists()
            except Exception:   # pragma: no cover
                is_reposted = False

        # 5️⃣ Формируем ответ
        return Response({
            'success': True,
            'track_id': track_id,
            'is_reposted': is_reposted,
            'repost_count': repost_cnt,
            'user': user.username if user else None
        })

    except Track.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Трек не найден',
            'track_id': track_id
        }, status=404)

    except Exception as e:
        logger.error(f'Ошибка в check_track_repost: {e}')
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_liked_tracks_public(request, user_id):
    """
    ✅ ПУБЛИЧНО: Возвращает список треков, которые пользователь <user_id> лайкнул.
    URL: /api/users/<user_id>/liked-tracks/
    """
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        tracks = []
        liked_at_map = {}

        if HAS_TRACK_LIKE:
            likes_qs = (TrackLike.objects
                        .filter(user=target_user)
                        .select_related('track', 'track__uploaded_by')
                        .order_by('-liked_at'))
            tracks = [l.track for l in likes_qs]
            liked_at_map = {l.track_id: l.liked_at.isoformat() for l in likes_qs}

        elif HAS_USER_TRACK_INTERACTION:
            interactions = (UserTrackInteraction.objects
                            .filter(user=target_user, liked=True)
                            .select_related('track', 'track__uploaded_by')
                            .order_by('-liked_at'))
            tracks = [i.track for i in interactions]
            liked_at_map = {i.track_id: i.liked_at.isoformat() for i in interactions}

        serializer = CompactTrackSerializer(tracks, many=True, context={'request': request})
        tracks_data = serializer.data

        # необязательно, но удобно (в будущем можно сортировать All по liked_at)
        for t in tracks_data:
            tid = t.get('id')
            if tid in liked_at_map:
                t['liked_at'] = liked_at_map[tid]

        return Response({
            'success': True,
            'user_id': target_user.id,
            'username': target_user.username,
            'liked_tracks': tracks_data,
            'count': len(tracks_data)
        })

    except Exception as e:
        logger.error(f"Ошибка get_user_liked_tracks_public: {e}")
        return Response({'success': False, 'error': str(e)}, status=500)



from django.db.models import Max, Count
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Убедись что эти модели импортированы вверху views.py:
# from .models import CustomUser, Follow, TrackLike, TrackRepost, TrackComment

def _build_user_card(request, u):
    avatar_url = u.get_avatar_url() if hasattr(u, 'get_avatar_url') else None
    if avatar_url and avatar_url.startswith('/'):
        avatar_url = request.build_absolute_uri(avatar_url)

    i_am_following = False
    if request.user and request.user.is_authenticated:
        i_am_following = Follow.objects.filter(follower=request.user, following=u).exists()

    return {
        'id': u.id,
        'username': u.username,
        'avatar_url': avatar_url,
        'followers_count': getattr(u, 'followers_count', 0),
        'i_am_following': i_am_following,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_likes_users(request, user_id):
    """Кто лайкал треки этого автора (агрегация по всем его трекам)"""
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        qs = (
            TrackLike.objects
            .filter(track__uploaded_by=target_user)
            .exclude(user=target_user)   # ✅ чтобы ты сам себе не попался
            .values('user')
            .annotate(last_at=Max('liked_at'), cnt=Count('id'))
            .order_by('-last_at')
        )

        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 8)), 50)  # ✅ 8 = 4+4 карточки
        paginator = Paginator(qs, per_page)

        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        user_ids = [row['user'] for row in page_obj.object_list]
        users = CustomUser.objects.filter(id__in=user_ids)
        users_by_id = {u.id: u for u in users}

        result = []
        for row in page_obj.object_list:
            u = users_by_id.get(row['user'])
            if not u:
                continue
            card = _build_user_card(request, u)
            card['likes_count'] = row.get('cnt', 0)
            card['last_liked_at'] = row.get('last_at').isoformat() if row.get('last_at') else None
            result.append(card)

        return Response({
            'success': True,
            'users': result,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'per_page': per_page
            }
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e), 'users': []}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_reposts_users(request, user_id):
    """Кто репостил треки этого автора (агрегация)"""
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        qs = (
            TrackRepost.objects
            .filter(track__uploaded_by=target_user)
            .exclude(user=target_user)   # ✅
            .values('user')
            .annotate(last_at=Max('reposted_at'), cnt=Count('id'))
            .order_by('-last_at')
        )

        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 8)), 50)
        paginator = Paginator(qs, per_page)

        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        user_ids = [row['user'] for row in page_obj.object_list]
        users = CustomUser.objects.filter(id__in=user_ids)
        users_by_id = {u.id: u for u in users}

        result = []
        for row in page_obj.object_list:
            u = users_by_id.get(row['user'])
            if not u:
                continue
            card = _build_user_card(request, u)
            card['reposts_count'] = row.get('cnt', 0)
            card['last_reposted_at'] = row.get('last_at').isoformat() if row.get('last_at') else None
            result.append(card)

        return Response({
            'success': True,
            'users': result,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'per_page': per_page
            }
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e), 'users': []}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_comments_users(request, user_id):
    """Кто комментировал треки этого автора (агрегация)"""
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        qs = (
            TrackComment.objects
            .filter(track__uploaded_by=target_user, is_deleted=False)
            .exclude(user=target_user)   # ✅
            .values('user')
            .annotate(last_at=Max('created_at'), cnt=Count('id'))
            .order_by('-last_at')
        )

        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 8)), 50)
        paginator = Paginator(qs, per_page)

        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        user_ids = [row['user'] for row in page_obj.object_list]
        users = CustomUser.objects.filter(id__in=user_ids)
        users_by_id = {u.id: u for u in users}

        result = []
        for row in page_obj.object_list:
            u = users_by_id.get(row['user'])
            if not u:
                continue
            card = _build_user_card(request, u)
            card['comments_count'] = row.get('cnt', 0)
            card['last_commented_at'] = row.get('last_at').isoformat() if row.get('last_at') else None
            result.append(card)

        return Response({
            'success': True,
            'users': result,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'per_page': per_page
            }
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e), 'users': []}, status=500)

# =========================
# PLAYLISTS + TRACK SEARCH
# =========================

@api_view(['GET'])
@permission_classes([AllowAny])
def search_tracks(request):
    """
    GET /api/tracks/search/?q=xxx&page=1&per_page=24
    Ищем по title (и чуть-чуть по username автора).
    """
    from .models import Track
    from .serializers import CompactTrackSerializer

    q = (request.GET.get('q') or '').strip()
    page = int(request.GET.get('page') or 1)
    per_page = int(request.GET.get('per_page') or 24)
    page = max(1, page)
    per_page = min(max(1, per_page), 60)

    if not q:
        return Response({'success': True, 'tracks': [], 'pagination': {'page': page, 'per_page': per_page, 'total': 0}}, status=200)

    qs = (Track.objects
          .filter(status='published')
          .select_related('uploaded_by')
          .filter(
              Q(title__icontains=q) |
              Q(uploaded_by__username__icontains=q)
          )
          .order_by('-created_at'))

    total = qs.count()
    start = (page - 1) * per_page
    end = start + per_page
    tracks = qs[start:end]

    data = CompactTrackSerializer(tracks, many=True, context={'request': request}).data

    return Response({
        'success': True,
        'tracks': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'has_next': end < total
        }
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_playlist(request):
    try:
        title = (request.data.get('title') or '').strip() or 'New playlist'
        description = (request.data.get('description') or '').strip()
        visibility = (request.data.get('visibility') or 'private').strip()

        # ✅ принимаем и cover, и cover_image (чтобы фронт/бек не ругались)
        cover_file = request.FILES.get('cover') or request.FILES.get('cover_image')

        raw_ids = request.data.get('track_ids') or '[]'
        if isinstance(raw_ids, str):
            try:
                track_ids = json.loads(raw_ids)
            except Exception:
                track_ids = []
        else:
            track_ids = list(raw_ids) if raw_ids else []

        track_ids = [int(x) for x in track_ids if str(x).isdigit()]

        with transaction.atomic():
            playlist = Playlist.objects.create(
                title=title,
                description=description,
                visibility=visibility,
                created_by=request.user,
            )

            # ✅ поле модели называется cover
            if cover_file:
                playlist.cover = cover_file
                playlist.save(update_fields=['cover'])

            # пересобираем треки по порядку
            for idx, tid in enumerate(track_ids):
                PlaylistTrack.objects.create(
                    playlist=playlist,
                    track_id=tid,
                    added_by=request.user,
                    position=idx
                )

        return Response({"playlist": PlaylistSerializer(playlist, context={"request": request}).data}, status=201)

    except Exception as e:
        print("create_playlist error:", e)
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_playlist(request, playlist_id: int):
    playlist = get_object_or_404(Playlist, id=playlist_id)

    if playlist.created_by_id != request.user.id:
        return Response({"error": "Forbidden"}, status=403)

    try:
        title = (request.data.get('title') or '').strip()
        description = (request.data.get('description') or '').strip()
        visibility = (request.data.get('visibility') or '').strip()
        cover_file = request.FILES.get('cover') or request.FILES.get('cover_image')

        raw_ids = request.data.get('track_ids')
        if raw_ids is None:
            track_ids = None
        else:
            if isinstance(raw_ids, str):
                try:
                    track_ids = json.loads(raw_ids)
                except Exception:
                    track_ids = []
            else:
                track_ids = list(raw_ids) if raw_ids else []
            track_ids = [int(x) for x in track_ids if str(x).isdigit()]

        with transaction.atomic():
            if title:
                playlist.title = title
            if request.data.get('description') is not None:
                playlist.description = description
            if visibility:
                playlist.visibility = visibility

            playlist.save()

            if cover_file:
                playlist.cover = cover_file
                playlist.save(update_fields=['cover'])

            if track_ids is not None:
                PlaylistTrack.objects.filter(playlist=playlist).delete()
                for idx, tid in enumerate(track_ids):
                    PlaylistTrack.objects.create(
                        playlist=playlist,
                        track_id=tid,
                        added_by=request.user,
                        position=idx
                    )

        return Response({"playlist": PlaylistSerializer(playlist, context={"request": request}).data})

    except Exception as e:
        print("update_playlist error:", e)
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def playlist_detail(request, playlist_id: int):
    playlist = get_object_or_404(Playlist, id=playlist_id)

    # private — только владельцу
    if playlist.visibility == 'private':
        if not request.user.is_authenticated or playlist.created_by_id != request.user.id:
            return Response({"error": "Private playlist"}, status=403)

    items_qs = PlaylistTrack.objects.filter(playlist=playlist).select_related('track').order_by('position', 'id')
    return Response({
        "playlist": PlaylistSerializer(playlist, context={"request": request}).data,
        "items": PlaylistTrackSerializer(items_qs, many=True, context={"request": request}).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_playlist_copy(request, playlist_id: int):
    """Сохранить (скопировать) чужой плейлист себе."""
    src = get_object_or_404(Playlist, id=playlist_id)

    if src.visibility == 'private' and src.created_by_id != request.user.id:
        return Response({"error": "Forbidden"}, status=403)

    items = list(PlaylistTrack.objects.filter(playlist=src).order_by('position', 'id').values_list('track_id', flat=True))

    with transaction.atomic():
        new_pl = Playlist.objects.create(
            title=f"{src.title} (saved)",
            description=src.description,
            visibility="private",
            created_by=request.user,
            # cover: можно оставить пустым или сделать url
            cover_url=(src.get_cover_url() if hasattr(src, "get_cover_url") else (src.cover.url if src.cover else "")),
        )
        for idx, tid in enumerate(items):
            PlaylistTrack.objects.create(playlist=new_pl, track_id=tid, added_by=request.user, position=idx)

    return Response({"playlist": PlaylistSerializer(new_pl, context={"request": request}).data}, status=201)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_playlists(request, user_id):
    target = get_object_or_404(User, id=user_id)
    qs = Playlist.objects.filter(created_by=target)

    # добавление фильтрации по visibility
    if not (request.user.is_authenticated and request.user.id == target.id):
        qs = qs.filter(visibility__in=['public', 'unlisted'])

    return Response({
        'playlists': PlaylistSerializer(qs, many=True, context={"request": request}).data
    }, status=200)


from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def search_hub(request):
    """
    GET /api/search/?q=xxx&type=all|tracks|playlists|people
                   &tag=Techno&tag=Ambient
                   &country=Germany
                   &page=1&per_page=20
    """
    from .models import Track, Playlist, CustomUser, Hashtag
    from .serializers import CompactTrackSerializer, PlaylistSerializer, PublicUserSerializer

    q = (request.GET.get('q') or '').strip()
    tab = (request.GET.get('type') or 'all').strip().lower()

    # multi tag: ?tag=a&tag=b
    tags = request.GET.getlist('tag') or []
    tags = [t.replace('#', '').strip() for t in tags if t.strip()]

    country = (request.GET.get('country') or '').strip()

    def to_int(v, default):
        try:
            return int(v)
        except:
            return default

    page = max(1, to_int(request.GET.get('page'), 1))
    per_page = min(max(1, to_int(request.GET.get('per_page'), 20)), 60)

    # --- базовые queryset-ы ---
    tracks_qs = (Track.objects
        .filter(status='published')
        .select_related('uploaded_by')
    )

    if q:
        tracks_qs = tracks_qs.filter(
            Q(title__icontains=q) |
            Q(uploaded_by__username__icontains=q)
        )

    if tags:
        # AND по тегам (все выбранные должны быть у трека)
        for t in tags:
            tracks_qs = tracks_qs.filter(hashtags__name__iexact=t)

    tracks_qs = tracks_qs.order_by('-created_at').distinct()

    playlists_qs = (Playlist.objects
        .filter(visibility='public')
        .select_related('created_by')
        .prefetch_related('tracks')
    )

    if q:
        playlists_qs = playlists_qs.filter(
            Q(title__icontains=q) |
            Q(description__icontains=q) |
            Q(created_by__username__icontains=q)
        )

    if tags:
        # плейлист подходит, если в нём есть треки с тегами
        for t in tags:
            playlists_qs = playlists_qs.filter(tracks__hashtags__name__iexact=t)

    playlists_qs = playlists_qs.order_by('-created_at').distinct()

    users_qs = CustomUser.objects.all()

    if q:
        users_qs = users_qs.filter(
            Q(username__icontains=q) |
            Q(bio__icontains=q) |
            Q(country__icontains=q)
        )

    if country:
        users_qs = users_qs.filter(country__iexact=country)

    users_qs = users_qs.order_by('-created_at').distinct()

    # --- counts для заголовка "Found ..." ---
    counts = {
        "tracks": tracks_qs.count(),
        "playlists": playlists_qs.count(),
        "people": users_qs.count(),
    }

    # --- фильтры слева ---
    # страны из результата people
    available_countries = list(
        users_qs.exclude(country='')
               .values_list('country', flat=True)
               .distinct()[:60]
    )

    # теги из результата tracks (плюс можно добавить trending)
    available_tags = list(
        tracks_qs.values_list('hashtags__name', flat=True)
                 .exclude(hashtags__name__isnull=True)
                 .exclude(hashtags__name__exact='')
                 .distinct()[:40]
    )

    trending_tags = list(
        Hashtag.objects.order_by('-usage_count').values_list('name', flat=True)[:20]
    )

    def paginate(qs):
        total = qs.count()
        start = (page - 1) * per_page
        end = start + per_page
        return qs[start:end], {
            "page": page,
            "per_page": per_page,
            "total": total,
            "has_next": end < total
        }

    payload = {
        "success": True,
        "q": q,
        "type": tab,
        "selected": {
            "tags": tags,
            "country": country,
        },
        "counts": counts,
        "filters": {
            "countries": available_countries,
            "tags": available_tags,
            "trending_tags": trending_tags
        }
    }

    # --- выдача по вкладке ---
    if tab == 'tracks':
        items, pagination = paginate(tracks_qs)
        payload["tracks"] = CompactTrackSerializer(items, many=True, context={"request": request}).data
        payload["pagination"] = pagination
        return Response(payload, status=200)

    if tab == 'playlists':
        items, pagination = paginate(playlists_qs)
        payload["playlists"] = PlaylistSerializer(items, many=True, context={"request": request}).data
        payload["pagination"] = pagination
        return Response(payload, status=200)

    if tab == 'people':
        items, pagination = paginate(users_qs)
        payload["people"] = PublicUserSerializer(items, many=True, context={"request": request}).data
        payload["pagination"] = pagination
        return Response(payload, status=200)

    # tab == all
    payload["people"] = PublicUserSerializer(users_qs[:6], many=True, context={"request": request}).data
    payload["tracks"] = CompactTrackSerializer(tracks_qs[:12], many=True, context={"request": request}).data
    payload["playlists"] = PlaylistSerializer(playlists_qs[:6], many=True, context={"request": request}).data

    return Response(payload, status=200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_playlist(request, playlist_id: int):
    playlist = get_object_or_404(Playlist, id=playlist_id)

    if playlist.created_by_id != request.user.id:
        return Response({"error": "Forbidden"}, status=403)

    try:
        with transaction.atomic():
            # ✅ удалить файл обложки (если есть)
            if playlist.cover:
                playlist.cover.delete(save=False)

            # ✅ удалить связи треков (на всякий)
            PlaylistTrack.objects.filter(playlist=playlist).delete()

            # ✅ удалить сам плейлист
            playlist.delete()

        return Response({"success": True, "deleted_id": playlist_id}, status=200)

    except Exception as e:
        print("delete_playlist error:", e)
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_playlist_like(request, playlist_id):
    playlist = get_object_or_404(Playlist, id=playlist_id)

    # Проверка, есть ли уже лайк от этого пользователя
    existing_like = PlaylistLike.objects.filter(user=request.user, playlist=playlist).first()

    if existing_like:
        # Если лайк уже есть, удаляем его
        existing_like.delete()
        return Response({'success': False, 'message': 'Playlist unliked'})
    else:
        # Если лайка нет, создаем новый
        PlaylistLike.objects.create(user=request.user, playlist=playlist)
        return Response({'success': True, 'message': 'Playlist liked'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_playlist_repost(request, playlist_id):
    playlist = get_object_or_404(Playlist, id=playlist_id)

    # Проверка, есть ли уже репост от этого пользователя
    existing_repost = PlaylistRepost.objects.filter(user=request.user, playlist=playlist).first()

    if existing_repost:
        # Если репост уже есть, удаляем его
        existing_repost.delete()
        return Response({'success': False, 'message': 'Playlist unreposted'})
    else:
        # Если репоста нет, создаем новый
        PlaylistRepost.objects.create(user=request.user, playlist=playlist)
        return Response({'success': True, 'message': 'Playlist reposted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_playlist_like_status(request, playlist_id: int):
    playlist = get_object_or_404(Playlist, id=playlist_id)
    liked = PlaylistLike.objects.filter(user=request.user, playlist=playlist).exists()
    count = PlaylistLike.objects.filter(playlist=playlist).count()
    return Response({'success': True, 'liked': liked, 'like_count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_playlist_repost_status(request, playlist_id: int):
    playlist = get_object_or_404(Playlist, id=playlist_id)
    reposted = PlaylistRepost.objects.filter(user=request.user, playlist=playlist).exists()
    count = PlaylistRepost.objects.filter(playlist=playlist).count()
    return Response({'success': True, 'reposted': reposted, 'repost_count': count})

def _safe_user_card(u: CustomUser):
    # fallback если у тебя нет _build_user_card
    return {
        "id": u.id,
        "username": getattr(u, "username", ""),
        "email": getattr(u, "email", ""),
        "avatar_url": getattr(getattr(u, "avatar", None), "url", None),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def get_playlist_likes_users(request, playlist_id: int):
    """Кто лайкнул плейлист"""
    try:
        playlist = get_object_or_404(Playlist, id=playlist_id)

        qs = (
            PlaylistLike.objects
            .filter(playlist=playlist)
            .values('user')
            .annotate(last_at=Max('created_at'), cnt=Count('id'))
            .order_by('-last_at')
        )

        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 8)), 50)
        paginator = Paginator(qs, per_page)

        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        user_ids = [row['user'] for row in page_obj.object_list]
        users = CustomUser.objects.filter(id__in=user_ids)
        users_by_id = {u.id: u for u in users}

        result = []
        for row in page_obj.object_list:
            u = users_by_id.get(row['user'])
            if not u:
                continue

            # если у тебя в проекте есть _build_user_card — используй его
            try:
                card = _build_user_card(request, u)  # noqa
            except Exception:
                card = _safe_user_card(u)

            card['likes_count'] = row.get('cnt', 0)
            card['last_liked_at'] = row.get('last_at').isoformat() if row.get('last_at') else None
            result.append(card)

        return Response({
            'success': True,
            'users': result,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'per_page': per_page
            }
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e), 'users': []}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_playlist_reposts_users(request, playlist_id: int):
    """Кто репостнул плейлист"""
    try:
        playlist = get_object_or_404(Playlist, id=playlist_id)

        qs = (
            PlaylistRepost.objects
            .filter(playlist=playlist)
            .values('user')
            .annotate(last_at=Max('created_at'), cnt=Count('id'))
            .order_by('-last_at')
        )

        page = request.GET.get('page', 1)
        per_page = min(int(request.GET.get('per_page', 8)), 50)
        paginator = Paginator(qs, per_page)

        try:
            page_obj = paginator.page(page)
        except:
            page_obj = paginator.page(1)

        user_ids = [row['user'] for row in page_obj.object_list]
        users = CustomUser.objects.filter(id__in=user_ids)
        users_by_id = {u.id: u for u in users}

        result = []
        for row in page_obj.object_list:
            u = users_by_id.get(row['user'])
            if not u:
                continue

            try:
                card = _build_user_card(request, u)  # noqa
            except Exception:
                card = _safe_user_card(u)

            card['reposts_count'] = row.get('cnt', 0)
            card['last_reposted_at'] = row.get('last_at').isoformat() if row.get('last_at') else None
            result.append(card)

        return Response({
            'success': True,
            'users': result,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'per_page': per_page
            }
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e), 'users': []}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_liked_playlists(request, user_id: int):
    playlist_ids = list(
        PlaylistLike.objects.filter(user_id=user_id).values_list('playlist_id', flat=True)
    )

    playlists = Playlist.objects.filter(id__in=playlist_ids).select_related('created_by').order_by('-created_at')

    return Response({
        "success": True,
        "playlist_ids": playlist_ids,  # удобно для кнопок
        "playlists": PlaylistSerializer(playlists, many=True, context={"request": request}).data
    }, status=200)


@api_view(['GET'])
@permission_classes([AllowAny])  # 👈 Меняем на AllowAny для публичного доступа
def get_user_reposted_playlists(request, user_id: int):
    playlist_ids = list(
        PlaylistRepost.objects.filter(user_id=user_id).values_list('playlist_id', flat=True)
    )

    playlists = Playlist.objects.filter(id__in=playlist_ids).select_related('created_by').order_by('-created_at')

    return Response({
        "success": True,
        "playlist_ids": playlist_ids,
        "playlists": PlaylistSerializer(playlists, many=True, context={"request": request}).data
    }, status=200)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_track_playlists(request, track_id):
    """
    Возвращает список плейлистов, в которых содержится указанный трек.
    Только публичные плейлисты (visibility != private).
    """
    try:
        track = Track.objects.filter(id=track_id).first()
        if not track:
            return Response({"success": False, "error": "Track not found"}, status=404)

        playlists = (
            Playlist.objects
            .filter(tracks__id=track_id)
            .exclude(visibility__iexact='private')   # ✅ у тебя нет is_private
            .select_related('created_by')
            .annotate(tracks_count=Count('tracks', distinct=True))
            .distinct()
        )

        serializer = PlaylistSerializer(playlists, many=True, context={'request': request})

        return Response({
            "success": True,
            "playlists": serializer.data,
            "count": playlists.count()
        })

    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=500)

from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

# Импортируем все необходимые модели и сериализаторы
from .models import (
    CustomUser, Track, Conversation, Message, DialogState,
    Follow, TrackLike, TrackRepost, ListeningHistory, PlayHistory,
    Notification, Playlist, PlaylistTrack, PlaylistLike, PlaylistRepost
)
from .serializers import (
    CompactTrackSerializer, DialogListSerializer, MessageSerializer,
    UserMeSerializer, TrackSerializer
)

# ==================== NOW PLAYING ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_now_playing(request):
    """
    POST /api/me/now-playing/
    body: { track_id: int|null, is_playing: bool }
    """
    user = request.user

    track_id = request.data.get('track_id', None)
    is_playing = bool(request.data.get('is_playing', True))

    track = None
    if track_id:
        track = get_object_or_404(Track, id=int(track_id))

    user.now_playing_track = track
    user.now_playing_is_playing = is_playing
    user.now_playing_at = timezone.now()
    user.save(update_fields=['now_playing_track', 'now_playing_is_playing', 'now_playing_at'])

    return Response({
        'success': True,
        'user_id': user.id,
        'track_id': track.id if track else None,
        'is_playing': user.now_playing_is_playing,
        'now_playing_at': user.now_playing_at.isoformat() if user.now_playing_at else None
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_now_playing(request, user_id):
    """
    GET /api/users/<id>/now-playing/
    Возвращает трек + время обновления, чтобы фронт мог считать online/afk/offline
    """
    u = get_object_or_404(CustomUser, id=user_id)

    track_data = None
    if u.now_playing_track:
        serializer = CompactTrackSerializer(u.now_playing_track, context={'request': request})
        track_data = serializer.data

    seconds_ago = None
    if u.now_playing_at:
        seconds_ago = int((timezone.now() - u.now_playing_at).total_seconds())

    return Response({
        'success': True,
        'user': {
            'id': u.id,
            'username': u.username,
            'avatar_url': u.get_avatar_url(),
            'bio': u.bio or ''
        },
        'track': track_data,
        'is_playing': bool(u.now_playing_is_playing),
        'now_playing_at': u.now_playing_at.isoformat() if u.now_playing_at else None,
        'seconds_ago': seconds_ago
    })


# ==================== ДИАЛОГИ (С УЧЕТОМ СКРЫТЫХ) ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_dialogs(request):
    """
    GET /api/dialogs/
    Список НЕ скрытых диалогов текущего пользователя
    """
    # Получаем ID скрытых диалогов
    hidden_ids = set(
        DialogState.objects.filter(user=request.user, is_hidden=True)
        .values_list('conversation_id', flat=True)
    )

    # Берем только те диалоги, которые не скрыты
    qs = (Conversation.objects
          .filter(participants=request.user)
          .exclude(id__in=hidden_ids)
          .distinct()
          .order_by('-updated_at'))

    serializer = DialogListSerializer(qs, many=True, context={'request': request})
    return Response({'success': True, 'dialogs': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_dialog(request):
    """
    POST /api/dialogs/start/
    body: { "user_id": <int> } или { "id": <int> } или { "other_user_id": <int> }
    Создать/получить диалог 1-на-1 и разскрыть его если был скрыт
    """
    # 🔥 МАКСИМАЛЬНО ГИБКОЕ ПОЛУЧЕНИЕ ID - поддерживаем ВСЕ возможные варианты
    other_id = (
        request.data.get('user_id') or
        request.data.get('id') or
        request.data.get('other_user_id') or
        request.data.get('userId') or
        request.data.get('otherId') or
        request.data.get('user') or
        request.data.get('uid') or
        request.data.get('pk') or
        request.query_params.get('user_id') or
        request.query_params.get('id')
    )
    
    # 🔥 ПОДРОБНОЕ ЛОГИРОВАНИЕ для отладки
    print(f"🔍 start_dialog: Получен запрос от пользователя {request.user.id}")
    print(f"📦 Данные запроса: {request.data}")
    print(f"🔑 Извлеченный other_id: {other_id}")
    
    # 🔥 Проверка на None или пустую строку
    if other_id is None or other_id == '':
        print(f"❌ start_dialog: other_id отсутствует или пустой")
        return Response({
            'success': False, 
            'error': 'user_id is required',
            'message': 'Необходимо указать ID пользователя',
            'received_data': request.data,
            'received_keys': list(request.data.keys()) if request.data else []
        }, status=400)
    
    # 🔥 Пробуем преобразовать в число (поддерживаем строки и числа)
    try:
        other_id = int(other_id)
        print(f"✅ start_dialog: Преобразовано в число: {other_id}")
    except (TypeError, ValueError) as e:
        print(f"❌ start_dialog: Ошибка преобразования в число: {e}, значение: {other_id}")
        return Response({
            'success': False, 
            'error': 'user_id must be a number',
            'message': f'ID пользователя должен быть числом, получено: {other_id}',
            'received_type': type(other_id).__name__,
            'received_value': str(other_id)[:100]
        }, status=400)

    # 🔥 Получаем пользователя
    try:
        other = CustomUser.objects.get(id=other_id)
        print(f"✅ start_dialog: Найден пользователь {other.username} (id: {other.id})")
    except CustomUser.DoesNotExist:
        print(f"❌ start_dialog: Пользователь с id {other_id} не найден")
        return Response({
            'success': False, 
            'error': f'User with id {other_id} not found',
            'message': f'Пользователь с ID {other_id} не найден'
        }, status=404)

    # 🔥 Проверка на диалог с самим собой
    if other.id == request.user.id:
        print(f"❌ start_dialog: Попытка создать диалог с самим собой")
        return Response({
            'success': False, 
            'error': 'cannot start dialog with yourself',
            'message': 'Нельзя создать диалог с самим собой'
        }, status=400)

    # 🔥 КРИТИЧЕСКИ ВАЖНО: ПРАВИЛЬНЫЙ ПОИСК СУЩЕСТВУЮЩЕГО ДИАЛОГА
    # Эта версия гарантированно находит ТОЛЬКО один диалог между двумя пользователями
    print(f"🔍 start_dialog: Поиск существующего диалога между {request.user.id} и {other.id}")
    
    u1 = request.user.id
    u2 = other.id
    
    # ✅ ИСПРАВЛЕННЫЙ ЗАПРОС - всегда находит правильный диалог
    existing = (Conversation.objects
                .filter(participants__id__in=[u1, u2])
                .annotate(
                    total=Count('participants', distinct=True),
                    matched=Count('participants', filter=Q(participants__id__in=[u1, u2]), distinct=True)
                )
                .filter(total=2, matched=2)
                .order_by('-updated_at')
                .first())

    if existing:
        conv = existing
        msg_count = conv.messages.count()
        print(f"✅ Найден существующий диалог {conv.id} с {msg_count} сообщениями")
        print(f"   Участники: {[p.id for p in conv.participants.all()]}")
    else:
        conv = Conversation.objects.create()
        conv.participants.add(request.user, other)
        conv.save()
        print(f"🆕 Создан новый диалог {conv.id} между {request.user.id} и {other.id}")

    # 🔥 КРИТИЧЕСКИ ВАЖНО: если диалог был скрыт - разскрываем его
    state, created = DialogState.objects.get_or_create(
        user=request.user, 
        conversation=conv,
        defaults={'is_hidden': False}
    )
    
    if created:
        print(f"📝 Создано состояние для диалога {conv.id} (is_hidden=False по умолчанию)")
    elif state.is_hidden:
        state.is_hidden = False
        state.save(update_fields=['is_hidden', 'updated_at'])
        print(f"🔓 Диалог {conv.id} был скрыт для пользователя {request.user.id}, теперь раскрыт")
    else:
        print(f"ℹ️ Диалог {conv.id} уже был видим для пользователя {request.user.id}")

    # 🔥 Сериализуем результат
    serializer = DialogListSerializer(conv, context={'request': request})
    
    # 🔥 Возвращаем расширенный ответ с отладочной информацией
    return Response({
        'success': True, 
        'dialog': serializer.data, 
        'conversation_id': conv.id,
        'was_existing': bool(existing),
        'was_hidden': not created and state.is_hidden,
        'debug': {
            'requested_user_id': other_id,
            'found_user': other.username,
            'conversation_created': not bool(existing),
            'messages_count': conv.messages.count(),
            'participants': [p.id for p in conv.participants.all()]
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hide_dialog(request, conversation_id):
    """
    POST /api/dialogs/<id>/hide/
    Скрыть диалог из списка (не удаляя переписку)
    """
    conv = get_object_or_404(Conversation, id=conversation_id)
    
    # Проверяем, что пользователь является участником диалога
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # Создаем или обновляем состояние
    state, _ = DialogState.objects.get_or_create(user=request.user, conversation=conv)
    state.is_hidden = True
    state.save(update_fields=['is_hidden', 'updated_at'])
    
    return Response({'success': True, 'message': 'Dialog hidden'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unhide_dialog(request, conversation_id):
    """
    POST /api/dialogs/<id>/unhide/
    Показать скрытый диалог обратно в списке
    """
    conv = get_object_or_404(Conversation, id=conversation_id)
    
    # Проверяем, что пользователь является участником диалога
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # Создаем или обновляем состояние
    state, _ = DialogState.objects.get_or_create(user=request.user, conversation=conv)
    state.is_hidden = False
    state.save(update_fields=['is_hidden', 'updated_at'])
    
    return Response({'success': True, 'message': 'Dialog unhidden'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_hidden_dialogs(request):
    """
    GET /api/dialogs/hidden/
    (Опционально) Получить список скрытых диалогов
    """
    # Получаем ID скрытых диалогов
    hidden_states = (DialogState.objects
                     .filter(user=request.user, is_hidden=True)
                     .select_related('conversation')
                     .order_by('-updated_at'))
    
    conversations = [state.conversation for state in hidden_states]
    
    serializer = DialogListSerializer(conversations, many=True, context={'request': request})
    return Response({'success': True, 'dialogs': serializer.data})


# ==================== СООБЩЕНИЯ ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_messages(request, conversation_id):
    """
    GET /api/dialogs/<id>/messages/
    Возвращает список сообщений в диалоге с флагом is_mine для каждого сообщения
    """
    conv = get_object_or_404(Conversation, id=conversation_id)

    # Проверяем, что пользователь является участником диалога
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # Получаем сообщения с оптимизацией запросов
    qs = (conv.messages
          .select_related('sender', 'track')
          .prefetch_related('track__uploaded_by')
          .order_by('created_at'))
    
    # 🔥 ВАЖНО: передаем request в контекст для корректного вычисления is_mine
    serializer = MessageSerializer(qs, many=True, context={'request': request})
    
    # Опционально: помечаем сообщения как прочитанные
    # Отмечаем только те, которые не от текущего пользователя и еще не прочитаны
    unread_messages = qs.filter(is_read=False).exclude(sender=request.user)
    if unread_messages.exists():
        unread_messages.update(is_read=True, read_at=timezone.now())
        print(f"📨 Помечено {unread_messages.count()} сообщений как прочитанные в диалоге {conversation_id}")
    
    return Response({
        'success': True, 
        'messages': serializer.data,
        'count': len(serializer.data),
        'conversation_id': conversation_id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request, conversation_id):
    """
    POST /api/dialogs/<id>/messages/send/
    
    Отправляет сообщение в диалог.
    Поддерживает типы сообщений:
    1. Текстовые: { "text": "..." }
    2. С треком: { "track_id": 123 }
    3. Голосовые: multipart/form-data с audio, duration, waveform
    4. Изображения: multipart/form-data с image, text (caption)
    5. Видео: multipart/form-data с video, text (caption)
    
    Возвращает созданное сообщение с флагом is_mine=true
    """
    conv = get_object_or_404(Conversation, id=conversation_id)

    # Проверяем, что пользователь является участником диалога
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # ========== ПОЛУЧАЕМ ДАННЫЕ ИЗ ЗАПРОСА ==========
    # Текст (может быть пустым для голосовых/медиа сообщений)
    text = (request.data.get('text') or '').strip()
    
    # ID трека (опционально)
    track_id = request.data.get('track_id')
    
    # ✅ ГОЛОСОВЫЕ ДАННЫЕ
    voice_file = request.FILES.get('audio') or request.FILES.get('voice')
    voice_duration = request.data.get('duration')
    waveform_raw = request.data.get('waveform')
    
    # ✅ МЕДИА ДАННЫЕ (ИЗОБРАЖЕНИЯ/ВИДЕО) - НОВЫЕ
    image_file = request.FILES.get('image')
    video_file = request.FILES.get('video')

    # ========== ВАЛИДАЦИЯ ==========
    # Должно быть что-то одно: текст, трек, голосовое, изображение или видео
    if not text and not track_id and not voice_file and not image_file and not video_file:
        return Response({
            'success': False, 
            'error': 'empty message',
            'detail': 'Message must contain text, track_id, audio, image or video'
        }, status=400)

    # ✅ ВАЛИДАЦИЯ ГОЛОСОВОГО СООБЩЕНИЯ
    if voice_file:
        # Проверяем минимальную длительность (1 секунда)
        try:
            dur = int(voice_duration or 0)
        except (ValueError, TypeError):
            dur = 0
        
        if dur < 1:
            return Response({
                'success': False, 
                'error': 'voice too short',
                'detail': 'Voice message must be at least 1 second long'
            }, status=400)
        
        # Проверяем формат файла
        content_type = voice_file.content_type or ''
        allowed_types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
        if not any(allowed in content_type for allowed in allowed_types):
            # Разрешаем основные аудио форматы
            ext = voice_file.name.split('.')[-1].lower() if '.' in voice_file.name else ''
            if ext not in ['webm', 'ogg', 'mp3', 'mp4', 'wav', 'm4a']:
                return Response({
                    'success': False,
                    'error': 'invalid format',
                    'detail': 'Supported formats: webm, ogg, mp3, mp4, wav, m4a'
                }, status=400)
        
        # Проверяем размер файла (максимум 10MB)
        if voice_file.size > 10 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'file too large',
                'detail': 'Voice message must be less than 10MB'
            }, status=400)

    # ✅ ВАЛИДАЦИЯ ИЗОБРАЖЕНИЯ
    if image_file:
        # Проверяем формат файла
        content_type = image_file.content_type or ''
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if not any(allowed in content_type for allowed in allowed_types):
            ext = image_file.name.split('.')[-1].lower() if '.' in image_file.name else ''
            if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                return Response({
                    'success': False,
                    'error': 'invalid format',
                    'detail': 'Supported formats: jpg, jpeg, png, gif, webp'
                }, status=400)
        
        # Проверяем размер файла (максимум 20MB)
        if image_file.size > 20 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'file too large',
                'detail': 'Image must be less than 20MB'
            }, status=400)

    # ✅ ВАЛИДАЦИЯ ВИДЕО
    if video_file:
        # Проверяем формат файла
        content_type = video_file.content_type or ''
        allowed_types = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
        if not any(allowed in content_type for allowed in allowed_types):
            ext = video_file.name.split('.')[-1].lower() if '.' in video_file.name else ''
            if ext not in ['mp4', 'webm', 'ogg', 'mov', 'm4v']:
                return Response({
                    'success': False,
                    'error': 'invalid format',
                    'detail': 'Supported formats: mp4, webm, ogg, mov, m4v'
                }, status=400)
        
        # Проверяем размер файла (максимум 50MB)
        if video_file.size > 50 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'file too large',
                'detail': 'Video must be less than 50MB'
            }, status=400)

    # Если есть track_id, получаем трек
    track = None
    if track_id:
        try:
            track_id_int = int(track_id)
            track = get_object_or_404(Track, id=track_id_int)
            # Опционально: проверить, имеет ли пользователь доступ к треку
            # if not track.can_be_accessed_by(request.user):
            #     return Response({'success': False, 'error': 'track not accessible'}, status=403)
        except (ValueError, TypeError):
            return Response({
                'success': False, 
                'error': 'invalid track_id',
                'detail': 'track_id must be a valid integer'
            }, status=400)

    # ========== ПАРСИМ WAVEFORM, ЕСЛИ ЕСТЬ ==========
    waveform_data = None
    if waveform_raw:
        try:
            # Пробуем распарсить JSON
            if isinstance(waveform_raw, str):
                waveform_data = json.loads(waveform_raw)
            elif isinstance(waveform_raw, list):
                waveform_data = waveform_raw
            else:
                waveform_data = waveform_raw
            
            # Проверяем, что это список чисел
            if isinstance(waveform_data, list):
                # Ограничиваем размер и проверяем что это числа
                if len(waveform_data) > 200:
                    waveform_data = waveform_data[:200]
                
                # Конвертируем все элементы в числа
                waveform_data = [float(x) if isinstance(x, (int, float, str)) and str(x).replace('.', '').isdigit() else 0 
                               for x in waveform_data]
            else:
                waveform_data = None
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            logger.warning(f"Error parsing waveform data: {e}")
            waveform_data = None

    # ========== СОЗДАЕМ СООБЩЕНИЕ ==========
    msg = Message.objects.create(
        conversation=conv,
        sender=request.user,
        text=text,
        track=track,
        voice=voice_file if voice_file else None,
        voice_duration=int(voice_duration) if voice_duration else None,
        waveform=waveform_data,
        # ✅ НОВЫЕ ПОЛЯ ДЛЯ МЕДИА
        image=image_file if image_file else None,
        video=video_file if video_file else None
    )
    
    logger.info(f"📝 Создано сообщение {msg.id} в диалоге {conversation_id} от пользователя {request.user.id}")
    if voice_file:
        logger.info(f"🎤 Голосовое сообщение: {voice_file.name}, длительность: {voice_duration}с")
    if image_file:
        logger.info(f"🖼️ Изображение: {image_file.name}")
    if video_file:
        logger.info(f"🎥 Видео: {video_file.name}")

    # Обновляем updated_at диалога, чтобы он поднялся вверх в списке
    conv.save(update_fields=['updated_at'])

    # 🔥 Отмечаем диалог как непрочитанный для других участников
    for participant in conv.participants.exclude(id=request.user.id):
        state, _ = DialogState.objects.get_or_create(
            user=participant,
            conversation=conv,
            defaults={'is_hidden': False}
        )
        # Здесь можно добавить логику для уведомлений

    # ========== СОЗДАЕМ УВЕДОМЛЕНИЕ ДЛЯ ДРУГОГО УЧАСТНИКА ==========
    other_user = conv.participants.exclude(id=request.user.id).first()
    if other_user:
        try:
            # Определяем тип и содержимое уведомления
            if voice_file:
                notification_type = 'voice_message'
                notification_title = f'🎤 Голосовое сообщение от {request.user.username}'
                notification_content = f'Голосовое сообщение ({voice_duration} сек)'
            elif image_file:
                notification_type = 'image_message'
                notification_title = f'🖼️ Изображение от {request.user.username}'
                notification_content = text[:100] + ('...' if len(text) > 100 else '') if text else '📷 Фото'
            elif video_file:
                notification_type = 'video_message'
                notification_title = f'🎥 Видео от {request.user.username}'
                notification_content = text[:100] + ('...' if len(text) > 100 else '') if text else '🎬 Видео'
            elif track:
                notification_type = 'track_message'
                notification_title = f'🎵 Трек от {request.user.username}'
                notification_content = track.title
            else:
                notification_type = 'text_message'
                notification_title = f'💬 Сообщение от {request.user.username}'
                notification_content = text[:100] + ('...' if len(text) > 100 else '')
            
            Notification.objects.create(
                user=other_user,
                type=notification_type,
                title=notification_title,
                content=notification_content,
                related_user=request.user,
                related_track=track
            )
            logger.info(f"📬 Уведомление создано для пользователя {other_user.id}")
        except Exception as e:
            logger.error(f"Ошибка при создании уведомления: {e}")

    # ========== СЕРИАЛИЗУЕМ И ВОЗВРАЩАЕМ ОТВЕТ ==========
    # 🔥 ВАЖНО: передаем request в контекст для корректного вычисления is_mine и voice_url/image_url/video_url
    serializer = MessageSerializer(msg, context={'request': request})

    return Response({
        'success': True, 
        'message': serializer.data,
        'conversation_id': conversation_id,
        'message_id': msg.id
    }, status=201)
# ==================== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ДИАЛОГОВ ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dialog_info(request, conversation_id):
    """
    GET /api/dialogs/<id>/info/
    Получить информацию о диалоге (участники, статус и т.д.)
    """
    conv = get_object_or_404(Conversation, id=conversation_id)

    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # Получаем состояние для текущего пользователя
    state = DialogState.objects.filter(user=request.user, conversation=conv).first()
    
    # Получаем другого участника (для 1-на-1)
    other_participant = conv.participants.exclude(id=request.user.id).first()
    
    other_data = None
    if other_participant:
        other_data = {
            'id': other_participant.id,
            'username': other_participant.username,
            'avatar_url': other_participant.get_avatar_url(),
            'is_online': other_participant.is_online if hasattr(other_participant, 'is_online') else False,
            'now_playing': other_participant.now_playing_track_id is not None
        }

    return Response({
        'success': True,
        'dialog': {
            'id': conv.id,
            'is_group': conv.is_group,
            'title': conv.title,
            'created_at': conv.created_at,
            'updated_at': conv.updated_at,
            'is_hidden': state.is_hidden if state else False,
            'participants_count': conv.participants.count(),
            'other_participant': other_data
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_dialog_read(request, conversation_id):
    """
    POST /api/dialogs/<id>/read/
    Пометить все сообщения в диалоге как прочитанные
    """
    conv = get_object_or_404(Conversation, id=conversation_id)

    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # Помечаем все непрочитанные сообщения (кроме своих) как прочитанные
    updated = Message.objects.filter(
        conversation=conv,
        is_read=False
    ).exclude(
        sender=request.user
    ).update(
        is_read=True,
        read_at=timezone.now()
    )

    return Response({
        'success': True,
        'marked_read': updated
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_dialog(request, conversation_id):
    """
    DELETE /api/dialogs/<id>/
    Полностью удалить диалог (только для владельца/админа)
    ВНИМАНИЕ: это удалит все сообщения безвозвратно!
    """
    conv = get_object_or_404(Conversation, id=conversation_id)

    # Проверяем права (только если пользователь - создатель или админ)
    # Для простоты разрешим только если пользователь - единственный участник?
    # Лучше сделать проверку на админа или владельца
    if not request.user.is_staff:
        return Response({'success': False, 'error': 'only staff can delete dialogs'}, status=403)

    # Удаляем связанные состояния
    DialogState.objects.filter(conversation=conv).delete()
    
    # Удаляем сообщения
    Message.objects.filter(conversation=conv).delete()
    
    # Удаляем сам диалог
    conv.delete()

    return Response({'success': True, 'message': 'Dialog deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_dialog_read(request, conversation_id):
    conv = get_object_or_404(Conversation, id=conversation_id)
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    # последнее сообщение в диалоге
    last_msg = (Message.objects
        .filter(conversation=conv)
        .order_by('-created_at')
        .first())

    state, _ = DialogState.objects.get_or_create(user=request.user, conversation=conv)

    if last_msg:
        state.last_read_message = last_msg
        state.last_read_at = timezone.now()
        state.save(update_fields=['last_read_message', 'last_read_at', 'updated_at'])

    return Response({'success': True, 'last_read_message_id': last_msg.id if last_msg else None})

PRESENCE_TTL = 60 * 10  # 10 минут хранить last_seen

def _presence_key(user_id: int) -> str:
    return f"presence:last_seen:{user_id}"

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def presence_ping(request):
    """
    Фронт шлёт пинг сразу после входа/загрузки страницы и далее по таймеру.
    """
    user = request.user
    now = timezone.now()
    cache.set(_presence_key(user.id), now.isoformat(), timeout=PRESENCE_TTL)
    return Response({"ok": True, "server_time": now.isoformat()})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_presence(request, user_id: int):
    """
    Возвращает presence для конкретного пользователя:
    online / afk / offline / dnd + seconds_ago
    
    Учитывает ручной режим присутствия (presence_mode) из модели пользователя:
    - auto: автоматический режим (по пингу)
    - online: принудительно онлайн
    - afk: принудительно AFK
    - dnd: не беспокоить (отображается как dnd)
    - offline: принудительно оффлайн
    """
    # 🔥 Проверяем ручной режим присутствия
    try:
        user = CustomUser.objects.only('presence_mode').get(id=user_id)
        mode = (user.presence_mode or 'auto').lower()
    except CustomUser.DoesNotExist:
        mode = 'auto'
    except Exception:
        mode = 'auto'
    
    # если режим не auto — возвращаем сразу
    if mode in ['online', 'afk', 'dnd', 'offline']:
        # Для dnd возвращаем специальный статус
        if mode == 'dnd':
            return Response({
                "presence": "dnd", 
                "seconds_ago": None, 
                "mode": mode,
                "label": "Do Not Disturb"
            })
        return Response({
            "presence": mode, 
            "seconds_ago": None, 
            "mode": mode
        })
    
    # 🔥 Автоматический режим (по пингу)
    now = timezone.now()
    raw = cache.get(_presence_key(user_id))

    if not raw:
        return Response({
            "presence": "offline", 
            "seconds_ago": None,
            "mode": "auto"
        })

    try:
        last_seen = datetime.fromisoformat(raw)
        if timezone.is_naive(last_seen):
            last_seen = timezone.make_aware(last_seen, timezone.get_current_timezone())
    except Exception:
        return Response({
            "presence": "offline", 
            "seconds_ago": None,
            "mode": "auto"
        })

    seconds_ago = max(0, int((now - last_seen).total_seconds()))

    # Определяем статус по времени последней активности
    if seconds_ago <= 90:
        presence = "online"
    elif seconds_ago <= 300:
        presence = "afk"
    else:
        presence = "offline"

    return Response({
        "presence": presence, 
        "seconds_ago": seconds_ago,
        "mode": "auto"
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_message_reaction(request, message_id):
    """
    POST /api/messages/<id>/react/
    body: { "emoji": "❤️" }
    """
    msg = get_object_or_404(Message, id=message_id)

    # защита: участник диалога
    conv = msg.conversation
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    emoji = (request.data.get('emoji') or '').strip()
    if not emoji:
        return Response({'success': False, 'error': 'no_emoji'}, status=400)

    reactions = msg.reactions or {}
    users = reactions.get(emoji, [])
    uid = request.user.id

    if uid in users:
        users = [x for x in users if x != uid]
    else:
        users = users + [uid]

    if users:
        reactions[emoji] = users
    else:
        # если никого не осталось — удаляем ключ
        if emoji in reactions:
            del reactions[emoji]

    msg.reactions = reactions
    msg.save(update_fields=['reactions'])

    return Response({'success': True, 'reactions': msg.reactions})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_message_reaction(request, message_id):
    msg = get_object_or_404(Message, id=message_id)

    conv = msg.conversation
    if not conv.participants.filter(id=request.user.id).exists():
        return Response({'success': False, 'error': 'forbidden'}, status=403)

    emoji = (request.data.get('emoji') or '').strip()
    if not emoji:
        return Response({'success': False, 'error': 'no_emoji'}, status=400)

    uid = request.user.id
    reactions = msg.reactions or {}

    # ✅ 1) Сначала найдём: есть ли у пользователя уже реакция на это сообщение
    prev_emoji = None
    for em, users in list(reactions.items()):
        if isinstance(users, list) and uid in users:
            prev_emoji = em
            reactions[em] = [x for x in users if x != uid]
            if not reactions[em]:
                del reactions[em]

    # ✅ 2) Если он нажал на ТО ЖЕ САМОЕ emoji второй раз — это просто снятие реакции
    if prev_emoji == emoji:
        msg.reactions = reactions
        msg.save(update_fields=['reactions'])
        return Response({'success': True, 'reactions': msg.reactions})

    # ✅ 3) Иначе — ставим новую реакцию (единственную)
    users = reactions.get(emoji, [])
    if not isinstance(users, list):
        users = []
    users.append(uid)
    # убираем дубли на всякий
    users = list(dict.fromkeys(users))

    reactions[emoji] = users
    msg.reactions = reactions
    msg.save(update_fields=['reactions'])

    return Response({'success': True, 'reactions': msg.reactions})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """
    Удаляет сообщение.
    Может удалить только автор сообщения.
    """
    msg = get_object_or_404(Message, id=message_id)

    # Проверка: автор сообщения
    if msg.sender != request.user:
        return Response({'error': 'You are not the author of this message'}, status=403)

    # Удаление файлов, если они есть
    if msg.voice:
        msg.voice.delete(save=False)
    if msg.image:
        msg.image.delete(save=False)

    msg.delete()

    return Response({'status': 'success', 'message_id': message_id}, status=200)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404

# Импорты моделей и сериализаторов
from .models import (
    CustomUser, Track, Playlist, PlaylistTrack, BanAppeal, UserReport,
    ModerationAction  # 👈 ВАЖНО: импортируем ModerationAction
)
from .serializers import CompactTrackSerializer, PlaylistSerializer, UserReportSerializer

def _ban_payload(u):
    # авто-разбан если срок прошёл
    if u.is_banned and u.ban_until and u.ban_until <= timezone.now():
        u.is_banned = False
        u.ban_reason = ''
        u.ban_until = None
        u.ban_created_at = None
        u.banned_by = None
        u.save(update_fields=['is_banned','ban_reason','ban_until','ban_created_at','banned_by'])

    days_left = None
    if u.is_banned and u.ban_until:
        delta = u.ban_until - timezone.now()
        days_left = max(0, int((delta.total_seconds() + 86399) // 86400))  # ceil days

    return {
        'is_banned': bool(u.is_banned),
        'ban_reason': u.ban_reason or '',
        'ban_until': u.ban_until.isoformat() if u.ban_until else None,
        'ban_permanent': bool(u.is_banned and u.ban_until is None),
        'ban_days_left': days_left,
        'banned_by': u.banned_by.username if u.banned_by else None,
        'ban_created_at': u.ban_created_at.isoformat() if u.ban_created_at else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_users_tracks(request):
    user = request.user
    if not (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import CustomUser, Track
    from .serializers import CompactTrackSerializer
    from django.db.models import Count, Q

    users = CustomUser.objects.all().order_by('id')

    payload = []
    for u in users:
        tracks_qs = (
            Track.objects
            .filter(uploaded_by=u)
            .annotate(
                real_like_count=Count('likes', distinct=True),
                real_repost_count=Count('reposts', distinct=True),
                real_comment_count=Count('track_comments', filter=Q(track_comments__is_deleted=False), distinct=True),
            )
            .order_by('-created_at')
        )

        tracks_data = CompactTrackSerializer(tracks_qs, many=True, context={'request': request}).data

        # ✅ Подменяем счетчики на реальные
        # Важно: tracks_qs и tracks_data в одном порядке (order_by уже есть)
        for obj, row in zip(tracks_qs, tracks_data):
            row['like_count'] = int(getattr(obj, 'real_like_count', 0) or 0)
            row['repost_count'] = int(getattr(obj, 'real_repost_count', 0) or 0)
            row['comment_count'] = int(getattr(obj, 'real_comment_count', 0) or 0)

        payload.append({
            'id': u.id,
            'username': u.username,
            'tracks': tracks_data
        })

    return Response({'users': payload})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_track(request, track_id):
    """
    DELETE /api/admin/tracks/<id>/delete/
    Удаляет трек (админ) и все связанные записи.
    """
    user = request.user
    if not (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Track

    try:
        track = Track.objects.get(id=track_id)
    except Track.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    # ✅ Удаляем файлы аккуратно (обложку/аудио), потом объект
    try:
        if track.cover:
            track.cover.delete(save=False)
    except Exception:
        pass

    try:
        if track.audio_file:
            track.audio_file.delete(save=False)
    except Exception:
        pass

    # ========== ОЧИСТКА ВСЕХ СВЯЗАННЫХ ЗАПИСЕЙ ==========
    try:
        # 1️⃣ История прослушиваний (TrackPlayHistory / ListeningHistory)
        # Проверяем разные возможные названия моделей
        try:
            from .models import TrackPlayHistory
            TrackPlayHistory.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        try:
            from .models import ListeningHistory
            ListeningHistory.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        try:
            from .models import TrackHistory
            TrackHistory.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 2️⃣ Лайки треков
        try:
            from .models import Like
            Like.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        try:
            from .models import TrackLike
            TrackLike.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 3️⃣ Репосты треков
        try:
            from .models import Repost
            Repost.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        try:
            from .models import TrackRepost
            TrackRepost.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 4️⃣ Комментарии к треку
        try:
            from .models import Comment
            Comment.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        try:
            from .models import TrackComment
            TrackComment.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 5️⃣ Связи с плейлистами (промежуточная таблица)
        try:
            from .models import PlaylistTrack
            PlaylistTrack.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 6️⃣ Если есть отдельная модель для "сейчас играет"
        try:
            from .models import NowPlaying
            NowPlaying.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

        # 7️⃣ Если есть модель для очереди воспроизведения
        try:
            from .models import QueueItem
            QueueItem.objects.filter(track_id=track_id).delete()
        except (ImportError, AttributeError):
            pass

    except Exception as e:
        # Логируем ошибку, но не прерываем удаление
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error while cleaning up track relations: {e}")

    # ========== ФИНАЛЬНОЕ УДАЛЕНИЕ ТРЕКА ==========
    track.delete()
    
    return Response({
        'success': True, 
        'deleted_track_id': track_id,
        'message': 'Трек и все связанные записи удалены'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_users_playlists(request):
    """
    GET /api/admin/playlists/
    Все пользователи и их плейлисты (для админки).
    """
    user = request.user
    if not (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import CustomUser, Playlist
    from .serializers import PlaylistSerializer
    from django.db.models import Count

    users = CustomUser.objects.all().order_by('id')

    payload = []
    for u in users:
        playlists_qs = (
            Playlist.objects
            .filter(created_by=u)
            .select_related('created_by')
            .annotate(
                real_likes_count=Count('likes', distinct=True),
                real_reposts_count=Count('reposts', distinct=True),
                real_tracks_count=Count('tracks', distinct=True),
            )
            .order_by('-created_at')
        )

        data = PlaylistSerializer(playlists_qs, many=True, context={'request': request}).data

        # ✅ подменяем цифры на реальные (иначе будут конфликтовать/не совпадать)
        for obj, row in zip(playlists_qs, data):
            row['likes_count'] = int(getattr(obj, 'real_likes_count', 0) or 0)
            # сериализатор имеет repost_count и reposts_count (алиас)
            real_rep = int(getattr(obj, 'real_reposts_count', 0) or 0)
            row['repost_count'] = real_rep
            row['reposts_count'] = real_rep
            # треков в плейлисте
            row['track_count'] = int(getattr(obj, 'real_tracks_count', 0) or 0)

        payload.append({
            'id': u.id,
            'username': u.username,
            'playlists': data
        })

    return Response({'users': payload})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_playlist(request, playlist_id):
    """
    DELETE /api/admin/playlists/<id>/delete/
    Удаляет плейлист (админ).
    """
    user = request.user
    if not (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Playlist, PlaylistTrack

    try:
        pl = Playlist.objects.get(id=playlist_id)
    except Playlist.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        # ✅ удалить обложку
        if pl.cover:
            pl.cover.delete(save=False)
    except Exception:
        pass

    try:
        PlaylistTrack.objects.filter(playlist=pl).delete()
    except Exception:
        pass

    pl.delete()
    return Response({'success': True, 'deleted_playlist_id': playlist_id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_users(request):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import CustomUser
    users = CustomUser.objects.all().order_by('id')

    data = []
    for u in users:
        # Получаем URL аватара
        avatar_url = None
        if hasattr(u, 'avatar') and u.avatar:
            avatar_url = u.avatar.url
        elif hasattr(u, 'avatar_url') and u.avatar_url:
            avatar_url = u.avatar_url
        
        row = {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'is_staff': bool(u.is_staff),
            'is_superuser': bool(u.is_superuser),
            # ✅ Добавляем avatar_url
            'avatar_url': avatar_url,
            # ✅ Добавляем дополнительные поля для отображения
            'is_active': u.is_active,
            'date_joined': u.date_joined.isoformat() if hasattr(u, 'date_joined') else None,
            'last_login': u.last_login.isoformat() if u.last_login else None,
        }
        # Добавляем информацию о бане
        row.update(_ban_payload(u))
        data.append(row)

    return Response({'users': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_ban_user(request, user_id):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import CustomUser, ModerationAction  # 👈 Добавляем ModerationAction

    try:
        u = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get('reason') or '').strip()
    permanent = bool(request.data.get('permanent', False))

    days_raw = request.data.get('days')
    days = 0
    try:
        if days_raw is not None and str(days_raw).strip() != '':
            days = int(days_raw)
    except:
        days = 0

    u.is_banned = True
    u.ban_reason = reason
    u.banned_by = me
    u.ban_created_at = timezone.now()

    if permanent:
        u.ban_until = None
    else:
        # если дней не дали — по умолчанию 1
        if days <= 0:
            days = 1
        u.ban_until = timezone.now() + timedelta(days=days)

    u.save(update_fields=['is_banned','ban_reason','ban_until','ban_created_at','banned_by'])

    # ✅ Логируем действие бана в ModerationAction
    ModerationAction.objects.create(
        user=u,
        admin=me,
        action_type='ban',
        reason=reason or '',
    )

    payload = {'success': True}
    payload.update(_ban_payload(u))
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_unban_user(request, user_id):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    from .models import CustomUser, ModerationAction  # 👈 Добавляем ModerationAction

    try:
        u = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    u.is_banned = False
    u.ban_reason = ''
    u.ban_until = None
    u.ban_created_at = None
    u.banned_by = None
    u.save(update_fields=['is_banned','ban_reason','ban_until','ban_created_at','banned_by'])

    # ✅ Логируем действие разбана в ModerationAction
    ModerationAction.objects.create(
        user=u,
        admin=me,
        action_type='unban',
        reason=(request.data.get('reason') or '').strip(),  # причина разбана
    )

    return Response({'success': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_ban_appeal(request):
    from .models import BanAppeal

    text = (request.data.get('disagree_text') or '').strip()
    if not text:
        return Response({'detail': 'Заполните поле: почему вы не согласны.'}, status=400)

    user = request.user

    # Снэпшоты бана
    banned_by_obj = getattr(user, 'banned_by', None)
    banned_by_name = ''
    try:
        if banned_by_obj:
            banned_by_name = getattr(banned_by_obj, 'username', None) or str(banned_by_obj)
    except Exception:
        banned_by_name = ''

    ban_reason = getattr(user, 'ban_reason', '') or ''
    ban_until = getattr(user, 'ban_until', None)
    ban_until_str = ''
    if ban_until:
        try:
            ban_until_str = ban_until.isoformat()
        except Exception:
            ban_until_str = str(ban_until)

    appeal = BanAppeal.objects.create(
        user=user,
        username_snapshot=getattr(user, 'username', '') or '',
        banned_by_snapshot=banned_by_name,
        ban_reason_snapshot=ban_reason,
        ban_until_snapshot=ban_until_str,
        disagree_text=text,
        status='pending'
    )

    return Response({'success': True, 'id': appeal.id}, status=201)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_list_appeals(request):
    """
    Получить список всех апелляций с AI-рекомендациями
    """
    from .models import BanAppeal

    appeals = BanAppeal.objects.select_related('user').all().order_by('-created_at')

    payload = []
    for a in appeals:
        payload.append({
            'id': a.id,
            'user': a.user_id,
            'username_snapshot': a.username_snapshot,
            'banned_by_snapshot': a.banned_by_snapshot,
            'ban_reason_snapshot': a.ban_reason_snapshot,
            'ban_until_snapshot': a.ban_until_snapshot,
            'disagree_text': a.disagree_text,
            'status': a.status,
            'admin_comment': a.admin_comment,
            'created_at': a.created_at.isoformat() if a.created_at else None,
            # 🔥 AI поля для отображения в интерфейсе
            'ai_status': a.ai_status,
            'ai_risk': a.ai_risk,
            'ai_recommendation': a.ai_recommendation,
            'ai_summary': a.ai_summary,  # опционально, если хочешь показывать превью
        })

    return Response({'appeals': payload})

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reject_appeal(request, appeal_id):
    from .models import BanAppeal

    reason = (request.data.get('reason') or '').strip()
    if not reason:
        return Response({"detail": "Нужно указать причину отказа."}, status=400)

    appeal = BanAppeal.objects.filter(id=appeal_id).select_related('user').first()
    if not appeal:
        return Response({"detail": "Апелляция не найдена."}, status=404)

    # ✅ у твоей модели статусы: pending / reviewed / rejected
    appeal.status = 'rejected'
    appeal.admin_comment = reason  # ✅ сюда пишем причину отказа
    appeal.save(update_fields=['status', 'admin_comment'])

    return Response({
        "status": appeal.status,
        "reject_reason": appeal.admin_comment,  # ✅ фронту удобно
        "decided_at": timezone.now().isoformat(),
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_unban_appeal(request, appeal_id):
    from .models import BanAppeal, CustomUser, ModerationAction  # 👈 Добавляем ModerationAction

    reason = (request.data.get('reason') or '').strip()
    if not reason:
        return Response({"detail": "Нужно указать причину разбана."}, status=400)

    appeal = BanAppeal.objects.filter(id=appeal_id).select_related('user').first()
    if not appeal:
        return Response({"detail": "Апелляция не найдена."}, status=404)

    u = appeal.user  # CustomUser

    # ✅ Разбан
    u.is_banned = False
    u.ban_reason = ''
    u.ban_until = None
    u.ban_created_at = None
    u.banned_by = None
    u.save(update_fields=['is_banned','ban_reason','ban_until','ban_created_at','banned_by'])

    # ✅ Логируем действие разбана в ModerationAction
    ModerationAction.objects.create(
        user=u,
        admin=request.user,
        action_type='unban',
        reason=reason or '',
    )

    # ✅ Апелляция рассмотрена
    appeal.status = 'reviewed'
    appeal.admin_comment = reason  # причина разбана
    appeal.save(update_fields=['status', 'admin_comment'])

    return Response({
        "status": appeal.status,
        "unban_reason": appeal.admin_comment,
        "decided_at": timezone.now().isoformat(),
        "success": True
    })


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_appeal(request, appeal_id):
    from .models import BanAppeal

    appeal = BanAppeal.objects.filter(id=appeal_id).first()
    if not appeal:
        return Response({"detail": "Апелляция не найдена."}, status=404)

    appeal.delete()
    return Response({"ok": True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_my_track(request, track_id: int):
    """
    DELETE /api/track/<id>/delete/
    Удаляет трек (ТОЛЬКО автор трека).
    """
    from .models import Track
    
    track = get_object_or_404(Track, id=track_id)

    # ✅ Только автор может удалить
    if track.uploaded_by_id != request.user.id:
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        with transaction.atomic():
            # ✅ аккуратно удалить файлы
            try:
                if track.cover:
                    track.cover.delete(save=False)
            except Exception:
                pass

            try:
                if track.audio_file:
                    track.audio_file.delete(save=False)
            except Exception:
                pass

            track.delete()

        # ✅ обновим статистику автора (по желанию, но полезно)
        try:
            request.user.update_stats()
        except Exception:
            pass

        return Response({"success": True, "deleted_track_id": track_id}, status=200)

    except Exception as e:
        return Response({"detail": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user_report(request):
    from .models import UserReport
    from .serializers import UserReportSerializer
    
    # ✅ ИСПРАВЛЕНО: принимаем reported_user или target_user, сохраняем в target_user_id
    reported_user_id = request.data.get('reported_user') or request.data.get('target_user')
    reason = (request.data.get('reason') or '').strip()
    message = (request.data.get('message') or '').strip()

    if not reported_user_id or not reason:
        return Response(
            {"error": "reported_user (or target_user) and reason required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if str(request.user.id) == str(reported_user_id):
        return Response(
            {"error": "You cannot report yourself"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ ВАЖНО: создаем с target_user_id, а не reported_user_id
    report = UserReport.objects.create(
        reporter=request.user,
        target_user_id=reported_user_id,  # ← ключевое исправление
        reason=reason,
        message=message
    )

    serializer = UserReportSerializer(report, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_reports(request):
    from .models import UserReport
    from .serializers import UserReportSerializer
    
    # ✅ ИСПРАВЛЕНО: используем правильные имена полей для select_related
    reports = UserReport.objects.select_related('reporter', 'target_user', 'reviewed_by').all().order_by('-created_at')
    serializer = UserReportSerializer(reports, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_reject_report(request, report_id):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=403)

    from .models import UserReport

    reason = (request.data.get('reason') or '').strip()
    if not reason:
        return Response({'detail': 'Нужно указать причину отказа.'}, status=400)

    # ✅ ИСПРАВЛЕНО: reported_user → target_user, убраны поля, которых нет в модели
    r = UserReport.objects.select_related('reporter', 'target_user').filter(id=report_id).first()
    if not r:
        return Response({'detail': 'Report not found'}, status=404)

    # ✅ Меняем только статус, остальных полей в модели нет
    r.status = 'rejected'
    r.save(update_fields=['status'])

    return Response({
        'id': r.id,
        'status': r.status,
        'admin_comment': reason,  # Возвращаем причину для отображения на фронте
        'decided_at': timezone.now().isoformat()  # Текущее время для отображения
    })

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_ban_reported_user_from_report(request, report_id):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=403)

    from .models import UserReport, ModerationAction
    from datetime import timedelta

    ban_reason = (request.data.get('ban_reason') or '').strip()
    if not ban_reason:
        return Response({'detail': 'Нужно указать причину бана.'}, status=400)

    permanent = bool(request.data.get('permanent', False))
    days_raw = request.data.get('days')
    days = 0
    try:
        if days_raw is not None and str(days_raw).strip() != '':
            days = int(days_raw)
    except:
        days = 0

    # ✅ target_user (а не reported_user)
    r = UserReport.objects.select_related('reporter', 'target_user').filter(id=report_id).first()
    if not r:
        return Response({'detail': 'Report not found'}, status=404)

    u = r.target_user
    if not u:
        return Response({'detail': 'User not found'}, status=404)

    # ✅ защита: нельзя банить самого себя
    if u.id == me.id:
        return Response({'detail': 'Нельзя забанить самого себя.'}, status=400)

    # ✅ защита: нельзя банить админа/супера
    if getattr(u, 'is_superuser', False) or getattr(u, 'is_staff', False):
        return Response({'detail': 'Нельзя забанить администратора.'}, status=400)

    # баним пользователя (как в admin_ban_user)
    u.is_banned = True
    u.ban_reason = ban_reason
    u.banned_by = me
    u.ban_created_at = timezone.now()

    if permanent:
        u.ban_until = None
        days_for_response = None
    else:
        if days <= 0:
            days = 1
        u.ban_until = timezone.now() + timedelta(days=days)
        days_for_response = days

    u.save(update_fields=['is_banned', 'ban_reason', 'ban_until', 'ban_created_at', 'banned_by'])

    # ✅ логируем действие
    ModerationAction.objects.create(
        user=u,
        admin=me,
        action_type='ban',
        reason=ban_reason or '',
    )

    # ✅ обновляем репорт БЕЗ несуществующих полей
    # (в твоей модели UserReport реально есть: status, reviewed_by, reviewed_at, reject_reason)
    r.status = 'reviewed'
    r.reviewed_by = me
    r.reviewed_at = timezone.now()
    # если у тебя есть reject_reason — можно не трогать, это бан
    r.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

    return Response({
        'ok': True,
        'report': {
            'id': r.id,
            'status': r.status,
            'reviewed_at': r.reviewed_at.isoformat() if getattr(r, 'reviewed_at', None) else None,
            'reviewed_by': me.username if me else None,
        },
        'ban': {
            'is_banned': u.is_banned,
            'ban_reason': u.ban_reason,
            'ban_until': u.ban_until.isoformat() if u.ban_until else None,
            'days': days_for_response,
            'permanent': permanent,
        }
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_report(request, report_id):
    me = request.user
    if not (getattr(me, 'is_staff', False) or getattr(me, 'is_superuser', False)):
        return Response({'detail': 'Forbidden'}, status=403)

    from .models import UserReport
    r = UserReport.objects.filter(id=report_id).first()
    if not r:
        return Response({'detail': 'Report not found'}, status=404)
    r.delete()
    return Response({'ok': True})


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ModerationAction, UserAppeal, UserReport, BanAppeal  # 👈 Добавляем BanAppeal
from .serializers import ModerationActionSerializer, UserAppealSerializer, UserReportSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def settings_overview(request):
    user = request.user

    actions = ModerationAction.objects.filter(user=user)[:200]
    
    # ✅ Заменяем UserAppeal на BanAppeal для отображения реальных апелляций
    appeals_qs = BanAppeal.objects.filter(user=user).order_by('-created_at')[:200]
    appeals_data = []
    for a in appeals_qs:
        appeals_data.append({
            "id": a.id,
            "message": a.disagree_text,        # текст апелляции
            "status": a.status,                # pending/rejected/reviewed
            "admin_response": a.admin_comment or "",
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.created_at.isoformat() if a.created_at else None,
            "related_action": None,
            "responded_by": None,
            "responded_by_username": None,
        })
    
    reports = UserReport.objects.filter(reporter=user)[:200]

    return Response({
        "email": user.email,
        "username": user.username,
        "status_text": getattr(user, 'status_text', ''),  # если поля нет — будет пусто
        "punishments": ModerationActionSerializer(actions, many=True).data,
        "appeals": appeals_data,  # 👈 Теперь используем appeals_data из BanAppeal
        "reports": UserReportSerializer(reports, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')

    if not old_password or not new_password:
        return Response({"detail": "old_password и new_password обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(old_password):
        return Response({"detail": "Старый пароль неверный"}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({"detail": "Новый пароль должен быть минимум 8 символов"}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])

    return Response({"ok": True})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_status_text(request):
    # ВАЖНО: поле status_text мы добавим в модель CustomUser ниже (пункт 1.4)
    user = request.user
    status_text = request.data.get('status_text', '')
    status_text = (status_text or '')[:120]

    if not hasattr(user, 'status_text'):
        return Response({"detail": "status_text field not found in CustomUser"}, status=status.HTTP_400_BAD_REQUEST)

    user.status_text = status_text
    user.save(update_fields=['status_text'])
    return Response({"ok": True, "status_text": user.status_text})


def _require_admin(user):
    return bool(user and (user.is_staff or user.is_superuser))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_userappeals(request):
    if not _require_admin(request.user):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    qs = UserAppeal.objects.all()[:500]
    return Response(UserAppealSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_userappeal(request, appeal_id):
    if not _require_admin(request.user):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        appeal = UserAppeal.objects.get(id=appeal_id)
    except UserAppeal.DoesNotExist:
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    status_val = request.data.get('status')
    admin_response = request.data.get('admin_response', '')

    if status_val in ['pending', 'approved', 'rejected']:
        appeal.status = status_val
    appeal.admin_response = admin_response or ''
    appeal.responded_by = request.user
    appeal.save()

    return Response(UserAppealSerializer(appeal).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_reports(request):
    if not _require_admin(request.user):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    qs = UserReport.objects.all()[:500]
    return Response(UserReportSerializer(qs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_report(request, report_id):
    if not _require_admin(request.user):
        return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        rep = UserReport.objects.get(id=report_id)
    except UserReport.DoesNotExist:
        return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

    status_val = request.data.get('status')
    admin_response = request.data.get('admin_response', '')

    if status_val in ['pending', 'accepted', 'rejected']:
        rep.status = status_val
    rep.admin_response = admin_response or ''
    rep.reviewed_by = request.user
    rep.save()

    return Response(UserReportSerializer(rep).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_presence_mode(request):
    user = request.user
    mode = (request.data.get('presence_mode') or 'auto').lower()

    allowed = {'auto', 'online', 'afk', 'dnd', 'offline'}
    if mode not in allowed:
        return Response({"detail": "invalid presence_mode"}, status=400)

    user.presence_mode = mode
    user.save(update_fields=['presence_mode'])
    return Response({"ok": True, "presence_mode": user.presence_mode})

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_ai_appeal(request, appeal_id):
    """
    AI анализ апелляции.
    Только рекомендация. Никаких решений.
    """

    from django.utils import timezone
    from .models import BanAppeal
    from .ai_ollama import analyze_moderation_case

    appeal = BanAppeal.objects.filter(id=appeal_id).first()
    if not appeal:
        return Response({"detail": "Апелляция не найдена."}, status=404)

    # если уже есть результат — просто возвращаем
    if appeal.ai_status == "ready" and appeal.ai_summary:
        return Response({
            "ai_status": appeal.ai_status,
            "ai_summary": appeal.ai_summary,
            "ai_recommendation": appeal.ai_recommendation,
            "ai_risk": appeal.ai_risk,
            "ai_model": appeal.ai_model,
            "ai_generated_at": appeal.ai_generated_at,
        })

    try:
        text_for_ai = (
            f"Причина бана: {appeal.ban_reason_snapshot}\n\n"
            f"Апелляция:\n{appeal.disagree_text}"
        )

        result = analyze_moderation_case(text_for_ai, "appeal")

        appeal.ai_status = "ready"
        appeal.ai_summary = result.get("summary", "")
        appeal.ai_recommendation = result.get("recommendation", "")
        appeal.ai_risk = result.get("risk", 0)
        appeal.ai_model = "qwen2.5:3b"
        appeal.ai_generated_at = timezone.now()
        appeal.ai_error = ""
        appeal.save()

        return Response({
            "ai_status": appeal.ai_status,
            "ai_summary": appeal.ai_summary,
            "ai_recommendation": appeal.ai_recommendation,
            "ai_risk": appeal.ai_risk,
            "ai_model": appeal.ai_model,
            "ai_generated_at": appeal.ai_generated_at,
        })

    except Exception as e:
        appeal.ai_status = "error"
        appeal.ai_error = str(e)
        appeal.save()

        return Response({
            "detail": "AI ошибка",
            "error": str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def made_for_you_ai(request):
    """
    AI-рекомендации для секции 'Made for you'
    Возвращает список треков + ai_reason.
    """
    from django.db.models import Count, Q
    from .models import Track, PlayHistory, ListeningHistory, TrackLike
    from .serializers import CompactTrackSerializer
    from .ai_ollama import recommend_tracks_for_user

    user = request.user
    limit = 12
    try:
        limit = int(request.query_params.get('limit', 12))
    except:
        limit = 12
    limit = max(1, min(24, limit))

    # 1) собираем сигналы пользователя (последние N прослушиваний/лайков)
    recent_plays = PlayHistory.objects.filter(user=user).order_by('-played_at')[:80]
    played_track_ids = [p.track_id for p in recent_plays]

    liked_ids = list(
        TrackLike.objects.filter(user=user).values_list('track_id', flat=True)[:120]
    )

    # топ жанров по прослушиваниям
    top_genres = list(
        Track.objects.filter(id__in=played_track_ids)
        .values('genre')
        .annotate(c=Count('id'))
        .order_by('-c')[:4]
    )
    top_genres = [g['genre'] for g in top_genres if g.get('genre')]

    # топ артистов по прослушиваниям
    top_artists = list(
        Track.objects.filter(id__in=played_track_ids)
        .values('artist')
        .annotate(c=Count('id'))
        .order_by('-c')[:5]
    )
    top_artists = [a['artist'] for a in top_artists if a.get('artist')]

    user_profile = {
        "top_genres": top_genres,
        "top_artists": top_artists,
        "liked_count": len(liked_ids),
        "recent_plays_count": len(played_track_ids),
        "note": "AI не принимает решений, только подбирает треки"
    }

    # 2) исключим уже прослушанные (уникальная история)
    listened_ids = set(
        ListeningHistory.objects.filter(user=user).values_list('track_id', flat=True)
    )

    # 3) кандидатный пул (быстро, без AI)
    base_q = Track.objects.filter(status='published')

    # если пользователь слушал что-то — под него
    if top_genres or top_artists:
        cand = base_q.filter(
            Q(genre__in=top_genres) | Q(artist__in=top_artists)
        )
    else:
        # холодный старт: просто популярное/свежее
        cand = base_q

    # исключим уже слушанное (чтобы давать новое)
    cand = cand.exclude(id__in=listened_ids)

    # сортируем по популярности
    cand = cand.order_by('-like_count', '-play_count')[:30]

    candidates = []
    for t in cand:
        candidates.append({
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "genre": t.genre,
            "likes": int(t.like_count or 0),
            "plays": int(t.play_count or 0),
        })

    # fallback если пусто
    if not candidates:
        fallback = base_q.order_by('-like_count', '-play_count')[:30]
        for t in fallback:
            candidates.append({
                "id": t.id,
                "title": t.title,
                "artist": t.artist,
                "genre": t.genre,
                "likes": int(t.like_count or 0),
                "plays": int(t.play_count or 0),
            })

    # 4) AI сортировка кандидатов
    out = recommend_tracks_for_user(user_profile, candidates, limit=limit)
    ids_ranked = out.get("track_ids") or []
    reasons = out.get("reasons") or {}

    # 5) грузим треки в нужном порядке
    tracks_map = {t.id: t for t in Track.objects.filter(id__in=ids_ranked)}
    ordered = [tracks_map[i] for i in ids_ranked if i in tracks_map]

    data = CompactTrackSerializer(ordered, many=True, context={'request': request}).data

    # приклеим ai_reason
    for item in data:
        rid = str(item.get("id"))
        item["ai_reason"] = reasons.get(rid, "")

    return Response({
        "source": "ai",
        "profile": user_profile,
        "results": data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def playlists_for_you_ai(request):
    """
    AI-рекомендации плейлистов для пользователя
    Возвращает список плейлистов + ai_reason.
    """
    from django.db.models import Count, Q, F, IntegerField
    from django.db.models.functions import Coalesce
    from django.db.models.expressions import ExpressionWrapper
    from .models import Playlist, PlaylistTrack, Track, TrackLike, PlayHistory
    from .serializers import PlaylistSerializer
    from .ai_ollama import recommend_playlists_for_user

    user = request.user
    try:
        limit = int(request.query_params.get('limit', 12))
    except:
        limit = 12
    limit = max(1, min(24, limit))

    # 1) Сигналы пользователя
    recent_plays = PlayHistory.objects.filter(user=user).order_by('-played_at')[:80]
    recent_track_ids = [p.track_id for p in recent_plays]

    liked_ids = list(TrackLike.objects.filter(user=user).values_list('track_id', flat=True)[:200])

    # Топ жанров по прослушиваниям
    top_genres = list(
        Track.objects.filter(id__in=recent_track_ids)
        .values('genre')
        .annotate(c=Count('id'))
        .order_by('-c')[:4]
    )
    top_genres = [g['genre'] for g in top_genres if g.get('genre')]

    # Топ исполнителей по прослушиваниям
    top_artists = list(
        Track.objects.filter(id__in=recent_track_ids)
        .values('artist')
        .annotate(c=Count('id'))
        .order_by('-c')[:5]
    )
    top_artists = [a['artist'] for a in top_artists if a.get('artist')]

    # 2) Кандидатный пул (быстро)
    # 🔥 ИСПРАВЛЕНО: Не исключаем плейлисты пользователя, чтобы они тоже могли попасть в рекомендации
    base = Playlist.objects.filter(visibility='public')
    
    # Исключаем только если есть веская причина (например, не хотим рекомендовать чужие приватные)
    # Но публичные плейлисты самого пользователя тоже могут быть хорошими кандидатами

    # 3) Плейлисты с совпадениями
    qs = base.annotate(
        match_liked=Count('tracks', filter=Q(tracks__id__in=liked_ids), distinct=True),
        match_recent=Count('tracks', filter=Q(tracks__id__in=recent_track_ids), distinct=True),
        match_genre=Count('tracks', filter=Q(tracks__genre__in=top_genres), distinct=True),
        match_artist=Count('tracks', filter=Q(tracks__artist__in=top_artists), distinct=True),
    ).annotate(
        score=ExpressionWrapper(
            Coalesce(F('match_liked'), 0) * 4 +  # лайкнутые треки - самый сильный сигнал
            Coalesce(F('match_recent'), 0) * 3 +  # недавно прослушанные
            Coalesce(F('match_artist'), 0) * 2 +  # любимые исполнители
            Coalesce(F('match_genre'), 0) * 1,    # любимые жанры
            output_field=IntegerField()
        )
    ).order_by('-score', '-likes_count', '-created_at')[:40]  # берем чуть больше для AI

    # 4) Подготовка кандидатов для AI
    candidates = []
    for p in qs:
        # получаем жанры треков в плейлисте
        playlist_tracks = p.tracks.all()[:10]  # ограничим для производительности
        genres = list(set(t.genre for t in playlist_tracks if t.genre))
        
        candidates.append({
            "id": p.id,
            "title": p.title,
            "creator": getattr(p.created_by, 'username', ''),
            "tracks_count": p.tracks.count(),
            "likes_count": p.likes_count or 0,
            "genres": genres[:5],  # топ жанров в плейлисте
            "match_liked": int(getattr(p, 'match_liked', 0) or 0),
            "match_recent": int(getattr(p, 'match_recent', 0) or 0),
            "match_genre": int(getattr(p, 'match_genre', 0) or 0),
            "match_artist": int(getattr(p, 'match_artist', 0) or 0),
        })

    # Если кандидатов мало, добавим популярные плейлисты как fallback
    if len(candidates) < 5:
        popular = Playlist.objects.filter(visibility='public')\
            .exclude(id__in=[c['id'] for c in candidates])\
            .order_by('-likes_count', '-created_at')[:10]
        
        for p in popular:
            playlist_tracks = p.tracks.all()[:10]
            genres = list(set(t.genre for t in playlist_tracks if t.genre))
            
            candidates.append({
                "id": p.id,
                "title": p.title,
                "creator": getattr(p.created_by, 'username', ''),
                "tracks_count": p.tracks.count(),
                "likes_count": p.likes_count or 0,
                "genres": genres[:5],
                "match_liked": 0,
                "match_recent": 0,
                "match_genre": 0,
                "match_artist": 0,
            })

    user_profile = {
        "top_genres": top_genres,
        "top_artists": top_artists,
        "liked_count": len(liked_ids),
        "recent_plays_count": len(recent_track_ids),
        "note": "AI сортирует плейлисты по релевантности"
    }

    # 5) AI сортировка
    out = recommend_playlists_for_user(user_profile, candidates, limit=limit)
    ids_ranked = out.get("playlist_ids") or []
    reasons = out.get("reasons") or {}

    # 6) Загружаем плейлисты в правильном порядке
    pl_map = {p.id: p for p in Playlist.objects.filter(id__in=ids_ranked).select_related('created_by')}
    ordered = [pl_map[i] for i in ids_ranked if i in pl_map]

    data = PlaylistSerializer(ordered, many=True, context={'request': request}).data
    
    # 7) Добавляем AI reasons (но на фронте мы их не показываем)
    for item in data:
        item["ai_reason"] = reasons.get(str(item.get("id")), "")

    return Response({
        "source": "ai",
        "results": data,
        "profile": user_profile,
        "candidates_count": len(candidates)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def following_recommended_tracks(request):
    from django.db.models import Q
    from .models import Track, Follow, ListeningHistory
    from .serializers import CompactTrackSerializer
    from .ai_ollama import recommend_tracks_for_user

    user = request.user
    try:
        limit = int(request.query_params.get('limit', 12))
    except:
        limit = 12
    limit = max(1, min(24, limit))

    following_ids = list(Follow.objects.filter(follower=user).values_list('following_id', flat=True))
    if not following_ids:
        return Response({"source": "following", "results": []})

    listened_ids = set(ListeningHistory.objects.filter(user=user).values_list('track_id', flat=True))

    # кандидаты: опубликованные треки от подписок
    cand_qs = (
        Track.objects
        .filter(status='published', uploaded_by_id__in=following_ids)
        .exclude(id__in=list(listened_ids))
        .order_by('-created_at')[:40]
    )

    candidates = [{
        "id": t.id,
        "title": t.title,
        "artist": t.artist,
        "genre": t.genre,
        "likes": int(getattr(t, "like_count", 0) or 0),
        "plays": int(getattr(t, "play_count", 0) or 0),
    } for t in cand_qs]

    if not candidates:
        # fallback: если всё уже слушал — просто последние треки подписок
        cand_qs = (
            Track.objects
            .filter(status='published', uploaded_by_id__in=following_ids)
            .order_by('-created_at')[:40]
        )
        candidates = [{
            "id": t.id,
            "title": t.title,
            "artist": t.artist,
            "genre": t.genre,
            "likes": int(getattr(t, "like_count", 0) or 0),
            "plays": int(getattr(t, "play_count", 0) or 0),
        } for t in cand_qs]

    user_profile = {
        "mode": "following",
        "following_count": len(following_ids),
        "note": "Выбирай треки подписок, которые вероятнее понравятся"
    }

    out = recommend_tracks_for_user(user_profile, candidates, limit=limit)
    ids_ranked = out.get("track_ids") or []

    tracks_map = {t.id: t for t in Track.objects.filter(id__in=ids_ranked)}
    ordered = [tracks_map[i] for i in ids_ranked if i in tracks_map]

    data = CompactTrackSerializer(ordered, many=True, context={'request': request}).data
    return Response({"source": "following", "results": data})

from .ai_ollama import analyze_moderation_case

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_ai_report(request, report_id):
    from .models import UserReport

    r = UserReport.objects.select_related('reporter', 'target_user').filter(id=report_id).first()
    if not r:
        return Response({'detail': 'Report not found'}, status=404)

    reporter_name = getattr(r.reporter, 'username', '') or f'id:{r.reporter_id}'
    target_name = getattr(r.target_user, 'username', '') if r.target_user else f'id:{getattr(r, "target_user_id", None)}'

    text = (
        f"REPORT (user-report)\n"
        f"Reporter: {reporter_name}\n"
        f"Target: {target_name}\n"
        f"Reason: {r.reason or ''}\n"
        f"Message: {r.message or ''}\n"
        f"Status: {r.status}\n"
    ).strip()

    ai = analyze_moderation_case(text, kind="report")

    # вернем ровно то, что рисует твой UI: summary, recommendation, risk, tags
    return Response(ai)