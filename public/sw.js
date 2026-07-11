// IronLog service worker — full offline + background sync.
//
// Strategies:
//   - install: precache app shell (/, /offline.html, manifest, icons)
//   - HTML navigations: NetworkFirst → cached shell ("/") → /offline.html
//   - Same-origin static assets (script/style/image/font): CacheFirst with
//     background revalidate. Once seen online, they work offline forever.
//   - Supabase / API mutations while offline: queued via IndexedDB and
//     replayed on the `sync` event when connectivity returns.

const VERSION = "v6";
const SHELL_CACHE = `ironlog-shell-${VERSION}`;
const RUNTIME_CACHE = `ironlog-runtime-${VERSION}`;
const DATA_CACHE = `ironlog-data-${VERSION}`;

const APP_SHELL_URL = "/";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  APP_SHELL_URL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/screenshot-mobile.jpg",
  "/screenshot-desktop.jpg",
];

// ---------- Install / Activate ----------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* ignore individual failures */
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
          .filter(
            (k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && k !== DATA_CACHE,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------- Fetch routing ----------

const ASSET_DESTS = new Set(["script", "style", "image", "font"]);

function isSupabaseHost(url) {
  return /\.supabase\.co$/.test(url.hostname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ---- Cross-origin: only handle Supabase for offline queue + read cache.
  if (url.origin !== self.location.origin) {
    if (isSupabaseHost(url)) {
      event.respondWith(handleSupabase(req));
    }
    return;
  }

  if (req.method !== "GET") return;

  // Same-origin API / server-fn / build assets → NetworkFirst with cache fallback.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_serverFn")
  ) {
    event.respondWith(networkFirst(req, DATA_CACHE));
    return;
  }

  // HTML navigations → NetworkFirst with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const fresh = await fetch(req);
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
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
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
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok && req.method === "GET") {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }
}

// ---------- Supabase handling: cache GETs, queue mutations offline ----------

async function handleSupabase(req) {
  if (req.method === "GET") {
    return networkFirst(req, DATA_CACHE);
  }
  // Mutation: try the network. On failure, queue and register a sync.
  try {
    return await fetch(req.clone());
  } catch {
    try {
      await queueRequest(req.clone());
      await registerSync();
      return new Response(
        JSON.stringify({ queued: true, offline: true }),
        { status: 202, headers: { "content-type": "application/json" } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "offline-queue-failed", message: String(err) }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }
  }
}

// ---------- IndexedDB queue ----------

const DB_NAME = "ironlog-sync";
const DB_STORE = "queue";

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function queueRequest(req) {
  const body = await req.arrayBuffer();
  const headers = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  const entry = {
    url: req.url,
    method: req.method,
    headers,
    body,
    ts: Date.now(),
  };
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteQueued(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function registerSync() {
  try {
    if ("sync" in self.registration) {
      await self.registration.sync.register("ironlog-sync-queue");
    }
  } catch {
    /* not supported — will retry on next mutation */
  }
}

async function flushQueue() {
  const items = await readAllQueued();
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body:
          item.method === "GET" || item.method === "HEAD"
            ? undefined
            : item.body,
      });
      if (res && (res.ok || (res.status >= 400 && res.status < 500))) {
        // Drop on success or permanent client error to avoid infinite retries.
        await deleteQueued(item.id);
      }
    } catch {
      // Leave in queue for the next sync opportunity.
    }
  }
  // Let the app refetch fresh data.
  const clientsList = await self.clients.matchAll({ type: "window" });
  clientsList.forEach((c) =>
    c.postMessage({ type: "ironlog-sync-flushed", at: Date.now() }),
  );
}

self.addEventListener("sync", (event) => {
  if (event.tag === "ironlog-sync-queue") {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ironlog-flush-now") {
    event.waitUntil(flushQueue());
  }
});
