import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { colors, RiseIn, Wordmark } from "./ui";
import { useBackHandler } from "./back";
import { ChevronDown, Trash2 } from "lucide-react-native";
import {
  ACCENT_COLORS,
  CustomDay,
  deleteCustomDay,
  getCustomDays,
  getSplitAccent,
} from "./data";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlanScreen({
  session,
  onOpenDay,
  onNewSplit,
  onEditSplit,
}: {
  session: Session;
  onOpenDay: (day: CustomDay) => void;
  onNewSplit: () => void;
  onEditSplit: (day: CustomDay) => void;
}) {
  const userId = session.user.id;
  const [days, setDays] = useState<CustomDay[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<CustomDay | null>(null);
  const [menuFor, setMenuFor] = useState<CustomDay | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useBackHandler(!!(pickerDay || menuFor || deleting), () => {
    if (pickerDay) setPickerDay(null);
    else if (menuFor) setMenuFor(null);
    else if (deleting) setDeleting(null);
    else return false;
    return true;
  });

  // Same storage key as the web WeekPlan component
  const scheduleKey = `ironlog:forged:schedule:${userId}`;

  const load = useCallback(async () => {
    const d = await getCustomDays(userId);
    setDays(d);
    try {
      const raw = await AsyncStorage.getItem(scheduleKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setSchedule(parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
    } catch {
      setSchedule({});
    }
  }, [userId, scheduleKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const setDayRoutine = async (weekday: string, routineId: string) => {
    const next = { ...schedule };
    if (routineId) next[weekday] = routineId;
    else delete next[weekday];
    setSchedule(next);
    try {
      await AsyncStorage.setItem(scheduleKey, JSON.stringify(next));
    } catch {
      setError("Could not save your schedule on this device.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setError(null);
    try {
      await deleteCustomDay(deleting.id, userId);
      setDeleting(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete routine");
    }
  };

  const routineName = (id: string) => days?.find((d) => d.id === id)?.name ?? "Unavailable routine";

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
          <Text style={styles.eyebrow}>YOUR TRAINING, ORGANISED</Text>
          <Text style={styles.title}>Plan</Text>
          <Text style={styles.subtitle}>Your routines. Ready when you are.</Text>
        </RiseIn>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!days ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <RiseIn delay={160}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your routines</Text>
                <Pressable onPress={onNewSplit} style={styles.newButton}>
                  <Text style={styles.newButtonText}>+ New</Text>
                </Pressable>
              </View>
              <View style={styles.routineList}>
                {days.map((s) => {
                  const accent = getSplitAccent(s.name, s.muscle_groups, s.accent ?? "primary");
                  const exCount = s.exercises?.length ?? 0;
                  const muscles = s.muscle_groups ?? [];
                  return (
                    <View key={s.id} style={styles.routineRow}>
                      <Pressable style={styles.routineMain} onPress={() => onOpenDay(s)}>
                        <View
                          style={[
                            styles.accentBar,
                            { backgroundColor: ACCENT_COLORS[accent] ?? ACCENT_COLORS.primary },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routineName} numberOfLines={1}>
                            {s.name}
                          </Text>
                          <Text style={styles.routineSub} numberOfLines={1}>
                            {exCount} exercises
                            {muscles.length > 0 &&
                              ` · ${muscles
                                .slice(0, 3)
                                .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                                .join(", ")}`}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => setMenuFor(s)}
                        hitSlop={8}
                        style={styles.menuButton}
                        accessibilityLabel={`More options for ${s.name}`}
                      >
                        <Text style={styles.menuDots}>⋯</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </RiseIn>

            <RiseIn delay={240}>
              <Text style={styles.sectionTitle}>Your week</Text>
              <Text style={styles.weekSub}>
                Optional schedule. Saved on this device, separate from your workout history.
              </Text>
              <View style={styles.weekList}>
                {WEEK.map((day) => {
                  const rid = schedule[day];
                  const routine = rid ? days.find((d) => d.id === rid) : null;
                  return (
                    <View key={day} style={styles.weekRow}>
                      <Text style={styles.weekDay}>{day}</Text>
                      <Pressable
                        style={styles.weekPicker}
                        onPress={() => setPickerDay(day)}
                        accessibilityLabel={`${day} routine`}
                      >
                        <Text
                          style={[
                            styles.weekPickerText,
                            !rid && { color: colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {rid ? routineName(rid) : "Unscheduled"}
                        </Text>
                        <ChevronDown size={14} color={colors.mutedForeground} />
                      </Pressable>
                      {routine && (
                        <Pressable
                          onPress={() => onOpenDay(routine)}
                          hitSlop={8}
                          accessibilityLabel={`Open ${day} workout`}
                        >
                          <Text style={styles.weekGo}>→</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </RiseIn>
          </>
        )}
      </ScrollView>

      <Modal visible={!!menuFor} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuFor(null)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                if (menuFor) onOpenDay(menuFor);
                setMenuFor(null);
              }}
            >
              <Text style={styles.sheetItemText}>Open routine</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                if (menuFor) onEditSplit(menuFor);
                setMenuFor(null);
              }}
            >
              <Text style={styles.sheetItemText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                const d = menuFor;
                setMenuFor(null);
                if (!d) return;
                const lines = [
                  `IronLog Workout Plan: ${d.name}`,
                  "Track. Lift. Repeat.",
                  "",
                  ...(Array.isArray(d.exercises)
                    ? d.exercises.map((ex, i) => `${i + 1}. ${ex}`)
                    : []),
                  "",
                  "Try this workout layout or track your lifts inside IronLog!",
                ];
                Share.share({ message: lines.join("\n") }).catch(() => {});
              }}
            >
              <Text style={styles.sheetItemText}>Share plan</Text>
            </Pressable>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                setDeleting(menuFor);
                setMenuFor(null);
              }}
            >
              <Text style={[styles.sheetItemText, { color: colors.destructive }]}>Delete</Text>
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={() => setMenuFor(null)}>
              <Text style={[styles.sheetItemText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!pickerDay} transparent animationType="fade">
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerDay(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{pickerDay} routine</Text>
            <Pressable
              style={styles.sheetItem}
              onPress={() => {
                if (pickerDay) void setDayRoutine(pickerDay, "");
                setPickerDay(null);
              }}
            >
              <Text style={styles.sheetItemText}>Unscheduled</Text>
            </Pressable>
            {(days ?? []).map((d) => (
              <Pressable
                key={d.id}
                style={styles.sheetItem}
                onPress={() => {
                  if (pickerDay) void setDayRoutine(pickerDay, d.id);
                  setPickerDay(null);
                }}
              >
                <Text
                  style={[
                    styles.sheetItemText,
                    pickerDay && schedule[pickerDay] === d.id && { color: colors.primary },
                  ]}
                >
                  {d.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!deleting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete split?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to delete {deleting?.name}? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setDeleting(null)} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={styles.modalDanger}>
                <Text style={styles.modalDangerText}>Delete</Text>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  eyebrow: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 20,
  },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 6 },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 12,
  },
  routineList: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  routineMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    paddingLeft: 20,
  },
  accentBar: { width: 4, height: 40, borderRadius: 999 },
  routineName: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  routineSub: { color: colors.mutedForeground, fontSize: 13, marginTop: 2 },
  menuButton: { paddingHorizontal: 16, paddingVertical: 16 },
  menuDots: { color: colors.mutedForeground, fontSize: 20, fontWeight: "700" },
  weekSub: { color: colors.mutedForeground, fontSize: 12, marginTop: -6, marginBottom: 8 },
  weekList: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDay: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600", width: 34 },
  weekPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weekPickerText: { color: colors.foreground, fontSize: 14, flex: 1 },
  weekChevron: { color: colors.mutedForeground, fontSize: 12, marginLeft: 8 },
  weekGo: { color: colors.primary, fontSize: 18, fontWeight: "700", paddingHorizontal: 6 },
  sheetBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    maxHeight: "70%",
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
  },
  modalTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  modalSub: { color: colors.mutedForeground, fontSize: 13, marginTop: 6, lineHeight: 19 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  modalGhost: { paddingHorizontal: 16, paddingVertical: 10 },
  modalGhostText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  modalDanger: {
    backgroundColor: colors.destructive,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalDangerText: { color: "#101411", fontSize: 15, fontWeight: "700" },
  newButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 28,
  },
  newButtonText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
});
