# api/management/commands/generate_real_waveforms.py
import os
import time
import librosa
import numpy as np
from django.core.management.base import BaseCommand
from django.db.models import Q
from api.models import Track
from api.waveform_utils import analyze_audio_file, analyze_audio_url
from django.utils import timezone

class Command(BaseCommand):
    help = 'Генерация настоящих waveforms из аудиофайлов'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Перегенерировать все waveforms'
        )
        parser.add_argument(
            '--tracks',
            type=str,
            help='ID треков через запятую (например: 1,2,3)'
        )
        parser.add_argument(
            '--num-points',
            type=int,
            default=120,
            help='Количество точек в waveform'
        )
    
    def handle(self, *args, **options):
        self.stdout.write("🎵 ГЕНЕРАЦИЯ НАСТОЯЩИХ WAVEFORMS ИЗ АУДИО")
        self.stdout.write("="*60)
        
        start_time = time.time()
        
        # Определяем какие треки обрабатывать
        if options['tracks']:
            track_ids = [int(id.strip()) for id in options['tracks'].split(',')]
            tracks = Track.objects.filter(id__in=track_ids)
            self.stdout.write(f"🎯 Режим: только указанные треки: {track_ids}")
        elif options['force']:
            tracks = Track.objects.all()
            self.stdout.write("🔄 Режим: перегенерация ВСЕХ треков")
        else:
            tracks = Track.objects.filter(
                Q(waveform_generated=False) | 
                Q(waveform_data__isnull=True) |
                Q(waveform_data__len=0)
            )
            self.stdout.write("📊 Режим: только треки без waveforms")
        
        total = tracks.count()
        self.stdout.write(f"📊 Найдено {total} треков для обработки")
        
        if total == 0:
            self.stdout.write(self.style.WARNING("⚠️ Нет треков для обработки"))
            return
        
        generated = 0
        skipped = 0
        errors = 0
        
        for i, track in enumerate(tracks, 1):
            try:
                self.stdout.write(f"\n[{i}/{total}] Трек {track.id}: {track.title}")
                
                # Проверяем нужно ли генерировать
                if track.waveform_generated and track.waveform_data and not options['force']:
                    self.stdout.write("   ⏭️  Пропущен (уже сгенерирован)")
                    skipped += 1
                    continue
                
                # Поиск аудиофайла
                audio_path = None
                
                # Способ 1: FileField
                if track.audio_file and hasattr(track.audio_file, 'path'):
                    if os.path.exists(track.audio_file.path):
                        audio_path = track.audio_file.path
                        self.stdout.write(f"   📁 Файл: {os.path.basename(audio_path)}")
                
                # Способ 2: URL локального файла
                if not audio_path and track.audio_url:
                    self.stdout.write(f"   🔗 URL: {track.audio_url}")
                    
                    # Пробуем найти локальный файл
                    if track.audio_url.startswith('/'):
                        possible_paths = [
                            f"frontend/public{track.audio_url}",
                            f"static{track.audio_url}",
                            f"media{track.audio_url}",
                            track.audio_url[1:],
                            os.path.join('..', 'frontend', 'public', track.audio_url[1:]),
                            os.path.join('..', 'static', track.audio_url[1:])
                        ]
                        
                        for path in possible_paths:
                            if os.path.exists(path):
                                audio_path = path
                                self.stdout.write(f"   📁 Найден: {path}")
                                break
                
                if not audio_path:
                    self.stdout.write(self.style.WARNING("   ⚠️  Аудиофайл не найден"))
                    # Пробуем анализировать по URL
                    if track.audio_url and track.audio_url.startswith('http'):
                        self.stdout.write("   🌐 Попытка анализа по HTTP...")
                        try:
                            waveform = analyze_audio_url(track.audio_url, options['num_points'])
                            if waveform:
                                track.waveform_data = waveform
                                track.waveform_generated = True
                                track.waveform_generated_at = timezone.now()
                                track.save()
                                generated += 1
                                self.stdout.write(self.style.SUCCESS("   ✅ Сгенерировано из URL"))
                                continue
                        except Exception as url_error:
                            self.stdout.write(self.style.WARNING(f"   ⚠️  Ошибка URL: {url_error}"))
                    
                    errors += 1
                    self.stdout.write(self.style.ERROR("   ❌ Не удалось найти аудио"))
                    continue
                
                # Анализ аудиофайла
                self.stdout.write("   🎧 Анализ аудио...")
                try:
                    waveform = analyze_audio_file(audio_path, options['num_points'])
                    
                    if waveform:
                        # Сохраняем результат
                        track.waveform_data = waveform
                        track.waveform_generated = True
                        track.waveform_generated_at = timezone.now()
                        track.save()
                        
                        generated += 1
                        
                        # Статистика
                        stats = {
                            'точек': len(waveform),
                            'мин': f"{min(waveform):.1f}",
                            'макс': f"{max(waveform):.1f}",
                            'сред': f"{np.mean(waveform):.1f}"
                        }
                        
                        self.stdout.write(self.style.SUCCESS("   ✅ УСПЕШНО!"))
                        self.stdout.write(f"      📊 {stats['точек']} точек")
                        self.stdout.write(f"      📈 Диапазон: {stats['мин']}-{stats['макс']}")
                        self.stdout.write(f"      📊 Среднее: {stats['сред']}")
                    else:
                        errors += 1
                        self.stdout.write(self.style.ERROR("   ❌ Ошибка анализа"))
                        
                except Exception as analysis_error:
                    errors += 1
                    self.stdout.write(self.style.ERROR(f"   ❌ Ошибка анализа: {analysis_error}"))
                
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f"   ❌ Исключение: {e}"))
                import traceback
                traceback.print_exc()
        
        elapsed = time.time() - start_time
        
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА!"))
        self.stdout.write(f"⏱️  Время: {elapsed:.2f} секунд")
        self.stdout.write(f"📊 Обработано треков: {total}")
        self.stdout.write(f"✅ Сгенерировано: {generated}")
        self.stdout.write(f"⏭️  Пропущено: {skipped}")
        self.stdout.write(f"❌ Ошибок: {errors}")
        self.stdout.write("="*60)
        
        if generated > 0:
            self.stdout.write(self.style.SUCCESS("\n✅ Настоящие waveforms сохранены в БД!"))
            self.stdout.write("📡 Доступны по API: /api/tracks/<id>/waveform/")
        
        if errors > 0:
            self.stdout.write(self.style.WARNING("\n⚠️  Были ошибки. Проверьте наличие аудиофайлов."))