# urls.py - ПОЛНЫЙ ИСПРАВЛЕННЫЙ ФАЙЛ

from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    
    # 🔥 АУТЕНТИФИКАЦИЯ
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('password-reset/request/', views.password_reset_request, name='password_reset_request'),
    path('password-reset/verify/', views.password_reset_verify, name='password_reset_verify'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    
    # 🔥 ПОЛЬЗОВАТЕЛИ И ПРОФИЛИ
    path('users/me/', views.get_user_me, name='user-me'),  # Текущий пользователь (JWT)
    path('users/me/profile/', views.get_user_profile, name='profile'),  # Полный профиль
    path('current-user/', views.current_user, name='current-user'),  # Альтернативный путь
    
    path('users/<int:user_id>/', views.get_user_public_profile, name='user-profile'),  # Публичный профиль по ID
    path('users/by-username/<str:username>/', views.get_user_by_username, name='user-by-username'),  # По username
    
    # 🔥 СИСТЕМА ПОДПИСОК - ОСНОВНЫЕ ЭНДПОИНТЫ
    path('users/<int:user_id>/follow/', views.follow_unfollow_user, name='follow-unfollow-user'),  # Единый эндпоинт (POST/DELETE)
    path('users/<int:user_id>/check-follow/', views.check_follow_status, name='check-follow-status'),  # Проверка статуса
    
    path('users/<int:user_id>/followers/', views.get_user_followers, name='user-followers'),  # Подписчики пользователя
    path('users/<int:user_id>/following/', views.get_user_following, name='user-following'),  # Подписки пользователя
    
    path('follow/suggestions/', views.get_follow_suggestions, name='follow-suggestions'),  # Рекомендации
    
    # 🔥 АВАТАР И ШАПКА ПРОФИЛЯ
    path('users/me/avatar/', views.get_avatar, name='get-avatar'),
    path('users/me/avatar/upload/', views.upload_avatar, name='upload-avatar'),
    path('users/me/avatar/remove/', views.remove_avatar, name='remove-avatar'),
    
    path('users/me/header/', views.upload_header, name='upload-header'),
    path('users/me/header-info/', views.get_header_info, name='header-info'),
    path('users/me/header/delete/', views.remove_header_image, name='delete-header'),
    path('users/me/gridscan-color/', views.update_gridscan_color, name='update-gridscan-color'),
    
    # 🔥 ТРЕКИ ПОЛЬЗОВАТЕЛЯ
    path('users/<int:user_id>/tracks/', views.get_user_tracks, name='user-tracks'),  # Треки пользователя
    path('users/<int:user_id>/stats/', views.get_user_stats, name='user-stats'),  # Статистика пользователя
    
    # 🔥 ТРЕКИ (ОБЩИЕ)
    path('tracks/', views.get_tracks, name='tracks'),  # Все треки
    path('my-tracks/', views.get_uploaded_tracks_jwt, name='get_uploaded_tracks_jwt'),  # Мои загруженные треки
    
    path('track/<int:track_id>/', views.get_track_info, name='track_info'),  # Информация о треке
    
    # 🔥 ЗАГРУЗКА И РЕДАКТИРОВАНИЕ ТРЕКОВ
    path('upload-track/', views.upload_track, name='upload_track'),
    path('track/<int:track_id>/publish/', views.publish_track, name='publish_track'),
    path('track/<int:track_id>/update-duration/', views.update_track_duration, name='update_track_duration'),
    path('track/<int:track_id>/generate-waveform/', views.generate_track_waveform, name='generate_track_waveform'),
    
    # 🔥 WAVEFORM
    path('track/<int:track_id>/waveform/', views.get_waveform, name='get_waveform'),
    
    # 🔥 ПРОСЛУШИВАНИЯ
    path('track/<int:track_id>/record-play/', views.record_play, name='record_play'),
    path('recently-played/', views.recently_played_tracks, name='recently_played_tracks'),
    
    # 🔥 ЛАЙКИ ТРЕКОВ
    path('like/toggle/', views.toggle_like, name='toggle_like'),  # Переключение лайка
    path('track/<int:track_id>/check-like/', views.check_track_like, name='check_track_like'),  # Проверка лайка
    
    path('liked-tracks/', views.get_liked_tracks, name='get_liked_tracks'),  # Понравившиеся треки
    path('liked-track-ids/', views.get_user_liked_track_ids, name='get_user_liked_track_ids'),  # ID лайкнутых треков
    path('track/<int:track_id>/sync-likes/', views.sync_track_likes, name='sync_track_likes'),  # Синхронизация лайков
    
    # 🔥 КОММЕНТАРИИ К ТРЕКАМ
    path('track/<int:track_id>/comments/', views.get_track_comments, name='get_track_comments'),  # Получение комментариев
    path('track/<int:track_id>/add-comment/', views.add_track_comment, name='add_track_comment'),  # Добавление комментария
    
    # 🔥 ЛАЙКИ КОММЕНТАРИЕВ (НОВЫЕ ПУТИ)
    path('comments/<int:comment_id>/like/', views.like_comment, name='like_comment'),
    path('comments/<int:comment_id>/delete/', views.delete_comment, name='delete_comment'),
    
    # 🔥 ХЕШТЕГИ
    path('hashtags/trending/', views.get_trending_hashtags, name='get_trending_hashtags'),
    path('hashtag/<str:hashtag>/', views.search_by_hashtag, name='search_by_hashtag'),
    
    # 🔥 РЕПОСТЫ
    path('repost/', views.repost_track, name='repost_track'),
    
    # 🔥 СИСТЕМА И ОТЛАДКА
    path('health/', views.health_check, name='health_check'),
    path('turnstile/verify/', views.verify_turnstile_endpoint, name='verify_turnstile'),
    
    # 🔥 ОТЛАДОЧНЫЕ ЭНДПОИНТЫ (только для разработки)
    path('debug/like/', views.debug_like, name='debug_like'),
    path('debug/all-likes/', views.debug_all_likes, name='debug_all_likes'),
    path('debug/track-data/', views.debug_track_data, name='debug_track_data'),
    path('users/<int:user_id>/follow-stats/', views.user_follow_stats, name='user-follow-stats'),
]

# 📌 СТАРЫЕ ПУТИ (для обратной совместимости - можно удалить через месяц)
urlpatterns += [
    # Старые пути лайков комментариев
    path('like/comment/<int:comment_id>/', views.like_comment, name='like_comment_old'),
    
    # Старые пути удаления комментариев
    path('comment/<int:comment_id>/delete/', views.delete_comment, name='delete_comment_old'),
]

# ⚠️ УДАЛЕННЫЕ ПУТИ (не должно быть в коде):
# path('follow/', views.follow_user, name='follow_user'),  # ⛔ УДАЛИТЬ - заменен на единый эндпоинт
# path('unfollow/', views.unfollow_user, name='unfollow_user'),  # ⛔ УДАЛИТЬ - заменен на единый эндпоинт

# 🔧 МЕДИА ФАЙЛЫ (только в режиме разработки)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)