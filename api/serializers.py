from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from .models import (
    CustomUser, Track, Hashtag, Follow, TrackLike, 
    TrackRepost, Playlist, PlaylistTrack, Comment, 
    TrackComment, Notification, ListeningHistory,
    PlayHistory, DailyStats, UserTrackInteraction,
    Message, Conversation, TrackAnalytics, SystemLog, WaveformGenerationTask,
    UserProfile, PlaylistLike, PlaylistRepost, DialogState,  # ← Добавлен DialogState
    BanAppeal,  # ← ДОБАВЛЕНО: импорт модели BanAppeal
    UserReport,  # ← ДОБАВЛЕНО: импорт модели UserReport
    # 🔥 НОВЫЕ МОДЕЛИ ДЛЯ ЛИЧНОГО КАБИНЕТА
    ModerationAction, UserAppeal,
)
from django.utils import timezone
from PIL import Image
import io
import colorsys
import logging
import numpy as np
from sklearn.cluster import KMeans
from django.db.models import Sum
from django.utils.text import slugify

logger = logging.getLogger(__name__)
User = get_user_model()

HAS_FOLLOW = False
try:
    from .models import Follow
    HAS_FOLLOW = True
except ImportError:
    pass

# ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
def extract_dominant_color_from_image(image_file):
    """Извлекает доминирующий цвет из изображения"""
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
        return '#003196'

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
            'bg_primary': f'#{hex_color}',
            'bg_light': hsl_to_hex(h, s, min(l + 0.2, 1)),
            'text_on_primary': '#ffffff' if l < 0.6 else '#000000',
            'text_on_light': '#000000',
            'border': hsl_to_hex(h, s, max(l - 0.2, 0)),
            'hover': hsl_to_hex(h, s, min(l + 0.2, 1)),
            'active': hsl_to_hex(h, s, max(l - 0.3, 0)),
            'gradient_start': f'#{hex_color}',
            'gradient_end': hsl_to_hex((h + 180) % 360, s, l),
        }
        
        return color_scheme
        
    except:
        return get_default_color_scheme()

def get_default_color_scheme():
    """Цветовая схема по умолчанию"""
    return {
        'primary': '#003196',
        'light': '#3a5fcf',
        'lighter': '#5d7cd9',
        'dark': '#00257a',
        'darker': '#001d5c',
        'complementary': '#963100',
        'analogous_1': '#00963a',
        'analogous_2': '#310096',
        'triadic_1': '#963100',
        'triadic_2': '#00963a',
        'monochromatic_1': '#3a5fcf',
        'monochromatic_2': '#00257a',
        'bg_primary': '#003196',
        'bg_light': '#3a5fcf',
        'text_on_primary': '#ffffff',
        'text_on_light': '#ffffff',
        'border': '#00257a',
        'hover': '#3a5fcf',
        'active': '#001d5c',
        'gradient_start': '#003196',
        'gradient_end': '#963100',
    }

# ==================== КОМПАКТНЫЙ СЕРИАЛИЗАТОР ПОЛЬЗОВАТЕЛЯ ====================
class CompactUserSerializer(serializers.ModelSerializer):
    """Компактный сериализатор пользователя - используется ВЕЗДЕ где нужен uploaded_by"""
    avatar_url = serializers.SerializerMethodField()
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url', 
            'header_image_url', 'gridscan_color',
            'is_admin', 'is_staff', 'is_superuser'  # ← ДОБАВЛЕНО
        ]
        read_only_fields = fields
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    def get_header_image_url(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== TRACK SERIALIZERS ====================
class TrackSerializer(serializers.ModelSerializer):
    """ОСНОВНОЙ сериализатор треков - ВСЕГДА включает uploaded_by"""
    
    uploaded_by = CompactUserSerializer(read_only=True)
    comments_count = serializers.IntegerField(source='comment_count', read_only=True)
    artist = serializers.SerializerMethodField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    duration_seconds = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    hashtag_list = serializers.SerializerMethodField()
    tag_list = serializers.SerializerMethodField()
    user_liked = serializers.SerializerMethodField()
    
    # ========== ДОБАВЛЕННЫЕ ПОЛЯ ДЛЯ FEED ==========
    like_count = serializers.SerializerMethodField()
    repost_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    author_username = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    # ================================================
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by', 'description',
            'cover', 'cover_url', 'audio_file', 'audio_url',
            'duration', 'duration_seconds', 'file_size', 'bitrate',
            'sample_rate', 'play_count', 'like_count', 'repost_count',
            'comment_count', 'download_count', 'share_count',
            'genre', 'hashtags', 'hashtag_list', 'tags', 'tag_list',
            'is_explicit', 'is_downloadable', 'is_private',
            'is_featured', 'is_premium', 'bpm', 'key', 'license',
            'recording_date', 'location', 'status', 'published_at',
            'created_at', 'updated_at', 'is_liked', 'is_reposted',
            'waveform_data', 'waveform_generated',
            'comments_count', 'user_liked',
            # ========== ДОБАВЛЕННЫЕ ПОЛЯ ==========
            'author_username', 'author_avatar',
            # ======================================
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'artist', 'cover_url', 'audio_url',
            'play_count', 'like_count', 'repost_count', 'comment_count',
            'download_count', 'share_count', 'published_at',
            'created_at', 'updated_at', 'duration_seconds',
            'is_liked', 'is_reposted',
            'comments_count', 'user_liked',
            'author_username', 'author_avatar',
        ]
    
    def get_artist(self, obj):
        """artist всегда берется из uploaded_by.username"""
        return obj.uploaded_by.username if obj.uploaded_by else ''
    
    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url
        return obj.cover_url or None
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return obj.audio_url or None
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return TrackLike.objects.filter(user=request.user, track=obj).exists()
        return False
    
    def get_is_reposted(self, obj):
        """Возвращает True, если текущий пользователь репостнул этот трек"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                return TrackRepost.objects.filter(user=request.user, track=obj).exists()
            except Exception:
                return False
        return False
    
    def get_hashtag_list(self, obj):
        """Возвращает список названий хештегов"""
        return [tag.name for tag in obj.hashtags.all()]
    
    def get_tag_list(self, obj):
        """Возвращает список тегов из строки tags"""
        if obj.tags:
            return [tag.strip() for tag in obj.tags.split(',') if tag.strip()]
        return []
    
    def get_user_liked(self, obj):
        """Алиас для is_liked (для совместимости)"""
        return self.get_is_liked(obj)
    
    # ========== МЕТОДЫ ДЛЯ FEED ПОЛЕЙ ==========
    def get_like_count(self, obj):
        """Количество лайков трека"""
        return obj.like_count
    
    def get_repost_count(self, obj):
        """Количество репостов трека"""
        return obj.repost_count
    
    def get_comment_count(self, obj):
        """Количество комментариев трека"""
        return obj.comment_count
    
    def get_author_username(self, obj):
        """Username автора трека"""
        return obj.uploaded_by.username if obj.uploaded_by else obj.artist or ''
    
    def get_author_avatar(self, obj):
        """URL аватара автора трека"""
        if obj.uploaded_by and obj.uploaded_by.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.uploaded_by.avatar.url)
            return obj.uploaded_by.avatar.url
        return None
    # ============================================

class TrackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = [
            'title', 'artist', 'description', 'cover', 'audio_file',
            'genre', 'tags', 'is_explicit', 'is_downloadable',
            'is_private', 'bpm', 'key', 'license'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['uploaded_by'] = request.user

        raw_tags = (validated_data.get('tags') or '').strip()

        # 1) создаём трек
        track = super().create(validated_data)

        # 2) парсим tags -> уникальный список
        if raw_tags:
            parts = raw_tags.replace(';', ',').split(',')
            cleaned = []
            for p in parts:
                t = p.strip()
                if not t:
                    continue
                t = t.lstrip('#').strip().lower()
                if not t:
                    continue
                cleaned.append(t)

            # уникализация (с сохранением порядка)
            uniq = []
            seen = set()
            for t in cleaned:
                if t not in seen:
                    seen.add(t)
                    uniq.append(t)

            # 3) создаём/получаем Hashtag и привязываем к track.hashtags
            tag_objs = []
            for name in uniq:
                slug = slugify(name)[:50] or name[:50]
                obj, _ = Hashtag.objects.get_or_create(
                    slug=slug,
                    defaults={"name": name[:50]}
                )
                # если было "Legenda" раньше — приводим к lower
                if obj.name != name:
                    obj.name = name[:50]
                    obj.save(update_fields=["name"])
                tag_objs.append(obj)

            track.hashtags.set(tag_objs)

            # 4) записываем track.tags в каноничном виде (чтобы не было дублей)
            track.tags = ','.join(uniq)
            track.save(update_fields=["tags"])

        return track

class CompactTrackSerializer(serializers.ModelSerializer):
    """Компактный сериализатор трека - ВСЕГДА включает uploaded_by"""
    
    uploaded_by = CompactUserSerializer(read_only=True)
    artist = serializers.SerializerMethodField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comment_count', read_only=True)
    duration_seconds = serializers.IntegerField(read_only=True)
    
    # ✅ ДОБАВЛЯЕМ ПОЛЯ ДЛЯ ТЕГОВ
    hashtag_list = serializers.SerializerMethodField()
    tag_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration', 'duration_seconds',
            'play_count', 'like_count', 'repost_count',
            'comment_count',               # ← ДОБАВЛЕНО
            'genre', 'created_at',
            'comments_count',              # оставить (совместимость)
            # ✅ ДОБАВЛЯЕМ ПОЛЯ ДЛЯ ТЕГОВ
            'hashtag_list', 'tag_list'
        ]
        read_only_fields = fields
    
    def get_artist(self, obj):
        """artist всегда берется из uploaded_by.username"""
        return obj.uploaded_by.username if obj.uploaded_by else ''
    
    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url
        return obj.cover_url or None
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return obj.audio_url or None
    
    # ✅ МЕТОДЫ ДЛЯ ТЕГОВ
    def get_hashtag_list(self, obj):
        return [t.name for t in obj.hashtags.all()]
    
    def get_tag_list(self, obj):
        if obj.tags:
            return [t.strip() for t in obj.tags.split(',') if t.strip()]
        return []

class PlayerTrackSerializer(serializers.ModelSerializer):
    """Специальный сериализатор для плеера - ГАРАНТИРУЕТ uploaded_by И duration_seconds"""
    
    uploaded_by = CompactUserSerializer(read_only=True)
    artist = serializers.SerializerMethodField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    duration_seconds = serializers.IntegerField(read_only=True)
    repost_count = serializers.IntegerField(read_only=True)
    is_reposted = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comment_count', read_only=True)
    
    # ✅ ДОБАВЛЕНО: поля для тегов
    hashtag_list = serializers.SerializerMethodField()
    tag_list = serializers.SerializerMethodField()
    tags = serializers.CharField(read_only=True)
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration', 
            'duration_seconds',
            'play_count', 'like_count', 'repost_count',
            'comment_count',               # ← ДОБАВЛЕНО
            'created_at',
            'is_reposted',
            'comments_count',
            # ✅ ДОБАВЛЕНО:
            'tags', 'tag_list', 'hashtag_list'
        ]
        read_only_fields = fields
    
    def get_artist(self, obj):
        """artist всегда берется из uploaded_by.username"""
        return obj.uploaded_by.username if obj.uploaded_by else ''
    
    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url
        return obj.cover_url or None
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return obj.audio_url or None
    
    def get_is_reposted(self, obj):
        """Возвращает True, если у request.user есть запись в TrackRepost для данного трека"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                return TrackRepost.objects.filter(user=request.user, track=obj).exists()
            except Exception:
                return False
        return False
    
    # ✅ ДОБАВЛЕНО: методы для тегов
    def get_hashtag_list(self, obj):
        try:
            return [t.name for t in obj.hashtags.all()]
        except Exception:
            return []
    
    def get_tag_list(self, obj):
        if obj.tags:
            return [x.strip() for x in obj.tags.split(',') if x.strip()]
        return []

# ==================== USER PROFILE SERIALIZERS ====================
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'created_at', 'updated_at']
        read_only_fields = fields

# ==================== PUBLIC USER SERIALIZER ====================
class PublicUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    header_image = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    color_scheme = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    tracks_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'bio', 'country', 'avatar', 'header_image',
            'gridscan_color', 'color_scheme', 'followers_count',
            'following_count', 'tracks_count', 'is_following',
            'is_artist', 'is_pro', 'website', 'instagram', 'twitter', 'soundcloud',
            'created_at', 'updated_at',
            'is_admin', 'is_staff', 'is_superuser',  # ← ДОБАВЛЕНО
        ]
        read_only_fields = fields
    
    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def get_header_image(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    def get_color_scheme(self, obj):
        color_to_use = obj.gridscan_color if obj.gridscan_color else '#003196'
        return get_color_scheme(color_to_use)
    
    def get_followers_count(self, obj):
        try:
            return obj.followers.count()
        except:
            return 0
    
    def get_following_count(self, obj):
        try:
            return obj.following.count()
        except:
            return 0
    
    def get_tracks_count(self, obj):
        try:
            return obj.uploaded_tracks.filter(status='published').count()
        except:
            return 0
    
    def get_is_following(self, obj):
        """Проверяет, подписан ли текущий пользователь на этого пользователя"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                return Follow.objects.filter(
                    follower=request.user,
                    following=obj
                ).exists()
            except:
                return False
        return False
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== USER ME SERIALIZER ====================
class UserMeSerializer(serializers.ModelSerializer):
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    tracks_count = serializers.IntegerField(read_only=True)
    playlists_count = serializers.IntegerField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    header_image = serializers.ImageField(read_only=True)
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    header_updated_at = serializers.DateTimeField(read_only=True)
    color_scheme = serializers.SerializerMethodField()
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'country', 'avatar', 'avatar_url',
            'created_at', 'updated_at', 'followers_count', 'following_count',
            'tracks_count', 'playlists_count', 'header_image',
            'header_image_url', 'header_updated_at', 'gridscan_color',
            'is_artist', 'is_pro', 'website', 'instagram', 'twitter',
            'soundcloud', 'color_scheme',
            'is_admin', 'is_staff', 'is_superuser',  # ← ДОБАВЛЕНО
        ]
        read_only_fields = [
            'id', 'username', 'email', 'avatar', 'avatar_url',
            'created_at', 'updated_at',
            'gridscan_color', 'header_image', 'header_image_url',
            'followers_count', 'following_count',
            'tracks_count', 'playlists_count',
            'is_artist', 'is_pro', 'website',
            'instagram', 'twitter', 'soundcloud',
            'color_scheme',
            'is_admin', 'is_staff', 'is_superuser',  # ← ДОБАВЛЕНО
        ]
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    def get_header_image_url(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    def get_color_scheme(self, obj):
        color_to_use = obj.gridscan_color if obj.gridscan_color else '#003196'
        return get_color_scheme(color_to_use)
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== USER PROFILE FULL SERIALIZER ====================
class UserProfileFullSerializer(serializers.ModelSerializer):
    followers_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    tracks_count = serializers.IntegerField(read_only=True)
    reposts_count = serializers.IntegerField(read_only=True)
    playlists_count = serializers.IntegerField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    header_image = serializers.ImageField(required=False, allow_null=True, write_only=True)
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(required=False, allow_blank=True, max_length=7)
    header_updated_at = serializers.DateTimeField(read_only=True)
    color_scheme = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    total_listens = serializers.SerializerMethodField()
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'country', 'avatar', 'avatar_url',
            'created_at', 'updated_at', 'email_verified',
            'followers_count', 'following_count', 'tracks_count',
            'reposts_count', 'playlists_count', 'is_artist', 'is_pro',
            'pro_expires_at', 'website', 'instagram', 'twitter', 'soundcloud',
            'header_image', 'header_image_url', 'header_updated_at',
            'gridscan_color', 'color_scheme', 'is_following', 'total_listens',
            'is_admin', 'is_staff', 'is_superuser',  # ← ДОБАВЛЕНО
        ]
        read_only_fields = [
            'id', 'email', 'created_at', 'updated_at', 'email_verified',
            'followers_count', 'following_count', 'tracks_count',
            'reposts_count', 'playlists_count', 'pro_expires_at',
            'header_updated_at', 'header_image_url',
            'color_scheme', 'is_following', 'total_listens',
            'is_admin', 'is_staff', 'is_superuser',  # ← ДОБАВЛЕНО
        ]
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    def get_header_image_url(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    def get_color_scheme(self, obj):
        color_to_use = obj.gridscan_color if obj.gridscan_color else '#003196'
        return get_color_scheme(color_to_use)
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False
    
    def get_total_listens(self, obj):
        try:
            return Track.objects.filter(uploaded_by=obj, status='published').aggregate(total=Sum('play_count'))['total'] or 0
        except:
            return 0
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser
    
    def update(self, instance, validated_data):
        header_image = validated_data.pop('header_image', None)
        gridscan_color = validated_data.pop('gridscan_color', None)
        
        if header_image:
            try:
                instance.header_image = header_image
                instance.header_updated_at = timezone.now()
                logger.info(f"Header image uploaded for user {instance.id}")
            except Exception as e:
                logger.error(f"Failed to save header image: {e}")
        
        if gridscan_color is not None:
            import re
            color_pattern = re.compile(r'^#(?:[0-9a-fA-F]{3}){1,2}$')
            if color_pattern.match(gridscan_color):
                instance.gridscan_color = gridscan_color
                logger.info(f"GridScan color updated for user {instance.id}: {gridscan_color}")
            else:
                logger.warning(f"Invalid gridscan_color format: {gridscan_color}")
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

# ==================== AVATAR SERIALIZERS ====================
class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.ImageField(required=True, max_length=100)
    
    def validate_avatar(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Размер файла слишком большой. Максимум 5MB")
        
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Неподдерживаемый формат файла")
        
        try:
            image = Image.open(value)
            image.verify()
            image = Image.open(value)
            width, height = image.size
            if width > 2000 or height > 2000:
                raise serializers.ValidationError("Изображение слишком большое")
        except Exception as e:
            raise serializers.ValidationError(f"Ошибка при обработке изображения: {str(e)}")
        
        return value

class HeaderImageUploadSerializer(serializers.Serializer):
    header_image = serializers.ImageField(required=True, max_length=100)
    gridscan_color = serializers.CharField(required=False, max_length=7)
    
    def validate_header_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size too large. Maximum 5MB")
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Invalid file type")
        return value
    
    def validate_gridscan_color(self, value):
        if value:
            import re
            color_pattern = re.compile(r'^#(?:[0-9a-fA-F]{3}){1,2}$')
            if not color_pattern.match(value):
                raise serializers.ValidationError("Неверный формат цвета")
        return value

class GridScanColorUpdateSerializer(serializers.Serializer):
    gridscan_color = serializers.CharField(required=True, max_length=7, min_length=7)
    
    def validate_gridscan_color(self, value):
        import re
        color_pattern = re.compile(r'^#(?:[0-9a-fA-F]{3}){1,2}$')
        if not color_pattern.match(value):
            raise serializers.ValidationError("Неверный формат цвета")
        return value

# ==================== SIMPLE USER SERIALIZERS ====================
class SimpleUserSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url', 
            'header_image_url', 'gridscan_color',
            'is_admin', 'is_staff', 'is_superuser'  # ← ДОБАВЛЕНО
        ]
        read_only_fields = fields
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    def get_header_image_url(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== HASHTAG SERIALIZERS ====================
class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ['id', 'name', 'slug', 'usage_count', 'created_at']
        read_only_fields = ['id', 'slug', 'usage_count', 'created_at']

# ==================== FOLLOW SERIALIZERS ====================
class FollowSerializer(serializers.ModelSerializer):
    follower = CompactUserSerializer(read_only=True)
    following = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at', 'notifications_enabled']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        following_id = self.context.get('following_id')
        
        if not following_id:
            raise serializers.ValidationError("following_id is required")
        
        try:
            following_user = CustomUser.objects.get(id=following_id)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found")
        
        if request.user == following_user:
            raise serializers.ValidationError("Cannot follow yourself")
        
        if Follow.objects.filter(follower=request.user, following=following_user).exists():
            raise serializers.ValidationError("Already following")
        
        follow = Follow.objects.create(
            follower=request.user,
            following=following_user
        )
        
        return follow

# ==================== FOLLOW RESPONSE SERIALIZERS ====================
class FollowResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    action = serializers.CharField()
    message = serializers.CharField()
    follow_id = serializers.IntegerField(required=False, allow_null=True)
    deleted_count = serializers.IntegerField(required=False, default=0)
    followers_count = serializers.SerializerMethodField()
    
    def get_followers_count(self, obj):
        user_id = self.context.get('user_id')
        if user_id:
            try:
                user = CustomUser.objects.get(id=user_id)
                return user.followers.count()
            except:
                return 0
        return 0

class FollowStatusSerializer(serializers.Serializer):
    is_following = serializers.BooleanField()
    followers_count = serializers.IntegerField()
    following_count = serializers.IntegerField()
    
    class Meta:
        fields = ['is_following', 'followers_count', 'following_count']

class UserFollowersSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    bio = serializers.CharField(allow_null=True)
    avatar_url = serializers.URLField(allow_null=True)
    followed_at = serializers.DateTimeField()
    is_following_back = serializers.BooleanField(required=False)
    
    class Meta:
        fields = ['id', 'username', 'bio', 'avatar_url', 'followed_at', 'is_following_back']

class UserFollowingSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    bio = serializers.CharField(allow_null=True)
    avatar_url = serializers.URLField(allow_null=True)
    followed_at = serializers.DateTimeField()
    follows_you = serializers.BooleanField(required=False)
    
    class Meta:
        fields = ['id', 'username', 'bio', 'avatar_url', 'followed_at', 'follows_you']

# ==================== LIKE SERIALIZERS ====================
class TrackLikeSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = TrackLike
        fields = ['id', 'user', 'track', 'liked_at']
        read_only_fields = ['id', 'liked_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)

# ==================== REPOST SERIALIZERS ====================
class TrackRepostSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = TrackRepost
        fields = ['id', 'user', 'track', 'reposted_at', 'comment']
        read_only_fields = ['id', 'reposted_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)

# ==================== PLAYLIST LIKE SERIALIZERS ====================
class PlaylistLikeSerializer(serializers.ModelSerializer):
    """Сериализатор для лайков плейлистов"""
    user = CompactUserSerializer(read_only=True)
    playlist = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = PlaylistLike
        fields = ['id', 'user', 'playlist', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)

# ==================== PLAYLIST REPOST SERIALIZERS ====================
class PlaylistRepostSerializer(serializers.ModelSerializer):
    """Сериализатор для репостов плейлистов"""
    user = CompactUserSerializer(read_only=True)
    playlist = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = PlaylistRepost
        fields = ['id', 'user', 'playlist', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)

# ==================== PLAYLIST SERIALIZERS (обновлен с repost_count) ====================
class PlaylistSerializer(serializers.ModelSerializer):
    created_by = CompactUserSerializer(read_only=True)
    cover_url = serializers.SerializerMethodField()
    track_count = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    # ✅ ДОБАВЛЯЕМ ПОЛЯ ДЛЯ РЕПОСТОВ
    repost_count = serializers.SerializerMethodField()
    reposts_count = serializers.SerializerMethodField()  # алиас для совместимости
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'title', 'description', 'created_by',
            'cover', 'cover_url', 'visibility', 'tracks',
            'created_at', 'updated_at', 'likes_count', 'play_count',
            'repost_count', 'reposts_count',  # ← ДОБАВЛЕНО
            'is_featured', 'is_collaborative', 'track_count',
            'total_duration', 'is_owner', 'is_liked', 'is_reposted'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_at', 'updated_at',
            'likes_count', 'play_count', 'repost_count', 'reposts_count',  # ← ДОБАВЛЕНО
            'is_liked', 'is_reposted'
        ]
    
    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url
        return obj.cover_url or None
    
    def get_track_count(self, obj):
        return obj.tracks.count()
    
    def get_total_duration(self, obj):
        total_seconds = 0
        for track in obj.tracks.all():
            total_seconds += track.get_duration_seconds()
        
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"
    
    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.created_by == request.user
        return False
    
    def get_is_liked(self, obj):
        """Проверяет, лайкнул ли текущий пользователь этот плейлист"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PlaylistLike.objects.filter(
                user=request.user, 
                playlist=obj
            ).exists()
        return False
    
    def get_is_reposted(self, obj):
        """Проверяет, репостнул ли текущий пользователь этот плейлист"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return PlaylistRepost.objects.filter(
                user=request.user, 
                playlist=obj
            ).exists()
        return False
    
    # ✅ МЕТОДЫ ДЛЯ РЕПОСТОВ
    def get_repost_count(self, obj):
        """Количество репостов плейлиста"""
        try:
            return PlaylistRepost.objects.filter(playlist=obj).count()
        except Exception as e:
            logger.error(f"Error counting playlist reposts: {e}")
            return 0
    
    def get_reposts_count(self, obj):
        """Алиас для repost_count (на случай если фронт ожидает именно reposts_count)"""
        return self.get_repost_count(obj)

# ==================== COMMENT SERIALIZERS ====================
class TrackCommentSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = TrackComment
        fields = [
            'id', 'user', 'track', 'text', 'created_at', 'updated_at',
            'likes', 'like_count', 'is_deleted', 'parent', 'is_liked',
            'replies'
        ]
        read_only_fields = ['id', 'user', 'track', 'created_at', 'updated_at', 'like_count']
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False
    
    def get_replies(self, obj):
        replies = obj.replies.filter(is_deleted=False).order_by('created_at')
        return TrackCommentSerializer(replies, many=True, context=self.context).data

# ==================== NOTIFICATION SERIALIZERS ====================
class NotificationSerializer(serializers.ModelSerializer):
    related_user = CompactUserSerializer(read_only=True)
    related_track = CompactTrackSerializer(read_only=True)
    related_comment = TrackCommentSerializer(read_only=True)
    related_playlist = PlaylistSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'type', 'title', 'content', 'is_read',
            'created_at', 'related_user', 'related_track',
            'related_comment', 'related_playlist'
        ]
        read_only_fields = ['id', 'created_at']

# ==================== LISTENING HISTORY SERIALIZERS ====================
class ListeningHistorySerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = ListeningHistory
        fields = ['id', 'user', 'track', 'listened_at', 'play_count']
        read_only_fields = ['id', 'listened_at']

# ==================== AUTH SERIALIZERS ====================
class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    country = serializers.CharField(
        max_length=100, 
        required=False, 
        allow_blank=True,
        help_text="Страна пользователя (английское название)"
    )
    captcha_token = serializers.CharField(write_only=True, required=False)
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        
        if CustomUser.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Пользователь с таким email уже существует"})
        
        if CustomUser.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "Пользователь с таким именем уже существует"})
        
        if 'country' in data and data['country']:
            country = data['country'].strip()
            if country:
                import re
                if not re.match(r'^[A-Za-z\s-]+$', country):
                    raise serializers.ValidationError({
                        "country": "Страна может содержать только английские буквы, пробелы и дефисы"
                    })
                data['country'] = country
        
        return data
    
    def create(self, validated_data):
        country = validated_data.pop('country', '')
        captcha_token = validated_data.pop('captcha_token', '')
        
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            country=country or '',
        )
        
        return user
    
    def validate_captcha(self, captcha_token):
        return True

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

# ==================== USER WITH GRIDSCAN SERIALIZER ====================
class UserWithGridScanSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    color_scheme = serializers.SerializerMethodField()
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url',
            'header_image_url', 'gridscan_color', 'color_scheme',
            'updated_at',
            'is_admin', 'is_staff', 'is_superuser'  # ← ДОБАВЛЕНО
        ]
        read_only_fields = fields
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    def get_header_image_url(self, obj):
        if obj.header_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.header_image.url)
            return obj.header_image.url
        return None
    
    def get_color_scheme(self, obj):
        color_to_use = obj.gridscan_color if obj.gridscan_color else '#003196'
        return get_color_scheme(color_to_use)
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== EXPORT SERIALIZER ====================
class UserExportSerializer(serializers.ModelSerializer):
    tracks = CompactTrackSerializer(many=True, read_only=True, source='uploaded_tracks')
    playlists = PlaylistSerializer(many=True, read_only=True, source='playlists')
    followers = CompactUserSerializer(many=True, read_only=True, source='followers')
    following = CompactUserSerializer(many=True, read_only=True, source='following')
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'country', 'avatar',
            'created_at', 'updated_at', 'website',
            'instagram', 'twitter', 'soundcloud',
            'header_image', 'gridscan_color', 'tracks', 
            'playlists', 'followers', 'following'
        ]
        read_only_fields = fields

# ==================== UPLOADED TRACKS SERIALIZER ====================
class UploadedTracksSerializer(serializers.ModelSerializer):
    """Сериализатор для загруженных треков пользователя"""
    uploaded_by = CompactUserSerializer(read_only=True)
    artist = serializers.SerializerMethodField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comment_count', read_only=True)
    duration_seconds = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration', 'duration_seconds',
            'play_count', 'like_count', 'repost_count',
            'comment_count',               # ← ДОБАВЛЕНО
            'genre',
            'created_at',
            'comments_count'
        ]
        read_only_fields = fields
    
    def get_artist(self, obj):
        """artist всегда берется из uploaded_by.username"""
        return obj.uploaded_by.username if obj.uploaded_by else ''
    
    def get_cover_url(self, obj):
        if obj.cover:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover.url)
            return obj.cover.url
        return None
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        return None

# ==================== ВАЛИДАЦИОННЫЕ И ВСПОМОГАТЕЛЬНЫЕ СЕРИАЛИЗАТОРЫ ====================
class ImageValidationSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True)
    
    def validate_image(self, value):
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(f"Image too large. Maximum {max_size // (1024*1024)}MB")
        
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(f"Invalid image type")
        
        return value

class ColorAnalysisSerializer(serializers.Serializer):
    hex_color = serializers.CharField(max_length=7)
    color_scheme = serializers.DictField(read_only=True)
    
    def validate_hex_color(self, value):
        if not value.startswith('#') or len(value) != 7:
            raise serializers.ValidationError("Invalid HEX color format")
        
        try:
            int(value[1:], 16)
        except ValueError:
            raise serializers.ValidationError("Invalid HEX color")
        
        return value
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['color_scheme'] = get_color_scheme(instance['hex_color'])
        return representation

# ==================== ВСПОМОГАТЕЛЬНЫЕ СЕРИАЛИЗАТОРЫ ====================
class PlaylistTrackSerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    added_by = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = PlaylistTrack
        fields = ['id', 'playlist', 'track', 'added_by', 'added_at', 'position']
        read_only_fields = ['id', 'added_at']

class CommentLikeSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']

class PlayHistorySerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    user = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = PlayHistory
        fields = [
            'id', 'user', 'track', 'played_at', 
            'ip_address', 'user_agent', 'duration_listened', 'is_full_play'
        ]
        read_only_fields = ['id', 'played_at']

class DailyStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyStats
        fields = [
            'id', 'date', 'total_plays', 'total_likes',
            'total_reposts', 'total_tracks', 'total_users',
            'total_uploads', 'total_comments'
        ]
        read_only_fields = ['id']

class UserTrackInteractionSerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = UserTrackInteraction
        fields = [
            'id', 'user', 'track', 'liked', 'liked_at',
            'played', 'played_at', 'saved', 'saved_at'
        ]
        read_only_fields = ['id', 'user']

class TrackAnalyticsSerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = TrackAnalytics
        fields = [
            'id', 'track', 'date', 'plays', 'likes',
            'reposts', 'comments', 'downloads', 'shares'
        ]
        read_only_fields = ['id']

class SystemLogSerializer(serializers.ModelSerializer):
    user = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = SystemLog
        fields = [
            'id', 'level', 'module', 'message', 'details',
            'created_at', 'ip_address', 'user'
        ]
        read_only_fields = ['id', 'created_at']

class WaveformGenerationTaskSerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)
    
    class Meta:
        model = WaveformGenerationTask
        fields = [
            'id', 'track', 'status', 'created_at',
            'started_at', 'completed_at', 'error_message',
            'attempt_count', 'points_generated', 'processing_time'
        ]
        read_only_fields = ['id', 'created_at']

class AvatarResponseSerializer(serializers.Serializer):
    avatar_url = serializers.URLField(read_only=True)
    message = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)

class UserMinimalSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    
    # 👑 ДОБАВЛЕНЫ ПОЛЯ АДМИНА
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url',
            'is_admin'  # ← ДОБАВЛЕНО
        ]
        read_only_fields = fields
    
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        elif obj.avatar_url:
            return obj.avatar_url
        return None
    
    # 👑 МЕТОД ДЛЯ is_admin
    def get_is_admin(self, obj):
        """Определяет, является ли пользователь администратором"""
        return obj.is_staff or obj.is_superuser

# ==================== STATS SERIALIZER ====================
class UserStatsSerializer(serializers.Serializer):
    followers = serializers.IntegerField()
    following = serializers.IntegerField()
    tracks = serializers.IntegerField()
    playlists = serializers.IntegerField()
    total_listens = serializers.IntegerField()
    total_likes = serializers.IntegerField()
    total_reposts = serializers.IntegerField()
    rank = serializers.IntegerField(allow_null=True)
    percentile = serializers.FloatField(allow_null=True)

# ==================== FOLLOW LIST SERIALIZERS ====================
class FollowerDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    avatar_url = serializers.CharField(allow_null=True)
    bio = serializers.CharField(allow_null=True)
    followed_at = serializers.DateTimeField()
    is_following_back = serializers.BooleanField()
    is_current_user = serializers.BooleanField()

class FollowingDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    avatar_url = serializers.CharField(allow_null=True)
    bio = serializers.CharField(allow_null=True)
    followed_at = serializers.DateTimeField()
    follows_you = serializers.BooleanField()
    is_current_user = serializers.BooleanField()

class FollowListResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    followers = FollowerDetailSerializer(many=True, required=False)
    following = FollowingDetailSerializer(many=True, required=False)
    count = serializers.IntegerField()
    user = serializers.DictField()

# ==================== BATCH OPERATIONS SERIALIZER ====================
class BatchFollowSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),  # ← ИСПРАВЛЕНО: child= через равно
        min_length=1,
        max_length=50
    )
    
    def validate_user_ids(self, value):
        existing_ids = CustomUser.objects.filter(id__in=value).values_list('id', flat=True)
        missing_ids = set(value) - set(existing_ids)
        
        if missing_ids:
            raise serializers.ValidationError(
                f"Пользователи с ID {missing_ids} не найдены"
            )
        
        request = self.context.get('request')
        if request and request.user.id in value:
            raise serializers.ValidationError(
                "Нельзя подписаться на себя"
            )
        
        return value

class BatchFollowResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    created = serializers.IntegerField()
    already_following = serializers.IntegerField()
    failed = serializers.IntegerField()
    details = serializers.DictField(required=False)

# ==================== NOTIFICATION SETTINGS SERIALIZER ====================
class FollowNotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ['notifications_enabled']
    
    def update(self, instance, validated_data):
        instance.notifications_enabled = validated_data.get(
            'notifications_enabled', 
            instance.notifications_enabled
        )
        instance.save()
        return instance

# ==================== DIALOG / MESSAGE SERIALIZERS ====================

class MessageSerializer(serializers.ModelSerializer):
    """Сериализатор для сообщений в диалоге"""
    sender = CompactUserSerializer(read_only=True)
    track = CompactTrackSerializer(read_only=True, allow_null=True)
    
    # 🔥 НОВЫЕ ПОЛЯ ДЛЯ ФРОНТЕНДА
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    # ✅ ГОЛОСОВЫЕ СООБЩЕНИЯ
    voice_url = serializers.SerializerMethodField()
    waveform = serializers.JSONField(read_only=True, allow_null=True)
    
    # ✅ МЕДИА ПОЛЯ (ИЗОБРАЖЕНИЯ/ВИДЕО) - НОВЫЕ
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    # 🔥 РЕАКЦИИ НА СООБЩЕНИЯ
    reactions = serializers.JSONField(read_only=True)
    
    # 🔥 НОВОЕ ПОЛЕ: реакции с расширенной информацией о пользователях
    reactions_expanded = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 
            'conversation', 
            'sender', 
            'sender_id',          # ← ДОБАВЛЕНО
            'sender_username',    # ← ДОБАВЛЕНО
            'is_mine',            # ← ДОБАВЛЕНО
            'text', 
            'track', 
            # ✅ ГОЛОСОВЫЕ ПОЛЯ
            'voice_url', 'voice_duration', 'waveform',
            # ✅ МЕДИА ПОЛЯ (НОВЫЕ)
            'image_url', 'video_url',
            # 🔥 РЕАКЦИИ (НОВЫЕ)
            'reactions',
            'reactions_expanded',  # ← ДОБАВЛЕНО
            'is_read', 
            'read_at', 
            'created_at'
        ]
        read_only_fields = [
            'id', 'conversation', 'sender', 'sender_id', 'sender_username', 
            'is_mine', 'is_read', 'read_at', 'created_at',
            'voice_url', 'voice_duration', 'waveform', 'image_url', 'video_url',
            'reactions', 'reactions_expanded'
        ]

    def get_is_mine(self, obj):
        """
        Определяет, принадлежит ли сообщение текущему пользователю
        """
        request = self.context.get('request')
        if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
            return False
        return obj.sender_id == request.user.id
    
    def get_voice_url(self, obj):
        """Получить полный URL голосового сообщения"""
        if not obj.voice:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.voice.url)
        return obj.voice.url
    
    def get_image_url(self, obj):
        """Получить полный URL изображения"""
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
    
    def get_video_url(self, obj):
        """Получить полный URL видео"""
        if not obj.video:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.video.url)
        return obj.video.url
    
    def get_reactions_expanded(self, obj):
        """
        🔥 НОВЫЙ МЕТОД:
        Возвращает реакции с полной информацией о пользователях (аватарки, имена)
        Формат: { "❤️": [{"id": 1, "username": "user", "avatar": "url"}, ...] }
        """
        reactions = obj.reactions or {}
        if not reactions:
            return {}
        
        # Собираем все ID пользователей из всех реакций
        user_ids = set()
        for emoji, users in reactions.items():
            if isinstance(users, list):
                for uid in users:
                    if isinstance(uid, int):
                        user_ids.add(uid)
        
        if not user_ids:
            return {}
        
        # Получаем информацию о пользователях
        users = CustomUser.objects.filter(id__in=user_ids).only('id', 'username', 'avatar')
        
        # Создаем маппинг ID -> данные пользователя
        user_map = {}
        request = self.context.get('request')
        
        for user in users:
            avatar_url = None
            if user.avatar:
                if request:
                    avatar_url = request.build_absolute_uri(user.avatar.url)
                else:
                    avatar_url = user.avatar.url
            elif user.avatar_url:
                avatar_url = user.avatar_url
            
            user_map[user.id] = {
                'id': user.id,
                'username': user.username,
                'avatar': avatar_url
            }
        
        # Формируем результат
        result = {}
        for emoji, user_ids_list in reactions.items():
            if not isinstance(user_ids_list, list):
                continue
            
            result[emoji] = [
                user_map.get(uid, {
                    'id': uid, 
                    'username': f'user_{uid}',
                    'avatar': None
                }) 
                for uid in user_ids_list if uid in user_map
            ]
        
        return result


class DialogListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка диалогов в левой колонке"""
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    # 🔥 НОВОЕ ПОЛЕ: ID последнего прочитанного сообщения собеседника
    other_last_read_message_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 
            'other_user', 
            'last_message', 
            'unread_count', 
            'other_last_read_message_id',  # ← ДОБАВЛЕНО
            'updated_at', 
            'created_at', 
            'is_group', 
            'title'
        ]

    def get_other_user(self, obj):
        """Возвращает второго участника диалога (для 1-на-1)"""
        request = self.context.get('request')
        me = getattr(request, 'user', None)
        if not me or not me.is_authenticated:
            return None
        other = obj.participants.exclude(id=me.id).first()
        return CompactUserSerializer(other, context=self.context).data if other else None

    def get_last_message(self, obj):
        """Возвращает последнее сообщение в диалоге"""
        last = obj.messages.order_by('-created_at').first()
        if not last:
            return None
        return MessageSerializer(last, context=self.context).data

    def get_unread_count(self, obj):
        """Возвращает количество непрочитанных сообщений для текущего пользователя"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        # Количество сообщений, которые не прочитаны и отправлены не текущим пользователем
        return obj.messages.filter(
            ~Q(sender=request.user),  # не от текущего пользователя
            is_read=False
        ).count()
    
    def get_other_last_read_message_id(self, obj):
        """
        🔥 НОВЫЙ МЕТОД:
        Возвращает ID последнего прочитанного сообщения собеседником
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        # Находим "другого" участника
        other = obj.participants.exclude(id=request.user.id).first()
        if not other:
            return None
        
        # Получаем состояние диалога для другого пользователя
        try:
            state = DialogState.objects.filter(
                user=other, 
                conversation=obj
            ).first()
            
            if state and state.last_read_message_id:
                return state.last_read_message_id
        except Exception as e:
            logger.error(f"Error getting other_last_read_message_id: {e}")
        
        return None


class DialogDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор диалога (с участниками)"""
    participants = CompactUserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    
    # 🔥 НОВОЕ ПОЛЕ: ID последнего прочитанного сообщения собеседника
    other_last_read_message_id = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 
            'participants', 
            'last_message', 
            'other_last_read_message_id',  # ← ДОБАВЛЕНО
            'updated_at', 
            'created_at', 
            'is_group', 
            'title'
        ]

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if not last:
            return None
        return MessageSerializer(last, context=self.context).data
    
    def get_other_last_read_message_id(self, obj):
        """
        🔥 НОВЫЙ МЕТОД:
        Возвращает ID последнего прочитанного сообщения собеседником
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        # Находим "другого" участника
        other = obj.participants.exclude(id=request.user.id).first()
        if not other:
            return None
        
        # Получаем состояние диалога для другого пользователя
        try:
            state = DialogState.objects.filter(
                user=other, 
                conversation=obj
            ).first()
            
            if state and state.last_read_message_id:
                return state.last_read_message_id
        except Exception as e:
            logger.error(f"Error getting other_last_read_message_id: {e}")
        
        return None


class SendMessageSerializer(serializers.Serializer):
    """Сериализатор для отправки сообщения"""
    text = serializers.CharField(required=False, allow_blank=True, default='')
    track_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        text = data.get('text', '').strip()
        track_id = data.get('track_id')
        
        if not text and not track_id:
            raise serializers.ValidationError("Нельзя отправить пустое сообщение")
        
        if track_id:
            try:
                track = Track.objects.get(id=track_id)
                # Можно добавить проверку доступа к треку
                data['track'] = track
            except Track.DoesNotExist:
                raise serializers.ValidationError({"track_id": "Трек не найден"})
        
        return data


class StartDialogSerializer(serializers.Serializer):
    """Сериализатор для создания/получения диалога"""
    user_id = serializers.IntegerField(required=True)

    def validate_user_id(self, value):
        request = self.context.get('request')
        
        if request and request.user.id == value:
            raise serializers.ValidationError("Нельзя создать диалог с самим собой")
        
        try:
            user = CustomUser.objects.get(id=value)
            return user
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Пользователь не найден")


class MarkMessagesReadSerializer(serializers.Serializer):
    """Сериализатор для отметки сообщений как прочитанных"""
    message_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Список ID сообщений для отметки (если не указан, отмечаются все)"
    )
    
    def validate_message_ids(self, value):
        if value and len(value) > 100:
            raise serializers.ValidationError("Слишком много сообщений (максимум 100)")
        return value


# ==================== BAN APPEAL SERIALIZERS ====================
class BanAppealSerializer(serializers.ModelSerializer):
    """
    Сериализатор для апелляций на бан
    """
    user = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = BanAppeal
        fields = [
            'id',
            'user',
            'username_snapshot',
            'banned_by_snapshot',
            'ban_reason_snapshot',
            'ban_until_snapshot',
            'disagree_text',
            'status',
            'admin_comment',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'username_snapshot',
            'banned_by_snapshot',
            'ban_reason_snapshot',
            'ban_until_snapshot',
            'status',
            'admin_comment',
            'created_at',
        ]


# ==================== USER REPORT SERIALIZERS ====================
class UserReportSerializer(serializers.ModelSerializer):
    """
    Сериализатор для жалоб на пользователей
    """
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reported_username = serializers.CharField(source='reported_user.username', read_only=True)

    class Meta:
        model = UserReport
        fields = [
            'id',
            'reporter',
            'reporter_username',
            'reported_user',
            'reported_username',
            'reason',
            'status',
            'created_at'
        ]
        read_only_fields = ['reporter', 'status', 'created_at']


# ==================== 🔥 НОВЫЕ СЕРИАЛИЗАТОРЫ ДЛЯ ЛИЧНОГО КАБИНЕТА ====================

class ModerationActionSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модерационных действий (наказаний)
    """
    admin_username = serializers.SerializerMethodField()

    class Meta:
        model = ModerationAction
        fields = ['id', 'action_type', 'reason', 'created_at', 'admin', 'admin_username']

    def get_admin_username(self, obj):
        """Возвращает username администратора, если он есть"""
        return getattr(obj.admin, 'username', None)


class UserAppealSerializer(serializers.ModelSerializer):
    """
    Сериализатор для апелляций пользователей
    """
    responded_by_username = serializers.SerializerMethodField()
    related_action_type = serializers.SerializerMethodField()

    class Meta:
        model = UserAppeal
        fields = [
            'id', 'message', 'status', 'admin_response',
            'created_at', 'updated_at',
            'related_action', 'related_action_type',
            'responded_by', 'responded_by_username'
        ]

    def get_responded_by_username(self, obj):
        """Возвращает username админа, который ответил на апелляцию"""
        return getattr(obj.responded_by, 'username', None)
    
    def get_related_action_type(self, obj):
        """Возвращает тип связанного модерационного действия"""
        if obj.related_action:
            return obj.related_action.action_type
        return None


class UserReportSerializer(serializers.ModelSerializer):
    """
    Сериализатор для репортов (жалоб) пользователей
    """
    reviewed_by_username = serializers.SerializerMethodField()
    target_username = serializers.SerializerMethodField()

    class Meta:
        model = UserReport
        fields = [
            'id', 'reason', 'message', 'status', 'admin_response',
            'created_at', 'updated_at',
            'target_user', 'target_username',
            'reviewed_by', 'reviewed_by_username'
        ]

    def get_reviewed_by_username(self, obj):
        """Возвращает username админа, который рассмотрел репорт"""
        return getattr(obj.reviewed_by, 'username', None)

    def get_target_username(self, obj):
        """Возвращает username пользователя, на которого подали жалобу"""
        return getattr(obj.target_user, 'username', None)