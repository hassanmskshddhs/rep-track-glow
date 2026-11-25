import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const haptic = (fn: () => Promise<void>) => {
  fn().catch(() => {}); // no-op on web/unsupported
};
import type { Session } from "@supabase/supabase-js";
import { colors, PrimaryButton, RiseIn } from "./ui";
import { useBackHandler } from "./back";
import { Calculator, Check, Flame, PartyPopper, RotateCcw, StickyNote, Target, Trophy } from "lucide-react-native";
import {
  CustomDay,
  ExerciseInsight,
  getExerciseInsights,
  getExerciseNotes,
  saveExerciseNote,
  saveWorkoutSession,
  SetRowInput,
  updateCustomDay,
} from "./data";
import { EXERCISE_DB } from "./exercises";

type SetKind = "N" | "W" | "D" | "F";
type SetRow = { weight: string; reps: string; done?: boolean; kind?: SetKind };

const SET_KIND_ORDER: SetKind[] = ["N", "W", "D", "F"];
const SET_KIND_META: Record<SetKind, { title: string; color: string }> = {
  N: { title: "Working set", color: "#9fb5a8" },
  W: { title: "Warm-up (not saved)", color: "#7ea6ff" },
  D: { title: "Drop set", color: "#f0b866" },
  F: { title: "To failure", color: "#ff8f7a" },
};
function nextSetKind(k?: SetKind): SetKind {
  return SET_KIND_ORDER[(SET_KIND_ORDER.indexOf(k ?? "N") + 1) % SET_KIND_ORDER.length];
}
type SetsState = Record<string, SetRow[]>;

// Double-progression, same as the web day page
const DEFAULT_MIN_REPS = 8;
const DEFAULT_MAX_REPS = 12;
const WEIGHT_INCREMENT = 2.5;

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_KG = 20;

function platesPerSide(total: number): { plates: number[]; remainder: number } {
  if (!Number.isFinite(total) || total <= BAR_KG) return { plates: [], remainder: 0 };
  let side = (total - BAR_KG) / 2;
  const out: number[] = [];
  for (const p of PLATES_KG) {
    while (side + 1e-9 >= p) {
      out.push(p);
      side -= p;
    }
  }
  return { plates: out, remainder: Math.round(side * 2 * 100) / 100 };
}

function parseRepRange(name: string): { min: number; max: number } {
  const m = name.match(/(\d+)\s*-\s*(\d+)\s*reps?/i);
  if (m) return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
  return { min: DEFAULT_MIN_REPS, max: DEFAULT_MAX_REPS };
}

function buildTarget(
  exercise: string,
  lastSets: { weight: number | null; reps: number | null }[] | undefined,
): { last: string; target: string } {
  const range = parseRepRange(exercise);
  if (!lastSets || lastSets.length === 0) {
    return {
      last: "No history yet",
      target: `Pick a comfortable weight · aim for ${range.min}-${range.max} reps`,
    };
  }
  const valid = lastSets.filter((s) => s.weight != null && s.reps != null);
  if (valid.length === 0) {
    return { last: "No tracked sets last time", target: `Aim for ${range.min}-${range.max} reps` };
  }
  const topWeight = Math.max(...valid.map((s) => s.weight as number));
  const topSets = valid.filter((s) => s.weight === topWeight);
  const allHit = topSets.every((s) => (s.reps as number) >= range.max);
  const lastStr = valid.map((s) => `${s.weight}kg × ${s.reps}`).join("  ·  ");
  if (allHit) {
    const next = +(topWeight + WEIGHT_INCREMENT).toFixed(2);
    return {
      last: lastStr,
      target: `Increase to ${next}kg · aim for ${range.min}-${range.min + 2} reps`,
    };
  }
  return {
    last: lastStr,
    target: `Stay at ${topWeight}kg · add 1-2 total reps across sets`,
  };
}

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
  const [exercises, setExercises] = useState<string[]>(
    Array.isArray(day.exercises) ? day.exercises : [],
  );
  const [insights, setInsights] = useState<Record<string, ExerciseInsight>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [removingEx, setRemovingEx] = useState<string | null>(null);
  const [renamingEx, setRenamingEx] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; msg: string } | null>(null);
  const [platesFor, setPlatesFor] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [savedPRs, setSavedPRs] = useState<string[]>([]);

  const draftKey = `ironlog:draft:${userId}:${day.id}`;

  const emptyState = (): SetsState =>
    Object.fromEntries(exercises.map((e) => [e, [{ weight: "", reps: "" }]]));

  const [state, setState] = useState<SetsState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Rest timer: auto-starts when a set is marked done.
  const [restTarget, setRestTarget] = useState(90);
  const [restDeadline, setRestDeadline] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState(90);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Hardware back: close whatever sheet/dialog is open, topmost first.
  const anyOverlay = !!(
    notice || savedSummary || resetOpen || reviewOpen || renamingEx ||
    removingEx || platesFor || noteEditing || menuFor || addOpen
  );
  useBackHandler(anyOverlay, () => {
    if (notice) setNotice(null);
    else if (savedSummary) {
      setSavedSummary(null);
      setSavedPRs([]);
      onSaved();
    } else if (resetOpen) setResetOpen(false);
    else if (reviewOpen) setReviewOpen(false);
    else if (renamingEx) setRenamingEx(null);
    else if (removingEx) setRemovingEx(null);
    else if (platesFor) setPlatesFor(null);
    else if (noteEditing) setNoteEditing(null);
    else if (menuFor) setMenuFor(null);
    else if (addOpen) setAddOpen(false);
    else return false;
    return true;
  });
  const [saving, setSaving] = useState(false);
  const startRef = useRef(Date.now());

  // Load per-exercise history insights and saved notes.
  useEffect(() => {
    let live = true;
    (async () => {
      const [ins, nts] = await Promise.all([
        getExerciseInsights(userId, exercises),
        getExerciseNotes(userId, exercises),
      ]);
      if (!live) return;
      setInsights(ins);
      setNotes(nts);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  const update = (ex: string, idx: number, field: keyof SetRow, value: string | SetKind) => {
    const cleaned = field === "kind" ? value : String(value).replace(/[^0-9.]/g, "");
    setState((s) => ({
      ...s,
      [ex]: s[ex].map((r, i) => (i === idx ? { ...r, [field]: cleaned } : r)),
    }));
  };

  const toggleSetDone = (ex: string, idx: number) => {
    let marking = false;
    setState((s) => {
      const row = s[ex]?.[idx];
      marking = !(row?.done ?? false);
      return {
        ...s,
        [ex]: s[ex].map((r, i) => (i === idx ? { ...r, done: marking } : r)),
      };
    });
    if (marking) {
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      setRestRemaining(restTarget);
      setRestDeadline(Date.now() + restTarget * 1000);
    }
  };

  useEffect(() => {
    if (!restDeadline) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((restDeadline - Date.now()) / 1000));
      setRestRemaining(seconds);
      if (seconds <= 0) {
        setRestDeadline(null);
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [restDeadline]);

  const addSet = (ex: string) =>
    setState((s) => ({ ...s, [ex]: [...s[ex], { weight: "", reps: "" }] }));

  const removeSet = (ex: string, idx: number) =>
    setState((s) => ({
      ...s,
      [ex]: s[ex].length > 1 ? s[ex].filter((_, i) => i !== idx) : s[ex],
    }));

  const persistExercises = async (next: string[]) => {
    setExercises(next);
    try {
      await updateCustomDay(day.id, userId, { exercises: next });
    } catch {
      /* offline: keep local */
    }
  };

  const removeExercise = (ex: string) => {
    const next = exercises.filter((e) => e !== ex);
    setState((s) => {
      const copy = { ...s };
      delete copy[ex];
      return copy;
    });
    setRemovingEx(null);
    void persistExercises(next);
  };

  const commitRename = () => {
    if (!renamingEx) return;
    const n = renameDraft.trim();
    if (n && n !== renamingEx) {
      const next = exercises.map((e) => (e === renamingEx ? n : e));
      setState((s) => {
        const copy = { ...s };
        if (copy[renamingEx]) {
          copy[n] = copy[renamingEx];
          delete copy[renamingEx];
        }
        return copy;
      });
      void persistExercises(next);
    }
    setRenamingEx(null);
  };

  const saveNote = async (ex: string) => {
    const text = noteDraft;
    setNotes((n) => ({ ...n, [ex]: text }));
    setNoteEditing(null);
    try {
      await saveExerciseNote(userId, ex, text);
    } catch {
      /* offline: keep local */
    }
  };

  const filledRows = (): SetRowInput[] => {
    const rows: SetRowInput[] = [];
    for (const ex of exercises) {
      let setNumber = 0;
      (state[ex] ?? []).forEach((r) => {
        if (r.kind === "W") return; // warm-ups are never saved to history
        const w = r.weight === "" ? null : Number(r.weight);
        const reps = r.reps === "" ? null : Number(r.reps);
        if (w === null && reps === null) return;
        setNumber += 1;
        rows.push({ exercise_name: ex, set_number: setNumber, weight: w, reps });
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

  const confirmReset = () => setResetOpen(true);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveWorkoutSession(userId, day.id, day.name, rows);
      await AsyncStorage.removeItem(draftKey).catch(() => {});
      setReviewOpen(false);
      const totalVolume = rows.reduce((a, r) => a + (r.weight ?? 0) * (r.reps ?? 0), 0);
      const totalReps = rows.reduce((a, r) => a + (r.reps ?? 0), 0);
      const bestByEx = new Map<string, { weight: number; reps: number }>();
      const prs: string[] = [];
      for (const r of rows) {
        if (r.weight == null) continue;
        const cur = bestByEx.get(r.exercise_name);
        if (!cur || r.weight > cur.weight) bestByEx.set(r.exercise_name, { weight: r.weight, reps: r.reps ?? 0 });
        const prevBest = insights[r.exercise_name]?.bestWeight;
        if (prevBest != null && r.weight > prevBest && !prs.includes(r.exercise_name)) {
          prs.push(r.exercise_name);
        }
      }
      const topLifts = [...bestByEx.entries()].sort((a, b) => b[1].weight - a[1].weight).slice(0, 3);
      const lines = [
        `${day.name}`,
        `Volume: ${Math.round(totalVolume).toLocaleString()} kg`,
        `${rows.length} sets · ${totalReps} reps`,
      ];
      if (prs.length) {
        lines.push("");
        prs.forEach((p) => lines.push(`New PR: ${p}`));
      }
      if (topLifts.length) {
        lines.push("", "Top lifts:");
        topLifts.forEach(([ex, l]) => lines.push(`• ${ex}: ${l.weight}kg × ${l.reps}`));
      }
      lines.push("", "— Logged with IronLog");
      setSavedPRs(prs);
      setSavedSummary(lines.join("\n"));
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    } catch (e) {
      setNotice({
        title: "Could not save",
        msg: e instanceof Error ? e.message : "Check your connection and try again.",
      });
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
        {exercises.map((ex, i) => {
          const insight = insights[ex];
          const target = buildTarget(ex, insight?.lastSets);
          const enteredBest = Math.max(
            0,
            ...(state[ex] ?? [])
              .map((r) => parseFloat(r.weight))
              .filter((w) => Number.isFinite(w)),
          );
          const isPR =
            insight?.bestWeight != null && enteredBest > insight.bestWeight;
          return (
          <RiseIn key={ex} delay={i * 70} style={{ marginTop: 14 }}>
            <View style={styles.card}>
              <View style={styles.exHeaderRow}>
                <Text style={styles.exName}>{ex}</Text>
                {isPR && (
                  <View style={styles.prBadge}>
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                )}
                <Pressable onPress={() => setMenuFor(ex)} hitSlop={10}>
                  <Text style={styles.menuDots}>⋯</Text>
                </Pressable>
              </View>
              <View style={styles.insightBox}>
                <Text style={styles.insightLabel}>LAST SESSION</Text>
                <Text style={styles.insightLast}>{target.last}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Target size={12} color={colors.primary} />
                  <Text style={styles.insightTarget}>{target.target}</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable
                  onPress={() => {
                    setNoteEditing(ex);
                    setNoteDraft(notes[ex] ?? "");
                  }}
                  style={styles.noteToggle}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    {notes[ex] ? <StickyNote size={12} color={colors.primary} /> : null}
                    <Text style={styles.noteToggleText}>
                      {notes[ex] ? notes[ex] : "+ Add a note"}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setPlatesFor(platesFor === ex ? null : ex)}
                  style={styles.noteToggle}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Calculator size={12} color={colors.primary} />
                    <Text style={styles.noteToggleText}>Plates</Text>
                  </View>
                </Pressable>
              </View>
              {platesFor === ex &&
                (() => {
                  const lastW = [...(state[ex] ?? [])]
                    .reverse()
                    .find((r) => r.weight !== "" && Number(r.weight) > 0);
                  const total = lastW ? Number(lastW.weight) : 0;
                  const { plates, remainder } = platesPerSide(total);
                  return (
                    <View style={styles.platesBox}>
                      {total <= BAR_KG ? (
                        <Text style={styles.platesHint}>
                          Enter a weight above {BAR_KG} kg to see the plates for a {BAR_KG} kg bar.
                        </Text>
                      ) : (
                        <>
                          <Text style={styles.platesHint}>
                            {total} kg = {BAR_KG} kg bar + each side:
                          </Text>
                          <View style={styles.platesChips}>
                            {plates.map((p, i) => (
                              <View key={i} style={styles.plateChip}>
                                <Text style={styles.plateChipText}>{p}</Text>
                              </View>
                            ))}
                          </View>
                          {remainder > 0 && (
                            <Text style={styles.platesHint}>
                              {remainder} kg can't be loaded with standard plates.
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  );
                })()}
              <View style={styles.setHeader}>
                <Text style={[styles.setHeaderText, { width: 44 }]}>SET</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>KG</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>REPS</Text>
                <View style={{ width: 34 }} />
                <View style={{ width: 22 }} />
              </View>
              {(state[ex] ?? []).map((r, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.setRow,
                    r.done && styles.setRowDone,
                    (r.kind ?? "N") === "W" && styles.setRowWarmup,
                    (r.kind ?? "N") === "D" && styles.setRowDrop,
                    (r.kind ?? "N") === "F" && styles.setRowFailure,
                  ]}
                >
                  {(() => {
                    const kind: SetKind = r.kind ?? "N";
                    const working = (state[ex] ?? [])
                      .slice(0, idx + 1)
                      .filter((s) => (s.kind ?? "N") !== "W").length;
                    const meta = SET_KIND_META[kind];
                    return (
                      <Pressable
                        onPress={() => update(ex, idx, "kind", nextSetKind(r.kind))}
                        hitSlop={4}
                        style={styles.setNum}
                      >
                        <Text style={[styles.setNumText, { color: meta.color }]}>
                          {kind === "N" ? String(working) : kind}
                        </Text>
                      </Pressable>
                    );
                  })()}
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
                  <Pressable
                    onPress={() => toggleSetDone(ex, idx)}
                    hitSlop={6}
                    style={[styles.setCheck, r.done && styles.setCheckDone]}
                  >
                    <Check size={14} color={r.done ? colors.background : colors.mutedForeground} strokeWidth={3} />
                  </Pressable>
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
          );
        })}
        <Pressable onPress={() => setAddOpen(true)} style={styles.addExercise}>
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.restBar}>
        {restDeadline ? (
          <View style={styles.restActiveRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.restLabel}>REST</Text>
              <Text style={styles.restTime}>
                {String(Math.floor(restRemaining / 60)).padStart(2, "0")}:
                {String(restRemaining % 60).padStart(2, "0")}
              </Text>
            </View>
            <Pressable
              style={styles.restButton}
              onPress={() => {
                setRestRemaining((r) => r + 30);
                setRestDeadline(restDeadline + 30000);
              }}
            >
              <Text style={styles.restButtonText}>+30s</Text>
            </Pressable>
            <Pressable
              style={styles.restButton}
              onPress={() => {
                setRestDeadline(null);
                setRestRemaining(restTarget);
              }}
            >
              <Text style={[styles.restButtonText, { color: colors.mutedForeground }]}>Skip</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.restActiveRow}>
            <Text style={styles.restLabel}>REST</Text>
            <View style={{ flex: 1, flexDirection: "row", gap: 6, marginLeft: 10 }}>
              {[60, 90, 120, 180].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setRestTarget(t);
                    setRestRemaining(t);
                    setRestDeadline(Date.now() + t * 1000);
                  }}
                  style={[styles.restPreset, restTarget === t && styles.restPresetActive]}
                >
                  <Text
                    style={[styles.restPresetText, restTarget === t && styles.restPresetTextActive]}
                  >
                    {`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.readyText}>
          {rows.length} {rows.length === 1 ? "set" : "sets"} ready · {day.name}
        </Text>
        <View style={styles.bottomButtons}>
          <Pressable onPress={confirmReset} style={styles.resetButton}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <RotateCcw size={13} color={colors.mutedForeground} />
              <Text style={styles.resetText}>Reset</Text>
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Review session"
              onPress={() => {
                if (rows.length === 0) {
                  setNotice({ title: "Nothing to review", msg: "Add at least one set with weight or reps." });
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
            <Text style={styles.modalSub}>
              {rows.length} filled {rows.length === 1 ? "set" : "sets"}
            </Text>
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
      <Modal visible={!!menuFor} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuFor(null)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setRenamingEx(menuFor);
                setRenameDraft(menuFor ?? "");
                setMenuFor(null);
              }}
            >
              <Text style={styles.sheetItemText}>Rename exercise</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setRemovingEx(menuFor);
                setMenuFor(null);
              }}
            >
              <Text style={[styles.sheetItemText, { color: colors.destructive }]}>
                Remove exercise
              </Text>
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={() => setMenuFor(null)}>
              <Text style={[styles.sheetItemText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!renamingEx} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Rename exercise</Text>
            <TextInput
              style={styles.centerInput}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              placeholder="Exercise name"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setRenamingEx(null)} style={styles.centerGhost}>
                <Text style={styles.centerGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={commitRename} style={styles.centerPrimary}>
                <Text style={styles.centerPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!removingEx} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Remove exercise?</Text>
            <Text style={styles.centerSub}>
              Remove {removingEx} from this workout? Your saved history is not affected.
            </Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setRemovingEx(null)} style={styles.centerGhost}>
                <Text style={styles.centerGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => removingEx && removeExercise(removingEx)}
                style={styles.centerDanger}
              >
                <Text style={styles.centerDangerText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!noteEditing} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Note · {noteEditing}</Text>
            <TextInput
              style={[styles.centerInput, { minHeight: 80, textAlignVertical: "top" }]}
              value={noteDraft}
              onChangeText={setNoteDraft}
              multiline
              autoFocus
              placeholder="e.g. slow eccentric, watch left shoulder"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setNoteEditing(null)} style={styles.centerGhost}>
                <Text style={styles.centerGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => noteEditing && saveNote(noteEditing)} style={styles.centerPrimary}>
                <Text style={styles.centerPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!savedSummary} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            {savedPRs.length > 0 && (
              <View style={{ alignItems: "center", marginBottom: 4 }}>
                <Trophy size={44} color={colors.primary} strokeWidth={1.5} />
              </View>
            )}
            <Text style={styles.centerTitle}>
              {savedPRs.length > 0 ? "New PR!" : "Workout saved"}
            </Text>
            <Text style={styles.centerBody}>{savedSummary}</Text>
            <View style={styles.centerButtons}>
              <Pressable
                onPress={() => {
                  const text = savedSummary;
                  setSavedSummary(null);
                  setSavedPRs([]);
                  onSaved();
                  if (text) Share.share({ message: text }).catch(() => {});
                }}
                style={styles.centerPrimary}
              >
                <Text style={styles.centerPrimaryText}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSavedSummary(null);
                  setSavedPRs([]);
                  onSaved();
                }}
                style={styles.centerPrimary}
              >
                <Text style={styles.centerPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={resetOpen} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Reset session?</Text>
            <Text style={styles.centerBody}>
              Clear all current inputs and stop the timer? This won't affect saved history.
            </Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setResetOpen(false)} style={styles.centerGhost}>
                <Text style={styles.centerGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setResetOpen(false);
                  void doReset();
                }}
                style={styles.centerPrimary}
              >
                <Text style={styles.centerPrimaryText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!notice} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>{notice?.title}</Text>
            <Text style={styles.centerBody}>{notice?.msg}</Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setNotice(null)} style={styles.centerPrimary}>
                <Text style={styles.centerPrimaryText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addOpen} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setAddOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add exercise</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {EXERCISE_DB.filter((e) => !exercises.includes(e.name)).map((e) => (
                <Pressable
                  key={e.name}
                  style={styles.sheetItem}
                  onPress={() => {
                    const next = [...exercises, e.name];
                    setState((s) => ({ ...s, [e.name]: [{ weight: "", reps: "" }] }));
                    void persistExercises(next);
                    setAddOpen(false);
                  }}
                >
                  <Text style={styles.sheetItemText}>{e.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
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
  exName: { color: colors.foreground, fontSize: 16, fontWeight: "700", flex: 1 },
  setHeader: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  setHeaderText: { color: colors.mutedForeground, fontSize: 10, letterSpacing: 1.2 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
    width: "100%",
  },
  setNum: { width: 44, justifyContent: "center" as const },
  setNumText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "700" as const },
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
  removeSet: { color: colors.mutedForeground, fontSize: 20, width: 22, textAlign: "center" },
  setRowDone: { backgroundColor: "#c8f2cb10", borderRadius: 10 },
  setCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  setCheckDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  setCheckText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "800" },
  setCheckTextDone: { color: colors.primaryForeground },
  addSet: { marginTop: 12, paddingVertical: 8, alignItems: "center" },
  addSetText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  prTrophyBig: { fontSize: 44, textAlign: "center" as const, marginBottom: 4 },
  setRowWarmup: { backgroundColor: "rgba(126,166,255,0.07)", borderRadius: 8 },
  setRowDrop: { backgroundColor: "rgba(240,184,102,0.07)", borderRadius: 8 },
  setRowFailure: { backgroundColor: "rgba(255,143,122,0.07)", borderRadius: 8 },
  restBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    // sits above the absolutely-positioned bottomBar
    marginBottom: 108,
  },
  restActiveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  restLabel: { color: colors.mutedForeground, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  restTime: { color: colors.primary, fontSize: 24, fontWeight: "800", marginTop: 1 },
  restButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restButtonText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  restPreset: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  restPresetActive: { borderColor: colors.primary, backgroundColor: "#c8f2cb15" },
  restPresetText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700" },
  restPresetTextActive: { color: colors.primary },
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
  exHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exMenuDots: { color: colors.mutedForeground, fontSize: 18, fontWeight: "700", paddingHorizontal: 4 },
  prBadge: {
    backgroundColor: "#c8f2cb33",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prBadgeText: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  insightBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  insightLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  insightLast: { color: colors.foreground, fontSize: 12, marginTop: 2 },
  insightTarget: { color: "#8fd694", fontSize: 12, fontWeight: "600", marginTop: 6 },
  noteToggle: { marginTop: 10, paddingVertical: 4 },
  noteToggleText: { color: colors.mutedForeground, fontSize: 13 },
  platesBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  platesHint: { color: colors.mutedForeground, fontSize: 12 },
  platesChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  plateChip: {
    backgroundColor: "#c8f2cb26",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  plateChipText: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  addExercise: {
    marginTop: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  addExerciseText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  sheetBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    maxHeight: "75%",
  },
  sheetTitle: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sheetItem: { paddingHorizontal: 16, paddingVertical: 14 },
  sheetItemText: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  centerBackdrop: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    padding: 24,
  },
  centerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  centerTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  centerBody: { color: colors.mutedForeground, fontSize: 14, marginTop: 8, lineHeight: 20 },
  menuDots: { color: colors.mutedForeground, fontSize: 20, fontWeight: "700", paddingHorizontal: 4 },
  centerSub: { color: colors.mutedForeground, fontSize: 13, marginTop: 6, lineHeight: 19 },
  centerInput: {
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
    marginTop: 14,
  },
  centerButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  centerGhost: { paddingHorizontal: 16, paddingVertical: 10 },
  centerGhostText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  centerPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  centerPrimaryText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
  centerDanger: {
    backgroundColor: colors.destructive,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  centerDangerText: { color: "#101411", fontSize: 15, fontWeight: "700" },
});
