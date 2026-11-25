import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, PrimaryButton, RiseIn, Wordmark } from "./ui";

// Same storage keys as the web onboarding.
const TARGETS_KEY = "ironlog_macro_targets";
const GOAL_KEY = "ironlog:goal";

type Goal = "Build muscle" | "Get stronger" | "Lose fat" | "Stay consistent";

const GOALS: { id: Goal; blurb: string; icon: string }[] = [
  { id: "Build muscle", blurb: "Add size with progressive overload", icon: "🏋️" },
  { id: "Get stronger", blurb: "Push your numbers up, week on week", icon: "📈" },
  { id: "Lose fat", blurb: "Keep muscle while the scale drops", icon: "🔥" },
  { id: "Stay consistent", blurb: "Build the habit, session by session", icon: "📅" },
];

const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sedentary (office job, no exercise)" },
  { value: "1.375", label: "Lightly active (1-3 days/week)" },
  { value: "1.55", label: "Moderately active (3-5 days/week)" },
  { value: "1.725", label: "Very active (6-7 days/week)" },
  { value: "1.9", label: "Extra active (physical job and hard exercise)" },
];

const NUTRITION_GOAL: Record<Goal, "Lose" | "Maintain" | "Gain"> = {
  "Build muscle": "Gain",
  "Get stronger": "Gain",
  "Lose fat": "Lose",
  "Stay consistent": "Maintain",
};

function computeTargets(input: {
  sex: "Male" | "Female";
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: Goal;
}) {
  const { sex, age, height, weight, activity, goal } = input;
  const bmr =
    sex === "Male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * activity;
  const nutritionGoal = NUTRITION_GOAL[goal];
  let calories = tdee;
  if (nutritionGoal === "Lose") calories = tdee - 0.5 * 1100;
  if (nutritionGoal === "Gain") calories = tdee + 0.5 * 1100;
  const protein = weight * 2.0;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(Math.max(0, carbs)),
    fat: Math.round(fat),
    goal: nutritionGoal,
  };
}

export function OnboardingScreen({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("22");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("75");
  const [activity, setActivity] = useState("1.55");

  const totalSteps = 4;

  const statsValid = useMemo(() => {
    const a = parseFloat(age);
    const h = parseFloat(height);
    const w = parseFloat(weight);
    return a >= 10 && a <= 100 && h >= 120 && h <= 230 && w >= 30 && w <= 300;
  }, [age, height, weight]);

  const targets = useMemo(() => {
    if (!goal || !statsValid) return null;
    return computeTargets({
      sex,
      age: parseFloat(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      activity: parseFloat(activity),
      goal,
    });
  }, [goal, statsValid, sex, age, height, weight, activity]);

  const finish = async (withTargets: boolean) => {
    try {
      if (withTargets && targets && goal) {
        await AsyncStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
        await AsyncStorage.setItem(GOAL_KEY, goal);
      }
      await AsyncStorage.setItem(`ironlog:onboarded:${userId}`, "1");
    } catch {
      /* ignore */
    }
    onDone();
  };

  return (
    <View style={styles.screen}>
      {/* progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` as never }]}
          />
        </View>
        <View style={styles.progressRow}>
          {step > 0 ? (
            <Pressable onPress={() => setStep((s) => s - 1)} hitSlop={10}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={styles.stepCount}>
            {step + 1} / {totalSteps}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <RiseIn style={styles.centered}>
            <Text style={{ fontSize: 56, textAlign: "center" }}>🏋️</Text>
            <View style={{ alignItems: "center", marginTop: 16 }}>
              <Wordmark size={26} />
            </View>
            <Text style={styles.heroTitle}>Track. Lift. Repeat.</Text>
            <Text style={styles.heroSub}>
              IronLog remembers every set, so each session starts exactly where the last one left off.
            </Text>
            <View style={{ marginTop: 36, width: "100%" }}>
              <PrimaryButton label="Get started →" onPress={() => setStep(1)} />
            </View>
            <Pressable onPress={() => void finish(false)} style={{ marginTop: 14, paddingVertical: 8 }}>
              <Text style={styles.mutedLink}>I already have an account</Text>
            </Pressable>
          </RiseIn>
        )}

        {step === 1 && (
          <RiseIn style={styles.centered}>
            <Text style={styles.eyebrow}>YOUR GOAL</Text>
            <Text style={styles.stepTitle}>What are you training for?</Text>
            <View style={{ marginTop: 24, width: "100%", gap: 10 }}>
              {GOALS.map((g) => {
                const active = goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGoal(g.id)}
                    style={[styles.goalRow, active && styles.goalRowActive]}
                  >
                    <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalName}>{g.id}</Text>
                      <Text style={styles.goalBlurb}>{g.blurb}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: 24, width: "100%" }}>
              <PrimaryButton label="Continue →" onPress={() => setStep(2)} disabled={!goal} />
            </View>
          </RiseIn>
        )}

        {step === 2 && (
          <RiseIn style={styles.centered}>
            <Text style={styles.eyebrow}>YOUR STATS</Text>
            <Text style={styles.stepTitle}>Dial in your daily fuel</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 24, width: "100%" }}>
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
            <View style={{ width: "100%", marginTop: 14, gap: 12 }}>
              <View>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" />
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
                </View>
              </View>
              <View>
                <Text style={styles.label}>Activity level</Text>
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
            </View>
            <View style={{ marginTop: 20, width: "100%" }}>
              <PrimaryButton label="Continue →" onPress={() => setStep(3)} disabled={!statsValid} />
            </View>
            {!statsValid && (
              <Text style={styles.validation}>Enter realistic numbers to continue.</Text>
            )}
          </RiseIn>
        )}

        {step === 3 && targets && (
          <RiseIn style={styles.centered}>
            <Text style={{ fontSize: 44 }}>🎯</Text>
            <Text style={styles.stepTitle}>Your daily targets</Text>
            <View style={styles.targetsCard}>
              <Text style={styles.targetsCals}>{targets.calories}</Text>
              <Text style={styles.targetsCalsLabel}>CALORIES / DAY</Text>
              <View style={styles.targetsRow}>
                <View style={styles.targetsCell}>
                  <Text style={styles.targetsValue}>{targets.protein}g</Text>
                  <Text style={styles.targetsLabel}>Protein</Text>
                </View>
                <View style={styles.targetsCell}>
                  <Text style={styles.targetsValue}>{targets.carbs}g</Text>
                  <Text style={styles.targetsLabel}>Carbs</Text>
                </View>
                <View style={styles.targetsCell}>
                  <Text style={styles.targetsValue}>{targets.fat}g</Text>
                  <Text style={styles.targetsLabel}>Fat</Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 24, width: "100%" }}>
              <PrimaryButton label="Set my targets" onPress={() => void finish(true)} />
            </View>
            <Pressable onPress={() => void finish(false)} style={{ marginTop: 14, paddingVertical: 8 }}>
              <Text style={styles.mutedLink}>Skip setup for now</Text>
            </Pressable>
          </RiseIn>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  progressWrap: { paddingHorizontal: 24, paddingTop: 16 },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.input,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 999 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  backText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600" },
  stepCount: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  body: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 24 },
  heroTitle: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 18,
    textAlign: "center",
  },
  heroSub: {
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    alignSelf: "flex-start",
  },
  stepTitle: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
  },
  goalRowActive: { borderColor: colors.primary, backgroundColor: "#c8f2cb15" },
  goalName: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  goalBlurb: { color: colors.mutedForeground, fontSize: 13, marginTop: 2 },
  label: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
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
    paddingVertical: 11,
    marginBottom: 8,
  },
  listChoiceActive: { borderColor: colors.primary, backgroundColor: "#c8f2cb15" },
  listChoiceText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  validation: { color: colors.destructive, fontSize: 13, marginTop: 10 },
  targetsCard: {
    marginTop: 24,
    width: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
  },
  targetsCals: { color: colors.primary, fontSize: 44, fontWeight: "800", textAlign: "center" },
  targetsCalsLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 2,
  },
  targetsRow: { flexDirection: "row", marginTop: 18 },
  targetsCell: { flex: 1, alignItems: "center" },
  targetsValue: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  targetsLabel: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  mutedLink: { color: colors.mutedForeground, fontSize: 14, fontWeight: "600" },
});
