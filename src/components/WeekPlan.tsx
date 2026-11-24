import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { CustomDay } from "@/lib/db";
export function WeekPlan({
  routines,
  userId,
}: {
  routines: Pick<CustomDay, "id" | "name">[];
  userId?: string;
}) {
  const key = `ironlog:forged:schedule:${userId || "local"}`;
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setReady(false);
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      setSchedule(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
    } catch {
      setSchedule({});
    }
    setReady(true);
  }, [key]);
  function update(day: string, value: string) {
    const next = { ...schedule, [day]: value };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSchedule(next);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold">Your week</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Optional schedule. Saved on this device, separate from your workout history.
      </p>
      {storageError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          This device could not save your schedule. Your routines are unchanged.
        </p>
      )}
      <div className="mt-4 divide-y divide-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="flex items-center gap-3 py-3">
            <span className="w-10 text-xs font-semibold text-muted-foreground">{day}</span>
            <select
              disabled={!ready}
              aria-label={`${day} routine`}
              value={schedule[day] || ""}
              onChange={(e) => update(day, e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="">Unscheduled</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
              {schedule[day] && !routines.some((r) => r.id === schedule[day]) && (
                <option value={schedule[day]}>Unavailable routine</option>
              )}
            </select>
            {schedule[day] && routines.some((r) => r.id === schedule[day]) && (
              <Link
                to="/day/$day"
                params={{ day: schedule[day] }}
                className="flex h-11 w-11 items-center justify-center text-primary"
                aria-label={`Open ${day} workout`}
              >
                →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
