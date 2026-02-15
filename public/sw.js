// Service Worker for Masjid Irshad Push Notifications
// Handles both Web Push and local notifications

const CACHE_NAME = 'masjid-irshad-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle Web Push notifications from server
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let data = {
    title: 'Masjid Irshad',
    body: 'New notification',
    icon: '/masjid-irshad-logo.png',
    badge: '/masjid-irshad-logo.png',
    tag: 'masjid-notification',
    requireInteraction: true,
    data: { url: '/' },
  };

  // Parse push data
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
      console.log('[SW] Push data parsed:', data);
    } catch (e) {
      console.log('[SW] Push data as text:', event.data.text());
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/masjid-irshad-logo.png',
    badge: data.badge || '/masjid-irshad-logo.png',
    tag: data.tag || 'masjid-notification',
    requireInteraction: data.requireInteraction !== false,
    renotify: true,
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'listen', title: '🎧 Listen Now' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    timestamp: Date.now(),
  };

  console.log('[SW] Showing notification:', data.title, options);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW] Push notification shown'))
      .catch((err) => console.error('[SW] Push notification error:', err))
  );
});

// Handle notification click - open app and scroll to live section
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate the client to the target URL (supports hash fragments)
          client.postMessage({ 
            type: 'NOTIFICATION_CLICK', 
            url: urlToOpen 
          });
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen.startsWith('/') ? urlToOpen : '/' + urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    // Show notification immediately with enhanced options
    self.registration.showNotification(title, {
      ...options,
      icon: options.icon || '/masjid-irshad-logo.png',
      badge: options.badge || '/masjid-irshad-logo.png',
      requireInteraction: options.requireInteraction !== false,
      renotify: true,
      vibrate: options.vibrate || [200, 100, 200, 100, 200],
      timestamp: Date.now(),
    }).then(() => {
      console.log('[SW] Local notification shown successfully');
    }).catch((error) => {
      console.error('[SW] Failed to show local notification:', error);
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    // Re-subscribe with new subscription
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('[SW] Re-subscribed successfully');
        // Notify the app about the new subscription
        return clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription.toJSON(),
            });
          });
        });
      })
      .catch((err) => {
        console.error('[SW] Re-subscription failed:', err);
      })
  );
});
