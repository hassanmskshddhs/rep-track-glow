import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Wheat,
  Beef,
  Target,
  RotateCcw,
  Check,
  Bot,
  Settings as SettingsIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";
import { v4 as uuidv4 } from "uuid";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseFoodWithAI } from "@/lib/ai-food-parser";

// -----------------------------------------------------------------------------
// TYPES & DATA
// -----------------------------------------------------------------------------
type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
};

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

type FoodLog = {
  id: string;
  mealType: MealType;
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodDBItem = {
  id: string;
  name: string;
  baseAmount: number;
  baseUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  supportedUnits: { unit: string; multiplier: number }[];
};

const GRAMS = { unit: "g", multiplier: 1 };
const OUNCES = { unit: "oz", multiplier: 28.3495 };
const ML = { unit: "ml", multiplier: 1 };
const CUPS = { unit: "cup", multiplier: 240 };
const TBSP = { unit: "tbsp", multiplier: 15 };

const FOOD_DB: FoodDBItem[] = [
  // Generic / Western
  {
    id: "1",
    name: "Chicken Breast (Raw)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 120,
    protein: 22.5,
    carbs: 0,
    fat: 2.6,
    supportedUnits: [GRAMS, OUNCES],
  },
  {
    id: "2",
    name: "Chicken Breast (Cooked)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    supportedUnits: [GRAMS, OUNCES],
  },
  {
    id: "3",
    name: "White Rice (Cooked)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    supportedUnits: [GRAMS, OUNCES, CUPS],
  },
  {
    id: "4",
    name: "Oats (Dry)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    supportedUnits: [GRAMS, OUNCES, CUPS],
  },
  {
    id: "5",
    name: "Whole Egg (Large)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
    supportedUnits: [{ unit: "pc", multiplier: 1 }],
  },
  {
    id: "6",
    name: "Egg Whites",
    baseAmount: 100,
    baseUnit: "g",
    calories: 52,
    protein: 10.9,
    carbs: 0.7,
    fat: 0.2,
    supportedUnits: [GRAMS, OUNCES, CUPS],
  },
  {
    id: "7",
    name: "Lean Ground Beef (93/7)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 150,
    protein: 21,
    carbs: 0,
    fat: 7,
    supportedUnits: [GRAMS, OUNCES],
  },
  {
    id: "8",
    name: "Whey Protein Powder",
    baseAmount: 30,
    baseUnit: "g",
    calories: 120,
    protein: 24,
    carbs: 3,
    fat: 1.5,
    supportedUnits: [GRAMS, { unit: "scoop", multiplier: 30 }],
  },
  {
    id: "9",
    name: "Banana",
    baseAmount: 100,
    baseUnit: "g",
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    supportedUnits: [GRAMS, OUNCES, { unit: "medium pc", multiplier: 118 }],
  },
  {
    id: "10",
    name: "Peanut Butter",
    baseAmount: 15,
    baseUnit: "g",
    calories: 94,
    protein: 3.8,
    carbs: 3.1,
    fat: 8,
    supportedUnits: [GRAMS, TBSP],
  },
  {
    id: "11",
    name: "Whole Milk",
    baseAmount: 100,
    baseUnit: "ml",
    calories: 61,
    protein: 3.2,
    carbs: 4.8,
    fat: 3.3,
    supportedUnits: [ML, CUPS],
  },
  {
    id: "12",
    name: "Olive Oil",
    baseAmount: 15,
    baseUnit: "ml",
    calories: 119,
    protein: 0,
    carbs: 0,
    fat: 13.5,
    supportedUnits: [ML, TBSP],
  },

  // Egyptian / Arabic Local Foods
  {
    id: "13",
    name: "عيش بلدي (رغيف متوسط)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 275,
    protein: 9,
    carbs: 55,
    fat: 1.5,
    supportedUnits: [{ unit: "pc", multiplier: 1 }],
  },
  {
    id: "14",
    name: "فول مدمس (بدون زيت)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 110,
    protein: 8,
    carbs: 20,
    fat: 0.5,
    supportedUnits: [GRAMS, TBSP, CUPS],
  },
  {
    id: "15",
    name: "طعمية / فلافل (حبة مقلية)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 57,
    protein: 2,
    carbs: 5,
    fat: 3.5,
    supportedUnits: [{ unit: "pc", multiplier: 1 }],
  },
  {
    id: "16",
    name: "كشري مصري",
    baseAmount: 100,
    baseUnit: "g",
    calories: 160,
    protein: 5,
    carbs: 27,
    fat: 3.5,
    supportedUnits: [GRAMS, { unit: "plate", multiplier: 350 }],
  },
  {
    id: "17",
    name: "حواوشي لحم (رغيف كامل)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 650,
    protein: 25,
    carbs: 50,
    fat: 35,
    supportedUnits: [
      { unit: "pc", multiplier: 1 },
      { unit: "half", multiplier: 0.5 },
    ],
  },
  {
    id: "18",
    name: "مكرونة بشاميل",
    baseAmount: 100,
    baseUnit: "g",
    calories: 180,
    protein: 8,
    carbs: 18,
    fat: 9,
    supportedUnits: [GRAMS, { unit: "piece", multiplier: 200 }],
  },
  {
    id: "19",
    name: "شاورما دجاج (ساندوتش سوري)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 450,
    protein: 25,
    carbs: 45,
    fat: 18,
    supportedUnits: [{ unit: "pc", multiplier: 1 }],
  },
  {
    id: "20",
    name: "شاورما لحم (ساندوتش سوري)",
    baseAmount: 1,
    baseUnit: "pc",
    calories: 550,
    protein: 22,
    carbs: 45,
    fat: 30,
    supportedUnits: [{ unit: "pc", multiplier: 1 }],
  },
  {
    id: "21",
    name: "محشي كرنب",
    baseAmount: 100,
    baseUnit: "g",
    calories: 130,
    protein: 3,
    carbs: 22,
    fat: 4,
    supportedUnits: [GRAMS, { unit: "piece", multiplier: 25 }],
  },
  {
    id: "22",
    name: "بطاطس مقلية (French Fries)",
    baseAmount: 100,
    baseUnit: "g",
    calories: 312,
    protein: 3.4,
    carbs: 41,
    fat: 15,
    supportedUnits: [GRAMS],
  },
  {
    id: "23",
    name: "كبدة إسكندراني",
    baseAmount: 100,
    baseUnit: "g",
    calories: 190,
    protein: 26,
    carbs: 4,
    fat: 7,
    supportedUnits: [GRAMS],
  },
  {
    id: "24",
    name: "جبنة قريش",
    baseAmount: 100,
    baseUnit: "g",
    calories: 98,
    protein: 11,
    carbs: 3.4,
    fat: 4.3,
    supportedUnits: [GRAMS, TBSP],
  },
  {
    id: "25",
    name: "جبنة رومي",
    baseAmount: 100,
    baseUnit: "g",
    calories: 393,
    protein: 24,
    carbs: 1.5,
    fat: 32,
    supportedUnits: [GRAMS, { unit: "slice", multiplier: 20 }],
  },
  {
    id: "26",
    name: "زبادي طبيعي",
    baseAmount: 100,
    baseUnit: "g",
    calories: 61,
    protein: 3.5,
    carbs: 4.7,
    fat: 3.3,
    supportedUnits: [GRAMS, { unit: "cup", multiplier: 105 }],
  },
  {
    id: "27",
    name: "رز بلبن",
    baseAmount: 100,
    baseUnit: "g",
    calories: 111,
    protein: 3,
    carbs: 19,
    fat: 2.5,
    supportedUnits: [GRAMS, { unit: "plate", multiplier: 150 }],
  },
];

// -----------------------------------------------------------------------------
// LOCAL STORAGE HOOK
// -----------------------------------------------------------------------------
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const item = window.localStorage.getItem(key);
      setStoredValue(item ? JSON.parse(item) : initialValue);
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// -----------------------------------------------------------------------------
// ROUTE & MAIN COMPONENT
// -----------------------------------------------------------------------------
export const Route = createFileRoute("/nutrition")({
  component: NutritionRoute,
  head: () => ({
    meta: [
      { title: "Nutrition — IronLog" },
      {
        name: "description",
        content: "Track meals, calories and macros against your daily targets in IronLog.",
      },
    ],
  }),
});

function NutritionRoute() {
  const [targets, setTargets] = useLocalStorage<MacroTargets | null>("ironlog_macro_targets", null);

  if (!targets) {
    return <OnboardingWizard onComplete={setTargets} />;
  }

  return <NutritionDashboard targets={targets} onReset={() => setTargets(null)} />;
}

// -----------------------------------------------------------------------------
// ONBOARDING WIZARD
// -----------------------------------------------------------------------------
function OnboardingWizard({ onComplete }: { onComplete: (t: MacroTargets) => void }) {
  const [step, setStep] = useState(1);
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("28");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState("1.55");
  const [goal, setGoal] = useState<"Lose" | "Maintain" | "Gain">("Maintain");
  const [rate, setRate] = useState("0.5");

  const ACTIVITY_LEVELS = [
    { value: "1.2", label: "Sedentary (office job, no exercise)" },
    { value: "1.375", label: "Lightly Active (1-3 days/week)" },
    { value: "1.55", label: "Moderately Active (3-5 days/week)" },
    { value: "1.725", label: "Very Active (6-7 days/week)" },
    { value: "1.9", label: "Extra Active (physical job & hard exercise)" },
  ];

  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    const act = parseFloat(activity);
    const r = parseFloat(rate);

    const bmr = sex === "Male" ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;

    const tdee = bmr * act;

    let targetCalories = tdee;
    if (goal === "Lose") targetCalories = tdee - r * 1100;
    if (goal === "Gain") targetCalories = tdee + r * 1100;

    const protein = w * 2.0;
    const fat = (targetCalories * 0.25) / 9;
    const carbs = (targetCalories - protein * 4 - fat * 9) / 4;

    onComplete({
      calories: Math.round(targetCalories),
      protein: Math.round(protein),
      carbs: Math.round(Math.max(0, carbs)),
      fat: Math.round(fat),
      goal,
    });
  };

  return (
    <main className="mx-auto max-w-md px-5 pb-6">
      {/* Greeting — same structure as Home */}
      <header className="pt-5 animate-fade-in">
        <p className="text-[13px] font-medium text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-[1.05] tracking-tight">
          Fuel setup
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Set your calorie and macro targets from your body profile and goal.
        </p>
      </header>

      <section className="mt-6 animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/20 text-primary">
            <Target className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-6 rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Step {step} of 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-2 w-8 rounded-full transition-colors",
                    step >= s ? "bg-primary" : "bg-secondary",
                  )}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="mb-4 text-[20px] font-bold tracking-tight">Biological Profile</h2>
              <div className="space-y-2">
                <Label>Biological Sex</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={sex === "Male" ? "default" : "outline"}
                    onClick={() => setSex("Male")}
                  >
                    Male
                  </Button>
                  <Button
                    variant={sex === "Female" ? "default" : "outline"}
                    onClick={() => setSex("Female")}
                  >
                    Female
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age (years)</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Current Weight (kg)</Label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="mb-4 text-[20px] font-bold tracking-tight">Activity & Lifestyle</h2>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="mb-4 text-[20px] font-bold tracking-tight">Your Goal</h2>
              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={goal === "Lose" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setGoal("Lose")}
                  >
                    🔥 Fat Loss
                  </Button>
                  <Button
                    variant={goal === "Maintain" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setGoal("Maintain")}
                  >
                    ⚖️ Maintenance
                  </Button>
                  <Button
                    variant={goal === "Gain" ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setGoal("Gain")}
                  >
                    💪 Muscle Gain
                  </Button>
                </div>
              </div>

              {goal !== "Maintain" && (
                <div className="mt-4 space-y-2">
                  <Label>Rate of Change</Label>
                  <Select value={rate} onValueChange={setRate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">Slow & Steady (0.25 kg/week)</SelectItem>
                      <SelectItem value="0.5">Moderate (0.5 kg/week)</SelectItem>
                      <SelectItem value="0.75">Aggressive (0.75 kg/week)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={calculateMacros}>
                Calculate & Save <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
// NUTRITION DASHBOARD
// -----------------------------------------------------------------------------
function NutritionDashboard({ targets, onReset }: { targets: MacroTargets; onReset: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const [logsStorage, setLogsStorage] = useLocalStorage<Record<string, FoodLog[]>>(
    "ironlog_food_logs",
    {},
  );
  const [recentFoods, setRecentFoods] = useLocalStorage<FoodDBItem[]>("ironlog_recent_foods", []);

  const rawTodaysLogs = (logsStorage || {})[dateStr] || [];
  const todaysLogs = Array.isArray(rawTodaysLogs) ? rawTodaysLogs : [];
  const rawRecentFoods = recentFoods || [];
  const safeRecentFoods = Array.isArray(rawRecentFoods) ? rawRecentFoods : [];
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("Breakfast");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const consumed = todaysLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const remainingCals = targets.calories - consumed.calories;
  const calsPercent = Math.min(100, (consumed.calories / targets.calories) * 100);

  const addFood = (food: FoodLog, baseFoodItem: FoodDBItem) => {
    // Add to daily logs
    setLogsStorage((prev) => {
      const existing = prev[dateStr] || [];
      return { ...prev, [dateStr]: [...existing, food] };
    });
    // Add to recents if not exists
    setRecentFoods((prev) => {
      const filtered = prev.filter((p) => p.id !== baseFoodItem.id);
      return [baseFoodItem, ...filtered].slice(0, 15); // Keep last 15
    });
    setSearchModalOpen(false);
  };

  const removeFood = (id: string) => {
    setLogsStorage((prev) => {
      const existing = prev[dateStr] || [];
      return { ...prev, [dateStr]: existing.filter((f) => f.id !== id) };
    });
  };

  const meals: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <main className="mx-auto max-w-3xl px-5 pb-6">
      {/* Greeting — same structure as Home */}
      <header className="pt-5 animate-fade-in">
        <p className="text-[13px] font-medium text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-[32px] font-extrabold leading-[1.05] tracking-tight">Fuel</h1>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Nutrition settings"
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Date switcher */}
        <div className="mt-4 flex items-center justify-between rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setCurrentDate((d) => subDays(d, 1))}
            aria-label="Previous day"
            className="tap flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-[13px] font-bold">
            {isToday(currentDate) ? "Today" : format(currentDate, "MMM d, yyyy")}
          </div>
          <button
            onClick={() => setCurrentDate((d) => addDays(d, 1))}
            aria-label="Next day"
            className="tap flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* CALORIE SUMMARY */}
      <section className="mt-4 animate-fade-in">
        <div className="rounded-[24px] border border-border bg-card p-5">
          <div className="grid grid-cols-3 divide-x divide-border text-center">
            <div>
              <div className="text-[12px] font-medium text-muted-foreground">Goal</div>
              <div className="mt-0.5 text-[18px] font-extrabold tabular-nums">
                {targets.calories}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted-foreground">Food</div>
              <div className="mt-0.5 text-[18px] font-extrabold tabular-nums">
                {Math.round(consumed.calories)}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted-foreground">Remaining</div>
              <div
                className={cn(
                  "mt-0.5 text-[18px] font-extrabold tabular-nums",
                  remainingCals < 0 ? "text-destructive" : "text-primary",
                )}
              >
                {Math.round(remainingCals)}
              </div>
            </div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full transition-all duration-500",
                remainingCals < 0 ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${calsPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* MACRO RINGS */}
      <section className="mt-3 grid grid-cols-3 gap-3 animate-fade-in" aria-label="Macros">
        <MacroRing
          label="Protein"
          consumed={consumed.protein}
          target={targets.protein}
          color="text-protein"
          icon={<Beef className="h-3 w-3" />}
        />
        <MacroRing
          label="Carbs"
          consumed={consumed.carbs}
          target={targets.carbs}
          color="text-carbs"
          icon={<Wheat className="h-3 w-3" />}
        />
        <MacroRing
          label="Fat"
          consumed={consumed.fat}
          target={targets.fat}
          color="text-fat"
          icon={<Droplet className="h-3 w-3" />}
        />
      </section>

      {/* MEAL SECTIONS */}
      <section className="mt-6 space-y-4 animate-fade-in" aria-label="Meals">
        {meals.map((meal) => {
          const items = todaysLogs.filter((l) => l.mealType === meal);
          const mealCals = items.reduce((acc, i) => acc + i.calories, 0);

          return (
            <div key={meal} className="overflow-hidden rounded-[24px] border border-border bg-card">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-[16px] font-bold tracking-tight">{meal}</h3>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {Math.round(mealCals)} kcal
                </span>
              </div>
              <div className="divide-y divide-border/50 border-t border-border/50">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nothing logged yet — tap Add Food below.
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="group flex items-center justify-between p-4">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.quantity} {item.unit} • {Math.round(item.protein)}g P,{" "}
                          {Math.round(item.carbs)}g C, {Math.round(item.fat)}g F
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold tabular-nums">{Math.round(item.calories)}</span>
                        <button
                          onClick={() => removeFood(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="tap text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 pt-1">
                <button
                  onClick={() => {
                    setSelectedMealType(meal);
                    setSearchModalOpen(true);
                  }}
                  className="tap flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" /> Add Food
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <FoodSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        mealType={selectedMealType}
        onAdd={addFood}
        recentFoods={safeRecentFoods}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-md bg-background border-border"
        >
          <DialogHeader>
            <DialogTitle>Nutrition Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>AI Food Search</Label>
              <p className="text-xs text-muted-foreground">
                Built into the app — no key or setup needed. Just sign in and type any meal.
              </p>
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Label>Reset Macro Targets</Label>
              <Button
                variant="destructive"
                onClick={() => {
                  onReset();
                  setSettingsOpen(false);
                }}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Recalculate Macros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function MacroRing({
  label,
  consumed,
  target,
  color,
  icon,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = Math.min(100, target > 0 ? (consumed / target) * 100 : 0);
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="relative mb-1 flex h-12 w-12 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-secondary"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className={cn("transition-all duration-500", color)}
            strokeDasharray={`${pct}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
      </div>
      <div className="text-xs font-bold tabular-nums">
        {Math.round(consumed)}{" "}
        <span className="font-normal text-muted-foreground">/ {target}g</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FOOD SEARCH MODAL (AI + DB + RECENT)
// -----------------------------------------------------------------------------
function FoodSearchModal({
  open,
  onClose,
  mealType,
  onAdd,
  recentFoods,
}: {
  open: boolean;
  onClose: () => void;
  mealType: MealType;
  onAdd: (f: FoodLog, b: FoodDBItem) => void;
  recentFoods: FoodDBItem[];
}) {
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null);

  const [unit, setUnit] = useState<string>("");
  const [quantity, setQuantity] = useState("1");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedFood(null);
      setAiError("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedFood) {
      setUnit(selectedFood.supportedUnits[0].unit);
      setQuantity(selectedFood.baseAmount.toString());
    }
  }, [selectedFood]);

  const filteredFoods = useMemo(() => {
    if (!query) return recentFoods.length > 0 ? recentFoods : FOOD_DB;
    return FOOD_DB.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, recentFoods]);

  const handleAISearch = async () => {
    if (!query.trim()) return;

    setAiLoading(true);
    setAiError("");
    try {
      const aiResponse = await parseFoodWithAI(query);

      // Convert AI response into a FoodDBItem structure
      const parsedItem: FoodDBItem = {
        id: `ai_${uuidv4()}`,
        name: aiResponse.food_name,
        baseAmount: aiResponse.serving_size_quantity,
        baseUnit: aiResponse.serving_size_unit,
        calories: aiResponse.calories,
        protein: aiResponse.protein,
        carbs: aiResponse.carbs,
        fat: aiResponse.fats,
        supportedUnits: [
          { unit: aiResponse.serving_size_unit, multiplier: 1 },
          { unit: "serving", multiplier: aiResponse.serving_size_quantity },
        ],
      };

      setSelectedFood(parsedItem);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Failed to parse food.");
    } finally {
      setAiLoading(false);
    }
  };

  const calculatedMacros = useMemo(() => {
    if (!selectedFood) return null;

    const qty = parseFloat(quantity) || 0;
    const selectedUnitObj = selectedFood.supportedUnits.find((u) => u.unit === unit);
    if (!selectedUnitObj) return null;

    const totalBaseUnits = qty * selectedUnitObj.multiplier;
    const ratio = totalBaseUnits / selectedFood.baseAmount;

    return {
      calories: selectedFood.calories * ratio,
      protein: selectedFood.protein * ratio,
      carbs: selectedFood.carbs * ratio,
      fat: selectedFood.fat * ratio,
    };
  }, [selectedFood, unit, quantity]);

  const handleAdd = () => {
    if (!selectedFood || !calculatedMacros) return;
    onAdd(
      {
        id: uuidv4(),
        mealType,
        foodId: selectedFood.id,
        name: selectedFood.name,
        quantity: parseFloat(quantity) || 1,
        unit,
        calories: calculatedMacros.calories,
        protein: calculatedMacros.protein,
        carbs: calculatedMacros.carbs,
        fat: calculatedMacros.fat,
      },
      selectedFood,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] w-[95vw] max-w-md flex-col overflow-hidden rounded-[24px] border-border bg-background p-0"
      >
        <DialogHeader className="border-b border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <DialogTitle>Add to {mealType}</DialogTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search database or type any meal..."
                className="border-border bg-background pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedFood(null);
                  setAiError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAISearch();
                }}
              />
            </div>
          </div>
          {aiError && (
            <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> {aiError}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!selectedFood ? (
            <div className="divide-y divide-border">
              {!query && recentFoods.length > 0 && (
                <div className="bg-secondary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recent Foods
                </div>
              )}
              {!query && recentFoods.length === 0 && (
                <div className="bg-secondary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Database
                </div>
              )}

              {query.trim().length > 0 && (
                <button
                  onClick={handleAISearch}
                  disabled={aiLoading}
                  className="group flex w-full items-center justify-between border-b border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                      {aiLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Search className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-primary">Search online for "{query}"</div>
                      <div className="mt-1 text-xs text-primary/80">
                        Get precise macros for any food, meal, or recipe
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {filteredFoods.length === 0 && !aiLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Not found in local database.</p>
                  <p className="mt-2 text-xs">
                    Click "Search online" above or press Enter to find it.
                  </p>
                </div>
              ) : (
                filteredFoods.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => setSelectedFood(food)}
                    className="group flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <div className="font-semibold text-foreground transition-colors group-hover:text-primary">
                        {food.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {food.baseAmount} {food.baseUnit} • {Math.round(food.calories)} kcal
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-6 animate-fade-in">
              <button
                onClick={() => setSelectedFood(null)}
                className="mb-6 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Search
              </button>

              <div className="mb-6 flex items-start justify-between">
                <h3 className="text-2xl font-bold">{selectedFood.name}</h3>
                {selectedFood.id.startsWith("ai_") && (
                  <span className="flex items-center gap-1 rounded bg-primary/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <Bot className="h-3 w-3" /> AI Parsed
                  </span>
                )}
              </div>

              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFood.supportedUnits.map((u) => (
                        <SelectItem key={u.unit} value={u.unit}>
                          {u.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculatedMacros && (
                <div className="mb-8 rounded-[24px] border border-border bg-card p-5">
                  <div className="mb-6 text-center">
                    <div className="text-4xl font-extrabold tabular-nums text-primary">
                      {Math.round(calculatedMacros.calories)}
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Calories
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 divide-x divide-border text-center">
                    <div>
                      <div className="text-lg font-bold tabular-nums">
                        {Math.round(calculatedMacros.protein)}g
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Protein</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold tabular-nums">
                        {Math.round(calculatedMacros.carbs)}g
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Carbs</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold tabular-nums">
                        {Math.round(calculatedMacros.fat)}g
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleAdd}
                className="w-full rounded-xl py-6 text-lg font-bold shadow-lg"
              >
                <Check className="mr-2 h-5 w-5" /> Log Food
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
