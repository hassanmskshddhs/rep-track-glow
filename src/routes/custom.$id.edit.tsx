import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { SplitForm } from "@/components/SplitForm";
import type { MuscleGroup } from "@/lib/exercises";

export const Route = createFileRoute("/custom/$id/edit")({
  component: EditSplit,
  head: () => ({ meta: [{ title: "Edit Split — IronLog" }] }),
});

function EditSplit() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["custom-day-edit", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("name, subtitle, accent, exercises, muscle_groups")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;
  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading split…</div>;
  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground">Split not found.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 has-bottom-nav animate-fade-in-up">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Edit split</h1>

      <div className="mt-5">
        <SplitForm
          saving={saving}
          submitLabel="Save changes"
          initial={{
            name: data.name,
            subtitle: data.subtitle ?? "",
            accent: data.accent ?? "primary",
            muscleGroups: (data.muscle_groups ?? []) as MuscleGroup[],
            exercises: Array.isArray(data.exercises) ? (data.exercises as string[]) : [],
          }}
          onSubmit={async (draft) => {
            if (!draft.name) return toast.error("Give your split a name.");
            if (draft.exercises.length === 0)
              return toast.error("Add at least one exercise.");
            setSaving(true);
            try {
              const { error } = await supabase
                .from("custom_workout_days")
                .update({
                  name: draft.name,
                  subtitle: draft.subtitle || null,
                  accent: draft.accent,
                  muscle_groups: draft.muscleGroups,
                  exercises: draft.exercises,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", id);
              if (error) throw error;
              toast.success("Split updated");
              qc.invalidateQueries({ queryKey: ["custom-days-list", user.id] });
              qc.invalidateQueries({ queryKey: ["custom-day", id] });
              navigate({ to: "/" });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Failed to save";
              toast.error(msg);
            } finally {
              setSaving(false);
            }
          }}
        />
      </div>
    </main>
  );
}
