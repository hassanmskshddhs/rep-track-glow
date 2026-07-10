// Tiny IndexedDB-backed store for per-split custom background images.
// Values are stored as data URLs (base64) so they survive restarts and can
// be dropped straight into a CSS background-image url(). Falls back to
// localStorage on environments where IndexedDB isn't available.

const DB_NAME = "ironlog";
const STORE = "card_images";
const LS_PREFIX = "ironlog:card-image:";

function hasIDB() {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCardImage(id: string): Promise<string | null> {
  if (!hasIDB()) {
    try {
      return localStorage.getItem(LS_PREFIX + id);
    } catch {
      return null;
    }
  }
  try {
    const db = await openDB();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCardImage(id: string, dataUrl: string): Promise<void> {
  if (!hasIDB()) {
    try {
      localStorage.setItem(LS_PREFIX + id, dataUrl);
    } catch {
      /* quota */
    }
    return;
  }
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCardImage(id: string): Promise<void> {
  if (!hasIDB()) {
    try {
      localStorage.removeItem(LS_PREFIX + id);
    } catch {
      /* ignore */
    }
    return;
  }
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Downscale a File to a JPEG data URL to keep IDB entries small.
export async function fileToCardDataUrl(
  file: File,
  maxDim = 1200,
  quality = 0.82,
): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
