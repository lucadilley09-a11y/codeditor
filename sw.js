/* Quill service worker: caches the app so it opens offline. CDN assets (editor engine, Python) are cached after first use. */
const VERSION = 'cd-v11';
const SHELL = ['./', 'index.html', 'css/app.css', 'icon.svg', 'manifest.json',
  'js/util.js', 'js/langs.js', 'js/themes.js', 'js/fs.js', 'js/editor-lite.js', 'js/editor.js', 'js/runner.js', 'js/tutor-data.js', 'js/tutor.js',
  'js/langinfo.js', 'js/courses/_kit.js', 'js/courses/web.js', 'js/courses/game.js', 'js/courses/javascript.js', 'js/courses/python.js', 'js/courses/more.js', 'js/courses/more2.js', 'js/courses/ext-js.js', 'js/courses/ext-py.js', 'js/courses/ext-web.js', 'js/courses/ext-more.js', 'js/courses/ext-more2.js', 'js/courses/ext-more3.js', 'js/courses/projects.js', 'js/courses/projects2.js', 'js/courses/projects3.js', 'js/gen/core.js', 'js/gen/js.js', 'js/gen/game.js', 'js/gen/dom.js', 'js/gen/py.js', 'js/gen/cs.js', 'js/gen/lua.js', 'js/gen/cpp.js', 'js/gen/build.js', 'js/learn.js', 'js/progress.js', 'js/extensions.js', 'js/app.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== 'quill-cdn').map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // network first for app files so updates show up, cache as fallback
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else if (/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    // cache first for versioned CDN files
    e.respondWith(caches.open('quill-cdn').then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
  }
});
