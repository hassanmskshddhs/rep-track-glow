import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut, User as UserIcon, Mail, Shield } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — IronLog" }] }),
});

function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Athlete";

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
            <div className="truncate text-lg font-bold">{name}</div>
            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" /> {user.email}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Privacy
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your splits and logs are private to your account. Only you can read or modify them.
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
