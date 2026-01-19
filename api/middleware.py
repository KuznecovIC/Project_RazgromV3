# api/middleware.py
import threading
from django.utils.deprecation import MiddlewareMixin

class AutoWaveformMiddleware(MiddlewareMixin):
    """
    Middleware для автоматической проверки и генерации вейвформ
    при первом запросе страницы с вейвформами
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.waveform_check_done = False
        
    def __call__(self, request):
        # Проверяем, запрашивается ли страница с вейвформами
        path = request.path
        
        # Если это запрос вейвформы и проверка еще не выполнена
        if '/api/tracks/' in path and ('waveform' in path or 'waveform-enhanced' in path):
            # Запускаем проверку в фоновом потоке при первом запросе
            if not self.waveform_check_done:
                self.waveform_check_done = True
                
                def background_check():
                    try:
                        print("🔍 Автоматическая проверка вейвформ...")
                        # Импортируем здесь чтобы избежать циклических импортов
                        from api.views import check_and_generate_all_waveforms
                        from django.test import RequestFactory
                        
                        # Создаем фиктивный запрос
                        factory = RequestFactory()
                        dummy_request = factory.get('/api/waveforms/check/')
                        
                        # Вызываем нашу функцию
                        response = check_and_generate_all_waveforms(dummy_request)
                        print("✅ Автопроверка вейвформ завершена")
                        
                    except Exception as e:
                        print(f"❌ Ошибка автопроверки вейвформ: {e}")
                
                # Запускаем в фоновом потоке
                thread = threading.Thread(target=background_check)
                thread.daemon = True
                thread.start()
        
        response = self.get_response(request)
        return response
        