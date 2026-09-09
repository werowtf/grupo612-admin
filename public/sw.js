// Service worker mínimo: sólo existe para que el navegador considere la app
// "instalable" como PWA. No cachea nada — todo se sirve siempre de la red,
// para no arriesgarnos a servir datos financieros desactualizados offline.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Sin caché: deja pasar todas las peticiones a la red tal cual.
});
