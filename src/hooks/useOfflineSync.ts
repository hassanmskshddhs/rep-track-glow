import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushWorkoutQueue, pendingWorkoutCount } from "@/lib/offline-queue";

/**
 * Watches connectivity and replays any workouts logged while offline.
 * Mounted once, at the app shell level.
 */
export function useOfflineSync() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);

    let cancelled = false;
    const flush = async () => {
      const pending = await pendingWorkoutCount();
      if (pending === 0) return;
      const synced = await flushWorkoutQueue();
      if (cancelled || synced === 0) return;
      qc.invalidateQueries();
      toast.success(
        synced === 1 ? "Offline workout synced" : `${synced} offline workouts synced`,
      );
    };

    const handleOnline = () => { setOnline(true); void flush(); };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void flush();

    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "ironlog-sync-flushed") void flush();
    };
    navigator.serviceWorker?.addEventListener?.("message", onSwMessage);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    };
  }, [qc]);

  return { online };
}
