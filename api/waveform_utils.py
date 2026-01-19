import librosa
import numpy as np
import json
import os
import tempfile
import requests
from io import BytesIO
from pydub import AudioSegment
import logging
from scipy import signal
import math
import subprocess
import wave
import struct

logger = logging.getLogger(__name__)

def get_audio_duration(file_path):
    """
    Определяет длительность аудиофайла в секундах
    Использует несколько методов для надежности
    """
    try:
        # Метод 1: Используем ffprobe (самый надежный)
        try:
            cmd = [
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                duration = float(result.stdout.strip())
                logger.info(f"✅ Длительность определена через ffprobe: {duration:.2f}с")
                return duration
        except Exception as ffprobe_error:
            logger.debug(f"ffprobe не сработал: {ffprobe_error}")
        
        # Метод 2: Используем wave для .wav файлов
        if file_path.lower().endswith('.wav'):
            try:
                with wave.open(file_path, 'rb') as wav_file:
                    frames = wav_file.getnframes()
                    rate = wav_file.getframerate()
                    duration = frames / float(rate)
                    logger.info(f"✅ Длительность определена через wave: {duration:.2f}с")
                    return duration
            except Exception as wave_error:
                logger.debug(f"wave не сработал: {wave_error}")
        
        # Метод 3: Используем pydub
        try:
            audio = AudioSegment.from_file(file_path)
            duration = len(audio) / 1000.0  # миллисекунды -> секунды
            logger.info(f"✅ Длительность определена через pydub: {duration:.2f}с")
            return duration
        except Exception as pydub_error:
            logger.debug(f"pydub не сработал: {pydub_error}")
        
        # Метод 4: Используем librosa
        try:
            y, sr = librosa.load(file_path, sr=None, mono=True, duration=0)
            duration = librosa.get_duration(y=y, sr=sr)
            logger.info(f"✅ Длительность определена через librosa: {duration:.2f}с")
            return duration
        except Exception as librosa_error:
            logger.debug(f"librosa не сработал: {librosa_error}")
        
        # Если все методы не сработали
        logger.warning(f"⚠️ Не удалось определить длительность файла {file_path}")
        return 180.0  # 3 минуты по умолчанию
        
    except Exception as e:
        logger.error(f"❌ Критическая ошибка определения длительности: {e}")
        return 180.0

def format_duration(seconds):
    """Форматирует секунды в MM:SS или HH:MM:SS"""
    if seconds < 0:
        seconds = 0
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds_int = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds_int:02d}"
    else:
        return f"{minutes}:{seconds_int:02d}"

def analyze_audio_file(file_path, num_points=120, duration_sec=None):
    """
    Продвинутый анализ аудиофайла с учетом длительности
    """
    try:
        logger.info(f"🔍 Анализ аудиофайла: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"❌ Файл не найден: {file_path}")
            return None
        
        # Определяем длительность если не передана
        if duration_sec is None:
            duration_sec = get_audio_duration(file_path)
        
        # Адаптируем количество точек к длительности
        if duration_sec < 30:  # Меньше 30 секунд
            num_points = max(40, min(80, int(duration_sec * 2)))
        elif duration_sec > 600:  # Более 10 минут
            num_points = min(200, num_points * 2)
        
        logger.info(f"📊 Длительность: {duration_sec:.2f}с, точек: {num_points}")
        
        # Пробуем разные методы загрузки
        y = None
        sr = None
        
        # Метод 1: librosa с обработкой исключений
        try:
            y, sr = librosa.load(file_path, sr=22050, mono=True, duration=None)
            logger.info(f"✅ Аудио загружено через librosa: {len(y)} сэмплов, {sr} Hz")
        except Exception as librosa_error:
            logger.warning(f"⚠️ librosa не смог загрузить файл: {librosa_error}")
            
            # Метод 2: pydub
            try:
                audio = AudioSegment.from_file(file_path)
                samples = np.array(audio.get_array_of_samples())
                if audio.channels == 2:
                    samples = samples.reshape((-1, 2)).mean(axis=1)
                sr = audio.frame_rate
                y = samples.astype(np.float32) / (2 ** 15)  # Нормализация для 16-bit
                logger.info(f"✅ Аудио загружено через pydub: {len(y)} сэмплов, {sr} Hz")
            except Exception as pydub_error:
                logger.error(f"❌ Не удалось загрузить аудио: {pydub_error}")
                return generate_demo_waveform(hash(file_path) % 1000, num_points, os.path.basename(file_path))
        
        if y is None or sr is None:
            logger.error("❌ Не удалось загрузить аудио данные")
            return generate_demo_waveform(hash(file_path) % 1000, num_points, os.path.basename(file_path))
        
        # Нормализуем audio
        if len(y) > 0:
            y = y / (np.max(np.abs(y)) + 1e-8)
        
        # Разбиваем на сегменты для waveform
        segment_size = max(1, len(y) // num_points)
        waveform = []
        
        for i in range(num_points):
            start = i * segment_size
            end = min(start + segment_size, len(y))
            
            if start < len(y) and end > start:
                segment = y[start:end]
                
                # Вычисляем RMS (среднеквадратичное значение)
                rms = np.sqrt(np.mean(segment**2)) if len(segment) > 0 else 0
                
                # Логарифмическая шкала (dBFS)
                if rms > 1e-8:  # Избегаем log(0)
                    db = 20 * np.log10(rms)
                    # Преобразуем dBFS (от -60 до 0 dB) в 0-100
                    normalized = np.clip((db + 60) * (100 / 60), 10, 100)
                else:
                    normalized = 10.0
                
                # Добавляем немного динамики для тихих участков
                if normalized < 15:
                    normalized += np.random.uniform(0, 3)
                
                waveform.append(float(normalized))
            else:
                waveform.append(10.0)
        
        # Сглаживаем waveform для более приятного вида
        if len(waveform) > 5:
            try:
                # Используем скользящее среднее вместо savgol для надежности
                smoothed = []
                for i in range(len(waveform)):
                    start = max(0, i - 2)
                    end = min(len(waveform), i + 3)
                    window = waveform[start:end]
                    smoothed.append(np.mean(window))
                waveform = smoothed
            except Exception as smooth_error:
                logger.debug(f"Сглаживание не удалось: {smooth_error}")
        
        # Гарантируем, что waveform не пустой
        if len(waveform) == 0:
            waveform = [10.0] * num_points
        
        logger.info(f"✅ Waveform сгенерирован: {len(waveform)} точек, диапазон: {min(waveform):.1f}-{max(waveform):.1f}")
        return waveform
        
    except Exception as e:
        logger.error(f"❌ Ошибка анализа аудио: {e}")
        import traceback
        traceback.print_exc()
        # Возвращаем демо waveform в случае ошибки
        return generate_demo_waveform(hash(file_path) % 1000, num_points, "error")

def generate_waveform_for_track(track, num_points=120):
    """
    Основная функция генерации waveform для трека
    """
    try:
        logger.info(f"🎵 Генерация waveform для трека {track.id}: {track.title}")
        
        duration_sec = None
        # Определяем длительность трека
        if hasattr(track, 'get_duration_seconds'):
            duration_sec = track.get_duration_seconds()
            logger.info(f"📊 Длительность трека из БД: {duration_sec}с")
        
        # Приоритет 1: Анализ загруженного файла
        if track.audio_file and hasattr(track.audio_file, 'path'):
            file_path = track.audio_file.path
            if os.path.exists(file_path):
                logger.info(f"📁 Анализ локального файла: {file_path}")
                waveform = analyze_audio_file(file_path, num_points, duration_sec)
                if waveform:
                    return waveform
        
        # Приоритет 2: Анализ по URL
        if track.audio_url:
            logger.info(f"🔗 Анализ по URL: {track.audio_url}")
            waveform = analyze_audio_url(track.audio_url, num_points, duration_sec)
            if waveform:
                return waveform
        
        # Fallback: демо-данные
        logger.warning(f"⚠️ Использую демо-данные для трека {track.id}")
        return generate_demo_waveform(track.id, num_points, track.title, duration_sec)
        
    except Exception as e:
        logger.error(f"❌ Ошибка генерации waveform: {e}")
        import traceback
        traceback.print_exc()
        return generate_demo_waveform(track.id, num_points, track.title)

def analyze_audio_url(audio_url, num_points=120, duration_sec=None):
    """
    Анализирует аудио по URL
    """
    try:
        logger.info(f"🔍 Анализ аудио по URL: {audio_url}")
        
        # Проверяем локальный путь (относительно Django)
        if audio_url.startswith('/'):
            # Пробуем разные пути
            possible_paths = [
                os.path.join('media', audio_url.lstrip('/')),
                os.path.join('..', 'frontend', 'public', audio_url.lstrip('/')),
                os.path.join('static', audio_url.lstrip('/')),
                audio_url.lstrip('/'),
                os.path.join('/media', audio_url.lstrip('/')),
                os.path.join('/static', audio_url.lstrip('/'))
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    logger.info(f"✅ Найден локальный файл: {path}")
                    return analyze_audio_file(path, num_points, duration_sec)
                else:
                    logger.debug(f"Файл не найден: {path}")
        
        # Для HTTP URL
        if audio_url.startswith('http'):
            try:
                response = requests.get(audio_url, timeout=30, stream=True)
                if response.status_code == 200:
                    # Скачиваем первые 10MB для анализа
                    content = b''
                    for chunk in response.iter_content(chunk_size=8192):
                        content += chunk
                        if len(content) > 10 * 1024 * 1024:  # 10MB
                            break
                    
                    if content:
                        # Анализируем из памяти
                        return analyze_audio_bytes(content, num_points, duration_sec)
            except Exception as e:
                logger.error(f"❌ Ошибка загрузки URL: {e}")
        
        return None
        
    except Exception as e:
        logger.error(f"❌ Ошибка анализа URL: {e}")
        return None

def analyze_audio_bytes(audio_bytes, num_points=120, duration_sec=None):
    """
    Анализирует аудио из байтов
    """
    try:
        # Создаем временный файл
        import tempfile
        import uuid
        
        file_ext = '.mp3'  # дефолтное расширение
        if audio_bytes[:4] == b'RIFF':  # WAV файл
            file_ext = '.wav'
        elif audio_bytes[:3] == b'ID3':  # MP3 с ID3 тегом
            file_ext = '.mp3'
        
        temp_filename = f"temp_audio_{uuid.uuid4().hex}{file_ext}"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        with open(temp_path, 'wb') as tmp_file:
            tmp_file.write(audio_bytes)
        
        try:
            waveform = analyze_audio_file(temp_path, num_points, duration_sec)
        finally:
            # Удаляем временный файл
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        
        return waveform
        
    except Exception as e:
        logger.error(f"❌ Ошибка анализа байтов: {e}")
        return None

def generate_demo_waveform(track_id, num_points=120, title=None, duration_sec=None):
    """
    Генерирует демо waveform на основе ID и названия трека
    """
    import random
    
    # Создаем seed на основе ID и названия
    seed_value = track_id * 12345
    if title:
        seed_value += sum(ord(c) for c in title)
    
    random.seed(seed_value)
    
    waveform = []
    
    # Разные паттерны для разных ID
    for i in range(num_points):
        x = i / max(1, num_points)  # Нормализованная позиция
        
        # Базовый паттерн в зависимости от ID
        if track_id % 4 == 0:
            # Плавный паттерн (для электроники)
            base = 30 + 50 * math.sin(x * 8 * math.pi) * math.exp(-x * 2)
        elif track_id % 4 == 1:
            # Ритмичный паттерн (для рока/хип-хопа)
            base = 40 + 60 * abs(math.sin(x * 16 * math.pi)) * (1 - x * 0.3)
        elif track_id % 4 == 2:
            # Сложный паттерн (для экспериментальной музыки)
            base = 35 + 55 * (math.sin(x * 6 * math.pi) + 0.5 * math.sin(x * 18 * math.pi)) * (1 - x * 0.4)
        else:
            # Переменный паттерн
            base = 25 + 65 * math.sin(x * 12 * math.pi) * (0.5 + 0.5 * math.sin(x * 4 * math.pi))
        
        # Добавляем уникальность на основе ID
        base += (track_id % 20) - 10
        
        # Добавляем шум
        noise = random.uniform(-5, 5)
        
        # Ограничиваем диапазон
        value = max(10, min(100, base + noise))
        
        # Добавляем пики в случайных местах
        if random.random() < 0.03:
            value = min(100, value * 1.7)
        
        waveform.append(float(value))
    
    # Сглаживаем
    if len(waveform) > 5:
        try:
            from scipy import signal
            waveform = list(signal.savgol_filter(waveform, 5, 2))
        except:
            # Простое сглаживание
            smoothed = []
            for i in range(len(waveform)):
                start = max(0, i - 1)
                end = min(len(waveform), i + 2)
                window = waveform[start:end]
                smoothed.append(np.mean(window))
            waveform = smoothed
    
    # Гарантируем минимум
    for i in range(len(waveform)):
        if waveform[i] < 10:
            waveform[i] = 10 + random.uniform(0, 5)
    
    logger.info(f"✅ Демо waveform сгенерирован: {len(waveform)} точек")
    return waveform

def resample_waveform(waveform, new_length):
    """
    Ресемплирует waveform до новой длины
    """
    if not waveform or len(waveform) == 0:
        return generate_demo_waveform(1, new_length, "resampled")
    
    if len(waveform) == new_length:
        return waveform
    
    # Линейная интерполяция
    old_indices = np.arange(len(waveform))
    new_indices = np.linspace(0, len(waveform) - 1, new_length)
    
    try:
        resampled = np.interp(new_indices, old_indices, waveform)
        return [float(x) for x in resampled]
    except:
        # В случае ошибки возвращаем простой waveform
        return [50.0] * new_length