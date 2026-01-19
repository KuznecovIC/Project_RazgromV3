# api/apps.py
from django.apps import AppConfig
import threading

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """
        Запускается при готовности приложения
        """
        # Только в основном процессе, не в миграциях и т.д.
        import os
        if os.environ.get('RUN_MAIN') or not os.environ.get('DJANGO_SETTINGS_MODULE'):
            print("🚀 Инициализация приложения API...")
            
            # Фоновая проверка вейвформ при старте
            def startup_waveform_check():
                try:
                    # Ждем немного чтобы БД была готова
                    import time
                    time.sleep(2)
                    
                    print("🔍 Стартовая проверка вейвформ...")
                    
                    from api.models import Track
                    from django.db.models import Q
                    
                    # Проверяем базовые треки 1-3
                    for track_id in [1, 2, 3]:
                        try:
                            track, created = Track.objects.get_or_create(
                                id=track_id,
                                defaults={
                                    'title': f'Трек {track_id}',
                                    'artist': 'Артист',
                                    'audio_url': f'/tracks/track{track_id}.mp3',
                                    'duration': '3:00'
                                }
                            )
                            
                            # Если трек без вейвформы, генерируем
                            if not track.waveform_generated or not track.waveform_data:
                                from api.views import ensure_waveform_for_track
                                ensure_waveform_for_track(track)
                                print(f"✅ Стартовая генерация для трека {track_id}")
                                
                        except Exception as e:
                            print(f"⚠️ Ошибка стартовой проверки трека {track_id}: {e}")
                    
                    print("✅ Стартовая проверка вейвформ завершена")
                    
                except Exception as e:
                    print(f"❌ Ошибка стартовой проверки: {e}")
            
            # Запускаем в фоне
            thread = threading.Thread(target=startup_waveform_check)
            thread.daemon = True