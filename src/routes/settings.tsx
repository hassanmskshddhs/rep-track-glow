import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, User as UserIcon, Mail, Shield, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, writeProfile, resolveDisplayName } from "@/lib/profile";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — IronLog" }] }),
});

function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const profile = useProfile();
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const greetName = resolveDisplayName(profile, { fullName, email: user.email });

  const update = <K extends keyof typeof draft>(k: K, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    setSaving(true);
    try {
      writeProfile(draft);
      toast.success("Profile saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 animate-fade-in-up">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Settings</h1>

      <section className="mt-5 glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{greetName}</div>
            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" /> {user.email}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Profile</h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Saved on device
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Personal info stays on this device — used to greet you across the app.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={draft.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Alex"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={draft.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              placeholder="Used in welcome message"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              value={draft.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="years"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              min={0}
              max={500}
              step="0.1"
              value={draft.weight}
              onChange={(e) => update("weight", e.target.value)}
              placeholder="e.g. 78"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              min={0}
              max={300}
              value={draft.height}
              onChange={(e) => update("height", e.target.value)}
              placeholder="e.g. 178"
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="mt-5 w-full font-bold">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save profile"}
        </Button>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Privacy
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your splits and logs are private to your account. Profile info is stored
          only on this device. The app caches your data locally so it works
          offline after first load.
        </p>
      </section>

      <div className="mt-6">
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </main>
  );
}
