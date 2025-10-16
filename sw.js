const CACHE_NAME = 'morser-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/manifest.json',
    '/js/morse-data.js',
    '/js/kmeans.js',
    '/js/morse-decoder.js',
    '/js/morse-audio.js',
    '/js/app.js',
    '/languages/en.json',
    '/languages/ru.json',
    '/languages/de.json',
    '/languages/tr.json',
    '/src/sounds/beep.ogg',
    '/src/sounds/dot.wav',
    '/src/sounds/dash.wav',
    '/src/sounds/dot2.wav',
    '/src/sounds/dash2.wav',
    '/src/sounds/dkmstart.wav',
    '/src/sounds/dkmend.wav',
    '/src/sounds/start.wav',
    '/src/sounds/end.wav'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
