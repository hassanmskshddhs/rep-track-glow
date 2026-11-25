import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { colors, PrimaryButton, RiseIn } from "./ui";
import { CustomDay, saveWorkoutSession, SetRowInput } from "./data";

type SetRow = { weight: string; reps: string };
type SetsState = Record<string, SetRow[]>;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LoggerScreen({
  day,
  session,
  onBack,
  onSaved,
}: {
  day: CustomDay;
  session: Session;
  onBack: () => void;
  onSaved: () => void;
}) {
  const userId = session.user.id;
  const exercises = useMemo(
    () => (Array.isArray(day.exercises) ? day.exercises : []),
    [day.exercises],
  );
  const draftKey = `ironlog:draft:${userId}:${day.id}`;

  const emptyState = (): SetsState =>
    Object.fromEntries(exercises.map((e) => [e, [{ weight: "", reps: "" }]]));

  const [state, setState] = useState<SetsState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const startRef = useRef(Date.now());

  // Restore any in-progress draft, like the web logger.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { sets?: SetsState; startedAt?: number };
          if (parsed.sets && typeof parsed.sets === "object") {
            setState({ ...emptyState(), ...parsed.sets });
          }
          if (parsed.startedAt && parsed.startedAt < Date.now()) {
            startRef.current = parsed.startedAt;
            setElapsed(Math.floor((Date.now() - parsed.startedAt) / 1000));
          }
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist the draft on every change.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      draftKey,
      JSON.stringify({ sets: state, startedAt: startRef.current }),
    ).catch(() => {});
  }, [state, hydrated, draftKey]);

  // Session timer.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const update = (ex: string, idx: number, field: keyof SetRow, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    setState((s) => ({
      ...s,
      [ex]: s[ex].map((r, i) => (i === idx ? { ...r, [field]: cleaned } : r)),
    }));
  };

  const addSet = (ex: string) =>
    setState((s) => ({ ...s, [ex]: [...s[ex], { weight: "", reps: "" }] }));

  const removeSet = (ex: string, idx: number) =>
    setState((s) => ({
      ...s,
      [ex]: s[ex].length > 1 ? s[ex].filter((_, i) => i !== idx) : s[ex],
    }));

  const filledRows = (): SetRowInput[] => {
    const rows: SetRowInput[] = [];
    for (const ex of exercises) {
      (state[ex] ?? []).forEach((r, i) => {
        const w = r.weight === "" ? null : Number(r.weight);
        const reps = r.reps === "" ? null : Number(r.reps);
        if (w === null && reps === null) return;
        rows.push({ exercise_name: ex, set_number: i + 1, weight: w, reps });
      });
    }
    return rows;
  };

  const rows = filledRows();

  const doReset = async () => {
    setState(emptyState());
    startRef.current = Date.now();
    setElapsed(0);
    try {
      await AsyncStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  const confirmReset = () =>
    Alert.alert(
      "Reset session?",
      "Clear all current inputs and stop the timer? This won't affect saved history.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", onPress: () => void doReset() },
      ],
    );

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveWorkoutSession(userId, day.id, day.name, rows);
      await AsyncStorage.removeItem(draftKey).catch(() => {});
      setReviewOpen(false);
      Alert.alert("Saved", `${rows.length} sets logged for ${day.name}.`);
      onSaved();
    } catch (e) {
      Alert.alert(
        "Could not save",
        e instanceof Error ? e.message : "Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backText}>← All workouts</Text>
        </Pressable>
        <Text style={styles.timer}>{formatClock(elapsed)}</Text>
      </View>
      <Text style={styles.eyebrow}>FOCUS MODE · DRAFTS STAY ON THIS DEVICE</Text>
      <Text style={styles.title}>{day.name}</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {exercises.map((ex, i) => (
          <RiseIn key={ex} delay={i * 70} style={{ marginTop: 14 }}>
            <View style={styles.card}>
              <Text style={styles.exName}>{ex}</Text>
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, { width: 44 }]}>SET</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>KG</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>REPS</Text>
                <View style={{ width: 28 }} />
              </View>
              {(state[ex] ?? []).map((r, idx) => (
                <View key={idx} style={styles.setRow}>
                  <Text style={styles.setNum}>{idx + 1}</Text>
                  <TextInput
                    value={r.weight}
                    onChangeText={(v) => update(ex, idx, "weight", v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.setInput}
                  />
                  <TextInput
                    value={r.reps}
                    onChangeText={(v) => update(ex, idx, "reps", v)}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.setInput}
                  />
                  <Pressable onPress={() => removeSet(ex, idx)} hitSlop={8}>
                    <Text style={styles.removeSet}>×</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => addSet(ex)} style={styles.addSet}>
                <Text style={styles.addSetText}>+ Add set</Text>
              </Pressable>
            </View>
          </RiseIn>
        ))}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Text style={styles.readyText}>
          {rows.length} sets ready · {day.name}
        </Text>
        <View style={styles.bottomButtons}>
          <Pressable onPress={confirmReset} style={styles.resetButton}>
            <Text style={styles.resetText}>↺ Reset</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Review session"
              onPress={() => {
                if (rows.length === 0) {
                  Alert.alert("Nothing to review", "Add at least one set with weight or reps.");
                  return;
                }
                setReviewOpen(true);
              }}
            />
          </View>
        </View>
      </View>

      <Modal visible={reviewOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Session review</Text>
            <Text style={styles.modalSub}>{rows.length} filled sets</Text>
            <ScrollView style={{ maxHeight: 320, marginTop: 12 }}>
              {exercises.map((ex) => {
                const exRows = rows.filter((r) => r.exercise_name === ex);
                if (exRows.length === 0) return null;
                return (
                  <View key={ex} style={{ marginBottom: 12 }}>
                    <Text style={styles.reviewEx}>{ex}</Text>
                    <Text style={styles.reviewSets}>
                      {exRows
                        .map((r) => `${r.weight ?? "—"} kg × ${r.reps ?? "—"}`)
                        .join("  ·  ")}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <Text style={styles.reviewNote}>
              This will be saved to your workout history.
            </Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              <PrimaryButton
                label={saving ? "Saving…" : "Save workout"}
                onPress={() => void save()}
              />
              <Pressable onPress={() => setReviewOpen(false)} style={{ paddingVertical: 10 }}>
                <Text style={styles.switchMode}>Keep training</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backText: { color: colors.mutedForeground, fontSize: 14 },
  timer: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  eyebrow: {
    color: colors.mutedForeground,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginTop: 14,
  },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  exName: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  setHeader: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  setHeaderText: { color: colors.mutedForeground, fontSize: 10, letterSpacing: 1.2 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
    width: "100%",
  },
  setNum: { color: colors.mutedForeground, fontSize: 13, width: 44 },
  setInput: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 15,
    textAlign: "center",
  },
  removeSet: { color: colors.mutedForeground, fontSize: 20, width: 28, textAlign: "center" },
  addSet: { marginTop: 12, paddingVertical: 8, alignItems: "center" },
  addSetText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  readyText: { color: colors.mutedForeground, fontSize: 12, marginBottom: 10 },
  bottomButtons: { flexDirection: "row", alignItems: "center", gap: 12 },
  resetButton: { paddingVertical: 14, paddingHorizontal: 8 },
  resetText: { color: colors.mutedForeground, fontSize: 14, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { color: colors.foreground, fontSize: 20, fontWeight: "800" },
  modalSub: { color: colors.primary, fontSize: 13, marginTop: 4, fontWeight: "600" },
  reviewEx: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  reviewSets: { color: colors.mutedForeground, fontSize: 12, marginTop: 4 },
  reviewNote: { color: colors.mutedForeground, fontSize: 12, marginTop: 8 },
  switchMode: { color: colors.mutedForeground, fontSize: 14, textAlign: "center" },
});
