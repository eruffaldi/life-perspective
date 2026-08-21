/**
 * Service worker: rende l'applicazione utilizzabile senza rete anche quando
 * arriva da GitHub Pages invece che da un file su disco.
 *
 * La strategia è la più semplice possibile perché l'applicazione è un file
 * solo: si precarica tutto all'installazione e da quel momento si serve dalla
 * cache, senza mai interrogare la rete per il contenuto. Una strategia
 * "network first" qui sarebbe solo un modo di essere lenti e fragili.
 *
 * Il segnaposto nella costante qui sotto viene sostituito in fase di build con
 * l'impronta dell'artefatto: cambia il nome della cache e costringe il browser
 * a rifare il precarico quando il contenuto cambia davvero.
 */
const VERSION = "__BUILD__";
const CACHE = "prospettiva-" + VERSION;

const PRECACHE = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // `reload` evita che il precarico peschi una copia stantia dalla cache HTTP.
    await cache.addAll(PRECACHE.map(url => new Request(url, { cache: "reload" })));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("prospettiva-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Navigazione verso un percorso non precaricato: si torna alla pagina.
    if (request.mode === "navigate") {
      const shell = await caches.match("index.html");
      if (shell) return shell;
    }
    try {
      return await fetch(request);
    } catch {
      return new Response("Non disponibile offline.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});

// La pagina chiede di saltare l'attesa quando l'utente accetta l'aggiornamento.
self.addEventListener("message", event => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
