// IronLog service worker — robust offline support.
//
// Strategy:
//   - install: precache app shell (/, /offline.html, manifest, icons)
//   - HTML navigations: NetworkFirst → cached shell ("/") → /offline.html
//   - Same-origin static assets (script/style/image/font): CacheFirst with
//     background revalidate. Once seen online, they work offline forever.
//   - Supabase / API / cross-origin: pass-through (never cached).

const VERSION = "v4";
const SHELL_CACHE = `ironlog-shell-${VERSION}`;
const RUNTIME_CACHE = `ironlog-runtime-${VERSION}`;

const APP_SHELL_URL = "/";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  APP_SHELL_URL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/screenshot-mobile.jpg",
  "/screenshot-desktop.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            // Ignore individual failures (e.g. first install offline).
          }
        }),
      );
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
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
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

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Never cache API / server-fn endpoints.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/_build/")
  ) {
    return;
  }

  // HTML navigations → NetworkFirst with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const fresh = await fetch(req);
          // Update the shell snapshot whenever we successfully fetch HTML.
          cache.put(APP_SHELL_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cachedShell = await cache.match(APP_SHELL_URL);
          if (cachedShell) return cachedShell;
          const offline = await cache.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response("<h1>Offline</h1>", {
            status: 503,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  // Static assets → CacheFirst, revalidate in background.
  if (ASSET_DESTS.has(req.destination)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        if (cached) {
          // Background refresh; ignore failures.
          fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            })
            .catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      })(),
    );
  }
});
