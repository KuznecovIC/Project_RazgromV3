# models.py - ТОЛЬКО модели, логика в views.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import os
from django.conf import settings
import logging
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger(__name__)

# ==================== CORRECT STORAGE ====================
class OverwriteStorage(FileSystemStorage):
    def get_available_name(self, name, max_length=None):
        if self.exists(name):
            os.remove(os.path.join(self.location, name))
        return name

# ==================== ПУТИ ДЛЯ ФАЙЛОВ ====================
def avatar_upload_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    if ext not in allowed_extensions:
        ext = 'jpg'
    
    timestamp = int(timezone.now().timestamp())
    filename = f"user_{instance.id}_{timestamp}.{ext}"
    return f"avatars/{filename}"

def track_cover_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = int(timezone.now().timestamp())
    safe_title = "".join(c for c in instance.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"cover_{instance.uploaded_by.id}_{timestamp}_{safe_title[:20]}.{ext}"
    return f"covers/{filename}"

def track_audio_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = int(timezone.now().timestamp())
    safe_title = "".join(c for c in instance.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"track_{instance.uploaded_by.id}_{timestamp}_{safe_title[:30]}.{ext}"
    return f"audio/{filename}"

def playlist_cover_path(instance, filename):
    ext = filename.split('.')[-1]
    timestamp = int(timezone.now().timestamp())
    safe_title = "".join(c for c in instance.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    filename = f"playlist_cover_{instance.created_by.id}_{timestamp}_{safe_title[:20]}.{ext}"
    return f"playlists/{filename}"

def user_header_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    if ext not in allowed_extensions:
        ext = 'jpg'
    
    timestamp = int(timezone.now().timestamp())
    filename = f"header_{instance.id}_{timestamp}.{ext}"
    return f"headers/{filename}"

# ==================== CUSTOM USER ====================
class CustomUserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email обязателен')
        if not username:
            raise ValueError('Username обязателен')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, username, password, **extra_fields)

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    bio = models.TextField(max_length=500, blank=True)
    
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        verbose_name='Аватар',
        blank=True,
        null=True,
        storage=OverwriteStorage(),
        help_text='Аватар пользователя (рекомендуется 200x200px)'
    )
    
    avatar_url = models.URLField(
        verbose_name='Внешний URL аватара',
        blank=True,
        default='',
        help_text='Внешняя ссылка на аватар (если не загружен файл)'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    email_verified = models.BooleanField(default=False)
    
    header_image = models.ImageField(
        upload_to=user_header_path,
        verbose_name='Header Image',
        blank=True,
        null=True,
        storage=OverwriteStorage(),
        help_text='Header image для профиля (рекомендуется 1500x500px)'
    )
    
    gridscan_color = models.CharField(
        max_length=7,
        default='#003196',
        verbose_name='GridScan Color',
        help_text='Цвет GridScan (формат #RRGGBB)'
    )
    
    header_updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Header Updated At'
    )
    
    # 🔴🔴🔴 ВСЕГДА АКТУАЛЬНЫЕ СЧЁТЧИКИ
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    tracks_count = models.IntegerField(default=0)
    reposts_count = models.IntegerField(default=0)
    playlists_count = models.IntegerField(default=0)
    
    is_artist = models.BooleanField(default=False)
    is_pro = models.BooleanField(default=False)
    pro_expires_at = models.DateTimeField(null=True, blank=True)
    
    website = models.URLField(blank=True, default='')
    instagram = models.CharField(max_length=100, blank=True, default='')
    twitter = models.CharField(max_length=100, blank=True, default='')
    soundcloud = models.CharField(max_length=100, blank=True, default='')
    
    objects = CustomUserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return self.username
    
    def get_avatar_url(self):
        if self.avatar:
            return self.avatar.url
        elif self.avatar_url:
            return self.avatar_url
        return None
    
    # 🔴🔴🔴 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: ЭТОТ МЕТОД ВЫЗЫВАЕТ ТОЛЬКО VIEW
    def update_stats(self):
        """Обновление статистики пользователя ИЗ БАЗЫ ДАННЫХ"""
        try:
            from .models import Follow, Track, TrackRepost, Playlist
            
            # Количество подписчиков (кто подписан НА меня)
            self.followers_count = Follow.objects.filter(following=self).count()
            
            # Количество подписок (на кого подписан Я)
            self.following_count = Follow.objects.filter(follower=self).count()
            
            # Остальные счетчики
            self.tracks_count = Track.objects.filter(uploaded_by=self).count()
            self.reposts_count = TrackRepost.objects.filter(user=self).count()
            self.playlists_count = Playlist.objects.filter(created_by=self).count()
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении статистики пользователя {self.id}: {e}")
            # Устанавливаем значения по умолчанию в случае ошибки
            self.followers_count = 0
            self.following_count = 0
            self.tracks_count = 0
            self.reposts_count = 0
            self.playlists_count = 0
        
        self.save(update_fields=[
            'followers_count', 'following_count', 'tracks_count', 
            'reposts_count', 'playlists_count', 'updated_at'
        ])
    
    def get_header_image_url(self):
        if self.header_image:
            return self.header_image.url
        return None
    
    def get_gridscan_color(self):
        return self.gridscan_color if self.gridscan_color else '#003196'
    
    def update_avatar(self, avatar_file=None, avatar_url=None):
        if avatar_file:
            self.avatar = avatar_file
            if avatar_url:
                self.avatar_url = avatar_url
        elif avatar_url:
            self.avatar_url = avatar_url
            if self.avatar:
                self.avatar.delete(save=False)
                self.avatar = None
        
        self.updated_at = timezone.now()
        self.save(update_fields=[
            'avatar', 'avatar_url', 'updated_at'
        ])
        return True
    
    def update_header_and_color(self, header_file=None, gridscan_color=None):
        if header_file:
            self.header_image = header_file
        if gridscan_color:
            self.gridscan_color = gridscan_color
        
        self.header_updated_at = timezone.now()
        self.save(update_fields=[
            'header_image', 'gridscan_color', 'header_updated_at', 'updated_at'
        ])
        return True
    
    def get_liked_track_ids(self):
        liked_ids = []
        
        if hasattr(self, 'track_likes'):
            liked_ids = list(self.track_likes.values_list('track_id', flat=True))
        elif hasattr(self, 'usertrackinteraction_set'):
            liked_ids = list(self.usertrackinteraction_set.filter(liked=True)
                           .values_list('track_id', flat=True))
        
        return liked_ids
    
    def get_recent_tracks(self, limit=10):
        from .models import Track
        return Track.objects.filter(
            uploaded_by=self,
            status='published'
        ).order_by('-created_at')[:limit]

# ==================== СИСТЕМА ПОДПИСОК - УБРАЛ save/delete ЛОГИКУ ====================
class Follow(models.Model):
    follower = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='following',
        verbose_name='Подписчик'
    )
    
    following = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='followers',
        verbose_name='На кого подписан'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата подписки'
    )
    
    notifications_enabled = models.BooleanField(
        default=True,
        verbose_name='Уведомления включены'
    )
    
    class Meta:
        unique_together = ['follower', 'following']
        ordering = ['-created_at']
        verbose_name = 'Подписка'
        verbose_name_plural = 'Подписки'
    
    def __str__(self):
        return f"{self.follower.username} → {self.following.username}"
    
    # 🔴🔴🔴 КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: УБРАЛ save() и delete() переопределения
    # Логика обновления статистики будет ТОЛЬКО в views.py

# ==================== USER PROFILE EXTENSION ====================
class UserProfile(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='user_profile',
        verbose_name='Пользователь'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Дополнительный профиль'
        verbose_name_plural = 'Дополнительные профили'
    
    def __str__(self):
        return f"Профиль: {self.user.username}"

# ==================== USER SESSION ====================
class UserSession(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Сессия пользователя'
        verbose_name_plural = 'Сессии пользователей'
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at}"

# ==================== ПАРОЛЬ RESET TOKEN ====================
class PasswordResetToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=255, unique=True)
    reset_code = models.CharField(max_length=6, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Токен сброса пароля'
        verbose_name_plural = 'Токены сброса пароля'
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at}"
    
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

# ==================== ХЕШТЕГИ ====================
class Hashtag(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(max_length=50, unique=True)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-usage_count']
        verbose_name = 'Хештег'
        verbose_name_plural = 'Хештеги'
    
    def __str__(self):
        return f'#{self.name}'
    
    def increment_usage(self):
        self.usage_count += 1
        self.save(update_fields=['usage_count'])

# ==================== ТРЕКИ ====================
class Track(models.Model):
    STATUS_CHOICES = [
        ('draft', '📝 Черновик'),
        ('pending', '⏳ На модерации'),
        ('published', '✅ Опубликован'),
        ('rejected', '❌ Отклонен'),
        ('archived', '🗄️ В архиве'),
    ]
    
    GENRE_CHOICES = [
        ('rock', '🎸 Рок'),
        ('pop', '🎤 Поп'),
        ('hiphop', '🎧 Хип-хоп'),
        ('electronic', '🎹 Электроника'),
        ('jazz', '🎷 Джаз'),
        ('classical', '🎻 Классика'),
        ('metal', '🤘 Метал'),
        ('indie', '🎵 Инди'),
        ('lofi', '☕ Lo-Fi'),
        ('ambient', '🌌 Эмбиент'),
        ('folk', '🌿 Фолк'),
        ('blues', '🎶 Блюз'),
        ('reggae', '🌈 Регги'),
        ('punk', '⚡ Панк'),
        ('dance', '💃 Танцевальная'),
        ('experimental', '🔬 Экспериментальная'),
        ('other', '🎼 Другое'),
    ]
    
    title = models.CharField(
        max_length=255,
        verbose_name='Название трека',
        help_text='Укажите название вашего трека'
    )
    
    artist = models.CharField(
        max_length=255,
        verbose_name='Исполнитель',
        help_text='Имя исполнителя или группы'
    )
    
    uploaded_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='uploaded_tracks',
        verbose_name='Загружено пользователем'
    )
    
    cover = models.ImageField(
        upload_to=track_cover_path,
        verbose_name='Обложка',
        blank=True,
        null=True,
        help_text='Рекомендуемый размер: 1000x1000px',
        storage=OverwriteStorage()
    )
    
    cover_url = models.URLField(
        verbose_name='Ссылка на обложку',
        blank=True,
        default='',
        help_text='Внешняя ссылка на обложку'
    )
    
    audio_file = models.FileField(
        upload_to=track_audio_path,
        verbose_name='Аудио файл',
        help_text='Поддерживаемые форматы: MP3, WAV, OGG, FLAC, M4A',
        storage=OverwriteStorage(),
        max_length=500
    )
    
    audio_url = models.URLField(
        verbose_name='Ссылка на аудио',
        blank=True,
        default='',
        help_text='Внешняя ссылка на аудио (если нет файла)'
    )
    
    duration = models.CharField(
        max_length=10,
        verbose_name='Длительность',
        default='0:00',
        help_text='Длительность трека (например: 3:45)'
    )
    
    file_size = models.PositiveIntegerField(
        verbose_name='Размер файла (байт)',
        default=0
    )
    
    bitrate = models.PositiveIntegerField(
        verbose_name='Битрейт (kbps)',
        default=0
    )
    
    sample_rate = models.PositiveIntegerField(
        verbose_name='Частота дискретизации (Hz)',
        default=0
    )
    
    waveform_data = models.JSONField(
        verbose_name='Waveform данные',
        default=list,
        blank=True,
        help_text='Массив чисел 0-100 для отрисовки waveform'
    )
    
    waveform_generated = models.BooleanField(
        default=False,
        verbose_name='Waveform сгенерирован'
    )
    
    waveform_generated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата генерации waveform'
    )
    
    waveform_version = models.CharField(
        max_length=10,
        default='1.0',
        verbose_name='Версия waveform'
    )
    
    waveform_points = models.PositiveIntegerField(
        default=120,
        verbose_name='Количество точек waveform'
    )
    
    play_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество прослушиваний'
    )
    
    like_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество лайков'
    )
    
    repost_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество репостов'
    )
    
    comment_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество комментариев'
    )
    
    download_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество скачиваний'
    )
    
    share_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество шарингов'
    )
    
    description = models.TextField(
        verbose_name='Описание',
        blank=True,
        help_text='Расскажите о вашем треке'
    )
    
    genre = models.CharField(
        max_length=50,
        choices=GENRE_CHOICES,
        default='other',
        verbose_name='Жанр'
    )
    
    hashtags = models.ManyToManyField(
        Hashtag,
        related_name='tracks',
        blank=True,
        verbose_name='Хештеги'
    )
    
    tags = models.TextField(
        verbose_name='Теги',
        blank=True,
        help_text='Теги через запятую (альтернатива хештегам)'
    )
    
    is_explicit = models.BooleanField(
        default=False,
        verbose_name='Эксплицитный контент',
        help_text='Содержит нецензурную лексику или взрослый контент'
    )
    
    is_downloadable = models.BooleanField(
        default=True,
        verbose_name='Доступно для скачивания'
    )
    
    is_private = models.BooleanField(
        default=False,
        verbose_name='Приватный трек',
        help_text='Виден только вам и указанным пользователям'
    )
    
    is_featured = models.BooleanField(
        default=False,
        verbose_name='Рекомендуемый трек'
    )
    
    is_premium = models.BooleanField(
        default=False,
        verbose_name='Премиум контент'
    )
    
    bpm = models.PositiveIntegerField(
        verbose_name='BPM (темп)',
        null=True,
        blank=True
    )
    
    key = models.CharField(
        max_length=10,
        verbose_name='Тональность',
        blank=True,
        null=True,
        help_text='Музыкальная тональность (например: Cm, G#maj)'
    )
    
    license = models.CharField(
        max_length=100,
        default='All rights reserved',
        verbose_name='Лицензия',
        help_text='Права на использование трека'
    )
    
    recording_date = models.DateField(
        verbose_name='Дата записи',
        null=True,
        blank=True
    )
    
    location = models.CharField(
        max_length=100,
        verbose_name='Место записи',
        blank=True,
        null=True
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Статус'
    )
    
    published_at = models.DateTimeField(
        verbose_name='Дата публикации',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    moderated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_tracks',
        verbose_name='Проверено модератором'
    )
    
    moderated_at = models.DateTimeField(
        verbose_name='Дата модерации',
        null=True,
        blank=True
    )
    
    moderation_notes = models.TextField(
        verbose_name='Заметки модератора',
        blank=True
    )

    duration_seconds = models.PositiveIntegerField(
        verbose_name='Длительность в секундах',
        default=0
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Трек'
        verbose_name_plural = 'Треки'
        indexes = [
            models.Index(fields=['status', 'published_at']),
            models.Index(fields=['uploaded_by', 'status']),
            models.Index(fields=['genre', 'status']),
            models.Index(fields=['like_count', 'play_count']),
            models.Index(fields=['created_at']),
            models.Index(fields=['title']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.artist}"
    
    def save(self, *args, **kwargs):
        if self.pk and self.status == 'published':
            try:
                old_track = Track.objects.get(pk=self.pk)
                if old_track.status != 'published':
                    self.published_at = timezone.now()
                    logger.info(f"Трек {self.id} переведен в статус 'published'")
            except Track.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        if self.status == 'published' and not self.waveform_generated:
            logger.info(f"Трек {self.id} опубликован, можно сгенерировать waveform")
    
    def publish(self):
        if self.status == 'draft':
            self.status = 'published'
            self.published_at = timezone.now()
            self.save()
            logger.info(f"Трек {self.id} опубликован через метод publish()")
            return True
        return False
    
    def approve(self):
        if self.status == 'pending':
            self.status = 'published'
            self.published_at = timezone.now()
            self.moderated_at = timezone.now()
            self.save()
            return True
        return False
    
    def reject(self, reason=""):
        if self.status == 'pending':
            self.status = 'rejected'
            self.moderated_at = timezone.now()
            self.moderation_notes = reason
            self.save()
            return True
        return False
    
    def get_cover_url(self):
        if self.cover:
            return self.cover.url
        elif self.cover_url:
            return self.cover_url
        return None
    
    def get_audio_url(self):
        if self.audio_file:
            return self.audio_file.url
        elif self.audio_url:
            return self.audio_url
        return None
    
    def get_hashtag_list(self):
        return [tag.name for tag in self.hashtags.all()]
    
    def get_tag_list(self):
        if self.tags:
            return [tag.strip() for tag in self.tags.split(',')]
        return []
    
    def get_duration_seconds(self):
        try:
            if not self.duration:
                return 0
            
            if ':' in self.duration:
                parts = self.duration.split(':')
                if len(parts) == 2:
                    minutes, seconds = map(int, parts)
                    return minutes * 60 + seconds
                elif len(parts) == 3:
                    hours, minutes, seconds = map(int, parts)
                    return hours * 3600 + minutes * 60 + seconds
            
            if hasattr(self, 'duration_seconds') and self.duration_seconds:
                return self.duration_seconds
            
            return 0
        except Exception as e:
            logger.error(f"Ошибка преобразования длительности '{self.duration}': {e}")
            return 0
    
    def get_formatted_duration(self):
        return self.duration
    
    def get_file_size_mb(self):
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return 0
    
    def increment_play_count(self):
        self.play_count += 1
        self.save(update_fields=['play_count', 'updated_at'])
    
    def increment_like_count(self):
        self.like_count += 1
        self.save(update_fields=['like_count', 'updated_at'])
    
    def decrement_like_count(self):
        if self.like_count > 0:
            self.like_count -= 1
            self.save(update_fields=['like_count', 'updated_at'])
    
    def can_be_accessed_by(self, user):
        if self.status != 'published':
            return False
        if self.is_private and user != self.uploaded_by:
            return False
        if self.is_premium and not (user.is_pro or user == self.uploaded_by):
            return False
        return True
    
    def get_waveform(self, num_points=None):
        if not self.waveform_data:
            return []
        
        if num_points and len(self.waveform_data) != num_points:
            import math
            old_len = len(self.waveform_data)
            new_data = []
            for i in range(num_points):
                idx = int(i * old_len / num_points)
                if idx < old_len:
                    new_data.append(self.waveform_data[idx])
                else:
                    new_data.append(0)
            return new_data
        
        return self.waveform_data

# ==================== СИСТЕМА РЕПОСТОВ ====================
class TrackRepost(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='reposts',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='reposts',
        verbose_name='Трек'
    )
    
    reposted_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата репоста'
    )
    
    comment = models.TextField(
        verbose_name='Комментарий',
        blank=True,
        help_text='Комментарий к репосту'
    )
    
    class Meta:
        unique_together = ['user', 'track']
        ordering = ['-reposted_at']
        verbose_name = 'Репост трека'
        verbose_name_plural = 'Репосты треков'
    
    def __str__(self):
        return f"{self.user.username} reposted {self.track.title}"

# ==================== ЗАЩИТА ОТ НАКРУТКИ ПРОСЛУШИВАНИЙ ====================
class PlayHistory(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='play_history',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='play_history',
        verbose_name='Трек'
    )
    
    played_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время прослушивания'
    )
    
    ip_address = models.GenericIPAddressField(
        verbose_name='IP адрес',
        null=True,
        blank=True
    )
    
    user_agent = models.TextField(
        verbose_name='User Agent',
        blank=True
    )
    
    duration_listened = models.PositiveIntegerField(
        verbose_name='Прослушано (секунд)',
        default=0
    )
    
    is_full_play = models.BooleanField(
        verbose_name='Полное прослушивание',
        default=False
    )
    
    class Meta:
        unique_together = ['user', 'track']
        ordering = ['-played_at']
        indexes = [
            models.Index(fields=['user', 'track', 'played_at']),
            models.Index(fields=['track', 'played_at']),
        ]
        verbose_name = 'История прослушиваний'
        verbose_name_plural = 'История прослушиваний'
    
    def __str__(self):
        return f"{self.user.username} played {self.track.title}"
    
    def save(self, *args, **kwargs):
        recent_play = PlayHistory.objects.filter(
            user=self.user,
            track=self.track,
            played_at__gte=timezone.now() - timezone.timedelta(minutes=30)
        ).exists()
        
        if not recent_play:
            super().save(*args, **kwargs)
            self.track.increment_play_count()

# ==================== ГЛОБАЛЬНАЯ СТАТИСТИКА ====================
class DailyStats(models.Model):
    date = models.DateField(
        unique=True,
        verbose_name='Дата'
    )
    
    total_plays = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего прослушиваний'
    )
    
    total_likes = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего лайков'
    )
    
    total_reposts = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего репостов'
    )
    
    total_tracks = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего треков'
    )
    
    total_users = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего пользователей'
    )
    
    total_uploads = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего загрузок'
    )
    
    total_comments = models.PositiveIntegerField(
        default=0,
        verbose_name='Всего комментариев'
    )
    
    class Meta:
        ordering = ['-date']
        verbose_name = 'Дневная статистика'
        verbose_name_plural = 'Дневная статистика'
    
    def __str__(self):
        return f"Статистика за {self.date}"

# ==================== ЛАЙКИ ====================
class TrackLike(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='track_likes',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Трек'
    )
    
    liked_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время лайка'
    )
    
    class Meta:
        unique_together = ['user', 'track']
        ordering = ['-liked_at']
        verbose_name = 'Лайк трека'
        verbose_name_plural = 'Лайки треков'
    
    def __str__(self):
        return f"{self.user.username} liked {self.track.title}"

# ==================== USER TRACK INTERACTION ====================
class UserTrackInteraction(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        verbose_name='Трек'
    )
    
    liked = models.BooleanField(
        default=False,
        verbose_name='Лайк'
    )
    
    liked_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Время лайка'
    )
    
    played = models.BooleanField(
        default=False,
        verbose_name='Прослушан'
    )
    
    played_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время прослушивания'
    )
    
    saved = models.BooleanField(
        default=False,
        verbose_name='Сохранено'
    )
    
    saved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время сохранения'
    )
    
    class Meta:
        unique_together = ['user', 'track']
        verbose_name = 'Взаимодействие с треком'
        verbose_name_plural = 'Взаимодействия с треками'
    
    def __str__(self):
        actions = []
        if self.liked: actions.append('Liked')
        if self.played: actions.append('Played')
        if self.saved: actions.append('Saved')
        return f"{self.user.username} - {self.track.title}: {', '.join(actions)}"

# ==================== КОММЕНТАРИИ ====================
class Comment(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Трек'
    )
    
    text = models.TextField(
        verbose_name='Текст комментария'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    likes_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество лайков'
    )
    
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name='Родительский комментарий'
    )
    
    is_deleted = models.BooleanField(
        default=False,
        verbose_name='Удален'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'
    
    def __str__(self):
        return f"{self.user.username} commented on {self.track.title}"
    
    def update_likes_count(self):
        self.likes_count = CommentLike.objects.filter(comment=self).count()
        self.save(update_fields=['likes_count'])

# ==================== ЛАЙКИ КОММЕНТАРИЕВ ====================
class CommentLike(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='comment_likes',
        verbose_name='Пользователь'
    )
    
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Комментарий'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата лайка'
    )
    
    class Meta:
        unique_together = ['user', 'comment']
        ordering = ['-created_at']
        verbose_name = 'Лайк комментария'
        verbose_name_plural = 'Лайки комментариев'
    
    def __str__(self):
        return f"{self.user.username} liked comment #{self.comment.id}"

# ==================== LISTENING HISTORY ====================
class ListeningHistory(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        verbose_name='Трек'
    )
    
    listened_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время прослушивания'
    )
    
    play_count = models.IntegerField(
        default=1,
        verbose_name='Количество прослушиваний'
    )
    
    class Meta:
        ordering = ['-listened_at']
        unique_together = ['user', 'track']
        verbose_name = 'История прослушивания'
        verbose_name_plural = 'История прослушиваний'
    
    def __str__(self):
        return f"{self.user.username} listened {self.track.title} at {self.listened_at}"

# ==================== КОММЕНТАРИИ К ТРЕКАМ ====================
class TrackComment(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='track_comments',
        verbose_name='Пользователь'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='track_comments',
        verbose_name='Трек'
    )
    
    text = models.TextField(
        verbose_name='Текст комментария'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    likes = models.ManyToManyField(
        CustomUser,
        related_name='liked_track_comments',
        blank=True,
        verbose_name='Пользователи, поставившие лайк'
    )
    
    like_count = models.IntegerField(
        default=0,
        verbose_name='Количество лайков'
    )
    
    is_deleted = models.BooleanField(
        default=False,
        verbose_name='Удален'
    )
    
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name='Родительский комментарий'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Комментарий к треку'
        verbose_name_plural = 'Комментарии к трекам'
    
    def __str__(self):
        return f"{self.user.username} on {self.track.title}: {self.text[:50]}"
    
    def save(self, *args, **kwargs):
        if self.pk:
            self.like_count = self.likes.count()
        super().save(*args, **kwargs)
    
    def update_like_count(self):
        self.like_count = self.likes.count()
        self.save(update_fields=['like_count'])
    
    def toggle_like(self, user):
        if not user or not user.is_authenticated:
            return False, self.like_count
        
        if self.likes.filter(id=user.id).exists():
            self.likes.remove(user)
            liked = False
        else:
            self.likes.add(user)
            liked = True
        
        self.update_like_count()
        return liked, self.like_count
    
    def is_liked_by_user(self, user):
        if not user or not user.is_authenticated:
            return False
        return self.likes.filter(id=user.id).exists()

# ==================== ПЛЕЙЛИСТЫ ====================
class Playlist(models.Model):
    VISIBILITY_CHOICES = [
        ('public', '🌍 Публичный'),
        ('private', '🔒 Приватный'),
        ('unlisted', '🔗 Ссылочный'),
    ]
    
    title = models.CharField(
        max_length=255,
        verbose_name='Название плейлиста'
    )
    
    description = models.TextField(
        verbose_name='Описание',
        blank=True
    )
    
    cover = models.ImageField(
        upload_to=playlist_cover_path,
        verbose_name='Обложка',
        blank=True,
        null=True,
        storage=OverwriteStorage()
    )
    
    cover_url = models.URLField(
        verbose_name='Ссылка на обложку',
        blank=True,
        default=''
    )
    
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='playlists',
        verbose_name='Создатель'
    )
    
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='public',
        verbose_name='Видимость'
    )
    
    tracks = models.ManyToManyField(
        Track,
        through='PlaylistTrack',
        related_name='playlists',
        verbose_name='Треки'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    
    likes_count = models.IntegerField(
        default=0,
        verbose_name='Количество лайков'
    )
    
    play_count = models.IntegerField(
        default=0,
        verbose_name='Количество прослушиваний'
    )
    
    is_featured = models.BooleanField(
        default=False,
        verbose_name='Рекомендуемый'
    )
    
    is_collaborative = models.BooleanField(
        default=False,
        verbose_name='Коллаборативный'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Плейлист'
        verbose_name_plural = 'Плейлисты'
    
    def __str__(self):
        return self.title
    
    def get_cover_url(self):
        if self.cover:
            return self.cover.url
        elif self.cover_url:
            return self.cover_url
        return None

# ==================== ПЛЕЙЛИСТ-ТРЕК СВЯЗЬ ====================
class PlaylistTrack(models.Model):
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        verbose_name='Плейлист'
    )
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        verbose_name='Трек'
    )
    
    added_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата добавления'
    )
    
    added_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        verbose_name='Добавил'
    )
    
    position = models.IntegerField(
        default=0,
        verbose_name='Позиция'
    )
    
    class Meta:
        ordering = ['position', '-added_at']
        unique_together = ['playlist', 'track']
        verbose_name = 'Трек в плейлисте'
        verbose_name_plural = 'Треки в плейлистах'
    
    def __str__(self):
        return f"{self.track.title} in {self.playlist.title}"

# ==================== УВЕДОМЛЕНИЯ ====================
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('follow', 'Новая подписка'),
        ('like', 'Лайк'),
        ('repost', 'Репост'),
        ('comment', 'Комментарий'),
        ('mention', 'Упоминание'),
        ('new_track', 'Новый трек'),
        ('playlist_add', 'Добавление в плейлист'),
        ('system', 'Системное'),
        ('waveform_ready', 'Waveform готов'),
    ]
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Пользователь'
    )
    
    type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        verbose_name='Тип уведомления'
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name='Заголовок',
        blank=True
    )
    
    content = models.TextField(
        verbose_name='Содержание'
    )
    
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    
    related_user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications',
        verbose_name='Связанный пользователь'
    )
    
    related_track = models.ForeignKey(
        Track,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Связанный трек'
    )
    
    related_comment = models.ForeignKey(
        TrackComment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Связанный комментарий'
    )
    
    related_playlist = models.ForeignKey(
        Playlist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Связанный плейлист'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
    
    def __str__(self):
        return f"{self.user.username} - {self.type}"

# ==================== СООБЩЕНИЯ ====================
class Message(models.Model):
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name='Отправитель'
    )
    
    receiver = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='received_messages',
        verbose_name='Получатель'
    )
    
    content = models.TextField(
        verbose_name='Содержание'
    )
    
    sent_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время отправки'
    )
    
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время прочтения'
    )
    
    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'
    
    def __str__(self):
        return f"{self.sender.username} → {self.receiver.username}: {self.content[:50]}"

# ==================== АНАЛИТИКА ====================
class TrackAnalytics(models.Model):
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='analytics',
        verbose_name='Трек'
    )
    
    date = models.DateField(
        verbose_name='Дата'
    )
    
    plays = models.IntegerField(
        default=0,
        verbose_name='Прослушивания'
    )
    
    likes = models.IntegerField(
        default=0,
        verbose_name='Лайки'
    )
    
    reposts = models.IntegerField(
        default=0,
        verbose_name='Репосты'
    )
    
    comments = models.IntegerField(
        default=0,
        verbose_name='Комментарии'
    )
    
    downloads = models.IntegerField(
        default=0,
        verbose_name='Скачивания'
    )
    
    shares = models.IntegerField(
        default=0,
        verbose_name='Шаринги'
    )
    
    class Meta:
        unique_together = ['track', 'date']
        ordering = ['-date']
        verbose_name = 'Аналитика трека'
        verbose_name_plural = 'Аналитика треков'
    
    def __str__(self):
        return f"{self.track.title} - {self.date}"

# ==================== СИСТЕМНЫЕ ЛОГИ ====================
class SystemLog(models.Model):
    LOG_LEVELS = [
        ('debug', 'Debug'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    MODULES = [
        ('auth', 'Аутентификация'),
        ('upload', 'Загрузка'),
        ('waveform', 'Waveform генерация'),
        ('api', 'API'),
        ('moderation', 'Модерация'),
        ('payment', 'Платежи'),
        ('system', 'Система'),
    ]
    
    level = models.CharField(
        max_length=10,
        choices=LOG_LEVELS,
        verbose_name='Уровень'
    )
    
    module = models.CharField(
        max_length=20,
        choices=MODULES,
        verbose_name='Модуль'
    )
    
    message = models.TextField(
        verbose_name='Сообщение'
    )
    
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Детали'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время создания'
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP адрес'
    )
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Пользователь'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Системный лог'
        verbose_name_plural = 'Системные логи'
    
    def __str__(self):
        return f"[{self.level}] {self.module}: {self.message[:100]}"

# ==================== МОДЕЛИ ДЛЯ ГЕНЕРАЦИИ WAVEFORM ====================
class WaveformGenerationTask(models.Model):
    STATUS_CHOICES = [
        ('pending', '⏳ Ожидание'),
        ('processing', '⚙️ Обработка'),
        ('completed', '✅ Завершено'),
        ('failed', '❌ Ошибка'),
        ('cancelled', '🚫 Отменено'),
    ]
    
    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name='waveform_tasks',
        verbose_name='Трек'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Статус'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время создания'
    )
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время начала'
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время завершения'
    )
    
    error_message = models.TextField(
        blank=True,
        verbose_name='Сообщение об ошибке'
    )
    
    attempt_count = models.IntegerField(
        default=0,
        verbose_name='Количество попыток'
    )
    
    points_generated = models.IntegerField(
        default=0,
        verbose_name='Сгенерировано точек'
    )
    
    processing_time = models.FloatField(
        default=0,
        verbose_name='Время обработки (сек)'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Задача генерации waveform'
        verbose_name_plural = 'Задачи генерации waveform'
    
    def __str__(self):
        return f"Waveform task for {self.track.title} - {self.status}"
    
    def start_processing(self):
        self.status = 'processing'
        self.started_at = timezone.now()
        self.attempt_count += 1
        self.save(update_fields=['status', 'started_at', 'attempt_count'])
    
    def complete(self, points_count=0, processing_time=0):
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.points_generated = points_count
        self.processing_time = processing_time
        self.save(update_fields=[
            'status', 'completed_at', 'points_generated', 'processing_time'
        ])
    
    def fail(self, error_message):
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.save(update_fields=['status', 'completed_at', 'error_message'])

# ==================== СИГНАЛЫ ====================
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=CustomUser)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'user_profile'):
        instance.user_profile.save()

@receiver(post_save, sender=Track)
def track_post_save(sender, instance, created, **kwargs):
    if created:
        instance.uploaded_by.update_stats()

@receiver(post_save, sender=TrackLike)
def tracklike_post_save(sender, instance, created, **kwargs):
    if created:
        instance.track.like_count = TrackLike.objects.filter(track=instance.track).count()
        instance.track.save(update_fields=['like_count'])

@receiver(post_delete, sender=TrackLike)
def tracklike_post_delete(sender, instance, **kwargs):
    instance.track.like_count = TrackLike.objects.filter(track=instance.track).count()
    instance.track.save(update_fields=['like_count'])

@receiver(post_save, sender=Comment)
def comment_post_save(sender, instance, created, **kwargs):
    if created:
        instance.track.comment_count = Comment.objects.filter(track=instance.track).count()
        instance.track.save(update_fields=['comment_count'])

@receiver(post_delete, sender=Comment)
def comment_post_delete(sender, instance, **kwargs):
    instance.track.comment_count = Comment.objects.filter(track=instance.track).count()
    instance.track.save(update_fields=['comment_count'])