import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Dumbbell } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, type DayKey } from "@/lib/exercises";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — IronLog" }, { name: "description", content: "Your workout history." }] }),
});

type SessionWithSets = {
  id: string;
  day: string;
  performed_at: string;
  sets: { exercise_name: string; set_number: number; weight: number | null; reps: number | null }[];
};

function HistoryPage() {
  const { user, loading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("id, day, performed_at")
        .order("performed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!sessions || sessions.length === 0) return [] as SessionWithSets[];

      const ids = sessions.map((s) => s.id);
      const { data: sets, error: e2 } = await supabase
        .from("set_logs")
        .select("session_id, exercise_name, set_number, weight, reps")
        .in("session_id", ids)
        .order("set_number", { ascending: true });
      if (e2) throw e2;

      return sessions.map((s) => ({
        ...s,
        sets: (sets ?? []).filter((x) => x.session_id === s.id),
      })) as SessionWithSets[];
    },
  });

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">History</h1>
      <p className="text-sm text-muted-foreground">Every session. Every set. Track the overload.</p>

      {isLoading ? (
        <div className="mt-10 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-semibold">No workouts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Log your first session to see it here.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary underline">
            Pick a workout
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {data.map((s) => {
            const cfg = DAYS[s.day as DayKey];
            const accent = cfg?.accent ?? "primary";
            // group sets by exercise
            const grouped = new Map<string, typeof s.sets>();
            for (const x of s.sets) {
              const arr = grouped.get(x.exercise_name) ?? [];
              arr.push(x);
              grouped.set(x.exercise_name, arr);
            }
            return (
              <article key={s.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center justify-between border-b border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 22%, transparent)` }}
                    >
                      <Dumbbell className="h-5 w-5" style={{ color: `var(--${accent})` }} />
                    </div>
                    <div>
                      <div className="font-bold">{cfg?.name ?? s.day}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(s.performed_at), "EEE, MMM d · h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.sets.length} {s.sets.length === 1 ? "set" : "sets"}
                  </div>
                </header>

                <div className="divide-y divide-border/50">
                  {Array.from(grouped, ([ex, sets]) => (
                    <div key={ex} className="p-4">
                      <div className="mb-2 text-sm font-semibold">{ex}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sets.map((x) => (
                          <span
                            key={x.set_number}
                            className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums text-foreground"
                          >
                            <span className="text-muted-foreground">{x.set_number}.</span>{" "}
                            {x.weight ?? "—"}kg × {x.reps ?? "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
