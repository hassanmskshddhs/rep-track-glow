// IronLog service worker — minimal, safe offline support.
// Strategy:
//   - HTML navigations: NetworkFirst (so new builds always replace the shell
//     when online; falls back to last cached shell when offline).
//   - Static same-origin GET assets (js/css/img/fonts): StaleWhileRevalidate.
//   - Everything else (Supabase, APIs, cross-origin): pass-through, never cached.

const VERSION = "v1";
const RUNTIME_CACHE = `ironlog-runtime-${VERSION}`;
const SHELL_CACHE = `ironlog-shell-${VERSION}`;
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // ignore — first install offline
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== RUNTIME_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

const ASSET_DESTS = new Set(["script", "style", "image", "font"]);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Skip Supabase / api endpoints under our origin
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn")) return;

  // HTML navigation → NetworkFirst
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(OFFLINE_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(OFFLINE_URL);
          return (
            cached ??
            new Response("<h1>Offline</h1>", {
              status: 503,
              headers: { "content-type": "text/html; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets → StaleWhileRevalidate
  if (ASSET_DESTS.has(req.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return cached ?? (await network) ?? new Response("", { status: 504 });
      })(),
    );
  }
});
