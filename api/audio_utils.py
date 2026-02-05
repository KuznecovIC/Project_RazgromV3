import os
import tempfile
import logging
from pydub import AudioSegment
import librosa
import wave
import subprocess

# ВАЖНО: ДОБАВЬ ЭТИ СТРОКИ В САМЫЙ ВЕРХ ФАЙЛА
# Укажи ПРАВИЛЬНЫЕ пути к ffmpeg и ffprobe на твоем Windows
AudioSegment.converter = r"C:\ffmpeg-2026-01-19-git-43dbc011fa-full_build\bin\ffmpeg.exe"
AudioSegment.ffprobe = r"C:\ffmpeg-2026-01-19-git-43dbc011fa-full_build\bin\ffprobe.exe"

logger = logging.getLogger(__name__)

def determine_duration_from_file(file_path):
    """Определение длительности аудио файла в секундах"""
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        duration_sec = 0
        
        logger.info(f"=== WAVEFORM/ДЛИТЕЛЬНОСТЬ START ===")
        logger.info(f"Определение длительности для: {file_path}, расширение: {file_ext}")
        
        # Способ 1: Пробуем через pydub (нужен ffmpeg)
        try:
            print(f"Пробуем pydub с файлом: {file_path}")
            print(f"Существует ли файл: {os.path.exists(file_path)}")
            
            audio = AudioSegment.from_file(file_path)
            duration_sec = len(audio) / 1000.0  # pydub возвращает миллисекунды
            logger.info(f"Длительность определена через pydub: {duration_sec:.2f} секунд")
            print(f"Pydub успешно! Длительность: {duration_sec:.2f}с")
            return duration_sec
            
        except Exception as pydub_error:
            logger.error(f"pydub не удался: {pydub_error}")
            print(f"Pydub ошибка: {pydub_error}")
            
            # Способ 2: Пробуем через librosa
            try:
                print("Пробуем librosa...")
                y, sr = librosa.load(file_path, sr=None, duration=None)
                duration_sec = librosa.get_duration(y=y, sr=sr)
                logger.info(f"Длительность определена через librosa: {duration_sec:.2f} секунд")
                return duration_sec
                
            except Exception as librosa_error:
                logger.warning(f"librosa не удался: {librosa_error}")
                
                # Способ 3: Для WAV файлов через wave
                if file_ext == '.wav':
                    try:
                        with wave.open(file_path, 'rb') as wav_file:
                            frames = wav_file.getnframes()
                            rate = wav_file.getframerate()
                            duration_sec = frames / float(rate)
                            logger.info(f"Длительность определена через wave: {duration_sec:.2f} секунд")
                            return duration_sec
                    except Exception as wave_error:
                        logger.warning(f"wave не удался: {wave_error}")
                
                # Способ 4: Пробуем ffprobe если установлен
                try:
                    import subprocess
                    cmd = ['ffprobe', '-v', 'error', '-show_entries', 
                          'format=duration', '-of', 
                          'default=noprint_wrappers=1:nokey=1', file_path]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        duration_sec = float(result.stdout.strip())
                        logger.info(f"Длительность определена через ffprobe: {duration_sec:.2f} секунд")
                        return duration_sec
                    else:
                        logger.warning(f"ffprobe вернул ошибку: {result.stderr}")
                except Exception as ffprobe_error:
                    logger.warning(f"ffprobe не удался: {ffprobe_error}")
                
        # Если все методы не сработали
        raise Exception(f"Не удалось определить длительность файла: {file_path}")
        
    except Exception as e:
        logger.error(f"Критическая ошибка определения длительности: {e}")
        raise e

def format_duration(seconds):
    """Форматирование секунд в MM:SS"""
    if not seconds or seconds <= 0:
        return "0:00"
    
    minutes = int(seconds // 60)
    seconds_int = int(seconds % 60)
    return f"{minutes}:{seconds_int:02d}"