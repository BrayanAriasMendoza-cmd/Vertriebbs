// Speichert die App-Dateien, damit sie ohne Netz startet.
const CACHE = 'vertrieb-v5';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'lib.js', 'xlsx.js', 'manifest.json', 'icon.svg', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
