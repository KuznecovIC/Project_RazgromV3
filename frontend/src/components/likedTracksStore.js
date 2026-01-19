// likedTracksStore.js
class LikedTracksStore {
  constructor() {
    this.likedTracks = new Set();
    this.listeners = new Set();
    this.sessionToken = null;
    this.isInitialized = false;
  }

  // Инициализация с токеном сессии
  initialize(sessionToken) {
    if (sessionToken) {
      this.sessionToken = sessionToken;
      this.isInitialized = true;
      console.log('✅ Store: Инициализирован с токеном');
      this.loadFromServer();
    } else {
      console.log('⚠️ Store: Токен не предоставлен, используем localStorage');
      this.loadFromLocalStorage();
    }
  }

  // Загрузка лайков с сервера
  async loadFromServer() {
    if (!this.sessionToken) {
      console.log('⚠️ Store: Нет токена сессии, пропускаем загрузку с сервера');
      this.loadFromLocalStorage();
      return;
    }

    try {
      console.log('📥 Store: Загрузка лайков с сервера...');
      const response = await fetch('/api/tracks/liked/', {
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Store: Данные с сервера:', data);
        
        const trackIds = data.tracks?.map(track => track.id) || [];
        this.likedTracks = new Set(trackIds);
        console.log(`✅ Store: Загружено ${trackIds.length} лайков с сервера:`, trackIds);
        
        // Синхронизация с localStorage
        this.saveToLocalStorage();
        this.notifyListeners();
      } else if (response.status === 401) {
        console.warn('⚠️ Store: Не авторизован, очищаем лайки');
        this.likedTracks = new Set();
        this.clearLocalStorage();
        this.notifyListeners();
      } else {
        console.error('❌ Store: Ошибка сервера:', response.status);
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('❌ Store: Сетевая ошибка при загрузке с сервера:', error);
      this.loadFromLocalStorage();
    }
  }

  // Загрузка из localStorage
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('likedTracksStorage');
      if (stored) {
        const data = JSON.parse(stored);
        this.likedTracks = new Set(data.likedTracks || []);
        console.log(`📱 Store: Загружено ${this.likedTracks.size} лайков из localStorage`);
        this.notifyListeners();
      } else {
        console.log('📱 Store: Нет данных в localStorage');
        this.likedTracks = new Set();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Store: Ошибка загрузки из localStorage:', error);
      this.likedTracks = new Set();
      this.notifyListeners();
    }
  }

  // Сохранение в localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('likedTracksStorage', JSON.stringify({
        likedTracks: Array.from(this.likedTracks),
        lastSync: new Date().toISOString()
      }));
      console.log('💾 Store: Данные сохранены в localStorage');
    } catch (error) {
      console.error('❌ Store: Ошибка сохранения в localStorage:', error);
    }
  }

  // Очистка localStorage
  clearLocalStorage() {
    try {
      localStorage.removeItem('likedTracksStorage');
      console.log('🗑️ Store: localStorage очищен');
    } catch (error) {
      console.error('❌ Store: Ошибка очистки localStorage:', error);
    }
  }

  // Основные методы
  setLikedTracks(trackIds) {
    this.likedTracks = new Set(trackIds);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  addTrack(trackId) {
    this.likedTracks.add(trackId);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  removeTrack(trackId) {
    this.likedTracks.delete(trackId);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  toggleTrack(trackId) {
    if (this.likedTracks.has(trackId)) {
      this.removeTrack(trackId);
      return false;
    } else {
      this.addTrack(trackId);
      return true;
    }
  }

  hasTrack(trackId) {
    return this.likedTracks.has(trackId);
  }

  getLikedTracks() {
    return this.likedTracks;
  }

  getLikedTrackIds() {
    return Array.from(this.likedTracks);
  }

  // Подписка на изменения
  subscribe(listener) {
    this.listeners.add(listener);
    // Сразу вызываем с текущим состоянием
    listener(this.likedTracks);
    console.log(`👂 Store: Новый слушатель, всего: ${this.listeners.size}`);
    return () => {
      this.listeners.delete(listener);
      console.log(`👋 Store: Слушатель удален, осталось: ${this.listeners.size}`);
    };
  }

  notifyListeners() {
    console.log('🔔 Store: Уведомление слушателей, лайков:', this.likedTracks.size);
    this.listeners.forEach(listener => {
      try {
        listener(this.likedTracks);
      } catch (error) {
        console.error('❌ Store: Ошибка в слушателе:', error);
      }
    });
  }

  // Очистка всех данных
  clear() {
    this.likedTracks.clear();
    this.clearLocalStorage();
    this.notifyListeners();
  }

  // Синхронизация с сервером
  syncWithServer() {
    if (this.sessionToken) {
      this.loadFromServer();
    }
  }
}

// Создаем и экспортируем единственный экземпляр
const likedTracksStore = new LikedTracksStore();
export { likedTracksStore };