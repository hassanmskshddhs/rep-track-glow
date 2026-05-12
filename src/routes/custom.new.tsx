import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { SplitForm } from "@/components/SplitForm";

export const Route = createFileRoute("/custom/new")({
  component: NewSplit,
  head: () => ({ meta: [{ title: "New Split — IronLog" }] }),
});

function NewSplit() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 has-bottom-nav animate-fade-in-up">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">New split</h1>
      <p className="text-sm text-muted-foreground">Name it, tag muscle groups, pick exercises.</p>

      <div className="mt-5">
        <SplitForm
          saving={saving}
          submitLabel="Create split"
          onSubmit={async (draft) => {
            if (!draft.name) return toast.error("Give your split a name.");
            if (draft.exercises.length === 0)
              return toast.error("Add at least one exercise.");
            setSaving(true);
            try {
              const { data, error } = await supabase
                .from("custom_workout_days")
                .insert({
                  user_id: user.id,
                  name: draft.name,
                  subtitle: draft.subtitle || null,
                  accent: draft.accent,
                  muscle_groups: draft.muscleGroups,
                  exercises: draft.exercises,
                })
                .select("id")
                .single();
              if (error) throw error;
              toast.success("Split created");
              navigate({ to: "/day/$day", params: { day: data!.id } });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Failed to create split";
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
