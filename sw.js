/* ==========================================================================
   OCR Brillance — service worker de l'app Atelier (atelier.ocrbrillance.com)
   · L'app s'ouvre instantanément : la coquille vient du téléphone.
   · Les PAGES passent TOUJOURS par le réseau d'abord. Règle absolue pour une
     caisse : personne ne doit travailler sur une vieille version.
   · Les appels à la base (Supabase) ne sont JAMAIS mis en cache — ni les
     chiffres, ni les clients, ni les sessions. Hors ligne, l'app s'ouvre et
     affiche son bandeau « ⛔ Hors ligne », elle n'invente aucune donnée.
   ========================================================================== */
const CACHE = 'ocr-atelier-v1';
const COQUILLE = ['/', 'icon.png', 'icon-192.png', 'icon-512.png', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.host.includes('supabase.co')) return;   // données vivantes : jamais en cache

  // pages : réseau d'abord, cache seulement si le réseau est tombé
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copie = r.clone();
        caches.open(CACHE).then(c => c.put('/', copie));
        return r;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // icônes, polices, bibliothèque Supabase : cache d'abord (ouverture instantanée)
  const cachable = url.origin === location.origin ||
                   /jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host);
  if (cachable) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        const copie = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return r;
      }))
    );
  }
});
