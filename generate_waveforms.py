# generate_waveforms.py
import os
import sys
import json
import time
import numpy as np
import librosa
from pathlib import Path

def analyze_audio_file_simple(audio_path, num_bars=60):
    """Простой анализ аудиофайла без зависимостей от Django"""
    try:
        print(f"🔍 Анализируем файл: {os.path.basename(audio_path)}")
        
        if not os.path.exists(audio_path):
            print(f"❌ Файл не найден: {audio_path}")
            return None
        
        # Загружаем аудио с пониженной частотой для скорости
        y, sr = librosa.load(audio_path, sr=11025, mono=True)
        
        print(f"✅ Аудио загружено: {len(y):,} сэмплов, {sr} Гц, {len(y)/sr:.2f} секунд")
        
        # Вычисляем амплитуду
        amplitude = np.abs(y)
        
        # Делим на равные части
        chunk_size = len(amplitude) // num_bars
        if chunk_size == 0:
            chunk_size = 1
        
        print(f"🔢 Создаем {num_bars} палочек, размер чанка: {chunk_size:,}")
        
        # Вычисляем RMS для каждого чанка
        bars = []
        for i in range(num_bars):
            start_idx = i * chunk_size
            end_idx = min((i + 1) * chunk_size, len(amplitude))
            
            chunk = amplitude[start_idx:end_idx]
            if len(chunk) > 0:
                rms = np.sqrt(np.mean(chunk**2))
                bars.append(float(rms))
            else:
                bars.append(0.0)
        
        bars = np.array(bars)
        
        # Нормализация
        bars = bars + 0.0001  # Избегаем нулей
        bars = np.log10(bars + 1)  # Логарифмическое преобразование
        
        min_val = bars.min()
        max_val = bars.max()
        
        if max_val - min_val > 0:
            normalized_bars = ((bars - min_val) / (max_val - min_val)) * 99 + 1
        else:
            normalized_bars = np.ones_like(bars) * 50
        
        # Округляем и ограничиваем
        bar_heights = [int(round(h, 0)) for h in normalized_bars]
        bar_heights = [max(10, min(100, h)) for h in bar_heights]  # 10-100%
        
        print(f"✅ Waveform сгенерирован:")
        print(f"   - Палочек: {len(bar_heights)}")
        print(f"   - Диапазон: {min(bar_heights)}% - {max(bar_heights)}%")
        print(f"   - Среднее: {np.mean(bar_heights):.1f}%")
        
        return bar_heights
        
    except Exception as e:
        print(f"❌ Ошибка при анализе: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def update_database(track_id, waveform_data):
    """Обновляет базу данных Django"""
    try:
        # Добавляем путь к Django проекту
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'soundcloud.settings')
        
        import django
        django.setup()
        
        from api.models import Track
        
        track = Track.objects.get(id=track_id)
        track.waveform_data = waveform_data
        track.waveform_generated = True
        track.save()
        
        print(f"💾 Данные сохранены в БД для трека {track_id}")
        return True
        
    except Exception as e:
        print(f"⚠️ Не удалось обновить БД: {e}")
        return False

def main():
    """Главная функция"""
    print("=" * 60)
    print("🚀 ГЕНЕРАЦИЯ WAVEFORMS ДЛЯ ВСЕХ ТРЕКОВ")
    print("=" * 60)
    
    # Создаем директорию для waveforms если ее нет
    waveforms_dir = "frontend/public/waveforms"
    os.makedirs(waveforms_dir, exist_ok=True)
    
    # Определяем аудиофайлы
    audio_files = {
        1: "frontend/public/tracks/track1.mp3",
        2: "frontend/public/tracks/track2.mp3", 
        3: "frontend/public/tracks/track3.mp3"
    }
    
    # Проверяем существование файлов
    missing_files = []
    for track_id, path in audio_files.items():
        if not os.path.exists(path):
            missing_files.append(f"Трек {track_id}: {path}")
    
    if missing_files:
        print("❌ Отсутствуют аудиофайлы:")
        for missing in missing_files:
            print(f"   - {missing}")
        print("\n📁 Убедитесь, что файлы находятся в правильных путях:")
        print("   frontend/public/tracks/track1.mp3")
        print("   frontend/public/tracks/track2.mp3")
        print("   frontend/public/tracks/track3.mp3")
        return
    
    # Генерируем waveforms для каждого трека
    results = []
    
    for track_id in [1, 2, 3]:
        print(f"\n{'='*60}")
        print(f"🎵 ТРЕК {track_id}")
        print(f"{'='*60}")
        
        audio_path = audio_files[track_id]
        start_time = time.time()
        
        # Генерируем waveform
        waveform_data = analyze_audio_file_simple(audio_path, num_bars=60)
        
        if waveform_data:
            elapsed = time.time() - start_time
            
            # Сохраняем в JSON файл
            output_file = f"{waveforms_dir}/track_{track_id}.json"
            
            with open(output_file, 'w') as f:
                json.dump({
                    'track_id': track_id,
                    'waveform': waveform_data,
                    'num_bars': len(waveform_data),
                    'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'duration': f"{elapsed:.2f}с"
                }, f, indent=2)
            
            print(f"💾 Waveform сохранен в {output_file}")
            
            # Пытаемся обновить базу данных
            db_updated = update_database(track_id, waveform_data)
            
            results.append({
                'track_id': track_id,
                'success': True,
                'elapsed': elapsed,
                'db_updated': db_updated,
                'file': output_file
            })
        else:
            results.append({
                'track_id': track_id,
                'success': False,
                'error': 'Не удалось сгенерировать waveform'
            })
    
    # Выводим итоги
    print(f"\n{'='*60}")
    print("📊 ИТОГИ ГЕНЕРАЦИИ")
    print(f"{'='*60}")
    
    successful = sum(1 for r in results if r['success'])
    
    for result in results:
        if result['success']:
            print(f"✅ Трек {result['track_id']}: УСПЕХ ({result['elapsed']:.2f}с)")
            if result.get('db_updated'):
                print(f"   📊 БД обновлена")
            print(f"   📁 Файл: {result['file']}")
        else:
            print(f"❌ Трек {result['track_id']}: ОШИБКА - {result.get('error', 'Неизвестная ошибка')}")
    
    print(f"\n🎉 Успешно сгенерировано: {successful}/3 треков")
    
    if successful == 3:
        print("\n✅ Все waveforms успешно сгенерированы!")
        print("🔧 Далее:")
        print("   1. Запустите сервер Django: python manage.py runserver")
        print("   2. Запустите фронтенд: cd frontend && npm start")
        print("   3. Откройте браузер: http://localhost:3000")
    else:
        print(f"\n⚠️  Сгенерировано только {successful} из 3 треков")
        print("   Проверьте аудиофайлы и повторите попытку")

if __name__ == "__main__":
    main()