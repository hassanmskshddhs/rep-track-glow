import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Trophy, Flame, Dumbbell } from "lucide-react-native";
import { colors } from "./ui";

export type ShareCardData = {
  dayName: string;
  dateLabel: string;
  volume: number;
  sets: number;
  reps: number;
  durationMin: number;
  prs: string[];
  topLifts: { name: string; weight: number; reps: number }[];
};

// Fixed-size card rendered off-screen and captured to a PNG for sharing.
// Pure RN views so it renders identically on device and in capture.
export const SHARE_CARD_WIDTH = 360;

export function ShareCard({ data }: { data: ShareCardData }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.wordmark}>IRONLOG</Text>
        <Text style={styles.date}>{data.dateLabel}</Text>
      </View>
      <Text style={styles.dayName}>{data.dayName}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(data.volume).toLocaleString()}</Text>
          <Text style={styles.statLabel}>kg volume</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.sets}</Text>
          <Text style={styles.statLabel}>sets</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.reps}</Text>
          <Text style={styles.statLabel}>reps</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.durationMin}</Text>
          <Text style={styles.statLabel}>min</Text>
        </View>
      </View>

      {data.prs.length > 0 && (
        <View style={styles.prBox}>
          <View style={styles.prHeader}>
            <Trophy size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.prTitle}>
              {data.prs.length === 1 ? "New personal record" : `${data.prs.length} new personal records`}
            </Text>
          </View>
          {data.prs.map((p) => (
            <Text key={p} style={styles.prLine}>{p}</Text>
          ))}
        </View>
      )}

      {data.topLifts.length > 0 && (
        <View style={styles.liftsBox}>
          <View style={styles.liftsHeader}>
            <Dumbbell size={14} color={colors.mutedForeground} strokeWidth={2} />
            <Text style={styles.liftsTitle}>Top lifts</Text>
          </View>
          {data.topLifts.map((l) => (
            <View key={l.name} style={styles.liftRow}>
              <Text style={styles.liftName} numberOfLines={1}>{l.name}</Text>
              <Text style={styles.liftValue}>{l.weight}kg × {l.reps}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Flame size={12} color={colors.brand} strokeWidth={2} />
        <Text style={styles.footerText}>Logged with IronLog</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    backgroundColor: colors.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordmark: { color: colors.brand, fontSize: 13, fontWeight: "800", letterSpacing: 3 },
  date: { color: colors.mutedForeground, fontSize: 12 },
  dayName: { color: colors.foreground, fontSize: 26, fontWeight: "800", marginTop: 10 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginTop: 16,
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  statLabel: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  prBox: {
    marginTop: 14,
    backgroundColor: "rgba(200, 242, 203, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(200, 242, 203, 0.25)",
    padding: 14,
  },
  prHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  prTitle: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  prLine: { color: colors.primary, fontSize: 13, marginTop: 6, marginLeft: 24 },
  liftsBox: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  liftsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  liftsTitle: { color: colors.mutedForeground, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  liftRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  liftName: { color: colors.foreground, fontSize: 14, flex: 1, marginRight: 12 },
  liftValue: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 18 },
  footerText: { color: colors.mutedForeground, fontSize: 12 },
});
