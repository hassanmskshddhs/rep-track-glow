import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { colors, RiseIn, Wordmark } from "./ui";
import { Dumbbell, Pencil, Trash2, Trophy } from "lucide-react-native";
import { useBackHandler } from "./back";
import {
  CustomDay,
  SessionWithSets,
  deleteSessionAndLogs,
  getCustomDays,
  getHistorySessions,
  updateSessionTitle,
} from "./data";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${DAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} · ${h12}:${m} ${ampm}`;
}

// Walk oldest -> newest; a session's top weight per exercise earns a PR badge
// when it beats everything before it. Mirrors the web history page.
function computePRs(sessions: SessionWithSets[]): Map<string, Set<string>> {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
  );
  const bestSoFar = new Map<string, number>();
  const prSessions = new Map<string, Set<string>>();
  for (const s of ordered) {
    const topPerEx = new Map<string, number>();
    for (const x of s.sets) {
      if (x.weight == null || x.reps == null || x.reps <= 0) continue;
      const cur = topPerEx.get(x.exercise_name) ?? -Infinity;
      if (x.weight > cur) topPerEx.set(x.exercise_name, x.weight);
    }
    const sessionPRs = new Set<string>();
    for (const [ex, w] of topPerEx) {
      const prev = bestSoFar.get(ex);
      if (prev == null || w > prev) {
        sessionPRs.add(ex);
        bestSoFar.set(ex, w);
      }
    }
    if (sessionPRs.size > 0) prSessions.set(s.id, sessionPRs);
  }
  return prSessions;
}

export function HistoryScreen({ session }: { session: Session }) {
  const userId = session.user.id;
  const [days, setDays] = useState<CustomDay[]>([]);
  const [data, setData] = useState<SessionWithSets[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [renaming, setRenaming] = useState<SessionWithSets | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SessionWithSets | null>(null);
  const [undoDelete, setUndoDelete] = useState<SessionWithSets | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  useBackHandler(!!(renaming || deleting || undoDelete), () => {
    if (renaming) setRenaming(null);
    else if (deleting) setDeleting(null);
    else if (undoDelete) undoPendingDelete();
    else return false;
    return true;
  });

  const load = useCallback(async () => {
    const [d, h] = await Promise.all([getCustomDays(userId), getHistorySessions(userId)]);
    setDays(d);
    setData(h);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const splitMap = new Map(days.map((d) => [d.id, d]));
  const prSessions = data ? computePRs(data) : new Map<string, Set<string>>();

  const submitRename = async () => {
    if (!renaming) return;
    setSaving(true);
    setError(null);
    try {
      const title = renameValue.trim();
      await updateSessionTitle(renaming.id, title || null, userId);
      setRenaming(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename");
    } finally {
      setSaving(false);
    }
  };

  // Delete is never instant: the row hides, an undo bar shows for 6 seconds,
  // and only then does anything leave the database.
  const confirmDelete = () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setError(null);
    setData((cur) => (cur ? cur.filter((s) => s.id !== target.id) : cur));
    setUndoDelete(target);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setUndoDelete(null);
      deleteSessionAndLogs(target.id, userId).catch(async () => {
        setError("Couldn't delete that workout — it was restored.");
        await load();
      });
    }, 6000);
  };

  const undoPendingDelete = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    const target = undoDelete;
    setUndoDelete(null);
    if (target) {
      setData((cur) => {
        const next = [...(cur ?? []), target];
        next.sort(
          (a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime(),
        );
        return next;
      });
    }
  };

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
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Every session. Every set. Track the overload.</Text>
        </RiseIn>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : data.length === 0 ? (
          <View style={styles.empty}>
            <Dumbbell size={40} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySub}>Log your first session to see it here.</Text>
          </View>
        ) : (
          data.map((s, i) => {
            const split = splitMap.get(s.day);
            const prSet = prSessions.get(s.id) ?? new Set<string>();
            const grouped = new Map<string, typeof s.sets>();
            for (const x of s.sets) {
              const arr = grouped.get(x.exercise_name) ?? [];
              arr.push(x);
              grouped.set(x.exercise_name, arr);
            }
            return (
              <RiseIn key={s.id} delay={Math.min(i, 5) * 60}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.iconBox}>
                        <Dumbbell size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {s.title?.trim() || split?.name || "Workout"}
                          </Text>
                          <Pressable
                            accessibilityLabel="Rename session"
                            onPress={() => {
                              setRenameValue(s.title?.trim() || "");
                              setRenaming(s);
                            }}
                            hitSlop={8}
                          >
                            <Pencil size={15} color={colors.mutedForeground} />
                          </Pressable>
                        </View>
                        <Text style={styles.cardDate}>{formatWhen(s.performed_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.setCount}>
                        {s.sets.length} {s.sets.length === 1 ? "set" : "sets"}
                      </Text>
                      <Pressable
                        accessibilityLabel="Delete session"
                        onPress={() => setDeleting(s)}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </Pressable>
                    </View>
                  </View>

                  {Array.from(grouped, ([ex, sets]) => (
                    <View key={ex} style={styles.exRow}>
                      <View style={styles.exTitleRow}>
                        <Text style={styles.exName}>{ex}</Text>
                        {prSet.has(ex) && (
                          <View style={styles.prBadge}>
                            <Trophy size={11} color={colors.primary} />
                            <Text style={styles.prText}>New PR</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.chipsRow}>
                        {sets.map((x) => (
                          <View key={x.id} style={styles.chip}>
                            <Text style={styles.chipText}>
                              <Text style={styles.chipNum}>{x.set_number}.</Text>{" "}
                              {x.weight ?? "—"}kg × {x.reps ?? "—"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </RiseIn>
            );
          })
        )}
      </ScrollView>

      {undoDelete ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Workout deleted</Text>
          <Pressable onPress={undoPendingDelete} hitSlop={10} style={styles.undoButton}>
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={!!renaming} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename session</Text>
            <Text style={styles.modalSub}>
              Give this workout a custom name. Leave blank to use the split name.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Session name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setRenaming(null)} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitRename} disabled={saving} style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this workout log?</Text>
            <Text style={styles.modalSub}>
              This permanently removes the session and its sets.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setDeleting(null)} style={styles.modalGhost}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} disabled={saving} style={styles.modalDanger}>
                <Text style={styles.modalDangerText}>{saving ? "Deleting…" : "Delete"}</Text>
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
  undoBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  undoText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  undoButton: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  undoAction: { color: colors.brand, fontSize: 13, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  title: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 20,
  },
  subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 12 },
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
  emptySub: { color: colors.mutedForeground, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    marginTop: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#c8f2cb22",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800", flexShrink: 1 },
  pencil: { color: colors.mutedForeground, fontSize: 14 },
  cardDate: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  cardHeaderRight: { alignItems: "flex-end", gap: 6 },
  setCount: { color: colors.mutedForeground, fontSize: 12 },
  trash: { fontSize: 15, color: colors.mutedForeground },
  exRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#303b3355" },
  exTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exName: { color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 },
  prBadge: {
    backgroundColor: "#c8f2cb33",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prText: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: colors.foreground, fontSize: 12, fontVariant: ["tabular-nums"] },
  chipNum: { color: colors.mutedForeground },
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
  modalInput: {
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.foreground,
    fontSize: 15,
    marginTop: 16,
  },
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
  modalDanger: {
    backgroundColor: colors.destructive,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalDangerText: { color: "#101411", fontSize: 15, fontWeight: "700" },
});
