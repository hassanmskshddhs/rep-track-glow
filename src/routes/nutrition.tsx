import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/nutrition")({
  component: NutritionPage,
  head: () => ({
    meta: [
      { title: "Nutrition — IronLog" },
      { name: "description", content: "Log your meals and calories." },
    ],
  }),
});

function NutritionPage() {
  return (
    <div className="mx-auto max-w-md p-6 pb-32">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Apple className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nutrition log</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Calorie and meal tracking is coming soon. For now, focus on the lift — your training history is one tap away.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <Button asChild>
            <Link to="/">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">View workout history</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
