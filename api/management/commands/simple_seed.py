from django.core.management.base import BaseCommand
from api.models import CustomUser, Track
import json
import os

class Command(BaseCommand):
    help = 'Простое заполнение базы демо-треками'
    
    def handle(self, *args, **options):
        self.stdout.write("🚀 Запуск простого сидинга треков...")
        
        try:
            # Получаем или создаем пользователя
            user = CustomUser.objects.first()
            if not user:
                user = CustomUser.objects.create_user(
                    email='music@example.com',
                    username='music_bot',
                    password='music123'
                )
                self.stdout.write(self.style.SUCCESS("✅ Создан пользователь для треков"))
            else:
                self.stdout.write(f"✅ Используем существующего пользователя: {user.username}")
            
            # Данные треков
            tracks = [
                {
                    'id': 1,
                    'title': 'hard drive (slowed & muffled)',
                    'artist': 'griffinilla',
                    'cover': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                    'cover_url': 'https://i.ytimg.com/vi/0NdrW43JJA8/maxresdefault.jpg',
                    'audio_url': '/tracks/track1.mp3',
                    'duration': '3:20',
                    'like_count': 56,
                    'play_count': 1234
                },
                {
                    'id': 2,
                    'title': 'Deutschland',
                    'artist': 'Rammstein',
                    'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                    'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                    'audio_url': '/tracks/track2.mp3',
                    'duration': '5:22',
                    'like_count': 34,
                    'play_count': 876
                },
                {
                    'id': 3,
                    'title': 'Sonne',
                    'artist': 'Rammstein',
                    'cover': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                    'cover_url': 'https://i.ytimg.com/vi/i1M3qiX_GZo/maxresdefault.jpg',
                    'audio_url': '/tracks/track3.mp3',
                    'duration': '4:05',
                    'like_count': 23,
                    'play_count': 654
                }
            ]
            
            created_count = 0
            updated_count = 0
            
            for track_data in tracks:
                # Убираем поля которые могут быть лишними
                track_id = track_data.pop('id')
                clean_data = {k: v for k, v in track_data.items() if k not in ['cover_url', 'like_count', 'play_count']}
                
                track, created = Track.objects.update_or_create(
                    id=track_id,
                    defaults={
                        **clean_data,
                        'uploaded_by': user,
                        'status': 'published'
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f"✅ Создан трек: {track.title}"))
                else:
                    updated_count += 1
                    self.stdout.write(self.style.WARNING(f"⚠️ Обновлен трек: {track.title}"))
                
                # Генерируем демо-вейвформу
                try:
                    waveform_data = self.generate_waveform_for_track(track)
                    track.waveform_data = waveform_data
                    track.waveform_generated = True
                    track.save(update_fields=['waveform_data', 'waveform_generated'])
                    self.stdout.write(self.style.SUCCESS(f"   🎵 Вейвформа сгенерирована"))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"   ⚠️ Ошибка генерации вейвформы: {e}"))
            
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Сидинг завершен!"))
            self.stdout.write(f"📊 Создано: {created_count}, Обновлено: {updated_count}")
            
            # Проверяем количество треков
            total_tracks = Track.objects.count()
            self.stdout.write(f"📊 Всего треков в базе: {total_tracks}")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Ошибка сидинга треков: {e}"))
            import traceback
            traceback.print_exc()
    
    def generate_waveform_for_track(self, track):
        """
        Генерация демо-вейвформы для трека
        """
        import math
        import random
        
        # Уникальная волна для каждого трека
        track_id = track.id
        num_bars = 120
        waveform = []
        
        for i in range(num_bars):
            # Базовый паттерн
            base = 50 + 30 * math.sin(i * 0.15)
            
            # Добавляем особенности по ID трека
            if track_id == 1:
                base += 10 * math.sin(i * 0.3)  # Более плавная
            elif track_id == 2:
                base += 20 * abs(math.sin(i * 0.5))  # Резкие перепады
            elif track_id == 3:
                base += 15 * math.sin(i * 0.25) * math.cos(i * 0.1)  # Сложная волна
            else:
                base += track_id * 5 * math.sin(i * 0.2)
            
            # Добавляем немного случайности
            base += random.uniform(-5, 5)
            
            # Ограничиваем диапазон 10-100
            value = max(10, min(100, int(base)))
            waveform.append(value)
        
        return waveform