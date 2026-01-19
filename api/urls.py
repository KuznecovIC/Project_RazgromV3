# api/urls.py
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    # ==================== АУТЕНТИФИКАЦИЯ ====================
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/verify-turnstile/', views.verify_turnstile_endpoint, name='verify_turnstile'),
    
    # ==================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ====================
    path('auth/password-reset/request/', views.password_reset_request, name='password_reset_request'),
    path('auth/password-reset/verify/', views.password_reset_verify, name='password_reset_verify'),
    path('auth/password-reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    
    # ==================== ПОЛЬЗОВАТЕЛИ ====================
    path('user/profile/', views.get_user_profile, name='user_profile'),
    
    # ==================== ТРЕКИ ====================
    path('tracks/', views.get_tracks, name='get_tracks'),
    path('tracks/<int:track_id>/', views.get_track_info, name='track_info'),
    path('tracks/like/', views.toggle_like, name='toggle_like'),
    path('tracks/liked/', views.get_liked_tracks, name='liked_tracks'),
    path('tracks/recently-played/', views.recently_played_tracks, name='recently_played_tracks'),
    path('tracks/<int:track_id>/check-like/', views.check_track_like, name='check_track_like'),
    path('tracks/uploaded/', views.get_uploaded_tracks, name='uploaded_tracks'),
    path('tracks/uploaded-jwt/', views.get_uploaded_tracks_jwt, name='uploaded_tracks_jwt'),
    
    # ==================== КОММЕНТАРИИ ====================
    path('tracks/<int:track_id>/comments/', views.get_track_comments, name='get_comments'),
    path('tracks/<int:track_id>/comments/add/', views.add_track_comment, name='add_comment'),
    path('comments/<int:comment_id>/like/', views.like_comment, name='like_comment'),
    path('comments/<int:comment_id>/delete/', views.delete_comment, name='delete_comment'),
    
    # ==================== ОСТАЛЬНЫЕ СИСТЕМЫ ====================
    path('follow/', views.follow_user, name='follow'),
    path('unfollow/', views.unfollow_user, name='unfollow'),
    path('user/<int:user_id>/followers/', views.get_user_followers, name='get_followers'),
    path('user/<int:user_id>/following/', views.get_user_following, name='get_following'),
    path('tracks/<int:track_id>/repost/', views.repost_track, name='repost_track'),
    path('tracks/<int:track_id>/play/', views.record_play, name='record_play'),
    path('tracks/upload/', views.upload_track, name='upload_track'),
    path('tracks/<int:track_id>/publish/', views.publish_track, name='publish_track'),
    
    # ==================== ХЕШТЕГИ ====================
    path('hashtags/trending/', views.get_trending_hashtags, name='trending_hashtags'),
    path('hashtags/<str:hashtag>/', views.search_by_hashtag, name='hashtag_search'),
    
    # ==================== ВЕЙВФОРМЫ ====================
    path('tracks/<int:track_id>/waveform/', views.get_track_waveform, name='get_waveform'),
    
    # ==================== ЛАЙКИ (ДОПОЛНИТЕЛЬНЫЕ) ====================
    path('user/liked-track-ids/', views.get_user_liked_track_ids, name='liked_track_ids'),
    path('tracks/<int:track_id>/sync-likes/', views.sync_track_likes, name='sync_track_likes'),
    
    # ==================== СИСТЕМНЫЕ И ОТЛАДОЧНЫЕ ====================
    path('health/', views.health_check, name='health_check'),
    path('debug/like/', views.debug_like, name='debug_like'),
    path('debug/all-likes/', views.debug_all_likes, name='debug_all_likes'),
    path('debug/track-data/', views.debug_track_data, name='debug_track_data'),
]
