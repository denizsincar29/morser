const CACHE_NAME = 'morser-v2.2.9';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './js/app.js',
    './js/together.js',
    './js/morse-audio.js',
    './js/morse-data.js',
    './js/morse-decoder.js',
    './js/kmeans.js',
    './languages/en.json',
    './languages/ru.json',
    './languages/de.json',
    './languages/tr.json',
    './src/sounds/dot.wav',
    './src/sounds/dash.wav',
    './src/sounds/dot2.wav',
    './src/sounds/dash2.wav',
    './src/sounds/dkmstart.wav',
    './src/sounds/dkmend.wav',
    './src/sounds/start.wav',
    './src/sounds/end.wav',
    './src/sounds/beep.ogg',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
