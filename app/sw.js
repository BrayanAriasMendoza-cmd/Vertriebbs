// Speichert die App-Dateien, damit sie ohne Netz startet.
const CACHE = 'vertrieb-v3';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'lib.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
