import React, { useMemo, useState } from "react";
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
import type { Session } from "@supabase/supabase-js";
import { colors, PrimaryButton, Wordmark } from "./ui";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";
import { ACCENT_COLORS, CustomDay, createCustomDay, updateCustomDay } from "./data";
import { EXERCISE_DB, MUSCLE_GROUPS } from "./exercises";

const ACCENT_OPTIONS = ["push", "pull", "legs", "upper", "primary"] as const;

export function SplitEditorScreen({
  session,
  existing,
  onDone,
  onBack,
}: {
  session: Session;
  existing: CustomDay | null;
  onDone: () => void;
  onBack: () => void;
}) {
  const userId = session.user.id;
  const [name, setName] = useState(existing?.name ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [accent, setAccent] = useState(existing?.accent ?? "primary");
  const [muscleGroups, setMuscleGroups] = useState<string[]>(existing?.muscle_groups ?? []);
  const [exercises, setExercises] = useState<string[]>(existing?.exercises ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // exercise picker state
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<string>("Chest");
  const [customList, setCustomList] = useState<{ name: string; muscles: string[] }[]>([]);

  const combined = useMemo(() => [...customList, ...EXERCISE_DB], [customList]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return combined.filter((e) => {
      if (filter !== "All" && !e.muscles.includes(filter)) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, filter, combined]);

  const toggleMG = (g: string) =>
    setMuscleGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  const toggleEx = (n: string) =>
    setExercises((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const moveEx = (i: number, dir: -1 | 1) =>
    setExercises((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const saveCustom = () => {
    const n = customName.trim();
    if (!n) return;
    if (!combined.some((e) => e.name.toLowerCase() === n.toLowerCase())) {
      setCustomList((cur) => [{ name: n, muscles: [customMuscle] }, ...cur]);
    }
    if (!exercises.includes(n)) setExercises((cur) => [...cur, n]);
    setCustomName("");
    setCustomMuscle("Chest");
    setCustomOpen(false);
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Give your split a name.");
      return;
    }
    if (exercises.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        subtitle: subtitle.trim() || null,
        accent,
        muscle_groups: muscleGroups,
        exercises,
      };
      if (existing) {
        await updateCustomDay(existing.id, userId, payload);
      } else {
        await createCustomDay(userId, payload);
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save split");
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Wordmark size={20} />
        <Text style={styles.title}>{existing ? "Edit split" : "New split"}</Text>
        <Text style={styles.subtitle}>Name it, tag muscle groups, pick exercises.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.label}>SPLIT NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day"
            placeholderTextColor={colors.mutedForeground}
            maxLength={60}
          />
          <Text style={styles.label}>SUBTITLE</Text>
          <TextInput
            style={styles.input}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="e.g. Chest · Shoulders · Triceps"
            placeholderTextColor={colors.mutedForeground}
            maxLength={120}
          />
          <Text style={styles.label}>COLOR ACCENT</Text>
          <View style={styles.chipRow}>
            {ACCENT_OPTIONS.map((a) => {
              const on = accent === a;
              const col = ACCENT_COLORS[a] ?? ACCENT_COLORS.primary;
              return (
                <Pressable
                  key={a}
                  onPress={() => setAccent(a)}
                  style={[
                    styles.accentChip,
                    on && { borderColor: col, backgroundColor: col + "33" },
                  ]}
                >
                  <View style={[styles.accentDot, { backgroundColor: col }]} />
                  <Text style={[styles.accentChipText, on && { color: col }]}>{a}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>MUSCLE GROUPS TARGETED</Text>
          <View style={styles.chipRow}>
            {MUSCLE_GROUPS.map((g) => {
              const on = muscleGroups.includes(g);
              return (
                <Pressable
                  key={g}
                  onPress={() => toggleMG(g)}
                  style={[styles.mgChip, on && styles.mgChipOn]}
                >
                  <Text style={[styles.mgChipText, on && styles.mgChipTextOn]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>EXERCISES ({exercises.length})</Text>
          {exercises.map((ex, i) => (
            <View key={`${ex}-${i}`} style={styles.exItem}>
              <View style={styles.exOrderCol}>
                <Pressable onPress={() => moveEx(i, -1)} hitSlop={6} accessibilityLabel="Move up">
                  <ChevronUp size={14} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => moveEx(i, 1)} hitSlop={6} accessibilityLabel="Move down">
                  <ChevronDown size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <View style={styles.exNum}>
                <Text style={styles.exNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.exName} numberOfLines={1}>
                {ex}
              </Text>
              <Pressable
                onPress={() => setExercises((arr) => arr.filter((_, idx) => idx !== i))}
                hitSlop={8}
                accessibilityLabel="Remove"
              >
                <Trash2 size={15} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={q}
              onChangeText={setQ}
              placeholder="Search exercises…"
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable onPress={() => setCustomOpen(true)} style={styles.customButton}>
              <Text style={styles.customButtonText}>+ Custom</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {["All", ...MUSCLE_GROUPS].map((g) => {
              const on = filter === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setFilter(g)}
                  style={[styles.mgChip, on && styles.mgChipOn]}
                >
                  <Text style={[styles.mgChipText, on && styles.mgChipTextOn]}>{g}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.library}>
            {filtered.length === 0 ? (
              <Text style={styles.libraryEmpty}>No exercises match.</Text>
            ) : (
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filtered.slice(0, 40).map((e) => {
                  const on = exercises.includes(e.name);
                  return (
                    <Pressable key={e.name} onPress={() => toggleEx(e.name)} style={styles.libRow}>
                      <Text style={[styles.libName, on && { color: colors.primary }]} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <Text style={[styles.libCheck, on && { color: colors.primary }]}>
                        {on ? "✓" : "+"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={{ height: 12 }} />
        <PrimaryButton
          label={saving ? "Saving…" : existing ? "Save changes" : "Create split"}
          onPress={saving ? () => {} : submit}
        />
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={customOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom exercise</Text>
            <TextInput
              style={[styles.input, { marginTop: 14 }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder="Exercise name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <View style={[styles.chipRow, { marginTop: 12 }]}>
              {MUSCLE_GROUPS.map((g) => {
                const on = customMuscle === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setCustomMuscle(g)}
                    style={[styles.mgChip, on && styles.mgChipOn]}
                  >
                    <Text style={[styles.mgChipText, on && styles.mgChipTextOn]}>{g}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setCustomOpen(false)} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveCustom} style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>Add</Text>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 20,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 12 },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  label: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  accentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  accentDot: { width: 10, height: 10, borderRadius: 999 },
  accentChipText: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mgChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mgChipOn: { borderColor: colors.primary, backgroundColor: "#c8f2cb26" },
  mgChipText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  mgChipTextOn: { color: colors.primary },
  exItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  exOrderCol: { alignItems: "center", gap: 2 },
  orderArrow: { color: colors.mutedForeground, fontSize: 10 },
  exNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  exNumText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700" },
  exName: { flex: 1, color: colors.foreground, fontSize: 14, fontWeight: "600" },
  exRemove: { fontSize: 14, color: colors.mutedForeground },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  customButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  customButtonText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  filterRow: { marginTop: 10 },
  library: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginTop: 10,
    height: 320,
    overflow: "hidden",
  },
  libraryEmpty: {
    color: colors.mutedForeground,
    fontSize: 13,
    textAlign: "center",
    padding: 24,
  },
  libRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#303b3355",
  },
  libName: { color: colors.foreground, fontSize: 14, flex: 1 },
  libCheck: { color: colors.mutedForeground, fontSize: 16, fontWeight: "700", marginLeft: 8 },
  backLink: { alignItems: "center", paddingVertical: 16 },
  backLinkText: { color: colors.mutedForeground, fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  modalGhost: { paddingHorizontal: 16, paddingVertical: 10 },
  modalGhostText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  modalPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalPrimaryText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
});
