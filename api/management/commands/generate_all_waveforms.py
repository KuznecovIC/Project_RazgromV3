# api/management/commands/generate_all_waveforms.py
from django.core.management.base import BaseCommand
from api.models import Track
from api.views import ensure_waveform_for_track
from django.db.models import Q
import time

class Command(BaseCommand):
    help = 'Генерация всех вейвформ с автоматическим созданием треков'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перегенерировать даже если уже есть'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Пропустить треки с существующими вейвформами'
        )
    
    def handle(self, *args, **options):
        self.stdout.write("🚀 Запуск генерации всех waveforms...")
        
        start_time = time.time()
        
        # Сначала создаем базовые треки если их нет
        self.create_basic_tracks()
        
        # Определяем какие треки обрабатывать
        if options['force']:
            tracks = Track.objects.all()
            self.stdout.write("🔄 Режим: перегенерация ВСЕХ треков")
        elif options['skip_existing']:
            tracks = Track.objects.filter(
                Q(waveform_generated=False) | 
                Q(waveform_data__len=0)
            )
            self.stdout.write("⏭️ Режим: только треки без вейвформ")
        else:
            tracks = Track.objects.all()
            self.stdout.write("📊 Режим: проверка и генерация при необходимости")
        
        total = tracks.count()
        self.stdout.write(f"📊 Найдено {total} треков для обработки")
        
        generated = 0
        skipped = 0
        errors = 0
        
        for i, track in enumerate(tracks, 1):
            try:
                self.stdout.write(f"\n[{i}/{total}] Трек {track.id}: {track.title}")
                
                # Проверяем нужно ли генерировать
                if track.waveform_generated and track.waveform_data and not options['force']:
                    self.stdout.write("   ⏭️  Пропущен (уже есть)")
                    skipped += 1
                    continue
                
                # Проверяем наличие аудио
                has_audio = False
                if track.audio_file and track.audio_file.path:
                    import os
                    has_audio = os.path.exists(track.audio_file.path)
                elif track.audio_url:
                    # Проверяем локальный файл по URL
                    import os
                    if track.audio_url.startswith('/tracks/'):
                        local_path = f"frontend/public{track.audio_url}"
                        has_audio = os.path.exists(local_path)
                
                if not has_audio:
                    self.stdout.write(self.style.WARNING("   ⚠️  Аудиофайл не найден"))
                
                # Генерируем вейвформу
                waveform_data = ensure_waveform_for_track(track)
                
                if waveform_data:
                    generated += 1
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Сгенерировано"))
                    self.stdout.write(f"      📊 Палочек: {len(waveform_data)}")
                    self.stdout.write(f"      📊 Диапазон: {min(waveform_data)}-{max(waveform_data)}")
                else:
                    errors += 1
                    self.stdout.write(self.style.ERROR("   ❌ Ошибка генерации"))
                
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f"   ❌ Исключение: {e}"))
        
        elapsed = time.time() - start_time
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА!"))
        self.stdout.write(f"⏱️  Время: {elapsed:.2f} секунд")
        self.stdout.write(f"📊 Всего треков: {total}")
        self.stdout.write(f"✅ Сгенерировано: {generated}")
        self.stdout.write(f"⏭️  Пропущено: {skipped}")
        self.stdout.write(f"❌ Ошибок: {errors}")
        self.stdout.write("="*60)
        
        if errors > 0:
            self.stdout.write(self.style.WARNING("\n⚠️  Были ошибки. Проверьте логи."))
        
        self.stdout.write(self.style.SUCCESS("\n✅ Готово! Waveforms доступны по API: /api/tracks/<id>/waveform/"))
    
    def create_basic_tracks(self):
        """Создает базовые треки если их нет"""
        from api.models import CustomUser
        
        user = CustomUser.objects.first()
        if not user:
            self.stdout.write(self.style.WARNING("⚠️  Нет пользователей, создаем демо..."))
            user = CustomUser.objects.create_user(
                email='waveform@example.com',
                username='waveform_bot',
                password='temp123'
            )
        
        basic_tracks = [
            {
                'id': 1,
                'title': 'hard drive (slowed & muffled)',
                'artist': 'griffinilla',
                'audio_url': '/tracks/track1.mp3',
                'duration': '3:20'
            },
            {
                'id': 2,
                'title': 'Deutschland',
                'artist': 'Rammstein',
                'audio_url': '/tracks/track2.mp3',
                'duration': '5:22'
            },
            {
                'id': 3,
                'title': 'Sonne',
                'artist': 'Rammstein',
                'audio_url': '/tracks/track3.mp3',
                'duration': '4:05'
            }
        ]
        
        created_count = 0
        for data in basic_tracks:
            track, created = Track.objects.get_or_create(
                id=data['id'],
                defaults={
                    **data,
                    'uploaded_by': user,
                    'status': 'published',
                    'cover': f'https://i.ytimg.com/vi/{"0NdrW43JJA8" if data["id"] == 1 else "i1M3qiX_GZo"}/maxresdefault.jpg'
                }
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Создано {created_count} базовых треков"))