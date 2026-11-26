import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, RiseIn, Wordmark } from "./ui";
import { useBackHandler } from "./back";
import { ChevronDown, TrendingUp, Trophy } from "lucide-react-native";
import {
  BodyMeasurement,
  ProgressData,
  deleteBodyMeasurement,
  getBodyMeasurements,
  getProgressData,
  saveBodyMeasurement,
} from "./data";

const BODY_FIELDS = [
  { key: "weight", label: "Body weight", unit: "kg" },
  { key: "body_fat", label: "Body fat", unit: "%" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "arm", label: "Arm", unit: "cm" },
  { key: "thigh", label: "Thigh", unit: "cm" },
] as const;
type BodyFieldKey = (typeof BODY_FIELDS)[number]["key"];

function BodySection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<BodyMeasurement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  useBackHandler(open, () => {
    setOpen(false);
    return true;
  });
  const [draft, setDraft] = useState<Record<BodyFieldKey, string>>({
    weight: "", body_fat: "", waist: "", chest: "", arm: "", thigh: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await getBodyMeasurements(userId));
    } catch {
      /* offline */
    }
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = rows[0];
  const latestOf = (k: BodyFieldKey) => rows.find((r) => r[k] != null)?.[k] ?? null;

  const save = async () => {
    const entry: Partial<Record<BodyFieldKey, number>> = {};
    for (const f of BODY_FIELDS) {
      const v = draft[f.key].trim();
      if (v) entry[f.key] = Number(v);
    }
    if (Object.keys(entry).length === 0) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await saveBodyMeasurement(userId, entry);
      setDraft({ weight: "", body_fat: "", waist: "", chest: "", arm: "", thigh: "" });
      setOpen(false);
      await load();
    } catch {
      /* keep draft */
    }
    setSaving(false);
  };

  if (!loaded) return null;
  return (
    <RiseIn delay={460}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Body measurements</Text>
        <Pressable onPress={() => setOpen(true)}>
          <Text style={styles.bodyAddText}>+ Log</Text>
        </Pressable>
      </View>
      {latest ? (
        <View style={styles.chartCard}>
          {(() => {
            const weightRows = [...rows].reverse().filter((r) => r.weight != null);
            return weightRows.length >= 2 ? (
              <View style={{ marginBottom: 8 }}>
                <LineChart
                  points={weightRows.slice(-12).map((r) => r.weight as number)}
                  labels={weightRows.slice(-12).map((r) =>
                    new Date(r.measured_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  )}
                  showBest={false}
                />
                <Text style={styles.chartSub}>Body weight over time (kg)</Text>
              </View>
            ) : null;
          })()}
          <View style={styles.bodyGrid}>
            {BODY_FIELDS.map((f) => (
              <View key={f.key} style={styles.bodyCell}>
                <Text style={styles.bodyCellLabel}>{f.label}</Text>
                <Text style={styles.bodyCellValue}>
                  {latestOf(f.key) != null ? `${latestOf(f.key)}${f.unit === "%" ? "%" : ""}` : "—"}
                </Text>
              </View>
            ))}
          </View>
          {rows.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.bodyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bodyRowDate}>
                  {new Date(r.measured_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.bodyRowVals} numberOfLines={2}>
                  {BODY_FIELDS.filter((f) => r[f.key] != null)
                    .map((f) => `${f.label} ${r[f.key]}${f.unit}`)
                    .join(" · ")}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void deleteBodyMeasurement(r.id).then(load);
                }}
                hitSlop={8}
              >
                <Text style={styles.bodyDelete}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.chartCard}>
          <Text style={styles.chartSub}>
            No measurements yet. Tap + Log to track weight, body fat and tape measurements.
          </Text>
        </View>
      )}

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.bodyBackdrop}>
          <View style={styles.bodyCard}>
            <Text style={styles.bodyTitle}>Log measurements</Text>
            {BODY_FIELDS.map((f) => (
              <View key={f.key} style={{ marginTop: 10 }}>
                <Text style={styles.bodyCellLabel}>
                  {f.label} ({f.unit})
                </Text>
                <TextInput
                  value={draft[f.key]}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v.replace(/[^0-9.]/g, "") }))}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.bodyInput}
                />
              </View>
            ))}
            <View style={styles.bodyButtons}>
              <Pressable onPress={() => setOpen(false)} style={styles.bodyCancel}>
                <Text style={styles.bodyCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void save()} disabled={saving} style={styles.bodySave}>
                <Text style={styles.bodySaveText}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </RiseIn>
  );
}

function LineChart({
  points,
  labels,
  height = 140,
  showBest = true,
}: {
  points: number[];
  labels: string[];
  height?: number;
  showBest?: boolean;
}) {
  const [width, setWidth] = useState(0);
  if (points.length < 2) return null;
  const padTop = 16;
  const padBottom = 22;
  const padX = 8;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const innerW = Math.max(width - padX * 2, 1);
  const innerH = height - padTop - padBottom;
  const x = (i: number) => padX + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padTop + innerH - ((v - min) / span) * innerH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${padTop + innerH} L${x(0)},${padTop + innerH} Z`;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#fill)" />
            <Path d={line} stroke={colors.primary} strokeWidth="2.5" fill="none" />
            {points.map((p, i) => (
              <Circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 4 : 3} fill={colors.primary} />
            ))}
          </Svg>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -14 }}>
            {labels.map((l, i) =>
              i === 0 || i === labels.length - 1 || i === Math.floor(labels.length / 2) ? (
                <Text key={i} style={{ color: colors.mutedForeground, fontSize: 10 }}>{l}</Text>
              ) : (
                <View key={i} />
              ),
            )}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
              {points[points.length - 1]} kg
            </Text>
            {showBest && (
              <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                best {max} kg
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function ProgressScreen({ session }: { session: Session }) {
  const userId = session.user.id;
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercise, setExercise] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  useBackHandler(pickerOpen, () => {
    setPickerOpen(false);
    return true;
  });
  const [metric, setMetric] = useState<"weight" | "oneRm">("oneRm");

  const load = useCallback(async () => {
    const d = await getProgressData(userId);
    setData(d);
    if (d && !exercise && d.uniqueExercises.length > 0) {
      setExercise(d.uniqueExercises[0]);
    }
    setLoading(false);
  }, [userId, exercise]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const history = useMemo(
    () => (exercise && data?.exerciseHistory[exercise]) || [],
    [data, exercise],
  );
  const maxWeekly = Math.max(...(data?.weeklyVolume.map((w) => w.val) ?? [1]), 1);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <RiseIn>
          <Wordmark size={20} />
        </RiseIn>
        <RiseIn delay={100}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Your training at a glance.</Text>
        </RiseIn>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !data ? (
          <Text style={styles.errorText}>Could not load progress. Pull to retry.</Text>
        ) : (
          <>
            {/* One glance: the three numbers that matter this month */}
            <RiseIn delay={160}>
              <View style={styles.statCard}>
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{data.overview.workoutsThisMonth}</Text>
                  <Text style={styles.statLabel}>Workouts</Text>
                  <Text
                    style={[
                      styles.statDelta,
                      { color: data.overview.workoutsDiff >= 0 ? colors.primary : colors.destructive },
                    ]}
                  >
                    {data.overview.workoutsDiff >= 0 ? "+" : ""}
                    {data.overview.workoutsDiff} vs last month
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>
                    {Math.round(data.overview.volumeThisMonth).toLocaleString("en-US")}
                  </Text>
                  <Text style={styles.statLabel}>kg lifted</Text>
                  <Text
                    style={[
                      styles.statDelta,
                      { color: data.overview.volumeUp ? colors.primary : colors.destructive },
                    ]}
                  >
                    {data.overview.volumeUp ? "↑" : "↓"} {data.overview.volumeDiffPct}% vs last month
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{data.overview.currentStreak}</Text>
                  <Text style={styles.statLabel}>
                    {data.overview.currentStreak === 1 ? "day" : "days"} streak
                  </Text>
                  <Text style={styles.statDelta}>best {data.overview.longestStreak}</Text>
                </View>
              </View>
            </RiseIn>

            {/* Consistency: weekly volume bars */}
            <RiseIn delay={220}>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Weekly volume</Text>
                <Text style={styles.chartSubHeader}>Total kg lifted per week</Text>
                <View style={styles.barRow}>
                  {data.weeklyVolume.map((w, i) => (
                    <View key={w.w} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: Math.max(4, (w.val / maxWeekly) * 120),
                              backgroundColor:
                                i === data.weeklyVolume.length - 1 ? colors.primary : colors.input,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{w.w}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </RiseIn>

            {/* Strength: one exercise, one clean line */}
            {history.length > 1 && exercise && (
              <RiseIn delay={280}>
                <View style={styles.chartCard}>
                  <Pressable style={styles.pickerRow} onPress={() => setPickerOpen(true)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerLabel}>EXERCISE</Text>
                      <Text style={styles.pickerValue} numberOfLines={1}>
                        {exercise}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <View style={styles.metricToggle}>
                    {(["oneRm", "weight"] as const).map((m) => (
                      <Pressable
                        key={m}
                        onPress={() => setMetric(m)}
                        style={[styles.metricChip, metric === m && styles.metricChipActive]}
                      >
                        <Text
                          style={[
                            styles.metricChipText,
                            metric === m && styles.metricChipTextActive,
                          ]}
                        >
                          {m === "oneRm" ? "Est. 1RM" : "Top weight"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <LineChart
                    points={history.slice(-12).map((h) => (metric === "oneRm" ? h.oneRm : h.val))}
                    labels={history.slice(-12).map((h) => h.date)}
                  />
                  <Text style={styles.chartSub}>
                    {metric === "oneRm"
                      ? "Estimated one-rep max per session"
                      : "Top weight per session (kg)"}
                  </Text>
                </View>
              </RiseIn>
            )}

            {/* Personal records: one clean list */}
            {data.prBoard.length > 0 && (
              <RiseIn delay={340}>
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Personal records</Text>
                  <Text style={styles.chartSubHeader}>All-time best on every lift</Text>
                  {data.prBoard.slice(0, 8).map((p, i) => (
                    <View key={p.ex} style={[styles.prListRow, i > 0 && styles.prListRowBorder]}>
                      <Trophy size={14} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prListEx} numberOfLines={1}>
                          {p.ex}
                        </Text>
                        <Text style={styles.prListMeta}>
                          {new Date(p.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                      <Text style={styles.prListWeight}>{p.weight} kg</Text>
                    </View>
                  ))}
                </View>
              </RiseIn>
            )}

            <BodySection userId={userId} />

            {data.overview.workoutsThisMonth === 0 && data.prs.length === 0 && (
              <View style={styles.empty}>
                <TrendingUp size={40} color={colors.mutedForeground} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No data yet</Text>
                <Text style={styles.emptySub}>
                  Log a few sessions and your progress shows up here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Exercise picker */}
      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Choose exercise</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {(data?.uniqueExercises ?? []).map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => {
                    setExercise(ex);
                    setPickerOpen(false);
                  }}
                  style={styles.pickerOption}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      ex === exercise && { color: colors.primary },
                    ]}
                  >
                    {ex}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 20,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionRange: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    width: "47.5%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 128,
    justifyContent: "space-between",
  },
  metricIcon: { fontSize: 20 },
  metricValue: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  metricChange: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  streakRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  streakCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
  streakIcon: { fontSize: 26 },
  streakLabel: {
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  streakValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  chartCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginTop: 12,
  },
  chartTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  chartSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 8 },
  metricToggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.input,
  },
  metricChipActive: { backgroundColor: colors.primary },
  metricChipText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  metricChipTextActive: { color: colors.background },
  bodyAddText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  bodyGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  bodyCell: { width: "33.33%", paddingVertical: 8 },
  bodyCellLabel: { color: colors.mutedForeground, fontSize: 11 },
  bodyCellValue: { color: colors.foreground, fontSize: 18, fontWeight: "800", marginTop: 2 },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    gap: 8,
  },
  bodyRowDate: { color: colors.mutedForeground, fontSize: 11 },
  bodyRowVals: { color: colors.foreground, fontSize: 12, marginTop: 2 },
  bodyDelete: { color: colors.destructive, fontSize: 22, paddingHorizontal: 6 },
  bodyBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  bodyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "100%",
  },
  bodyTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  bodyInput: {
    backgroundColor: colors.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginTop: 4,
  },
  bodyButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
  bodyCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  bodyCancelText: { color: colors.mutedForeground, fontSize: 14, fontWeight: "600" },
  bodySave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  bodySaveText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    marginTop: 16,
  },
  barCol: { alignItems: "center", flex: 1 },
  barTrack: { height: 120, justifyContent: "flex-end" },
  bar: { width: 24, borderRadius: 6, backgroundColor: colors.primary },
  barLabel: { color: colors.mutedForeground, fontSize: 11, marginTop: 6 },
  barValue: { color: colors.mutedForeground, fontSize: 10, marginBottom: 4 },
  boardSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  boardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  boardCell: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  boardWeight: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  boardEx: { color: colors.foreground, fontSize: 11, fontWeight: "600", marginTop: 2 },
  statCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 18,
    marginTop: 18,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statValue: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  statLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: "600" },
  statDelta: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: "center" },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  chartSubHeader: { color: colors.mutedForeground, fontSize: 12, marginTop: 2, marginBottom: 4 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  pickerLabel: {
    color: colors.mutedForeground,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  pickerValue: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 28,
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  pickerTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800", marginBottom: 8 },
  pickerOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionText: { color: colors.foreground, fontSize: 14 },
  prListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
  },
  prListRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  prListEx: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  prListMeta: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  prListWeight: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  empty: {
    marginTop: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700", marginTop: 10 },
  emptySub: { color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: "center" },
});
