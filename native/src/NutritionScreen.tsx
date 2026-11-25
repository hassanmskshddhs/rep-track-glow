import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import Svg, { Circle } from "react-native-svg";
import { colors, PrimaryButton, RiseIn } from "./ui";
import { useBackHandler } from "./back";
import { FOOD_DB, FoodDBItem } from "./food";
import { supabase } from "./supabase";

// Same server endpoint the web app calls; auth via the user's Supabase token.
const NUTRITION_API = "https://ironlog-orcin.vercel.app/api/nutrition";

type AIFoodResponse = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving_size_quantity: number;
  serving_size_unit: string;
};

// Same AsyncStorage keys as the web app so data carries over.
const TARGETS_KEY = "ironlog_macro_targets";
const LOGS_KEY = "ironlog_food_logs";
const RECENTS_KEY = "ironlog_recent_foods";

type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
};

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
const MEALS: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isToday(d: Date): boolean {
  return dateStr(d) === dateStr(new Date());
}

let idCounter = 0;
function uuid(): string {
  idCounter += 1;
  return `nl-${Date.now().toString(36)}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sedentary (office job, no exercise)" },
  { value: "1.375", label: "Lightly Active (1-3 days/week)" },
  { value: "1.55", label: "Moderately Active (3-5 days/week)" },
  { value: "1.725", label: "Very Active (6-7 days/week)" },
  { value: "1.9", label: "Extra Active (physical job & hard exercise)" },
];

const RATES = [
  { value: "0.25", label: "Slow & Steady (0.25 kg/week)" },
  { value: "0.5", label: "Moderate (0.5 kg/week)" },
  { value: "0.75", label: "Aggressive (0.75 kg/week)" },
];

function Wizard({ onComplete }: { onComplete: (t: MacroTargets) => void }) {
  const [step, setStep] = useState(1);
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("28");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("80");
  const [activity, setActivity] = useState("1.55");
  const [goal, setGoal] = useState<"Lose" | "Maintain" | "Gain">("Maintain");
  const [rate, setRate] = useState("0.5");

  const calculate = () => {
    const w = parseFloat(weight) || 0;
    const h = parseFloat(height) || 0;
    const a = parseFloat(age) || 0;
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

  const now = new Date();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.dateLine}>
        {WEEKDAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}
      </Text>
      <Text style={styles.title}>Fuel setup</Text>
      <Text style={styles.subtitle}>
        Set your calorie and macro targets from your body profile and goal.
      </Text>

      <View style={styles.wizardCard}>
        <View style={styles.stepRow}>
          <Text style={styles.stepText}>Step {step} of 3</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, step >= s && { backgroundColor: colors.primary }]}
              />
            ))}
          </View>
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.wizardHeading}>Biological Profile</Text>
            <Text style={styles.label}>Biological Sex</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["Male", "Female"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSex(s)}
                  style={[styles.choiceButton, sex === s && styles.choiceButtonActive]}
                >
                  <Text style={[styles.choiceText, sex === s && styles.choiceTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age (years)</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="number-pad" />
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Current Weight (kg)</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.wizardHeading}>Activity & Lifestyle</Text>
            <Text style={styles.label}>Activity Level</Text>
            {ACTIVITY_LEVELS.map((a) => (
              <Pressable
                key={a.value}
                onPress={() => setActivity(a.value)}
                style={[styles.listChoice, activity === a.value && styles.listChoiceActive]}
              >
                <Text style={[styles.listChoiceText, activity === a.value && styles.choiceTextActive]}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.wizardHeading}>Your Goal</Text>
            {(
              [
                { key: "Lose", label: "🔥 Fat Loss" },
                { key: "Maintain", label: "⚖️ Maintenance" },
                { key: "Gain", label: "💪 Muscle Gain" },
              ] as const
            ).map((g) => (
              <Pressable
                key={g.key}
                onPress={() => setGoal(g.key)}
                style={[styles.listChoice, goal === g.key && styles.listChoiceActive]}
              >
                <Text style={[styles.listChoiceText, goal === g.key && styles.choiceTextActive]}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
            {goal !== "Maintain" && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Rate of Change</Text>
                {RATES.map((r) => (
                  <Pressable
                    key={r.value}
                    onPress={() => setRate(r.value)}
                    style={[styles.listChoice, rate === r.value && styles.listChoiceActive]}
                  >
                    <Text style={[styles.listChoiceText, rate === r.value && styles.choiceTextActive]}>
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.wizardButtons}>
          <Pressable disabled={step === 1} onPress={() => setStep((s) => s - 1)} style={{ opacity: step === 1 ? 0.3 : 1 }}>
            <Text style={styles.wizardBack}>Back</Text>
          </Pressable>
          <View style={{ width: 140 }}>
            <PrimaryButton
              label={step < 3 ? "Next" : "Calculate & Save"}
              onPress={() => (step < 3 ? setStep((s) => s + 1) : calculate())}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function MacroRing({
  label,
  icon,
  consumed,
  target,
  color,
}: {
  label: string;
  icon: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(1, target > 0 ? consumed / target : 0);
  const size = 84;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ringCard}>
      <Text style={styles.ringLabel}>
        {icon} {label}
      </Text>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.input}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c}`}
            strokeDashoffset={c * (1 - pct)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={styles.ringCenterValue}>{Math.round(consumed)}</Text>
        <Text style={styles.ringCenterTarget}>/ {target}g</Text>
      </View>
    </View>
  );
}

export function NutritionScreen({ session }: { session: Session }) {
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logsStorage, setLogsStorage] = useState<Record<string, FoodLog[]>>({});
  const [recentFoods, setRecentFoods] = useState<FoodDBItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("Breakfast");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Search modal state
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null);
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Hardware back: close dialogs, then the food detail, then the search sheet.
  useBackHandler(
    !!(resetConfirm || settingsOpen || unitPickerOpen || selectedFood || searchOpen),
    () => {
      if (resetConfirm) setResetConfirm(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (unitPickerOpen) setUnitPickerOpen(false);
      else if (selectedFood) setSelectedFood(null);
      else if (searchOpen) setSearchOpen(false);
      else return false;
      return true;
    },
  );

  useEffect(() => {
    (async () => {
      try {
        const [t, l, r] = await Promise.all([
          AsyncStorage.getItem(TARGETS_KEY),
          AsyncStorage.getItem(LOGS_KEY),
          AsyncStorage.getItem(RECENTS_KEY),
        ]);
        if (t) setTargets(JSON.parse(t));
        if (l) setLogsStorage(JSON.parse(l));
        if (r) setRecentFoods(JSON.parse(r));
      } catch {
        /* ignore */
      }
      setLoaded(true);
    })();
  }, []);

  const saveTargets = async (t: MacroTargets | null) => {
    setTargets(t);
    try {
      if (t) await AsyncStorage.setItem(TARGETS_KEY, JSON.stringify(t));
      else await AsyncStorage.removeItem(TARGETS_KEY);
    } catch {
      /* ignore */
    }
  };

  const saveLogs = async (next: Record<string, FoodLog[]>) => {
    setLogsStorage(next);
    try {
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const saveRecents = async (next: FoodDBItem[]) => {
    setRecentFoods(next);
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const filteredFoods = useMemo(() => {
    if (!query) return recentFoods.length > 0 ? recentFoods : FOOD_DB;
    const q = query.toLowerCase();
    return FOOD_DB.filter((f) => f.name.toLowerCase().includes(q));
  }, [query, recentFoods]);

  const calculated = useMemo(() => {
    if (!selectedFood) return null;
    const qty = parseFloat(quantity) || 0;
    const unitObj = selectedFood.supportedUnits.find((u) => u.unit === unit);
    if (!unitObj) return null;
    const totalBase = qty * unitObj.multiplier;
    const ratio = totalBase / selectedFood.baseAmount;
    return {
      calories: selectedFood.calories * ratio,
      protein: selectedFood.protein * ratio,
      carbs: selectedFood.carbs * ratio,
      fat: selectedFood.fat * ratio,
    };
  }, [selectedFood, unit, quantity]);

  const ds = dateStr(currentDate);
  const todaysLogs = useMemo(() => {
    const raw = logsStorage[ds];
    return Array.isArray(raw) ? raw : [];
  }, [logsStorage, ds]);

  const consumed = todaysLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  if (!loaded) return <View style={styles.screen} />;

  if (!targets) {
    return <Wizard onComplete={(t) => void saveTargets(t)} />;
  }

  const remainingCals = targets.calories - consumed.calories;
  const calsPercent = Math.min(100, (consumed.calories / targets.calories) * 100);

  const openSearch = (meal: MealType) => {
    setSelectedMeal(meal);
    setQuery("");
    setSelectedFood(null);
    setUnitPickerOpen(false);
    setAiError("");
    setSearchOpen(true);
  };

  const searchOnline = async () => {
    const q = query.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error("Sign in to use AI food search.");
      const res = await fetch(NUTRITION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(res.status === 401 ? "Sign in to use AI food search." : detail || "AI search is unavailable right now.");
      }
      const parsed = (await res.json()) as AIFoodResponse;
      if (!parsed || typeof parsed.calories !== "number") {
        throw new Error("Couldn't identify that food — try describing it differently.");
      }
      const item: FoodDBItem = {
        id: `ai_${Date.now().toString(36)}`,
        name: parsed.food_name,
        baseAmount: parsed.serving_size_quantity,
        baseUnit: parsed.serving_size_unit,
        calories: parsed.calories,
        protein: parsed.protein,
        carbs: parsed.carbs,
        fat: parsed.fats,
        supportedUnits: [
          { unit: parsed.serving_size_unit, multiplier: 1 },
          { unit: "serving", multiplier: parsed.serving_size_quantity },
        ],
      };
      setSelectedFood(item);
      setUnit(item.supportedUnits[0].unit);
      setQuantity(item.baseAmount.toString());
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI search failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const addFood = () => {
    if (!selectedFood || !calculated) return;
    const log: FoodLog = {
      id: uuid(),
      mealType: selectedMeal,
      foodId: selectedFood.id,
      name: selectedFood.name,
      quantity: parseFloat(quantity) || 1,
      unit,
      ...calculated,
    };
    void saveLogs({ ...logsStorage, [ds]: [...todaysLogs, log] });
    void saveRecents([selectedFood, ...recentFoods.filter((f) => f.id !== selectedFood.id)].slice(0, 15));
    setSearchOpen(false);
    setSelectedFood(null);
    setQuery("");
  };

  const removeFood = (id: string) => {
    void saveLogs({ ...logsStorage, [ds]: todaysLogs.filter((f) => f.id !== id) });
  };

  const shiftDay = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const now = new Date();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.dateLine}>
          {WEEKDAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}
        </Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Fuel</Text>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Date switcher */}
        <View style={styles.dateSwitcher}>
          <Pressable onPress={() => shiftDay(-1)} hitSlop={10} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.dateLabel}>
            {isToday(currentDate)
              ? "Today"
              : `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
          </Text>
          <Pressable onPress={() => shiftDay(1)} hitSlop={10} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>

        {/* Calorie summary */}
        <RiseIn delay={60}>
          <View style={styles.card}>
            <View style={styles.calsRow}>
              <View style={styles.calsCell}>
                <Text style={styles.calsLabel}>Goal</Text>
                <Text style={styles.calsValue}>{Math.round(targets.calories)}</Text>
              </View>
              <View style={[styles.calsCell, styles.calsCellBorder]}>
                <Text style={styles.calsLabel}>Food</Text>
                <Text style={styles.calsValue}>{Math.round(consumed.calories)}</Text>
              </View>
              <View style={styles.calsCell}>
                <Text style={styles.calsLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.calsValue,
                    { color: remainingCals < 0 ? colors.destructive : colors.primary },
                  ]}
                >
                  {Math.round(remainingCals)}
                </Text>
              </View>
            </View>
            <View style={styles.calsTrack}>
              <View
                style={[
                  styles.calsFill,
                  {
                    width: `${calsPercent}%` as never,
                    backgroundColor: remainingCals < 0 ? colors.destructive : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </RiseIn>

        {/* Macro rings */}
        <View style={styles.ringsRow}>
          <RiseIn delay={120} style={{ flex: 1 }}>
            <MacroRing label="Protein" icon="🥩" consumed={consumed.protein} target={targets.protein} color="#f2a3a3" />
          </RiseIn>
          <RiseIn delay={200} style={{ flex: 1 }}>
            <MacroRing label="Carbs" icon="🌾" consumed={consumed.carbs} target={targets.carbs} color="#e8d5a0" />
          </RiseIn>
          <RiseIn delay={280} style={{ flex: 1 }}>
            <MacroRing label="Fat" icon="💧" consumed={consumed.fat} target={targets.fat} color="#a3c4f2" />
          </RiseIn>
        </View>

        {/* Meals */}
        {MEALS.map((meal, mi) => {
          const items = todaysLogs.filter((l) => l.mealType === meal);
          const mealCals = items.reduce((acc, i) => acc + i.calories, 0);
          return (
            <RiseIn key={meal} delay={340 + mi * 80} style={{ marginTop: 14 }}>
              <View style={styles.card}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>{meal}</Text>
                  <Text style={styles.mealCals}>{Math.round(mealCals)} kcal</Text>
                </View>
                <View style={styles.mealBody}>
                  {items.length === 0 ? (
                    <Text style={styles.mealEmpty}>Nothing logged yet — tap Add Food below.</Text>
                  ) : (
                    items.map((item, idx) => (
                      <View key={item.id} style={[styles.foodRow, idx > 0 && styles.foodRowBorder]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName}>{item.name}</Text>
                          <Text style={styles.foodMeta}>
                            {item.quantity} {item.unit} · {Math.round(item.protein)}g P, {Math.round(item.carbs)}g C, {Math.round(item.fat)}g F
                          </Text>
                        </View>
                        <Text style={styles.foodCals}>{Math.round(item.calories)}</Text>
                        <Pressable onPress={() => removeFood(item.id)} hitSlop={8}>
                          <Text style={styles.foodRemove}>🗑</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
                <Pressable onPress={() => openSearch(meal)} style={styles.addFoodButton}>
                  <Text style={styles.addFoodText}>+ Add Food</Text>
                </Pressable>
              </View>
            </RiseIn>
          );
        })}
      </ScrollView>

      {/* Food search modal */}
      <Modal visible={searchOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.searchBackdrop}
        >
          <View style={styles.searchSheet}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Add to {selectedMeal}</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods..."
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setSelectedFood(null);
                }}
              />
            </View>
            {!selectedFood ? (
              <ScrollView style={{ flex: 1 }}>
                {!query && (
                  <Text style={styles.searchSection}>
                    {recentFoods.length > 0 ? "RECENT FOODS" : "DATABASE"}
                  </Text>
                )}
                {query.trim().length > 0 && (
                  <Pressable style={styles.aiRow} onPress={() => void searchOnline()} disabled={aiLoading}>
                    <Text style={{ fontSize: 18 }}>{aiLoading ? "⏳" : "✨"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiRowTitle}>
                        {aiLoading ? "Searching online..." : `Search online for "${query.trim()}"`}
                      </Text>
                      <Text style={styles.aiRowSub}>Get precise macros for any food or meal</Text>
                    </View>
                  </Pressable>
                )}
                {aiError !== "" && <Text style={styles.aiError}>{aiError}</Text>}
                {filteredFoods.length === 0 ? (
                  <Text style={styles.searchEmpty}>Not found in the database — try Search online above.</Text>
                ) : (
                  filteredFoods.map((food) => (
                    <Pressable
                      key={food.id}
                      style={styles.searchRow}
                      onPress={() => {
                        setSelectedFood(food);
                        setUnit(food.supportedUnits[0].unit);
                        setQuantity(food.baseAmount.toString());
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodMeta}>
                          {food.baseAmount} {food.baseUnit} · {Math.round(food.calories)} kcal
                        </Text>
                      </View>
                      <Text style={styles.searchPlus}>+</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                <Pressable onPress={() => setSelectedFood(null)}>
                  <Text style={styles.backToSearch}>← Back to Search</Text>
                </Pressable>
                <Text style={styles.selectedName}>{selectedFood.name}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Unit</Text>
                    <Pressable style={styles.input} onPress={() => setUnitPickerOpen(true)}>
                      <Text style={{ color: colors.foreground, fontSize: 15 }}>{unit}</Text>
                    </Pressable>
                  </View>
                </View>
                {calculated && (
                  <View style={[styles.card, { marginTop: 18 }]}>
                    <Text style={styles.calcCals}>{Math.round(calculated.calories)}</Text>
                    <Text style={styles.calcCalsLabel}>CALORIES</Text>
                    <View style={styles.calsRow}>
                      <View style={styles.calsCell}>
                        <Text style={styles.calcMacroValue}>{Math.round(calculated.protein)}g</Text>
                        <Text style={styles.calcMacroLabel}>Protein</Text>
                      </View>
                      <View style={styles.calsCell}>
                        <Text style={styles.calcMacroValue}>{Math.round(calculated.carbs)}g</Text>
                        <Text style={styles.calcMacroLabel}>Carbs</Text>
                      </View>
                      <View style={styles.calsCell}>
                        <Text style={styles.calcMacroValue}>{Math.round(calculated.fat)}g</Text>
                        <Text style={styles.calcMacroLabel}>Fat</Text>
                      </View>
                    </View>
                  </View>
                )}
                <View style={{ marginTop: 18 }}>
                  <PrimaryButton label="Log Food" onPress={addFood} />
                </View>
              </ScrollView>
            )}
            <Pressable onPress={() => setSearchOpen(false)} style={styles.searchClose}>
              <Text style={styles.wizardBack}>Close</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unit picker */}
      <Modal visible={unitPickerOpen} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setUnitPickerOpen(false)}>
          <View style={styles.sheet}>
            {selectedFood?.supportedUnits.map((u) => (
              <Pressable
                key={u.unit}
                style={styles.sheetItem}
                onPress={() => {
                  setUnit(u.unit);
                  setUnitPickerOpen(false);
                }}
              >
                <Text style={styles.sheetItemText}>{u.unit}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Settings */}
      <Modal visible={settingsOpen} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Nutrition Settings</Text>
            <Text style={styles.centerSub}>
              Goal: {targets.goal} · {Math.round(targets.calories)} kcal · {targets.protein}g P · {targets.carbs}g C · {targets.fat}g F
            </Text>
            <Pressable
              onPress={() => {
                setSettingsOpen(false);
                setResetConfirm(true);
              }}
              style={styles.dangerButton}
            >
              <Text style={styles.dangerButtonText}>↺ Recalculate Macros</Text>
            </Pressable>
            <Pressable onPress={() => setSettingsOpen(false)} style={{ alignSelf: "center", marginTop: 14 }}>
              <Text style={styles.wizardBack}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Reset confirm */}
      <Modal visible={resetConfirm} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Recalculate macros?</Text>
            <Text style={styles.centerSub}>
              This clears your current targets and restarts the setup wizard. Your logged food stays.
            </Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setResetConfirm(false)} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={styles.wizardBack}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setResetConfirm(false);
                  void saveTargets(null);
                }}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  dateLine: { color: colors.mutedForeground, fontSize: 13, fontWeight: "500" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 },
  title: { color: colors.foreground, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 8, lineHeight: 20 },
  gearIcon: { fontSize: 20, opacity: 0.7 },
  dateSwitcher: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 4,
  },
  dateArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  dateArrowText: { color: colors.mutedForeground, fontSize: 22 },
  dateLabel: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  calsRow: { flexDirection: "row" },
  calsCell: { flex: 1, alignItems: "center" },
  calsCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  calsLabel: { color: colors.mutedForeground, fontSize: 12, fontWeight: "500" },
  calsValue: { color: colors.foreground, fontSize: 18, fontWeight: "800", marginTop: 2 },
  calsTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.input,
    overflow: "hidden",
  },
  calsFill: { height: "100%", borderRadius: 999 },
  ringsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  ringCard: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
  },
  ringLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  ringTrack: {
    marginTop: 10,
    width: "100%",
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.input,
    overflow: "hidden",
  },
  ringFill: { height: "100%", borderRadius: 999 },
  ringValue: { color: colors.foreground, fontSize: 13, fontWeight: "800", marginTop: 8 },
  ringTarget: { color: colors.mutedForeground, fontWeight: "400" },
  ringCenterValue: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  ringCenterTarget: { color: colors.mutedForeground, fontSize: 10 },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  mealCals: { color: colors.mutedForeground, fontSize: 14, fontWeight: "600" },
  mealBody: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12 },
  mealEmpty: { color: colors.mutedForeground, fontSize: 13, textAlign: "center", paddingVertical: 16 },
  foodRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  foodRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  foodName: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  foodMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  foodCals: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  foodRemove: { fontSize: 15, opacity: 0.6 },
  addFoodButton: { alignItems: "center", paddingVertical: 10 },
  addFoodText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  wizardCard: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
  },
  stepRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  stepText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600" },
  stepDot: { height: 8, width: 32, borderRadius: 999, backgroundColor: colors.input },
  wizardHeading: { color: colors.foreground, fontSize: 20, fontWeight: "700", marginBottom: 14 },
  label: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  choiceButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  choiceTextActive: { color: colors.primaryForeground },
  listChoice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  listChoiceActive: { borderColor: colors.primary, backgroundColor: "#c8f2cb15" },
  listChoiceText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  wizardButtons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22 },
  wizardBack: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  searchBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  searchSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    flex: 1,
    marginTop: 80,
  },
  searchHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800", marginBottom: 12 },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 15,
  },
  searchSection: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  searchEmpty: { color: colors.mutedForeground, textAlign: "center", padding: 30 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  searchPlus: { color: colors.mutedForeground, fontSize: 22, fontWeight: "300" },
  searchClose: { alignItems: "center", paddingVertical: 14 },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#c8f2cb10",
  },
  aiRowTitle: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  aiRowSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  aiError: { color: colors.destructive, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  backToSearch: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  selectedName: { color: colors.foreground, fontSize: 24, fontWeight: "800", marginTop: 14 },
  calcCals: { color: colors.primary, fontSize: 36, fontWeight: "800", textAlign: "center" },
  calcCalsLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  calcMacroValue: { color: colors.foreground, fontSize: 17, fontWeight: "700" },
  calcMacroLabel: { color: colors.mutedForeground, fontSize: 10, textTransform: "uppercase", marginTop: 2 },
  sheetBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 8,
    paddingBottom: 24,
  },
  sheetItem: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetItemText: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  centerBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "center", padding: 24 },
  centerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
  },
  centerTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  centerSub: { color: colors.mutedForeground, fontSize: 13, marginTop: 8, lineHeight: 19 },
  centerButtons: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 18 },
  dangerButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: colors.destructive, fontSize: 15, fontWeight: "700" },
});
