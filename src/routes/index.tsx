import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Zap, Play, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, subDays } from "date-fns";
import { SplitCard } from "@/components/SplitCard";
const QuickImportDialog = lazy(() =>
  import("@/components/QuickImportDialog").then((m) => ({ default: m.QuickImportDialog })),
);
import { type ImportedDraft } from "@/components/QuickImportDialog";
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
import * as db from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSplitAccent } from "@/lib/split-accent";
import { resolveDisplayName, useProfile } from "@/lib/profile";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "IronLog | Home" },
      { name: "description", content: "Your IronLog workout dashboard and training activity." },
      { property: "og:title", content: "IronLog | Home" },
      { property: "og:description", content: "Your IronLog workout dashboard and training activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
    queryKey: ["custom-days-list", user?.id || "guest"],
    queryFn: async (): Promise<CustomDay[]> => {
      return await db.getCustomDays(user?.id);
    },
  });

  // Pull a long window of sessions to power the infinite horizontal week
  // scroller. 26 weeks (~6 months) is plenty for a streak view; we extend
  // it client-side if the user scrolls further left.
  const { data: recent } = useQuery({
    queryKey: ["recent-sessions", user?.id || "guest"],
    queryFn: async () => {
      const since = subDays(new Date(), 26 * 7).toISOString();
      return await db.getRecentSessions(user?.id, since);
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

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.display_name as string | undefined) ??
    null;
  const firstName = resolveDisplayName(profile, { fullName, email: user?.email });

  const deleteSplit = (id: string, name: string) => setPendingDelete({ id, name });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      await db.deleteCustomDay(id, user?.id);
      toast.success("Split deleted");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user?.id || "guest"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImport = async (draft: ImportedDraft) => {
    setImporting(true);
    try {
      const { id } = await db.createCustomDay({
          name: draft.name,
          subtitle: draft.subtitle || null,
          accent: "primary",
          muscle_groups: draft.muscleGroups,
          exercises: draft.exercises,
      }, user?.id);
      setImportOpen(false);
      toast.success("Routine imported");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user?.id || "guest"] });
      navigate({ to: "/day/$day", params: { day: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save routine");
    } finally {
      setImporting(false);
    }
  };

  const dialogs = (
    <>
      <Suspense fallback={null}>
        <QuickImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onApply={handleImport}
          applying={importing}
        />
      </Suspense>
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
              <Zap className="mr-2 h-4 w-4" /> Import a routine
            </Button>
          </div>
        </div>
        {dialogs}
      </main>

    );
  }

  const week = days.slice(-7);
  const weekCount = week.filter((d) => d.active).length;
  const monthCount = (recent ?? []).filter(
    (s) => new Date(s.performed_at) >= subDays(new Date(), 30),
  ).length;
  const upNextCount = upNext && Array.isArray(upNext.exercises) ? (upNext.exercises as unknown[]).length : 0;
  const upNextMuscles = (upNext?.muscle_groups ?? []).slice(0, 3).map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" · ");

  return (
    <main className="mx-auto max-w-3xl px-5 pb-6">
      {/* Greeting */}
      <header className="pt-5 animate-fade-in">
        <p className="text-[13px] font-medium text-muted-foreground">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight">Hi, {firstName}</h1>
      </header>

      {/* Today */}
      {upNext && (
        <section className="mt-6 rounded-[28px] border border-border bg-card p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">Today</span>
            <Link
              to="/custom/$id/edit"
              params={{ id: upNext.id }}
              className="tap flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Edit workout"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>
          <h2 className="mt-2 text-[32px] font-extrabold leading-[1.05] tracking-tight">{upNext.name}</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {upNextCount} exercises{upNextMuscles ? ` · ${upNextMuscles}` : ""}
          </p>
          <Link
            to="/day/$day"
            params={{ day: upNext.id }}
            className="tap mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[16px] font-bold text-primary-foreground"
          >
            <Play className="h-4 w-4 fill-current" /> Start workout
          </Link>
        </section>
      )}

      {/* Stats */}
      <section className="mt-4 grid grid-cols-3 divide-x divide-border rounded-[24px] border border-border bg-card py-4 animate-fade-in">
        {[
          { v: `${weekCount}`, suffix: "/7", l: "This week" },
          { v: `${streak}`, suffix: streak === 1 ? " day" : " days", l: "Streak" },
          { v: `${monthCount}`, suffix: "", l: "Last 30 days" },
        ].map((x) => (
          <div key={x.l} className="px-3 text-center">
            <p className="text-[24px] font-extrabold tabular-nums leading-none">
              {x.v}
              <span className="text-[13px] font-semibold text-muted-foreground">{x.suffix}</span>
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">{x.l}</p>
          </div>
        ))}
      </section>

      {/* Week strip */}
      <section className="mt-4 flex justify-between px-1 animate-fade-in" aria-label="This week">
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <div key={d.date.toISOString()} className="flex flex-col items-center gap-2">
              <span className={cn("text-[11px] font-semibold", isToday ? "text-foreground" : "text-muted-foreground")}>
                {format(d.date, "EEEEE")}
              </span>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                  d.active
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "ring-1 ring-foreground/40 text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {format(d.date, "d")}
              </span>
            </div>
          );
        })}
      </section>

      {/* Programs */}
      <section className="mt-9 animate-fade-in">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-[20px] font-bold tracking-tight">My programs</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="tap flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <Zap className="h-4 w-4" /> Import
            </button>
            <Link
              to="/custom/new"
              className="tap flex h-10 items-center gap-1 rounded-full bg-secondary px-4 text-[13px] font-semibold text-foreground"
            >
              <Plus className="h-4 w-4" /> New
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-[24px] border border-border bg-card divide-y divide-border">
          {(splits ?? []).map((s, i) => (
            <SplitCard key={s.id} split={s} index={i} isNext={s.id === upNext?.id} onDelete={deleteSplit} />
          ))}
        </div>
      </section>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        <Link to="/progressive-overload-tracker" className="hover:text-foreground">
          How IronLog tracks progressive overload
        </Link>
      </footer>
      {dialogs}
    </main>
  );
}
