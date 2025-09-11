// StreamPireX PWA Service Worker
const CACHE_NAME = 'streampirex-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Core files to cache immediately
const CORE_CACHE_FILES = [
  '/',
  '/offline.html',
  '/src/front/styles/index.css',
  '/src/front/styles/MusicDistribution.css', 
  '/src/front/styles/PricingPlans.css',
  '/src/front/styles/ProductUploadForm.css',
  '/src/front/js/pages/home.js',
  '/manifest.json'
];

// Runtime cache patterns
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: ['css', 'js', 'png', 'jpg', 'jpeg', 'svg', 'woff', 'woff2'],
  // Network first for API calls
  NETWORK_FIRST: ['/api/', '/user/'],
  // Stale while revalidate for audio/video
  STALE_WHILE_REVALIDATE: ['mp3', 'mp4', 'wav', 'webm']
};

// Install event - cache core files
self.addEventListener('install', (event) => {
  console.log('🔧 StreamPireX SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 SW: Caching core files');
        return cache.addAll(CORE_CACHE_FILES);
      })
      .then(() => {
        console.log('✅ SW: Core files cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ SW: Cache core files failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 StreamPireX SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('🗑️ SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ SW: Activated and old caches cleaned');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const fileExtension = getFileExtension(url.pathname);
  
  // Handle different caching strategies
  if (CACHE_STRATEGIES.CACHE_FIRST.includes(fileExtension)) {
    event.respondWith(cacheFirst(event.request));
  } else if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/user/')) {
    event.respondWith(networkFirst(event.request));
  } else if (CACHE_STRATEGIES.STALE_WHILE_REVALIDATE.includes(fileExtension)) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

// Cache First Strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache First failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy - for API calls and dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate - for media files
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Update cache in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Return cached version immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-social-posts') {
    event.waitUntil(syncSocialPosts());
  } else if (event.tag === 'background-sync-music-uploads') {
    event.waitUntil(syncMusicUploads());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 SW: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update from StreamPireX',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'streampirex-notification',
    actions: [
      {
        action: 'open-app',
        title: 'Open StreamPireX'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('StreamPireX', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open-app') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
function getFileExtension(path) {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

async function syncSocialPosts() {
  try {
    // Get queued social posts from IndexedDB
    const queuedPosts = await getQueuedSocialPosts();
    
    for (const post of queuedPosts) {
      try {
        const response = await fetch('/api/social/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${post.token}`
          },
          body: JSON.stringify(post.data)
        });
        
        if (response.ok) {
          await removeQueuedPost(post.id);
          console.log('✅ SW: Synced social post:', post.id);
        }
      } catch (error) {
        console.error('❌ SW: Failed to sync social post:', error);
      }
    }
  } catch (error) {
    console.error('❌ SW: Social posts sync failed:', error);
  }
}

async function syncMusicUploads() {
  try {
    // Get queued music uploads from IndexedDB
    const queuedUploads = await getQueuedMusicUploads();
    
    for (const upload of queuedUploads) {
      try {
        const formData = new FormData();
        formData.append('audio', upload.file);
        formData.append('title', upload.title);
        formData.append('artist', upload.artist);
        
        const response = await fetch('/api/upload-audio', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${upload.token}`
          },
          body: formData
        });
        
        if (response.ok) {
          await removeQueuedUpload(upload.id);
          console.log('✅ SW: Synced music upload:', upload.id);
        }
      } catch (error) {
        console.error('❌ SW: Failed to sync upload:', error);
      }
    }
  } catch (error) {
    console.error('❌ SW: Music uploads sync failed:', error);
  }
}

// IndexedDB helpers (simplified - implement full IndexedDB operations)
async function getQueuedSocialPosts() {
  // Implement IndexedDB query for queued social posts
  return [];
}

async function getQueuedMusicUploads() {
  // Implement IndexedDB query for queued uploads
  return [];
}

async function removeQueuedPost(id) {
  // Implement IndexedDB removal
}

async function removeQueuedUpload(id) {
  // Implement IndexedDB removal
}