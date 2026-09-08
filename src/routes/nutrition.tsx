import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ArrowRight, Search, Plus, Trash2, ChevronLeft, ChevronRight, Droplet, Wheat, Beef, Target, RotateCcw, X, Check, Bot, Settings as SettingsIcon, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { parseFoodWithAI, AIFoodResponse } from "@/lib/ai-food-parser";

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
  { id: "1", name: "Chicken Breast (Raw)", baseAmount: 100, baseUnit: "g", calories: 120, protein: 22.5, carbs: 0, fat: 2.6, supportedUnits: [GRAMS, OUNCES] },
  { id: "2", name: "Chicken Breast (Cooked)", baseAmount: 100, baseUnit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6, supportedUnits: [GRAMS, OUNCES] },
  { id: "3", name: "White Rice (Cooked)", baseAmount: 100, baseUnit: "g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, supportedUnits: [GRAMS, OUNCES, CUPS] },
  { id: "4", name: "Oats (Dry)", baseAmount: 100, baseUnit: "g", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, supportedUnits: [GRAMS, OUNCES, CUPS] },
  { id: "5", name: "Whole Egg (Large)", baseAmount: 1, baseUnit: "pc", calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, supportedUnits: [{ unit: "pc", multiplier: 1 }] },
  { id: "6", name: "Egg Whites", baseAmount: 100, baseUnit: "g", calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2, supportedUnits: [GRAMS, OUNCES, CUPS] },
  { id: "7", name: "Lean Ground Beef (93/7)", baseAmount: 100, baseUnit: "g", calories: 150, protein: 21, carbs: 0, fat: 7, supportedUnits: [GRAMS, OUNCES] },
  { id: "8", name: "Whey Protein Powder", baseAmount: 30, baseUnit: "g", calories: 120, protein: 24, carbs: 3, fat: 1.5, supportedUnits: [GRAMS, { unit: "scoop", multiplier: 30 }] },
  { id: "9", name: "Banana", baseAmount: 100, baseUnit: "g", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, supportedUnits: [GRAMS, OUNCES, { unit: "medium pc", multiplier: 118 }] },
  { id: "10", name: "Peanut Butter", baseAmount: 15, baseUnit: "g", calories: 94, protein: 3.8, carbs: 3.1, fat: 8, supportedUnits: [GRAMS, TBSP] },
  { id: "11", name: "Whole Milk", baseAmount: 100, baseUnit: "ml", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, supportedUnits: [ML, CUPS] },
  { id: "12", name: "Olive Oil", baseAmount: 15, baseUnit: "ml", calories: 119, protein: 0, carbs: 0, fat: 13.5, supportedUnits: [ML, TBSP] },
  
  // Egyptian / Arabic Local Foods
  { id: "13", name: "عيش بلدي (رغيف متوسط)", baseAmount: 1, baseUnit: "pc", calories: 275, protein: 9, carbs: 55, fat: 1.5, supportedUnits: [{ unit: "pc", multiplier: 1 }] },
  { id: "14", name: "فول مدمس (بدون زيت)", baseAmount: 100, baseUnit: "g", calories: 110, protein: 8, carbs: 20, fat: 0.5, supportedUnits: [GRAMS, TBSP, CUPS] },
  { id: "15", name: "طعمية / فلافل (حبة مقلية)", baseAmount: 1, baseUnit: "pc", calories: 57, protein: 2, carbs: 5, fat: 3.5, supportedUnits: [{ unit: "pc", multiplier: 1 }] },
  { id: "16", name: "كشري مصري", baseAmount: 100, baseUnit: "g", calories: 160, protein: 5, carbs: 27, fat: 3.5, supportedUnits: [GRAMS, { unit: "plate", multiplier: 350 }] },
  { id: "17", name: "حواوشي لحم (رغيف كامل)", baseAmount: 1, baseUnit: "pc", calories: 650, protein: 25, carbs: 50, fat: 35, supportedUnits: [{ unit: "pc", multiplier: 1 }, { unit: "half", multiplier: 0.5 }] },
  { id: "18", name: "مكرونة بشاميل", baseAmount: 100, baseUnit: "g", calories: 180, protein: 8, carbs: 18, fat: 9, supportedUnits: [GRAMS, { unit: "piece", multiplier: 200 }] },
  { id: "19", name: "شاورما دجاج (ساندوتش سوري)", baseAmount: 1, baseUnit: "pc", calories: 450, protein: 25, carbs: 45, fat: 18, supportedUnits: [{ unit: "pc", multiplier: 1 }] },
  { id: "20", name: "شاورما لحم (ساندوتش سوري)", baseAmount: 1, baseUnit: "pc", calories: 550, protein: 22, carbs: 45, fat: 30, supportedUnits: [{ unit: "pc", multiplier: 1 }] },
  { id: "21", name: "محشي كرنب", baseAmount: 100, baseUnit: "g", calories: 130, protein: 3, carbs: 22, fat: 4, supportedUnits: [GRAMS, { unit: "piece", multiplier: 25 }] },
  { id: "22", name: "بطاطس مقلية (French Fries)", baseAmount: 100, baseUnit: "g", calories: 312, protein: 3.4, carbs: 41, fat: 15, supportedUnits: [GRAMS] },
  { id: "23", name: "كبدة إسكندراني", baseAmount: 100, baseUnit: "g", calories: 190, protein: 26, carbs: 4, fat: 7, supportedUnits: [GRAMS] },
  { id: "24", name: "جبنة قريش", baseAmount: 100, baseUnit: "g", calories: 98, protein: 11, carbs: 3.4, fat: 4.3, supportedUnits: [GRAMS, TBSP] },
  { id: "25", name: "جبنة رومي", baseAmount: 100, baseUnit: "g", calories: 393, protein: 24, carbs: 1.5, fat: 32, supportedUnits: [GRAMS, { unit: "slice", multiplier: 20 }] },
  { id: "26", name: "زبادي طبيعي", baseAmount: 100, baseUnit: "g", calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, supportedUnits: [GRAMS, { unit: "cup", multiplier: 105 }] },
  { id: "27", name: "رز بلبن", baseAmount: 100, baseUnit: "g", calories: 111, protein: 3, carbs: 19, fat: 2.5, supportedUnits: [GRAMS, { unit: "plate", multiplier: 150 }] },
];

// -----------------------------------------------------------------------------
// LOCAL STORAGE HOOK
// -----------------------------------------------------------------------------
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

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
});

function NutritionRoute() {
  const [targets, setTargets] = useLocalStorage<MacroTargets | null>("ironlog_macro_targets", null);
  const [apiKey, setApiKey] = useLocalStorage<string>("ironlog_gemini_key", "");

  const effectiveApiKey = import.meta.env.VITE_GEMINI_API_KEY || apiKey;

  if (!targets) {
    return <OnboardingWizard onComplete={setTargets} />;
  }

  return <NutritionDashboard targets={targets} onReset={() => setTargets(null)} apiKey={effectiveApiKey} setApiKey={setApiKey} />;
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

    const bmr = sex === "Male" 
      ? (10 * w) + (6.25 * h) - (5 * a) + 5
      : (10 * w) + (6.25 * h) - (5 * a) - 161;
      
    const tdee = bmr * act;
    
    let targetCalories = tdee;
    if (goal === "Lose") targetCalories = tdee - (r * 1100);
    if (goal === "Gain") targetCalories = tdee + (r * 1100);

    const protein = w * 2.0; 
    const fat = (targetCalories * 0.25) / 9; 
    const carbs = (targetCalories - (protein * 4) - (fat * 9)) / 4;

    onComplete({
      calories: Math.round(targetCalories),
      protein: Math.round(protein),
      carbs: Math.round(Math.max(0, carbs)),
      fat: Math.round(fat),
      goal
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 p-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="max-w-md mx-auto">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary mb-4">
            <Target className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Nutrition Calculator</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Set up your scientific calorie and macro targets based on your unique body profile and goals.
          </p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
          {/* Steps content is same as previous version... */}
          <div className="flex justify-between items-center mb-4 text-sm font-semibold text-muted-foreground">
            <span>Step {step} of 3</span>
            <div className="flex gap-1">
              {[1,2,3].map(s => <div key={s} className={cn("h-2 w-8 rounded-full transition-colors", step >= s ? "bg-primary" : "bg-secondary")} />)}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold mb-4">Biological Profile</h2>
              <div className="space-y-2">
                <Label>Biological Sex</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={sex === "Male" ? "default" : "outline"} onClick={() => setSex("Male")}>Male</Button>
                  <Button variant={sex === "Female" ? "default" : "outline"} onClick={() => setSex("Female")}>Female</Button>
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
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold mb-4">Activity & Lifestyle</h2>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-bold mb-4">Your Goal</h2>
              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant={goal === "Lose" ? "default" : "outline"} className="justify-start" onClick={() => setGoal("Lose")}>🔥 Fat Loss</Button>
                  <Button variant={goal === "Maintain" ? "default" : "outline"} className="justify-start" onClick={() => setGoal("Maintain")}>⚖️ Maintenance</Button>
                  <Button variant={goal === "Gain" ? "default" : "outline"} className="justify-start" onClick={() => setGoal("Gain")}>💪 Muscle Gain</Button>
                </div>
              </div>

              {goal !== "Maintain" && (
                <div className="space-y-2 mt-4">
                  <Label>Rate of Change</Label>
                  <Select value={rate} onValueChange={setRate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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

          <div className="pt-4 flex justify-between">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep(s => s - 1)}>Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={calculateMacros}>Calculate & Save <Check className="ml-2 h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// NUTRITION DASHBOARD
// -----------------------------------------------------------------------------
function NutritionDashboard({ targets, onReset, apiKey, setApiKey }: { targets: MacroTargets; onReset: () => void; apiKey: string; setApiKey: (k: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const [logsStorage, setLogsStorage] = useLocalStorage<Record<string, FoodLog[]>>("ironlog_food_logs", {});
  const [recentFoods, setRecentFoods] = useLocalStorage<FoodDBItem[]>("ironlog_recent_foods", []);
  
  const rawTodaysLogs = (logsStorage || {})[dateStr] || [];
  const todaysLogs = Array.isArray(rawTodaysLogs) ? rawTodaysLogs : [];
  const rawRecentFoods = recentFoods || [];
  const safeRecentFoods = Array.isArray(rawRecentFoods) ? rawRecentFoods : [];
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("Breakfast");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const consumed = todaysLogs.reduce((acc, log) => ({
    calories: acc.calories + log.calories,
    protein: acc.protein + log.protein,
    carbs: acc.carbs + log.carbs,
    fat: acc.fat + log.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remainingCals = targets.calories - consumed.calories;
  const calsPercent = Math.min(100, (consumed.calories / targets.calories) * 100);

  const addFood = (food: FoodLog, baseFoodItem: FoodDBItem) => {
    // Add to daily logs
    setLogsStorage(prev => {
      const existing = prev[dateStr] || [];
      return { ...prev, [dateStr]: [...existing, food] };
    });
    // Add to recents if not exists
    setRecentFoods(prev => {
      const filtered = prev.filter(p => p.id !== baseFoodItem.id);
      return [baseFoodItem, ...filtered].slice(0, 15); // Keep last 15
    });
    setSearchModalOpen(false);
  };

  const removeFood = (id: string) => {
    setLogsStorage(prev => {
      const existing = prev[dateStr] || [];
      return { ...prev, [dateStr]: existing.filter(f => f.id !== id) };
    });
  };

  const meals: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border pb-4 pt-12 px-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-2 bg-secondary rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="w-32 text-center">
              {isToday(currentDate) ? "Today" : format(currentDate, "MMM d, yyyy")}
            </div>
            <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-2 bg-secondary rounded-full">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="p-2 text-muted-foreground hover:text-foreground">
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>

        {/* CALORIE PROGRESS */}
        <div className="mt-6 flex items-center justify-between text-center px-2">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Goal</div>
            <div className="font-bold">{targets.calories}</div>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Food</div>
            <div className="font-bold">{Math.round(consumed.calories)}</div>
          </div>
          <div className="text-muted-foreground">=</div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className={cn("font-bold text-xl", remainingCals < 0 ? "text-destructive" : "text-primary")}>
              {Math.round(remainingCals)}
            </div>
          </div>
        </div>
        <div className="mt-4 h-3 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", remainingCals < 0 ? "bg-destructive" : "bg-primary")} 
            style={{ width: `${calsPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <MacroRing label="Protein" consumed={consumed.protein} target={targets.protein} color="bg-[#3B82F6]" icon={<Beef className="h-3 w-3" />} />
          <MacroRing label="Carbs" consumed={consumed.carbs} target={targets.carbs} color="bg-[#F59E0B]" icon={<Wheat className="h-3 w-3" />} />
          <MacroRing label="Fat" consumed={consumed.fat} target={targets.fat} color="bg-[#EF4444]" icon={<Droplet className="h-3 w-3" />} />
        </div>
      </header>

      {/* MEAL SECTIONS */}
      <main className="px-4 py-6 space-y-6">
        {meals.map(meal => {
          const items = todaysLogs.filter(l => l.mealType === meal);
          const mealCals = items.reduce((acc, i) => acc + i.calories, 0);

          return (
            <div key={meal} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-border/50 bg-secondary/20">
                <h3 className="font-bold text-lg">{meal}</h3>
                <span className="text-sm font-semibold">{Math.round(mealCals)} kcal</span>
              </div>
              <div className="divide-y divide-border/50">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground italic">No food logged yet.</div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between group">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.quantity} {item.unit} • {Math.round(item.protein)}g P, {Math.round(item.carbs)}g C, {Math.round(item.fat)}g F
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold">{Math.round(item.calories)}</span>
                        <button onClick={() => removeFood(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3">
                <button 
                  onClick={() => { setSelectedMealType(meal); setSearchModalOpen(true); }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Food
                </button>
              </div>
            </div>
          );
        })}
      </main>

      <FoodSearchModal 
        open={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
        mealType={selectedMealType} 
        onAdd={addFood}
        apiKey={apiKey}
        recentFoods={safeRecentFoods}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>Nutrition Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label>Gemini API Key (For AI Food Parser)</Label>
              <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIzaSy..." />
              <p className="text-xs text-muted-foreground mt-1">Stored locally on your device.</p>
            </div>
            <div className="space-y-2 pt-4 border-t border-border">
              <Label>Reset Macro Targets</Label>
              <Button variant="destructive" onClick={() => { onReset(); setSettingsOpen(false); }} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" /> Recalculate Macros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MacroRing({ label, consumed, target, color, icon }: any) {
  const pct = Math.min(100, (consumed / target) * 100);
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
        {icon} {label}
      </div>
      <div className="relative w-12 h-12 flex items-center justify-center mb-1">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
          <path className={cn("transition-all duration-500", color.replace('bg-', 'text-'))} strokeDasharray={`${pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
      <div className="text-xs font-bold">{Math.round(consumed)} <span className="text-muted-foreground font-normal">/ {target}g</span></div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// FOOD SEARCH MODAL (AI + DB + RECENT)
// -----------------------------------------------------------------------------
function FoodSearchModal({ open, onClose, mealType, onAdd, apiKey, recentFoods }: { 
  open: boolean, 
  onClose: () => void, 
  mealType: MealType, 
  onAdd: (f: FoodLog, b: FoodDBItem) => void,
  apiKey: string,
  recentFoods: FoodDBItem[]
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
    return FOOD_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, recentFoods]);

  const handleAISearch = async () => {
    if (!query.trim()) return;
    if (!apiKey) {
      setAiError("Please set your Gemini API Key in Nutrition Settings first.");
      return;
    }
    
    setAiLoading(true);
    setAiError("");
    try {
      const aiResponse = await parseFoodWithAI(query, apiKey);
      
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
        ]
      };
      
      setSelectedFood(parsedItem);
    } catch (err: any) {
      setAiError(err.message || "Failed to parse food.");
    } finally {
      setAiLoading(false);
    }
  };

  const calculatedMacros = useMemo(() => {
    if (!selectedFood) return null;
    
    const qty = parseFloat(quantity) || 0;
    const selectedUnitObj = selectedFood.supportedUnits.find(u => u.unit === unit);
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
    onAdd({
      id: uuidv4(),
      mealType,
      foodId: selectedFood.id,
      name: selectedFood.name,
      quantity: parseFloat(quantity) || 1,
      unit,
      calories: calculatedMacros.calories,
      protein: calculatedMacros.protein,
      carbs: calculatedMacros.carbs,
      fat: calculatedMacros.fat
    }, selectedFood);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden bg-background border-border max-h-[85vh] flex flex-col rounded-2xl">
        <DialogHeader className="p-4 border-b border-border bg-card">
          <div className="flex justify-between items-center mb-3">
            <DialogTitle>Add to {mealType}</DialogTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search database or type any meal..." 
                className="pl-9 bg-background border-border"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedFood(null); setAiError(""); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAISearch(); }}
              />
            </div>
          </div>
          {aiError && (
            <div className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {aiError}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!selectedFood ? (
            <div className="divide-y divide-border">
              {(!query && recentFoods.length > 0) && (
                <div className="px-4 py-2 bg-secondary/50 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Recent Foods
                </div>
              )}
              {(!query && recentFoods.length === 0) && (
                <div className="px-4 py-2 bg-secondary/50 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Database
                </div>
              )}

              {query.trim().length > 0 && (
                <button 
                  onClick={handleAISearch}
                  disabled={aiLoading}
                  className="w-full text-left p-4 hover:bg-primary/10 bg-primary/5 transition-colors flex justify-between items-center group border-b border-primary/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                      {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-primary">Search online for "{query}"</div>
                      <div className="text-xs text-primary/80 mt-1">Get precise macros for any food, meal, or recipe</div>
                    </div>
                  </div>
                </button>
              )}

              {filteredFoods.length === 0 && !aiLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Not found in local database.</p>
                  <p className="text-xs mt-2">Click "Search online" above or press Enter to find it.</p>
                </div>
              ) : (
                filteredFoods.map(food => (
                  <button 
                    key={food.id} 
                    onClick={() => setSelectedFood(food)}
                    className="w-full text-left p-4 hover:bg-secondary/50 transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{food.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {food.baseAmount} {food.baseUnit} • {Math.round(food.calories)} kcal
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-6 animate-in fade-in slide-in-from-right-4">
              <button onClick={() => setSelectedFood(null)} className="flex items-center gap-2 text-sm text-primary mb-6 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to Search
              </button>
              
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-2xl font-bold">{selectedFood.name}</h3>
                {selectedFood.id.startsWith("ai_") && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-1 rounded">
                    <Bot className="h-3 w-3" /> AI Parsed
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="text-lg font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="text-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedFood.supportedUnits.map(u => (
                        <SelectItem key={u.unit} value={u.unit}>{u.unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {calculatedMacros && (
                <div className="bg-card border border-border rounded-xl p-5 mb-8">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-black text-primary">{Math.round(calculatedMacros.calories)}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Calories</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border">
                    <div>
                      <div className="font-bold text-lg">{Math.round(calculatedMacros.protein)}g</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Protein</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">{Math.round(calculatedMacros.carbs)}g</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Carbs</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">{Math.round(calculatedMacros.fat)}g</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Fat</div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} className="w-full py-6 text-lg font-bold rounded-xl shadow-lg">
                <Check className="mr-2 h-5 w-5" /> Log Food
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
