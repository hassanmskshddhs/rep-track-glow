import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Apple, Beef, Flame, Wheat, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/nutrition")({
  component: NutritionPage,
  head: () => ({
    meta: [
      { title: "Nutrition & Macro Calculator — IronLog" },
      {
        name: "description",
        content:
          "Estimate your daily calories and protein, carb, and fat targets for muscle gain, maintenance, or fat loss with IronLog's free macro calculator.",
      },
      { property: "og:title", content: "Nutrition & Macro Calculator — IronLog" },
      {
        property: "og:description",
        content:
          "Estimate your daily calories and protein, carb, and fat targets for muscle gain, maintenance, or fat loss with IronLog's free macro calculator.",
      },
    ],
  }),
});

type Goal = "cut" | "maintain" | "bulk";

const ACTIVITY = [
  { value: "1.2", label: "Sedentary (little exercise)" },
  { value: "1.375", label: "Light (1–3 workouts/week)" },
  { value: "1.55", label: "Moderate (3–5 workouts/week)" },
  { value: "1.725", label: "Very active (6–7 workouts/week)" },
];

function NutritionPage() {
  const [weight, setWeight] = useState("80");
  const [height, setHeight] = useState("178");
  const [age, setAge] = useState("28");
  const [activity, setActivity] = useState("1.55");
  const [goal, setGoal] = useState<Goal>("maintain");

  const result = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) return null;
    // Mifflin-St Jeor (male/female midpoint approximation)
    const bmr = 10 * w + 6.25 * h - 5 * a;
    const tdee = bmr * parseFloat(activity);
    const calories = Math.round(goal === "cut" ? tdee - 400 : goal === "bulk" ? tdee + 300 : tdee);
    const protein = Math.round(w * (goal === "cut" ? 2.2 : goal === "bulk" ? 1.8 : 2.0));
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    return { calories, protein, fat, carbs };
  }, [weight, height, age, activity, goal]);

  return (
    <main className="mx-auto max-w-md p-6 pb-32">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card">
          <Apple className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Macro calculator</h1>
          <p className="text-sm text-muted-foreground">Daily calories & macros for your goal</p>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input id="weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Height (cm)</Label>
            <Input id="height" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age">Age</Label>
            <Input id="age" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Activity level</Label>
          <Select value={activity} onValueChange={setActivity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["cut", "maintain", "bulk"] as Goal[]).map((g) => (
            <Button
              key={g}
              variant={goal === g ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() => setGoal(g)}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-2xl border border-border bg-card p-5 text-center">
            <Flame className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{result.calories.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">kcal / day</div>
          </div>
          {[
            { icon: Beef, label: "Protein", value: result.protein },
            { icon: Wheat, label: "Carbs", value: result.carbs },
            { icon: Droplet, label: "Fat", value: result.fat },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className={`rounded-2xl border border-border bg-card p-4 text-center ${label === "Protein" ? "col-span-2" : ""}`}>
              <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="mt-1 text-xl font-bold tabular-nums">{value}g</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}

      <section className="mt-8 space-y-3 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Nutrition basics for lifters</h2>
        <p>
          <strong className="text-foreground">Protein first.</strong> Aim for 1.6–2.2g per kg of body
          weight daily to support muscle repair and growth, spread across 3–5 meals.
        </p>
        <p>
          <strong className="text-foreground">Small surpluses win.</strong> For muscle gain, a modest
          ~300 kcal surplus builds size with minimal fat. For fat loss, a ~400 kcal deficit preserves
          strength while you lean out.
        </p>
        <p>
          <strong className="text-foreground">Hydration & sleep.</strong> Roughly 35ml of water per kg
          of body weight and 7–9 hours of sleep do more for recovery than any supplement.
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-3">
        <Button asChild>
          <Link to="/">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/history">View workout history</Link>
        </Button>
      </div>
    </main>
  );
}
