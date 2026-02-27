from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    # --------------------  REST‑router  --------------------
    path('', include(router.urls)),

    # --------------------  АУТЕНТИФИКАЦИЯ  --------------------
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('password-reset/request/', views.password_reset_request, name='password_reset_request'),
    path('password-reset/verify/', views.password_reset_verify, name='password_reset_verify'),
    path('password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),

    # --------------------  ПОЛЬЗОВАТЕЛИ И ПРОФИЛИ  --------------------
    path('users/me/', views.get_user_me, name='user-me'),
    path('users/me/profile/', views.get_user_profile, name='profile'),
    path('current-user/', views.current_user, name='current-user'),
    path('users/<int:user_id>/', views.get_user_public_profile, name='user-profile'),
    path('users/by-username/<str:username>/', views.get_user_by_username, name='user-by-username'),

    # --------------------  СИСТЕМА ПОДПИСОК --------------------
    path('users/<int:user_id>/follow/', views.follow_unfollow_user, name='follow-unfollow-user'),
    path('users/<int:user_id>/check-follow/', views.check_follow_status, name='check-follow-status'),
    path('users/<int:user_id>/followers/', views.get_user_followers, name='user-followers'),
    path('users/<int:user_id>/following/', views.get_user_following, name='user-following'),
    path('follow/suggestions/', views.get_follow_suggestions, name='follow-suggestions'),

    # --------------------  АВАТАР И ШАПКА ПРОФИЛЯ --------------------
    path('users/me/avatar/', views.get_avatar, name='get-avatar'),
    path('users/me/avatar/upload/', views.upload_avatar, name='upload-avatar'),
    path('users/me/avatar/remove/', views.remove_avatar, name='remove-avatar'),
    path('users/me/header/', views.upload_header, name='upload-header'),
    path('users/me/header-info/', views.get_header_info, name='header-info'),
    path('users/me/header/delete/', views.remove_header_image, name='delete-header'),
    path('users/me/gridscan-color/', views.update_gridscan_color, name='update-gridscan-color'),

    # --------------------  ТРЕКИ ПОЛЬЗОВАТЕЛЯ --------------------
    path('users/<int:user_id>/tracks/', views.get_user_tracks, name='user-tracks'),
    path('users/<int:user_id>/stats/', views.get_user_stats, name='user-stats'),
    path('users/<int:user_id>/reposts/', views.get_user_reposts, name='user-reposts'),
    path('users/<int:user_id>/liked-tracks/', views.get_user_liked_tracks_public, name='user-liked-tracks'),
    path('users/<int:user_id>/likes/users/', views.get_user_likes_users, name='user-likes-users'),
    path('users/<int:user_id>/reposts/users/', views.get_user_reposts_users, name='user-reposts-users'),
    path('users/<int:user_id>/comments/users/', views.get_user_comments_users, name='user-comments-users'),

    # --------------------  ТРЕКИ (ОБЩИЕ) --------------------
    path('tracks/', views.get_tracks, name='tracks'),
    path('my-tracks/', views.get_uploaded_tracks_jwt, name='get_uploaded_tracks_jwt'),
    path('feed/', views.get_feed, name='feed'),
    path('track/<int:track_id>/', views.get_track_info, name='track_info'),

    # ----------  ЗАГРУЗКА И РЕДАКТИРОВАНИЕ ТРЕКОВ ----------
    path('upload-track/', views.upload_track, name='upload_track'),
    path('track/<int:track_id>/publish/', views.publish_track, name='publish_track'),
    path('track/<int:track_id>/update-duration/', views.update_track_duration, name='update_track_duration'),
    path('track/<int:track_id>/generate-waveform/', views.generate_track_waveform, name='generate_track_waveform'),

    # ----------  WAVEFORM ----------
    path('track/<int:track_id>/waveform/', views.get_waveform, name='get_waveform'),

    # ----------  ПРОСЛУШИВАНИЯ ----------
    path('track/<int:track_id>/record-play/', views.record_play, name='record_play'),
    path('recently-played/', views.recently_played_tracks, name='recently_played_tracks'),
    path('tracks/history/', views.tracks_history, name='tracks_history'),

    # --------------------  ЛАЙКИ ТРЕКОВ --------------------
    path('like/toggle/', views.toggle_like, name='toggle_like'),
    path('track/<int:track_id>/toggle-like/', views.toggle_like, name='toggle_like_by_id'),
    path('track/<int:track_id>/check-like/', views.check_track_like, name='check_track_like'),
    path('track/<int:track_id>/likes/users/', views.track_likes_users, name='track_likes_users'),
    path('track/<int:track_id>/reposts/users/', views.track_reposts_users, name='track_reposts_users'),
    path('liked-tracks/', views.get_liked_tracks, name='get_liked_tracks'),
    path('liked-track-ids/', views.get_user_liked_track_ids, name='get_user_liked_track_ids'),
    path('track/<int:track_id>/sync-likes/', views.sync_track_likes, name='sync_track_likes'),

    # --------------------  КОММЕНТАРИИ К ТРЕКАМ --------------------
    path('track/<int:track_id>/comments/', views.get_track_comments, name='get_track_comments'),
    path('track/<int:track_id>/add-comment/', views.add_track_comment, name='add_track_comment'),

    # --------------------  ЛАЙКИ КОММЕНТАРИЕВ --------------------
    path('comments/<int:comment_id>/like/', views.like_comment, name='like_comment'),
    path('comments/<int:comment_id>/delete/', views.delete_comment, name='delete_comment'),

    # --------------------  ХЭШТЕГИ --------------------
    path('hashtags/trending/', views.get_trending_hashtags, name='get_trending_hashtags'),
    path('hashtag/<str:hashtag>/', views.search_by_hashtag, name='search_by_hashtag'),

    # --------------------  РЕПОСТЫ --------------------
    path('repost/', views.repost_track, name='repost_track'),

    # --------------------  СИСТЕМА И ОТЛАДКА --------------------
    path('health/', views.health_check, name='health_check'),
    path('turnstile/verify/', views.verify_turnstile_endpoint, name='verify_turnstile'),
    path('debug/like/', views.debug_like, name='debug_like'),
    path('debug/all-likes/', views.debug_all_likes, name='debug_all_likes'),
    path('debug/track-data/', views.debug_track_data, name='debug_track_data'),
    path('users/<int:user_id>/follow-stats/', views.user_follow_stats, name='user-follow-stats'),
    path('track/<int:track_id>/check-repost/', views.check_track_repost, name='check_track_repost'),

    # --------------------  PLAYLISTS --------------------
    path('tracks/search/', views.search_tracks, name='tracks-search'),
    path('playlists/create/', views.create_playlist, name='playlist-create'),
    path('playlists/<int:playlist_id>/', views.playlist_detail, name='playlist-detail'),
    path('playlists/<int:playlist_id>/update/', views.update_playlist, name='playlist-update'),
    path('users/<int:user_id>/playlists/', views.get_user_playlists, name='user-playlists'),
    path('search/', views.search_hub, name='search-hub'),
    path('playlists/<int:playlist_id>/delete/', views.delete_playlist, name='playlist-delete'),
    
    # ========== НОВЫЕ МАРШРУТЫ ДЛЯ ЛАЙКОВ И РЕПОСТОВ ПЛЕЙЛИСТОВ ==========
    path('playlists/<int:playlist_id>/toggle-like/', views.toggle_playlist_like, name='toggle_playlist_like'),
    path('playlists/<int:playlist_id>/like/status/', views.get_playlist_like_status, name='playlist_like_status'),
    path('playlists/<int:playlist_id>/likes/users/', views.get_playlist_likes_users, name='playlist_likes_users'),
    
    path('playlists/<int:playlist_id>/toggle-repost/', views.toggle_playlist_repost, name='toggle_playlist_repost'),
    path('playlists/<int:playlist_id>/repost/status/', views.get_playlist_repost_status, name='playlist_repost_status'),
    path('playlists/<int:playlist_id>/reposts/users/', views.get_playlist_reposts_users, name='playlist_reposts_users'),
    path('users/<int:user_id>/liked-playlists/', views.get_user_liked_playlists, name='user-liked-playlists'),
    path('users/<int:user_id>/reposted-playlists/', views.get_user_reposted_playlists, name='user-reposted-playlists'),
    path('feed/playlists/', views.get_feed_playlists, name='feed_playlists'),
    path('tracks/<int:track_id>/playlists/', views.get_track_playlists, name='track_playlists'),
    
    # --------------------  NOW PLAYING / ACTIVITY  --------------------
    path('me/now-playing/', views.set_now_playing, name='set_now_playing'),
    path('users/<int:user_id>/now-playing/', views.get_user_now_playing, name='get_user_now_playing'),
    
    # --------------------  ДИАЛОГИ И СООБЩЕНИЯ --------------------
    path('dialogs/', views.list_dialogs, name='list_dialogs'),
    path('dialogs/start/', views.start_dialog, name='start_dialog'),
    path('dialogs/<int:conversation_id>/messages/', views.list_messages, name='list_messages'),
    path('dialogs/<int:conversation_id>/messages/send/', views.send_message, name='send_message'),
    path('dialogs/<int:conversation_id>/hide/', views.hide_dialog, name='hide_dialog'),
    path('dialogs/<int:conversation_id>/unhide/', views.unhide_dialog, name='unhide_dialog'),
    path('dialogs/hidden/', views.list_hidden_dialogs, name='list_hidden_dialogs'),
    path('dialogs/<int:conversation_id>/info/', views.get_dialog_info, name='get_dialog_info'),
    path('dialogs/<int:conversation_id>/read/', views.mark_dialog_read, name='mark_dialog_read'),
    path('dialogs/<int:conversation_id>/', views.delete_dialog, name='delete_dialog'),
    
    # --------------------  ПРИСУТСТВИЕ --------------------
    path('presence/ping/', views.presence_ping, name='presence_ping'),
    path('users/<int:user_id>/presence/', views.get_user_presence, name='get_user_presence'),
    
    # --------------------  РЕАКЦИИ НА СООБЩЕНИЯ --------------------
    path('messages/<int:message_id>/react/', views.toggle_message_reaction, name='toggle_message_reaction'),
    path('messages/<int:message_id>/delete/', views.delete_message, name='delete_message'),
    
    # --------------------  СТАТИСТИКА --------------------
    path('users/<int:user_id>/stats/history/', views.get_user_stats_history, name='user-stats-history'),
    
    # --------------------  АДМИН: УПРАВЛЕНИЕ КОНТЕНТОМ --------------------
    path('admin/tracks/', views.admin_list_users_tracks, name='admin_list_users_tracks'),
    path('admin/tracks/<int:track_id>/delete/', views.admin_delete_track, name='admin_delete_track'),
    path('admin/playlists/', views.admin_list_users_playlists, name='admin_list_users_playlists'),
    path('admin/playlists/<int:playlist_id>/delete/', views.admin_delete_playlist, name='admin_delete_playlist'),
    path('admin/users/', views.admin_list_users, name='admin_list_users'),
    path('admin/users/<int:user_id>/ban/', views.admin_ban_user, name='admin_ban_user'),
    path('admin/users/<int:user_id>/unban/', views.admin_unban_user, name='admin_unban_user'),

    # --------------------  АПЕЛЛЯЦИИ НА БАН (BanAppeal) --------------------
    path('appeals/ban/', views.create_ban_appeal, name='create_ban_appeal'),
    path('appeals/create/', views.create_ban_appeal, name='create_ban_appeal'),
    path('admin/appeals/', views.admin_list_appeals, name='admin_list_appeals'),
    # ✅ МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ АПЕЛЛЯЦИЯМИ (BanAppeal)
    path('admin/appeals/<int:appeal_id>/reject/', views.admin_reject_appeal, name='admin_reject_appeal'),
    path('admin/appeals/<int:appeal_id>/unban/', views.admin_unban_appeal, name='admin_unban_appeal'),
    path('admin/appeals/<int:appeal_id>/delete/', views.admin_delete_appeal, name='admin_delete_appeal'),
    # 🔥 НОВЫЙ МАРШРУТ ДЛЯ AI-АНАЛИЗА АПЕЛЛЯЦИИ
    path('admin/appeals/<int:appeal_id>/ai/', views.admin_ai_appeal, name='admin_ai_appeal'),
    
    # --------------------  РЕПОРТЫ --------------------
    path('reports/create/', views.create_user_report),
    path('admin/reports/', views.get_all_reports),
    path('admin/reports/<int:report_id>/reject/', views.admin_reject_report),
    path('admin/reports/<int:report_id>/ban/', views.admin_ban_reported_user_from_report),
    path('admin/reports/<int:report_id>/delete/', views.admin_delete_report),

    # --------------------  УДАЛЕНИЕ ТРЕКА --------------------
    path('track/<int:track_id>/delete/', views.delete_my_track, name='delete_my_track'),

    # --------------------  ЛИЧНЫЙ КАБИНЕТ (SETTINGS) --------------------
    path('settings/overview/', views.settings_overview, name='settings_overview'),
    path('settings/change-password/', views.change_password, name='change_password'),
    path('settings/status/', views.update_status_text, name='update_status_text'),
    path('settings/presence-mode/', views.update_presence_mode, name='update_presence_mode'),

    # --------------------  НОВАЯ СИСТЕМА UserReport --------------------
    path('admin/reports/', views.admin_list_reports, name='admin_list_reports'),
    path('admin/reports/<int:report_id>/', views.admin_update_report, name='admin_update_report'),
    path('recommendations/made-for-you/', views.made_for_you_ai, name='made_for_you_ai'),
    path('recommendations/playlists-for-you/', views.playlists_for_you_ai, name='playlists_for_you_ai'),
    path('recommendations/following-tracks/', views.following_recommended_tracks, name='following_recommended_tracks'),
    path('admin/reports/<int:report_id>/ai/', views.admin_ai_report, name='admin_ai_report'),
]

# --------------------  ДОПОЛНИТЕЛЬНЫЕ ПЛЕЙЛИСТ РОУТЫ (НОВЫЕ) --------------------
urlpatterns += [
    path('playlists/create/', views.create_playlist, name='playlists-create'),
    path('playlists/<int:playlist_id>/update/', views.update_playlist, name='playlists-update'),
    path('playlists/<int:playlist_id>/', views.playlist_detail, name='playlists-detail'),
    path('playlists/<int:playlist_id>/save/', views.save_playlist_copy, name='playlists-save-copy'),
]

# --------------------  СТАРЫЕ ПУТИ (для обратной совместимости) --------------------
urlpatterns += [
    path('like/comment/<int:comment_id>/', views.like_comment, name='like_comment_old'),
    path('comment/<int:comment_id>/delete/', views.delete_comment, name='delete_comment_old'),
]

# --------------------  СТАТИЧЕСКИЕ и медиа‑файлы --------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)