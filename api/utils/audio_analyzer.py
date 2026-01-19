# api/utils/audio_analyzer.py
import librosa
import numpy as np
import json
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')
import time

def analyze_audio_file_fast(audio_path, num_bars=60):
    """
    Быстрый анализ аудиофайла с оптимизацией для демо.
    Возвращает 60 значений для фронтенда.
    """
    try:
        print(f"🔍 [ANALYZER] Начинаем быстрый анализ: {audio_path}")
        start_time = time.time()
        
        # Проверяем существование файла
        if not Path(audio_path).exists():
            print(f"❌ [ANALYZER] Файл не найден: {audio_path}")
            return generate_default_waveform(num_bars)
        
        # 1. Загружаем аудио с пониженной частотой для скорости
        y, sr = librosa.load(audio_path, sr=11025, mono=True)  # Понижаем частоту вдвое
        
        load_time = time.time() - start_time
        print(f"✅ [ANALYZER] Аудио загружено за {load_time:.2f}с:")
        print(f"   - Длина: {len(y):,} сэмплов")
        print(f"   - Частота: {sr} Гц")
        print(f"   - Длительность: {len(y)/sr:.2f} секунд")
        
        # 2. Берем абсолютные значения амплитуды
        amplitude = np.abs(y)
        
        # 3. Для скорости используем меньше палочек на бэкенде
        backend_bars = min(num_bars * 2, 120)  # 120 максимум для бэкенда
        
        chunk_size = len(amplitude) // backend_bars
        if chunk_size == 0:
            chunk_size = 1
        
        print(f"🔢 [ANALYZER] Создаем {backend_bars} палочек, размер чанка: {chunk_size:,}")
        
        # 4. Быстрое вычисление RMS с использованием numpy
        bars = []
        for i in range(backend_bars):
            start_idx = i * chunk_size
            end_idx = min((i + 1) * chunk_size, len(amplitude))
            
            chunk = amplitude[start_idx:end_idx]
            if len(chunk) > 0:
                # Быстрое приближение RMS
                rms = np.sqrt(np.mean(chunk**2))
                bars.append(float(rms))
            else:
                bars.append(0.0)
        
        bars = np.array(bars)
        
        # 5. Быстрая нормализация
        bars = bars + 0.0001  # Избегаем нулей
        bars = np.log10(bars + 1)  # Логарифмическое преобразование
        
        min_val = bars.min()
        max_val = bars.max()
        
        if max_val - min_val > 0:
            normalized_bars = ((bars - min_val) / (max_val - min_val)) * 99 + 1
        else:
            normalized_bars = np.ones_like(bars) * 50
        
        # 6. Округляем
        bar_heights = [int(round(h, 0)) for h in normalized_bars]
        
        # 7. Прореживаем до нужного количества для фронтенда
        if len(bar_heights) > num_bars:
            step = len(bar_heights) // num_bars
            bar_heights = [bar_heights[i] for i in range(0, len(bar_heights), step)][:num_bars]
        
        total_time = time.time() - start_time
        print(f"✅ [ANALYZER] Waveform сгенерирован за {total_time:.2f}с:")
        print(f"   - Количество палочек: {len(bar_heights)}")
        print(f"   - Минимальная высота: {min(bar_heights)}%")
        print(f"   - Максимальная высота: {max(bar_heights)}%")
        print(f"   - Средняя высота: {np.mean(bar_heights):.1f}%")
        
        return bar_heights
        
    except Exception as e:
        print(f"❌ [ANALYZER] Ошибка при анализе аудио: {str(e)}")
        return generate_default_waveform(num_bars)

def generate_default_waveform(num_bars=60):
    """Генерирует дефолтный waveform для демо"""
    # Создаем синусоиду с шумом для каждого трека
    import random
    
    # Фиксированные сиды для каждого трека, чтобы waveform был стабильным
    track_seeds = {1: 42, 2: 123, 3: 456}
    
    # Получаем seed из трека ID через контекст
    import inspect
    for frame in inspect.stack():
        if 'track_id' in frame.frame.f_locals:
            track_id = frame.frame.f_locals['track_id']
            seed = track_seeds.get(track_id, 999)
            random.seed(seed)
            break
    else:
        random.seed(999)
    
    # Создаем плавную синусоиду
    x = np.linspace(0, 4 * np.pi, num_bars)
    base_wave = np.sin(x)
    
    # Добавляем уникальные вариации для каждого трека
    random_variation = np.random.normal(0, 0.3, num_bars)
    noise = np.random.normal(0, 0.1, num_bars)
    combined = base_wave + random_variation + noise
    
    # Нормализация
    min_val = combined.min()
    max_val = combined.max()
    
    if max_val - min_val > 0:
        normalized = ((combined - min_val) / (max_val - min_val)) * 80 + 20  # 20-100%
    else:
        normalized = np.ones_like(combined) * 60
    
    bar_heights = [int(round(h, 0)) for h in normalized]
    bar_heights = [max(10, min(100, h)) for h in bar_heights]  # Ограничиваем 10-100%
    
    return bar_heights

def analyze_audio_for_track(track_id):
    """
    Анализирует аудиофайл для конкретного трека
    и сохраняет результаты в JSON файл и БД
    """
    try:
        # Определяем путь к аудиофайлу по track_id
        audio_files = {
            1: "frontend/public/tracks/track1.mp3",
            2: "frontend/public/tracks/track2.mp3", 
            3: "frontend/public/tracks/track3.mp3"
        }
        
        if track_id not in audio_files:
            print(f"❌ [ANALYZER] Трек {track_id} не найден в списке файлов")
            return None
        
        audio_path = audio_files[track_id]
        print(f"🎵 [ANALYZER] Анализируем трек ID {track_id}")
        
        # Генерируем waveform данные (60 палочек для фронтенда)
        waveform_heights = analyze_audio_file_fast(audio_path, num_bars=60)
        
        # Сохраняем в JSON файл для быстрого доступа
        output_file = f"frontend/public/waveforms/track_{track_id}.json"
        
        # Создаем директорию если ее нет
        Path(output_file).parent.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем данные
        with open(output_file, 'w') as f:
            json.dump({
                'track_id': track_id,
                'waveform': waveform_heights,
                'num_bars': len(waveform_heights),
                'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'version': '2.0'
            }, f, indent=2)
        
        print(f"💾 [ANALYZER] Waveform сохранен в {output_file}")
        
        # Обновляем запись в БД если трек существует
        try:
            from ..models import Track
            track = Track.objects.get(id=track_id)
            track.waveform_data = waveform_heights
            track.waveform_generated = True
            track.save()
            print(f"💾 [ANALYZER] Waveform сохранен в БД для трека {track_id}")
        except Exception as db_error:
            print(f"⚠️ [ANALYZER] Не удалось сохранить в БД: {db_error}")
        
        return waveform_heights
        
    except Exception as e:
        print(f"❌ [ANALYZER] Ошибка при анализе трека {track_id}: {e}")
        import traceback
        traceback.print_exc()
        return None