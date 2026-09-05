import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, ChevronRight, Plus, Flame, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, subDays } from "date-fns";
import { SplitCard } from "@/components/SplitCard";
import { QuickImportDialog, type ImportedDraft } from "@/components/QuickImportDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSplitAccent } from "@/lib/split-accent";
import { resolveDisplayName, useProfile } from "@/lib/profile";
import heroLift from "@/assets/hero-lift.jpg";


export const Route = createFileRoute("/")({
  component: Index,
});

type CustomDay = {
  id: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  exercises: unknown;
  muscle_groups: string[] | null;
  created_at: string;
};

function Index() {
  const { user, loading } = useAuth();
  const profile = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: splits, isLoading: splitsLoading } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CustomDay[]> => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, subtitle, accent, exercises, muscle_groups, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomDay[];
    },
  });

  // Pull a long window of sessions to power the infinite horizontal week
  // scroller. 26 weeks (~6 months) is plenty for a streak view; we extend
  // it client-side if the user scrolls further left.
  const { data: recent } = useQuery({
    queryKey: ["recent-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = subDays(new Date(), 26 * 7).toISOString();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, day, performed_at")
        .eq("user_id", user!.id)
        .gte("performed_at", since)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const performedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of recent ?? []) {
      const key = startOfDay(new Date(s.performed_at)).toISOString();
      if (!m.has(key)) m.set(key, s.day);
    }
    return m;
  }, [recent]);

  // Render N weeks ending today. Grows when user scrolls near the left edge.
  const [weeksToShow, setWeeksToShow] = useState(8);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const days = useMemo(() => {
    const out: { date: Date; active: boolean; label: string; splitId: string | null }[] = [];
    const total = weeksToShow * 7;
    for (let i = total - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = d.toISOString();
      out.push({
        date: d,
        active: performedMap.has(key),
        label: format(d, "EEEEE"),
        splitId: performedMap.get(key) ?? null,
      });
    }
    return out;
  }, [performedMap, weeksToShow]);

  // Scroll to the today edge on first paint, and grow the window when the
  // user scrolls near the start (infinite past-weeks scroll).
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [weeksToShow]);
  const onScrollerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollLeft < 64) {
      setWeeksToShow((w) => Math.min(w + 8, 52));
    }
  };


  const streak = useMemo(() => {
    const set = new Set(
      (recent ?? []).map((s) =>
        startOfDay(new Date(s.performed_at)).toISOString(),
      ),
    );
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = startOfDay(subDays(new Date(), i));
      if (set.has(d.toISOString())) s++;
      else if (i > 0) break;
    }
    return s;
  }, [recent]);

  const upNext = useMemo(() => {
    if (!splits || splits.length === 0) return null;
    const lastSession = recent?.[0];
    if (!lastSession) return splits[0];
    const lastIdx = splits.findIndex((s) => s.id === lastSession.day);
    if (lastIdx === -1) return splits[0];
    return splits[(lastIdx + 1) % splits.length];
  }, [splits, recent]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.display_name as string | undefined) ??
    null;
  const firstName = resolveDisplayName(profile, { fullName, email: user.email });

  const deleteSplit = (id: string, name: string) => setPendingDelete({ id, name });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    const { error } = await supabase.from("custom_workout_days").delete().eq("id", id).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Split deleted");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user.id] });
    }
  };

  const handleImport = async (draft: ImportedDraft) => {
    setImporting(true);
    try {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .insert({
          user_id: user.id,
          name: draft.name,
          subtitle: draft.subtitle || null,
          accent: "primary",
          muscle_groups: draft.muscleGroups,
          exercises: draft.exercises,
        })
        .select("id")
        .single();
      if (error) throw error;
      setImportOpen(false);
      toast.success("Routine imported");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user.id] });
      navigate({ to: "/day/$day", params: { day: data!.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save routine");
    } finally {
      setImporting(false);
    }
  };

  const dialogs = (
    <>
      <QuickImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onApply={handleImport}
        applying={importing}
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Split?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {pendingDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Empty state
  if (!splitsLoading && (splits?.length ?? 0) === 0) {

    return (
      <main className="mx-auto max-w-3xl px-5 py-12 animate-fade-in-up">
        <div className="glass relative overflow-hidden rounded-3xl p-10 text-center">
          <div
            aria-hidden
            className="absolute -inset-1 -z-10 opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-4xl">
            Your journey starts here.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create your first custom workout split to start tracking sets, weights and progress.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="lg"
              className="font-bold shadow-[var(--shadow-glow)]"
              onClick={() => navigate({ to: "/custom/new" })}
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Split
            </Button>
            <Button size="lg" variant="outline" className="font-bold" onClick={() => setImportOpen(true)}>
              <Zap className="mr-2 h-4 w-4" /> Quick Import Routine
            </Button>
          </div>
        </div>
        {dialogs}
      </main>

    );
  }

  return (
    <main className="pb-4">
      {/* Cinematic hero */}
      <section className="relative -mt-[1px] h-[360px] w-full overflow-hidden md:h-[420px]">
        <img
          src={heroLift}
          alt="Athlete lifting a barbell in a dark gym"
          width={1024}
          height={1152}
          className="absolute inset-0 h-full w-full object-cover object-center contrast-125"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--background) 4%, color-mix(in oklab, var(--background) 55%, transparent) 45%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-7 mx-auto max-w-3xl px-5">
          <h1 className="text-display text-6xl leading-[0.85] tracking-tight md:text-7xl">
            HELLO,
            <br />
            <span className="text-primary">{firstName.toUpperCase()}</span>
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/70">
              {streak > 0 ? `${streak}-day streak` : "Let's lift"}
              {upNext ? ` • ${upNext.name}` : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5">
        {/* Activity strip */}
        <section className="animate-fade-in-up">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              Weekly activity
            </p>
            <p className="text-display text-xl leading-none">
              {days.filter((d) => d.active).length} SESSIONS
            </p>
          </div>
          <div
            ref={scrollerRef}
            onScroll={onScrollerScroll}
            className="no-scrollbar scroll-gpu -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1"
            style={{ scrollPaddingInline: 8 }}
          >
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              const split = d.splitId ? (splits ?? []).find((s) => s.id === d.splitId) : null;
              return (
                <div
                  key={d.date.toISOString()}
                  className="flex w-11 shrink-0 snap-end flex-col items-center gap-1.5"
                  title={`${format(d.date, "EEE, MMM d")}${split ? ` — ${split.name}` : ""}`}
                >
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-2 rounded-full transition-all",
                        d.active ? "bg-primary" : "bg-secondary",
                      )}
                      style={{ height: d.active ? "100%" : isToday ? "40%" : "28%" }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase",
                      isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-5 animate-fade-in-up">
          <Button
            size="lg"
            variant="outline"
            className="w-full font-bold uppercase tracking-wider"
            onClick={() => setImportOpen(true)}
          >
            <Zap className="mr-2 h-4 w-4 text-primary" /> Quick Import Routine
          </Button>
        </section>


        {/* Up Next — featured session */}
        {upNext && (
          <section className="relative mt-5 animate-fade-in-up stagger-1">
            <button
              type="button"
              onClick={() => deleteSplit(upNext.id, upNext.name)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition-colors hover:text-destructive"
              aria-label={`Delete ${upNext.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="glass-strong relative overflow-hidden rounded-[28px] p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
                style={{
                  background: `color-mix(in oklab, var(--${getSplitAccent(upNext.name, upNext.muscle_groups, upNext.accent ?? "primary")}) 14%, transparent)`,
                }}
              />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Next Session
                </span>
                <h2 className="text-display mt-2 text-4xl leading-none tracking-wide">
                  {upNext.name.toUpperCase()}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {upNext.subtitle ||
                    (Array.isArray(upNext.muscle_groups) && upNext.muscle_groups.length > 0
                      ? upNext.muscle_groups.join(" · ")
                      : "Your next session in the rotation")}
                  {" · "}
                  {Array.isArray(upNext.exercises) ? (upNext.exercises as unknown[]).length : 0} exercises
                </p>

                <Link
                  to="/day/$day"
                  params={{ day: upNext.id }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  <span className="text-display text-xl tracking-[0.15em]">START WORKOUT</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* My Programs */}
        <section className="mt-7 animate-fade-in-up stagger-2">
          <div className="mb-3 flex items-end justify-between">
            <h3 className="text-display text-2xl tracking-wide">MY PROGRAMS</h3>
            <Link
              to="/custom/new"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> New split
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(splits ?? []).map((s) => (
              <SplitCard key={s.id} split={s} onDelete={deleteSplit} />
            ))}

            <Link
              to="/custom/new"
              className="group flex min-h-[172px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center transition-colors hover:border-primary/50"
            >
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="text-display mt-2 text-lg tracking-wide">NEW SPLIT</div>
                <div className="text-[11px] text-muted-foreground">Build your own day</div>
              </div>
            </Link>
          </div>
        </section>
      </div>

      <footer className="mt-10 border-t border-border/60 px-5 py-6 text-center text-xs text-muted-foreground">
        <Link to="/progressive-overload-tracker" className="hover:text-foreground">
          How IronLog tracks progressive overload
        </Link>
      </footer>
      {dialogs}
    </main>
  );
}

