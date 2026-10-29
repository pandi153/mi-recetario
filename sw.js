// Service worker de Pandi recetas: red primero; si no hay conexión, copia guardada.
// Guarda también las librerías externas (jsdelivr) para que la app abra sin cobertura.
const V = 'pandi-v63';
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
  const tag = d.tag || '', o = { body: d.body || '', tag: tag || undefined, data: { tag } };
  if (tag.indexOf('cook|') === 0) o.actions = [{ action: 'yes', title: '✅ Sí, la cociné' }, { action: 'no', title: 'No' }];
  e.waitUntil(self.registration.showNotification(d.title || 'Pandi recetas', o));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const tag = (e.notification.data && e.notification.data.tag) || '';
  if (e.action === 'no') return;
  let cooked = '';
  if (tag.indexOf('cook|') === 0 && e.action === 'yes') { const p = tag.split('|'); cooked = p[1] + '|' + p[2] + '|' + p[3]; }
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if (cooked) c.postMessage({ cooked }); return c.focus(); } }
    return clients.openWindow(cooked ? './?cooked=' + encodeURIComponent(cooked) : './');
  }));
});
