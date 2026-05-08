import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell, ChevronRight, Flame, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { DAYS, DAY_KEYS } from "@/lib/exercises";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  const { data: customDays, refetch } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, subtitle, accent, exercises")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  const deleteCustom = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Logged sessions will stay in History.`)) return;
    const { error } = await supabase.from("custom_workout_days").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Workout deleted");
      refetch();
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Flame className="h-3.5 w-3.5" /> Today's grind
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
          Pick your <span className="text-primary">workout</span>.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Log every set. Track every kilo. Beat last week.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {DAY_KEYS.map((key) => {
          const d = DAYS[key];
          return (
            <Link
              key={key}
              to="/day/$day"
              params={{ day: key }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-card)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50"
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: `var(--${d.accent})` }} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Day · {key}
                  </div>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{d.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{d.subtitle}</p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklab, var(--${d.accent}) 18%, transparent)` }}
                >
                  <Dumbbell className="h-5 w-5" style={{ color: `var(--${d.accent})` }} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.exercises.length} exercises</span>
                <span className="flex items-center gap-1 font-medium text-primary">
                  Start <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}

        {(customDays ?? []).map((c) => {
          const accent = c.accent ?? "primary";
          const exCount = Array.isArray(c.exercises) ? (c.exercises as string[]).length : 0;
          return (
            <div key={c.id} className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-card)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: `var(--${accent})` }} />
              <Link to="/day/$day" params={{ day: c.id }} className="block p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Custom
                    </div>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{c.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{c.subtitle || "Your custom workout"}</p>
                  </div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 18%, transparent)` }}
                  >
                    <Dumbbell className="h-5 w-5" style={{ color: `var(--${accent})` }} />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{exCount} exercises</span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    Start <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.preventDefault(); deleteCustom(c.id, c.name); }}
                aria-label="Delete workout"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <Link
          to="/custom/new"
          className="group flex min-h-[180px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 p-6 text-center transition-all hover:border-primary/60 hover:bg-card/70"
        >
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-3 font-bold">New custom workout</div>
            <div className="text-xs text-muted-foreground">Build your own day</div>
          </div>
        </Link>
      </div>
    </main>
  );
}
