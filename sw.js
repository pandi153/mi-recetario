// Service worker de Pandi recetas: red primero; si no hay conexión, copia guardada.
// Guarda también las librerías externas (jsdelivr) para que la app abra sin cobertura.
const V = 'pandi-v32';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin, lib = u.hostname === 'cdn.jsdelivr.net';
  if (e.request.method !== 'GET' || (!mine && !lib)) return;
  e.respondWith(
    fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(ca => ca.put(e.request, c)).catch(() => {}); return r; })
      .catch(() => caches.match(e.request).then(m => m || (mine ? caches.match('./index.html') : Response.error())))
  );
});

// Avisos push (los envía la función «push» de Supabase)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { title: 'Pandi recetas', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Pandi recetas', { body: d.body || '', tag: d.tag || undefined, data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
