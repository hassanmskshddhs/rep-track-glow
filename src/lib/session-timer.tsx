import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "ironlog:session:startedAt";

// Module-level mirror so imperative reads (e.g. on Log Workout) don't need to
// subscribe to the per-second tick.
let _startedAt: number | null = null;
const _listeners = new Set<(v: number | null) => void>();
function _setStartedAt(v: number | null) {
  _startedAt = v;
  _listeners.forEach((l) => l(v));
}

type Ctx = {
  startedAt: number | null;
  start: () => void;
  stop: () => void;
  /** Imperative read — does NOT subscribe / re-render. */
  getElapsedMs: () => number;
};

const SessionTimerContext = createContext<Ctx | null>(null);

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Hydrate from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        _setStartedAt(n);
        setStartedAt(n);
      }
    }
    const sub = (v: number | null) => setStartedAt(v);
    _listeners.add(sub);
    return () => { _listeners.delete(sub); };
  }, []);

  const start = useCallback(() => {
    if (_startedAt != null) return;
    const t = Date.now();
    try { window.localStorage.setItem(STORAGE_KEY, String(t)); } catch { /* noop */ }
    _setStartedAt(t);
  }, []);

  const stop = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    _setStartedAt(null);
  }, []);

  const getElapsedMs = useCallback(
    () => (_startedAt != null ? Math.max(0, Date.now() - _startedAt) : 0),
    [],
  );

  return (
    <SessionTimerContext.Provider value={{ startedAt, start, stop, getElapsedMs }}>
      {children}
    </SessionTimerContext.Provider>
  );
}

export function useSessionTimer() {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) throw new Error("useSessionTimer must be used inside SessionTimerProvider");
  return ctx;
}

/**
 * Local-only ticker. Mounting this hook starts an interval that only updates
 * the component that called it — keeps the per-second re-render scoped to a
 * single text node (the stopwatch badge).
 */
export function useElapsedMs(): number {
  const [, force] = useState(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    let id: number | null = null;
    const tick = () => {
      const next = _startedAt != null ? Math.max(0, Date.now() - _startedAt) : 0;
      if (next !== elapsedRef.current) {
        elapsedRef.current = next;
        force((n) => (n + 1) | 0);
      }
    };
    tick();
    id = window.setInterval(tick, 1000);
    const sub = () => tick();
    _listeners.add(sub);
    return () => {
      if (id != null) window.clearInterval(id);
      _listeners.delete(sub);
    };
  }, []);
  return elapsedRef.current;
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
