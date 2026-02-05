# api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CustomUser, Track, Hashtag, Follow, TrackLike, 
    TrackRepost, Playlist, PlaylistTrack, Comment, 
    TrackComment, Notification, ListeningHistory,
    PlayHistory, DailyStats, UserTrackInteraction,
    Message, TrackAnalytics, SystemLog, WaveformGenerationTask,
    UserProfile
)
from django.utils import timezone
from PIL import Image
import io
import colorsys
import logging
import numpy as np
from sklearn.cluster import KMeans
from django.db.models import Sum

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
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'avatar', 'avatar_url', 'header_image_url', 'gridscan_color']
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

# ==================== TRACK SERIALIZERS ====================
class TrackSerializer(serializers.ModelSerializer):
    """ОСНОВНОЙ сериализатор треков - ВСЕГДА включает uploaded_by"""
    
    # 🔥 КРИТИЧЕСКО ВАЖНО: uploaded_by ДОЛЖЕН БЫТЬ ЕДИНСТВЕННЫМ ИСТОЧНИКОМ ИНФЫ ОБ АРТИСТЕ
    uploaded_by = CompactUserSerializer(read_only=True)
    
    # ❌ УБРАТЬ artist из полей или сделать его read_only синонимом uploaded_by.username
    artist = serializers.SerializerMethodField(read_only=True)  # Только для обратной совместимости
    
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    duration_seconds = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_reposted = serializers.SerializerMethodField()
    hashtag_list = serializers.SerializerMethodField()
    tag_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by', 'description',  # artist только для совместимости
            'cover', 'cover_url', 'audio_file', 'audio_url',
            'duration', 'duration_seconds', 'file_size', 'bitrate',
            'sample_rate', 'play_count', 'like_count', 'repost_count',
            'comment_count', 'download_count', 'share_count',
            'genre', 'hashtags', 'hashtag_list', 'tags', 'tag_list',
            'is_explicit', 'is_downloadable', 'is_private',
            'is_featured', 'is_premium', 'bpm', 'key', 'license',
            'recording_date', 'location', 'status', 'published_at',
            'created_at', 'updated_at', 'is_liked', 'is_reposted',
            'waveform_data', 'waveform_generated'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'artist', 'cover_url', 'audio_url',  # artist тоже read_only
            'play_count', 'like_count', 'repost_count', 'comment_count',
            'download_count', 'share_count', 'published_at',
            'created_at', 'updated_at', 'duration_seconds'
        ]
    
    def get_artist(self, obj):
        """artist всегда берется из uploaded_by.username для совместимости"""
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
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return TrackRepost.objects.filter(user=request.user, track=obj).exists()
        return False
    
    def get_hashtag_list(self, obj):
        return [tag.name for tag in obj.hashtags.all()]
    
    def get_tag_list(self, obj):
        if obj.tags:
            return [tag.strip() for tag in obj.tags.split(',')]
        return []

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
        return super().create(validated_data)

class CompactTrackSerializer(serializers.ModelSerializer):
    """Компактный сериализатор трека - ВСЕГДА включает uploaded_by"""
    
    # 🔥 ОБЯЗАТЕЛЬНО: uploaded_by должен быть здесь для плеера
    uploaded_by = CompactUserSerializer(read_only=True)
    
    # ❌ artist ТОЛЬКО как read_only поле из uploaded_by
    artist = serializers.SerializerMethodField(read_only=True)
    
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration', 'play_count',
            'like_count', 'genre', 'created_at'
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

class PlayerTrackSerializer(serializers.ModelSerializer):
    """Специальный сериализатор для плеера - ГАРАНТИРУЕТ uploaded_by"""
    
    # 🔥 КРИТИЧЕСКО ВАЖНО: uploaded_by ОБЯЗАТЕЛЕН
    uploaded_by = CompactUserSerializer(read_only=True)
    
    # ❌ artist ТОЛЬКО как read_only поле
    artist = serializers.SerializerMethodField(read_only=True)
    
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    duration_seconds = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration', 'duration_seconds',
            'play_count', 'like_count', 'created_at'
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
    is_following = serializers.SerializerMethodField()  # 🔥 ДОБАВЛЕНО
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'bio', 'avatar', 'header_image',
            'gridscan_color', 'color_scheme', 'followers_count',
            'following_count', 'tracks_count', 'is_following',  # 🔥 ДОБАВЛЕНО
            'is_artist', 'is_pro', 'website', 'instagram', 'twitter', 'soundcloud',
            'created_at', 'updated_at',
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
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'avatar', 'avatar_url',
            'created_at', 'updated_at', 'followers_count', 'following_count',
            'tracks_count', 'playlists_count', 'header_image',
            'header_image_url', 'header_updated_at', 'gridscan_color',
            'is_artist', 'is_pro', 'website', 'instagram', 'twitter',
            'soundcloud', 'color_scheme',
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
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'avatar', 'avatar_url',
            'created_at', 'updated_at', 'email_verified',
            'followers_count', 'following_count', 'tracks_count',
            'reposts_count', 'playlists_count', 'is_artist', 'is_pro',
            'pro_expires_at', 'website', 'instagram', 'twitter', 'soundcloud',
            'header_image', 'header_image_url', 'header_updated_at',
            'gridscan_color', 'color_scheme', 'is_following', 'total_listens',
        ]
        read_only_fields = [
            'id', 'email', 'created_at', 'updated_at', 'email_verified',
            'followers_count', 'following_count', 'tracks_count',
            'reposts_count', 'playlists_count', 'pro_expires_at',
            'header_updated_at', 'header_image_url',
            'color_scheme', 'is_following', 'total_listens'
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
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'avatar', 'avatar_url', 'header_image_url', 'gridscan_color']
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
        
        # Проверяем, не пытаемся ли подписаться на себя
        if request.user == following_user:
            raise serializers.ValidationError("Cannot follow yourself")
        
        # Проверяем, не подписаны ли уже
        if Follow.objects.filter(follower=request.user, following=following_user).exists():
            raise serializers.ValidationError("Already following")
        
        # Создаем подписку
        follow = Follow.objects.create(
            follower=request.user,
            following=following_user
        )
        
        return follow

# ==================== FOLLOW RESPONSE SERIALIZERS ====================
class FollowResponseSerializer(serializers.Serializer):
    """Сериализатор для ответов на действия подписки"""
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
    """Сериализатор для проверки статуса подписки"""
    is_following = serializers.BooleanField()
    followers_count = serializers.IntegerField()
    following_count = serializers.IntegerField()
    
    class Meta:
        fields = ['is_following', 'followers_count', 'following_count']

class UserFollowersSerializer(serializers.Serializer):
    """Сериализатор для списка подписчиков"""
    id = serializers.IntegerField()
    username = serializers.CharField()
    bio = serializers.CharField(allow_null=True)
    avatar_url = serializers.URLField(allow_null=True)
    followed_at = serializers.DateTimeField()
    is_following_back = serializers.BooleanField(required=False)
    
    class Meta:
        fields = ['id', 'username', 'bio', 'avatar_url', 'followed_at', 'is_following_back']

class UserFollowingSerializer(serializers.Serializer):
    """Сериализатор для списка подписок"""
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
    track = CompactTrackSerializer(read_only=True)  # ✅ Используем CompactTrackSerializer с uploaded_by
    
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
    track = CompactTrackSerializer(read_only=True)  # ✅ Используем CompactTrackSerializer с uploaded_by
    
    class Meta:
        model = TrackRepost
        fields = ['id', 'user', 'track', 'reposted_at', 'comment']
        read_only_fields = ['id', 'reposted_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)

# ==================== PLAYLIST SERIALIZERS ====================
class PlaylistSerializer(serializers.ModelSerializer):
    created_by = CompactUserSerializer(read_only=True)
    cover_url = serializers.SerializerMethodField()
    track_count = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'title', 'description', 'created_by',
            'cover', 'cover_url', 'visibility', 'tracks',
            'created_at', 'updated_at', 'likes_count', 'play_count',
            'is_featured', 'is_collaborative', 'track_count',
            'total_duration', 'is_owner'
        ]
        read_only_fields = [
            'id', 'created_by', 'created_at', 'updated_at',
            'likes_count', 'play_count'
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
    related_track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
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
    """Сериализатор для истории прослушиваний - ВСЕГДА с uploaded_by"""
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
    
    class Meta:
        model = ListeningHistory
        fields = ['id', 'user', 'track', 'listened_at', 'play_count']
        read_only_fields = ['id', 'listened_at']

# ==================== AUTH SERIALIZERS ====================
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['email', 'username', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

# ==================== USER WITH GRIDSCAN SERIALIZER ====================
class UserWithGridScanSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    header_image_url = serializers.SerializerMethodField()
    gridscan_color = serializers.CharField(read_only=True)
    color_scheme = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'avatar', 'avatar_url',
            'header_image_url', 'gridscan_color', 'color_scheme',
            'updated_at'
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

# ==================== EXPORT SERIALIZER ====================
class UserExportSerializer(serializers.ModelSerializer):
    tracks = CompactTrackSerializer(many=True, read_only=True, source='uploaded_tracks')
    playlists = PlaylistSerializer(many=True, read_only=True, source='playlists')
    followers = CompactUserSerializer(many=True, read_only=True, source='followers')
    following = CompactUserSerializer(many=True, read_only=True, source='following')
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'bio', 'avatar',
            'created_at', 'updated_at', 'website',
            'instagram', 'twitter', 'soundcloud',
            'header_image', 'gridscan_color', 'tracks', 
            'playlists', 'followers', 'following'
        ]
        read_only_fields = fields

# ==================== UPLOADED TRACKS SERIALIZER ====================
class UploadedTracksSerializer(serializers.ModelSerializer):
    """Сериализатор для загруженных треков пользователя"""
    uploaded_by = CompactUserSerializer(read_only=True)  # ✅ ОБЯЗАТЕЛЬНО
    artist = serializers.SerializerMethodField(read_only=True)  # Для совместимости
    
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'uploaded_by',
            'cover_url', 'audio_url', 'duration',
            'play_count', 'like_count', 'genre',
            'created_at'
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
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
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
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
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
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
    
    class Meta:
        model = UserTrackInteraction
        fields = [
            'id', 'user', 'track', 'liked', 'liked_at',
            'played', 'played_at', 'saved', 'saved_at'
        ]
        read_only_fields = ['id', 'user']

class MessageSerializer(serializers.ModelSerializer):
    sender = CompactUserSerializer(read_only=True)
    receiver = CompactUserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'content',
            'sent_at', 'is_read', 'read_at'
        ]
        read_only_fields = ['id', 'sent_at']

class TrackAnalyticsSerializer(serializers.ModelSerializer):
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
    
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
    track = CompactTrackSerializer(read_only=True)  # ✅ С uploaded_by
    
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
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'avatar', 'avatar_url']
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
        child=serializers.IntegerField(),
        min_length=1,
        max_length=50
    )
    
    def validate_user_ids(self, value):
        # Проверяем, что все пользователи существуют
        existing_ids = CustomUser.objects.filter(id__in=value).values_list('id', flat=True)
        missing_ids = set(value) - set(existing_ids)
        
        if missing_ids:
            raise serializers.ValidationError(
                f"Пользователи с ID {missing_ids} не найдены"
            )
        
        # Проверяем, что пользователь не пытается подписаться на себя
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