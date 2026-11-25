import { WeekPlan } from "@/components/WeekPlan";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, lazy, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
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
import * as db from "@/lib/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/plan")({
  component: Plan,
  head: () => ({
    meta: [
      { title: "Plan — IronLog" },
      { name: "description", content: "Your IronLog workout dashboard and training activity." },
      { property: "og:title", content: "Plan — IronLog" },
      {
        property: "og:description",
        content: "Your IronLog workout dashboard and training activity.",
      },
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

function Plan() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: splits, isLoading: splitsLoading } = useQuery({
    queryKey: ["custom-days-list", user?.id || "guest"],
    queryFn: async (): Promise<CustomDay[]> => {
      return await db.getCustomDays(user?.id);
    },
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  const deleteSplit = (id: string, name: string) => setPendingDelete({ id, name });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      await db.deleteCustomDay(id, user?.id);
      toast.success("Split deleted");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user?.id || "guest"] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not delete routine");
    }
  };

  const handleImport = async (draft: ImportedDraft) => {
    setImporting(true);
    try {
      const { id } = await db.createCustomDay(
        {
          name: draft.name,
          subtitle: draft.subtitle || null,
          accent: "primary",
          muscle_groups: draft.muscleGroups,
          exercises: draft.exercises,
        },
        user?.id,
      );
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
      <AlertDialog open={pendingDelete !== null} onOpenChange={(v) => !v && setPendingDelete(null)}>
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
            <Button
              size="lg"
              variant="outline"
              className="font-bold"
              onClick={() => setImportOpen(true)}
            >
              <Zap className="mr-2 h-4 w-4" /> Import a routine
            </Button>
          </div>
        </div>
        {dialogs}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pt-7 pb-8">
      <header>
        <p className="forged-eyebrow">Your training, organised</p>
        <h1 className="forged-title mt-3">Plan</h1>
        <p className="mt-3 text-sm text-muted-foreground">Your routines. Ready when you are.</p>
      </header>
      <div className="forged-panel mt-7">
        <p className="forged-eyebrow">Routine library</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open a routine to train, or use its menu to edit. Your saved workouts stay unchanged.
        </p>
      </div>
      {/* Programs */}
      <section className="mt-9 animate-fade-in">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-[20px] font-bold tracking-tight">Your routines</h3>
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
            <div
              key={s.id}
              className="rise-in"
              style={{ "--d": `${Math.min(i, 7) * 70}ms` } as CSSProperties}
            >
              <SplitCard split={s} index={i} isNext={false} onDelete={deleteSplit} />
            </div>
          ))}
        </div>
      </section>

      <WeekPlan routines={splits ?? []} userId={user?.id} />
      <Link
        to="/coach"
        className="mt-7 flex min-h-12 items-center justify-between rounded-xl border border-border px-4 text-sm text-primary"
      >
        Questions about your program?<span>Ask Coach →</span>
      </Link>
      {dialogs}
    </main>
  );
}
