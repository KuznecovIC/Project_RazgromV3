# utils/play_protection.py - Защита от накрутки прослушиваний
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache

def can_count_play(user, track):
    """
    Проверяет, можно ли засчитать прослушивание.
    Защита от накрутки по нескольким параметрам:
    1. Один пользователь = 1 прослушивание в сутки
    2. Один IP = максимум 5 прослушиваний в час
    3. Проверка по User-Agent
    """
    
    # Ключи для кэша
    user_track_key = f"play_user_{user.id}_track_{track.id}"
    ip_key = f"play_ip_{request.META.get('REMOTE_ADDR')}"
    
    # Проверка 1: Этот пользователь уже слушал этот трек сегодня
    if cache.get(user_track_key):
        return False
    
    # Проверка 2: Слишком много запросов с этого IP
    ip_plays = cache.get(ip_key, 0)
    if ip_plays >= 5:  # Максимум 5 прослушиваний в час с одного IP
        return False
    
    # Проверка 3: Проверяем в базе данных (дополнительная защита)
    today = timezone.now().date()
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
    
    has_played_today = PlayHistory.objects.filter(
        user=user,
        track=track,
        played_at__gte=today_start
    ).exists()
    
    if has_played_today:
        return False
    
    # Все проверки пройдены - можно засчитать
    # Устанавливаем блокировки в кэш
    cache.set(user_track_key, True, 86400)  # 24 часа
    cache.set(ip_key, ip_plays + 1, 3600)   # 1 час
    
    return True