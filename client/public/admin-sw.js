self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally do not call respondWith() or use Cache Storage. Admin pages,
// API responses, login links, and personal/payment records must remain online
// and must never be stored by this service worker.
self.addEventListener("fetch", () => {});
