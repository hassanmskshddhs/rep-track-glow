import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "ironlog:session:startedAt";

type Ctx = {
  startedAt: number | null;
  elapsedMs: number;
  start: () => void;
  stop: () => void;
};

const SessionTimerContext = createContext<Ctx | null>(null);

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setStartedAt(n);
    }
  }, []);

  // Tick every second while active
  useEffect(() => {
    if (startedAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const start = useCallback(() => {
    setStartedAt((prev) => {
      if (prev != null) return prev;
      const t = Date.now();
      try { window.localStorage.setItem(STORAGE_KEY, String(t)); } catch { /* noop */ }
      setNow(t);
      return t;
    });
  }, []);

  const stop = useCallback(() => {
    setStartedAt(null);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const elapsedMs = startedAt != null ? Math.max(0, now - startedAt) : 0;

  return (
    <SessionTimerContext.Provider value={{ startedAt, elapsedMs, start, stop }}>
      {children}
    </SessionTimerContext.Provider>
  );
}

export function useSessionTimer() {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) throw new Error("useSessionTimer must be used inside SessionTimerProvider");
  return ctx;
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
