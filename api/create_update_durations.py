# create_update_durations.py
import os
import django
import sys

# Добавьте путь к вашему проекту
sys.path.append('/path/to/your/project')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')
django.setup()

from api.models import Track
from api.audio_utils import determine_duration_from_file, format_duration
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_all_durations():
    tracks = Track.objects.all()
    logger.info(f"Найдено треков для обновления: {tracks.count()}")
    
    for track in tracks:
        try:
            if track.audio_file and os.path.exists(track.audio_file.path):
                audio_path = track.audio_file.path
                
                # Определяем длительность
                duration_sec = determine_duration_from_file(audio_path)
                
                # Обновляем
                track.duration = format_duration(duration_sec)
                
                if hasattr(track, 'duration_seconds'):
                    track.duration_seconds = int(duration_sec)
                
                track.save()
                
                logger.info(f"✅ Обновлен трек {track.id}: {track.title} -> {track.duration}")
            else:
                logger.warning(f"Трек {track.id} ({track.title}) не имеет аудио файла")
                
        except Exception as e:
            logger.error(f"❌ Ошибка обновления трека {track.id}: {e}")

if __name__ == "__main__":
    update_all_durations()