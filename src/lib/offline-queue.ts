/**
 * Offline-resilient workout persistence.
 *
 * A logged session is written straight to the backend when the network is
 * available. If the request fails (offline, flaky gym wifi, server hiccup) the
 * payload is stored in IndexedDB and replayed automatically as soon as the
 * connection returns — the user never loses a set and the app never crashes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PendingWorkout } from "@/types/workout";

const DB_NAME = "ironlog-outbox";
const STORE = "workouts";

type QueuedWorkout = PendingWorkout & { id?: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueWorkout(payload: PendingWorkout): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("No offline storage available");
  await tx("readwrite", (s) => s.add(payload) as IDBRequest<IDBValidKey>);
}

export async function pendingWorkoutCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  try {
    return await tx<number>("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

/** Writes one session + its sets. Throws on any backend error. */
async function pushWorkout(w: PendingWorkout): Promise<void> {
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: w.userId,
      day: w.day,
      title: w.title,
      performed_at: w.performedAt,
    })
    .select("id")
    .single();
  if (sErr) throw sErr;

  const { error: lErr } = await supabase.from("set_logs").insert(
    w.rows.map((r) => ({ ...r, session_id: session!.id, user_id: w.userId })),
  );
  if (lErr) throw lErr;
}

/**
 * Saves a workout. Returns how it was persisted so the UI can tell the user.
 */
export async function saveWorkout(
  payload: PendingWorkout,
): Promise<{ status: "synced" | "queued" }> {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      await pushWorkout(payload);
      return { status: "synced" };
    } catch (err) {
      // Only queue on transport-level failures; surface real validation errors.
      if (!isNetworkError(err)) throw err;
    }
  }
  await enqueueWorkout(payload);
  return { status: "queued" };
}

function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch|network|timeout|offline|Failed to send/i.test(msg);
}

let flushing = false;

/** Replays every queued workout. Safe to call repeatedly. */
export async function flushWorkoutQueue(): Promise<number> {
  if (flushing || typeof indexedDB === "undefined") return 0;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  flushing = true;
  let synced = 0;
  try {
    const items = await tx<QueuedWorkout[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedWorkout[]>);
    for (const item of items) {
      try {
        await pushWorkout(item);
        if (item.id != null) await tx("readwrite", (s) => s.delete(item.id!) as unknown as IDBRequest<undefined>);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) break; // still offline — retry later
        // Permanent failure (e.g. rejected row): drop it so we don't loop.
        if (item.id != null) await tx("readwrite", (s) => s.delete(item.id!) as unknown as IDBRequest<undefined>);
      }
    }
  } finally {
    flushing = false;
  }
  return synced;
}
