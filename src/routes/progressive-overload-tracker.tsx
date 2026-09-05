import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  Trophy,
  Target,
  History,
  Dumbbell,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = "https://rep-track-glow.lovable.app";

export const Route = createFileRoute("/progressive-overload-tracker")({
  component: ProgressiveOverloadPage,
  head: () => ({
    meta: [
      { title: "Progressive Overload Tracker — IronLog" },
      {
        name: "description",
        content:
          "IronLog is a progressive overload tracker that remembers every weight and rep, sets your next smart target with double progression, and flags PRs automatically.",
      },
      { property: "og:title", content: "Progressive Overload Tracker — IronLog" },
      {
        property: "og:description",
        content:
          "IronLog remembers every weight and rep, sets your next smart target with double progression, and flags PRs automatically — so you always know what to lift next.",
      },
      { property: "og:url", content: `${BASE}/progressive-overload-tracker` },
    ],
    links: [{ rel: "canonical", href: `${BASE}/progressive-overload-tracker` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Progressive Overload Tracker — IronLog",
          description:
            "How IronLog tracks progressive overload with smart double-progression targets, PR detection, and estimated 1RM analytics.",
          url: `${BASE}/progressive-overload-tracker`,
        }),
      },
    ],
  }),
});

const FEATURES = [
  {
    icon: Target,
    title: "Smart Targets every session",
    body: "IronLog applies the double progression rule automatically: hit the top of your rep range on every set and your next target jumps up in weight; miss it and you chase reps first. No spreadsheets, no guessing — the number you should lift is waiting when you walk in.",
  },
  {
    icon: History,
    title: "Last session, always visible",
    body: "Every exercise shows exactly what you lifted last time — weight and reps, set by set — right next to today's input. Progressive overload stops being a memory test and becomes a simple instruction: beat that number.",
  },
  {
    icon: Trophy,
    title: "Automatic PR detection",
    body: "Set a new personal record and IronLog flags it the moment you log the set. PRs are highlighted in your history so your best lifts are never buried in a notebook.",
  },
  {
    icon: TrendingUp,
    title: "1RM and volume analytics",
    body: "The Progress screen estimates your one-rep max with the Epley formula and charts your weekly training volume, so you can see overload working — or catch a stall before it costs you weeks.",
  },
  {
    icon: Zap,
    title: "Works offline, syncs later",
    body: "Gyms have terrible signal. IronLog saves every set on your device the instant you log it and syncs when you're back online — your overload streak never depends on Wi-Fi.",
  },
  {
    icon: Dumbbell,
    title: "Built around your split",
    body: "Push, Pull, Legs, or your own custom days — IronLog tracks progression per exercise inside the routine you actually run, with rest timers and drag-and-drop ordering.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Log today's sets",
    body: "Enter weight and reps for each set. It takes one tap per set — designed for chalky hands between lifts.",
  },
  {
    n: "2",
    title: "Get tomorrow's target",
    body: "IronLog compares against last session and applies double progression: more reps until you top the range, then more weight.",
  },
  {
    n: "3",
    title: "Beat the number",
    body: "Next session, your target is on screen. Hit it, and the cycle repeats — that's progressive overload, automated.",
  },
];

function ProgressiveOverloadPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-32">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">IronLog</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
        The progressive overload tracker that tells you what to lift next
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Progressive overload — lifting slightly more over time — is the single driver of
        strength and muscle growth. IronLog turns it into a system: it remembers every
        session, computes your next target, and celebrates every PR.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="font-bold">
          <Link to="/">
            Start tracking free <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/nutrition">Try the macro calculator</Link>
        </Button>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-extrabold text-primary">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">
          Everything an overload tracker should do
        </h2>
        <div className="mt-4 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Stop guessing. Start progressing.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Create your first split in under a minute. Your last session's numbers — and your
          next smart target — will be waiting every time you train.
        </p>
        <Button asChild size="lg" className="mt-5 font-bold">
          <Link to="/">
            Open IronLog <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
