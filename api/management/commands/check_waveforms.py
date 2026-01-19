# api/management/commands/check_waveforms.py
from django.core.management.base import BaseCommand
from api.models import Track
from django.utils import timezone

class Command(BaseCommand):
    help = 'Проверка статуса генерации waveforms'
    
    def handle(self, *args, **options):
        self.stdout.write("🔍 ПРОВЕРКА СТАТУСА WAVEFORMS")
        self.stdout.write("="*60)
        
        tracks = Track.objects.all().order_by('-created_at')
        
        for track in tracks:
            status_icon = "✅" if track.waveform_generated else "❌"
            waveform_info = f"{len(track.waveform_data) if track.waveform_data else 0} точек"
            
            if track.waveform_generated_at:
                time_ago = timezone.now() - track.waveform_generated_at
                time_str = f"{time_ago.total_seconds() / 60:.1f} мин назад"
            else:
                time_str = "не генерировался"
            
            self.stdout.write(
                f"{status_icon} Трек {track.id}: {track.title[:30]}... "
                f"[{track.status}] "
                f"Waveform: {waveform_info} "
                f"({time_str})"
            )
        
        self.stdout.write("\n📊 СТАТИСТИКА:")
        self.stdout.write(f"Всего треков: {tracks.count()}")
        self.stdout.write(f"С waveform: {tracks.filter(waveform_generated=True).count()}")
        self.stdout.write(f"Без waveform: {tracks.filter(waveform_generated=False).count()}")
        self.stdout.write(f"Опубликовано: {tracks.filter(status='published').count()}")