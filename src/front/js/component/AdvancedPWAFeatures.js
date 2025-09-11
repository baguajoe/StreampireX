// Advanced PWA Features for StreamPireX
// 1. Enhanced Background Sync Manager

class BackgroundSyncManager {
  constructor() {
    this.initializeSync();
  }

  async initializeSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      
      // Register different sync events
      await this.registerSyncEvents(registration);
    }
  }

  async registerSyncEvents(registration) {
    // Music upload sync
    await registration.sync.register('background-sync-music-uploads');
    
    // Social media posts sync
    await registration.sync.register('background-sync-social-posts');
    
    // Analytics data sync
    await registration.sync.register('background-sync-analytics');
    
    // Chat messages sync
    await registration.sync.register('background-sync-messages');
    
    // Radio station updates sync
    await registration.sync.register('background-sync-radio-updates');
  }

  // Queue music upload for background sync
  async queueMusicUpload(musicData) {
    await this.storeInIndexedDB('music-uploads', musicData);
    console.log('Music upload queued for background sync');
  }

  // Queue social post for background sync
  async queueSocialPost(postData) {
    await this.storeInIndexedDB('social-posts', postData);
    console.log('Social post queued for background sync');
  }

  async storeInIndexedDB(storeName, data) {
    // Implementation for IndexedDB storage
    const db = await this.openIndexedDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const request = store.add({
      id: Date.now(),
      data: data,
      timestamp: new Date(),
      synced: false
    });
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StreamPireXSync', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for different sync types
        if (!db.objectStoreNames.contains('music-uploads')) {
          db.createObjectStore('music-uploads', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('social-posts')) {
          db.createObjectStore('social-posts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
      };
    });
  }
}

// 2. Advanced Push Notification Manager
class PushNotificationManager {
  constructor() {
    this.setupPushNotifications();
  }

  async setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await this.requestPermission();
      
      if (permission === 'granted') {
        await this.subscribeToPush();
        this.setupNotificationHandlers();
      }
    }
  }

  async requestPermission() {
    return await Notification.requestPermission();
  }

  async subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await this.sendSubscriptionToServer(subscription);
      
      console.log('✅ Push notifications enabled');
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
    }
  }

  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('token');
    
    await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/push-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType()
      })
    });
  }

  setupNotificationHandlers() {
    // Handle notification clicks
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLICK') {
        // Navigate to specific page based on notification type
        this.handleNotificationClick(event.data.notificationData);
      }
    });
  }

  handleNotificationClick(data) {
    switch (data.type) {
      case 'music_upload_complete':
        window.location.href = '/music-distribution';
        break;
      case 'new_follower':
        window.location.href = '/profile';
        break;
      case 'radio_listener_milestone':
        window.location.href = '/radio-dashboard';
        break;
      case 'gaming_squad_invite':
        window.location.href = '/squad-finder';
        break;
      default:
        window.location.href = '/notifications';
    }
  }

  getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// 3. Offline Media Cache Manager
class OfflineMediaManager {
  constructor() {
    this.cacheName = 'streampirex-media-v1';
    this.maxCacheSize = 100; // Maximum number of media files to cache
  }

  // Cache user's favorite music for offline listening
  async cacheFavoriteMusic() {
    try {
      const favorites = await this.getFavoriteMusic();
      const cache = await caches.open(this.cacheName);
      
      for (const track of favorites.slice(0, this.maxCacheSize)) {
        if (track.audio_url) {
          try {
            await cache.add(track.audio_url);
            console.log(`✅ Cached: ${track.title}`);
          } catch (error) {
            console.warn(`⚠️ Failed to cache: ${track.title}`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Offline music caching failed:', error);
    }
  }

  // Cache podcast episodes for offline listening
  async cachePodcastEpisodes() {
    try {
      const subscriptions = await this.getPodcastSubscriptions();
      const cache = await caches.open(this.cacheName);
      
      for (const podcast of subscriptions) {
        const latestEpisodes = podcast.episodes.slice(0, 3); // Cache latest 3 episodes
        
        for (const episode of latestEpisodes) {
          if (episode.audio_url) {
            try {
              await cache.add(episode.audio_url);
              console.log(`✅ Cached episode: ${episode.title}`);
            } catch (error) {
              console.warn(`⚠️ Failed to cache episode: ${episode.title}`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Podcast caching failed:', error);
    }
  }

  async getFavoriteMusic() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/favorites/music`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : [];
  }

  async getPodcastSubscriptions() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast-subscriptions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : [];
  }

  // Smart cache management - remove old files when cache gets full
  async manageCacheSize() {
    const cache = await caches.open(this.cacheName);
    const keys = await cache.keys();
    
    if (keys.length > this.maxCacheSize) {
      // Remove oldest cached items
      const itemsToRemove = keys.slice(0, keys.length - this.maxCacheSize);
      
      for (const request of itemsToRemove) {
        await cache.delete(request);
        console.log(`🗑️ Removed from cache: ${request.url}`);
      }
    }
  }
}

// 4. App Shortcuts and Quick Actions
class AppShortcutsManager {
  constructor() {
    this.initializeShortcuts();
  }

  initializeShortcuts() {
    // Register keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'u':
            event.preventDefault();
            this.quickUpload();
            break;
          case 'm':
            event.preventDefault();
            this.openMusicDashboard();
            break;
          case 'r':
            event.preventDefault();
            this.openRadioStation();
            break;
          case 'g':
            event.preventDefault();
            this.openGamingHub();
            break;
          case 'p':
            event.preventDefault();
            this.openPodcasts();
            break;
        }
      }
    });

    // Add quick action buttons for frequent tasks
    this.addQuickActionButtons();
  }

  quickUpload() {
    // Show quick upload modal
    window.location.href = '/upload-music';
  }

  openMusicDashboard() {
    window.location.href = '/music-distribution';
  }

  openRadioStation() {
    window.location.href = '/radio-dashboard';
  }

  openGamingHub() {
    window.location.href = '/gaming';
  }

  openPodcasts() {
    window.location.href = '/browse-podcast-categories';
  }

  addQuickActionButtons() {
    // Create floating action button for quick access
    const fab = document.createElement('div');
    fab.className = 'floating-action-button';
    fab.innerHTML = `
      <button class="fab-main" title="Quick Actions">⚡</button>
      <div class="fab-menu hidden">
        <button onclick="window.location.href='/upload-music'" title="Upload Music">🎵</button>
        <button onclick="window.location.href='/social-dashboard'" title="Social Posts">📱</button>
        <button onclick="window.location.href='/radio-dashboard'" title="Radio">📻</button>
        <button onclick="window.location.href='/gaming'" title="Gaming">🎮</button>
      </div>
    `;

    // Add CSS for floating action button
    const style = document.createElement('style');
    style.textContent = `
      .floating-action-button {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 1000;
      }
      
      .fab-main {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF6600, #FF8533);
        color: white;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
        transition: all 0.3s ease;
      }
      
      .fab-main:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(255, 102, 0, 0.4);
      }
      
      .fab-menu {
        position: absolute;
        bottom: 70px;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .fab-menu button {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #004080;
        color: white;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 64, 128, 0.3);
        transition: all 0.3s ease;
      }
      
      .fab-menu button:hover {
        transform: scale(1.1);
        background: #0056b3;
      }
      
      .hidden {
        display: none;
      }
      
      @media (max-width: 768px) {
        .floating-action-button {
          bottom: 100px;
          right: 15px;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(fab);

    // Toggle menu on click
    const fabMain = fab.querySelector('.fab-main');
    const fabMenu = fab.querySelector('.fab-menu');

    fabMain.addEventListener('click', () => {
      fabMenu.classList.toggle('hidden');
    });

    // Hide menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!fab.contains(event.target)) {
        fabMenu.classList.add('hidden');
      }
    });
  }
}

// 5. PWA Update Manager
class PWAUpdateManager {
  constructor() {
    this.checkForUpdates();
  }

  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Handle update found
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });
    }
  }

  showUpdateNotification() {
    // Show update notification to user
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-notification';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span>🚀 StreamPireX has been updated!</span>
        <button onclick="window.location.reload()" class="update-btn">Refresh</button>
        <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">Later</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .update-notification {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #004080, #0056b3);
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }
      
      .update-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .update-btn, .dismiss-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      
      .update-btn {
        background: #FF6600;
        color: white;
      }
      
      .update-btn:hover {
        background: #FF8533;
        transform: translateY(-1px);
      }
      
      .dismiss-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }
      
      .dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(updateBanner, document.body.firstChild);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (updateBanner.parentElement) {
        updateBanner.remove();
      }
    }, 10000);
  }
}

// Initialize all advanced PWA features
export function initializeAdvancedPWAFeatures() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFeatures();
    });
  } else {
    initFeatures();
  }

  function initFeatures() {
    new BackgroundSyncManager();
    new PushNotificationManager();
    new OfflineMediaManager();
    new AppShortcutsManager();
    new PWAUpdateManager();
    
    console.log('🚀 StreamPireX Advanced PWA Features Initialized');
  }
}

// Auto-initialize when imported
initializeAdvancedPWAFeatures();