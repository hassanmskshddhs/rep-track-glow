import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { colors, RiseIn, Wordmark } from "./ui";
import { ProgressData, getProgressData } from "./data";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function MetricCard({
  icon,
  value,
  label,
  change,
  positive,
}: {
  icon: string;
  value: string;
  label: string;
  change: string;
  positive: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricChange, { color: positive ? colors.primary : colors.destructive }]}>
          {change}
        </Text>
      </View>
    </View>
  );
}

export function ProgressScreen({ session }: { session: Session }) {
  const userId = session.user.id;
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercise, setExercise] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
  const maxHist = Math.max(...history.map((h) => h.val), 1);
  const maxWeekly = Math.max(...(data?.weeklyVolume.map((w) => w.val) ?? [1]), 1);

  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const range = `${MONTHS[now.getMonth()]} 1 - ${MONTHS[now.getMonth()]} ${monthEnd.getDate()}`;

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
          <Text style={styles.subtitle}>PRs, volume and consistency.</Text>
        </RiseIn>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !data ? (
          <Text style={styles.errorText}>Could not load progress. Pull to retry.</Text>
        ) : (
          <>
            <RiseIn delay={160}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>This Month</Text>
                <Text style={styles.sectionRange}>{range}</Text>
              </View>
              <View style={styles.grid}>
                <MetricCard
                  icon="🏋️"
                  value={`${data.overview.workoutsThisMonth}`}
                  label="Workouts"
                  change={`${data.overview.workoutsDiff >= 0 ? "+" : ""}${data.overview.workoutsDiff} vs last month`}
                  positive={data.overview.workoutsDiff >= 0}
                />
                <MetricCard
                  icon="📈"
                  value={`${Math.round(data.overview.volumeThisMonth).toLocaleString("en-US")} kg`}
                  label="Total Volume"
                  change={`${data.overview.volumeUp ? "↑" : "↓"} ${data.overview.volumeDiffPct}% vs last month`}
                  positive={data.overview.volumeUp}
                />
                <MetricCard
                  icon="🏆"
                  value={`${data.overview.prsThisMonth}`}
                  label="New PRs"
                  change="This Month"
                  positive
                />
                <MetricCard
                  icon="🔥"
                  value={data.overview.workoutsThisMonth > 0 ? "Active" : "Idle"}
                  label="Status"
                  change={data.overview.workoutsThisMonth > 0 ? "Keep it up" : "Start working out"}
                  positive={data.overview.workoutsThisMonth > 0}
                />
              </View>
            </RiseIn>

            <RiseIn delay={220} style={styles.streakRow}>
              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>🔥</Text>
                <View>
                  <Text style={styles.streakLabel}>CURRENT STREAK</Text>
                  <Text style={styles.streakValue}>
                    {data.overview.currentStreak} {data.overview.currentStreak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>
              <View style={styles.streakCard}>
                <Text style={styles.streakIcon}>🏆</Text>
                <View>
                  <Text style={styles.streakLabel}>LONGEST STREAK</Text>
                  <Text style={styles.streakValue}>
                    {data.overview.longestStreak} {data.overview.longestStreak === 1 ? "day" : "days"}
                  </Text>
                </View>
              </View>
            </RiseIn>

            <RiseIn delay={280}>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Weekly volume (kg)</Text>
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

            {data.prs.length > 0 && (
              <RiseIn delay={340}>
                <Text style={styles.sectionTitle}>Recent PRs</Text>
                {data.prs.slice(0, 5).map((pr) => (
                  <View key={`${pr.ex}-${pr.date}`} style={styles.prRow}>
                    <Text style={styles.prTrophy}>🏆</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prEx}>{pr.ex}</Text>
                      <Text style={styles.prDate}>
                        {new Date(pr.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <Text style={styles.prWeight}>{pr.weight}kg</Text>
                    {pr.prev > 0 && <Text style={styles.prPrev}>was {pr.prev}</Text>}
                  </View>
                ))}
              </RiseIn>
            )}

            {history.length > 1 && exercise && (
              <RiseIn delay={400}>
                <View style={styles.chartCard}>
                  <Pressable onPress={() => setPickerOpen(!pickerOpen)}>
                    <Text style={styles.chartTitle}>
                      {exercise} <Text style={styles.pickerHint}>▾</Text>
                    </Text>
                  </Pressable>
                  {pickerOpen && (
                    <View style={styles.picker}>
                      {data.uniqueExercises.slice(0, 12).map((ex) => (
                        <Pressable
                          key={ex}
                          onPress={() => {
                            setExercise(ex);
                            setPickerOpen(false);
                          }}
                          style={styles.pickerItem}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              ex === exercise && { color: colors.primary },
                            ]}
                          >
                            {ex}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.barRow}>
                    {history.slice(-8).map((h) => (
                      <View key={h.date} style={styles.barCol}>
                        <Text style={styles.barValue}>{h.val}</Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.bar,
                              { height: Math.max(4, (h.val / maxHist) * 100) },
                            ]}
                          />
                        </View>
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {h.date.split(" ")[1]}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.chartSub}>Top weight per session (kg)</Text>
                </View>
              </RiseIn>
            )}

            {data.overview.workoutsThisMonth === 0 && data.prs.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📈</Text>
                <Text style={styles.emptyTitle}>No data yet</Text>
                <Text style={styles.emptySub}>
                  Log a few sessions and your progress shows up here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  prTrophy: { fontSize: 20 },
  prEx: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  prDate: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  prWeight: { color: colors.primary, fontSize: 16, fontWeight: "800" },
  prPrev: { color: colors.mutedForeground, fontSize: 11 },
  pickerHint: { color: colors.mutedForeground, fontSize: 14 },
  picker: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  pickerItem: { paddingVertical: 8 },
  pickerItemText: { color: colors.foreground, fontSize: 14 },
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
