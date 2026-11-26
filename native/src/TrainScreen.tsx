import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "./ui";
import type { Session } from "@supabase/supabase-js";
import { colors, PrimaryButton, RiseIn, Wordmark } from "./ui";
import { ArrowRight, Check, Sparkles } from "lucide-react-native";
import {
  CustomDay,
  getCustomDays,
  getLastSessionDayId,
  getRecentSessions,
} from "./data";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function TrainScreen({
  session,
  onSignOut,
  onOpenDay,
  onOpenCoach,
}: {
  session: Session;
  onSignOut: () => void;
  onOpenDay: (day: CustomDay) => void;
  onOpenCoach: () => void;
}) {
  const userId = session.user.id;
  const [days, setDays] = useState<CustomDay[] | null>(null);
  const [trained, setTrained] = useState<Set<number>>(new Set());
  const [lastDayId, setLastDayId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [d, recent, last] = await Promise.all([
        getCustomDays(userId),
        getRecentSessions(userId, 7),
        getLastSessionDayId(userId),
      ]);
      if (!live) return;
      setDays(d);
      setTrained(new Set(recent.map((s) => startOfDay(new Date(s.performed_at)))));
      setLastDayId(last);
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  const week = useMemo(() => {
    const out: { key: number; letter: string; num: number; done: boolean; today: boolean }[] = [];
    const todayTs = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ts = startOfDay(d);
      out.push({
        key: ts,
        letter: WEEKDAYS[d.getDay()],
        num: d.getDate(),
        done: trained.has(ts),
        today: ts === todayTs,
      });
    }
    return out;
  }, [trained]);

  const next: CustomDay | null = useMemo(() => {
    if (!days || days.length === 0) return null;
    const lastIndex = days.findIndex((d) => d.id === lastDayId);
    return days[(lastIndex + 1) % days.length];
  }, [days, lastDayId]);

  const now = new Date();
  const dateLine = `${DAYS_FULL[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  const trainedCount = week.filter((d) => d.done).length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <RiseIn>
          <View style={styles.headerRow}>
            <Wordmark size={18} />
          </View>
        </RiseIn>

        <RiseIn delay={80} style={{ marginTop: 28 }}>
          <Text style={styles.eyebrow}>{dateLine.toUpperCase()}</Text>
          <Text style={styles.title}>Your next rep.</Text>
          <Text style={styles.sub}>
            {trainedCount > 0 ? "Build on your last session." : "Your first session starts here."}
          </Text>
        </RiseIn>

        <RiseIn delay={140} style={{ marginTop: 24 }}>
          <View style={styles.weekHeader}>
            <Text style={styles.sectionLabel}>LAST 7 DAYS</Text>
            <Text style={styles.weekCount}>{trainedCount} training days</Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View key={d.key} style={styles.weekCol}>
                <Text style={styles.weekLetter}>{d.letter}</Text>
                <View
                  style={[
                    styles.weekDot,
                    d.done && styles.weekDotDone,
                    !d.done && d.today && styles.weekDotToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekNum,
                      d.done && { color: colors.primaryForeground, fontWeight: "800" },
                    ]}
                  >
                    {d.done ? <Check size={13} color={colors.primary} strokeWidth={3} /> : d.num}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </RiseIn>

        <RiseIn delay={200} style={{ marginTop: 20 }}>
          <AnimatedPressable style={styles.coachRow} onPress={onOpenCoach}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.coachRowText}>Ask IronCoach about your training</Text>
            <ArrowRight size={16} color={colors.mutedForeground} />
          </AnimatedPressable>
        </RiseIn>

        {days === null ? (
          <View style={[styles.card, { marginTop: 24, paddingVertical: 48 }]}>
            <Text style={styles.sub}>Loading routines…</Text>
          </View>
        ) : next ? (
          <RiseIn delay={220} style={{ marginTop: 24 }}>
            <View style={styles.card}>
              <View style={styles.cardEyebrowRow}>
                <Text style={styles.cardSlash}>/</Text>
                <Text style={styles.sectionLabel}>NEXT IN YOUR ROTATION</Text>
              </View>
              <Text style={styles.cardTitle}>{next.name}</Text>
              <Text style={styles.cardSub}>
                {next.subtitle || next.muscle_groups?.join(" · ")}
              </Text>
              <Text style={styles.cardCount}>
                {Array.isArray(next.exercises) ? next.exercises.length : 0} exercises
              </Text>
              <View style={{ marginVertical: 14, gap: 10 }}>
                {(Array.isArray(next.exercises) ? next.exercises : [])
                  .slice(0, 3)
                  .map((ex, i) => (
                    <View key={ex + i} style={styles.exRow}>
                      <Text style={styles.exNum}>{String(i + 1).padStart(2, "0")}</Text>
                      <Text style={styles.exName}>{ex}</Text>
                    </View>
                  ))}
              </View>
              <PrimaryButton label={`Open ${next.name}`} onPress={() => onOpenDay(next)} />
            </View>
          </RiseIn>
        ) : null}

        {days && days.length > 1 ? (
          <RiseIn delay={300} style={{ marginTop: 28 }}>
            <Text style={styles.routinesTitle}>Your routines</Text>
            <View style={[styles.card, { marginTop: 12, padding: 0 }]}>
              {days.map((d, i) => (
                <AnimatedPressable
                  key={d.id}
                  onPress={() => onOpenDay(d)}
                  style={[styles.routineRow, i > 0 && styles.routineRowBorder]}
                >
                  <View style={styles.routineBar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineName}>{d.name}</Text>
                    <Text style={styles.routineSub}>
                      {(Array.isArray(d.exercises) ? d.exercises.length : 0) +
                        " exercises · " +
                        (d.subtitle || "")}
                    </Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </RiseIn>
        ) : null}

        <Pressable onPress={onSignOut} style={{ marginTop: 32, alignItems: "center" }}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  coachRowText: { color: colors.foreground, fontSize: 14, fontWeight: "600", flex: 1 },
  coachRowArrow: { color: colors.mutedForeground, fontSize: 16 },
  eyebrow: { color: colors.mutedForeground, fontSize: 11, letterSpacing: 1.6, fontWeight: "700" },
  title: {
    color: colors.foreground,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
  },
  sub: { color: colors.mutedForeground, fontSize: 14, marginTop: 6 },
  weekHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  weekCount: { color: colors.mutedForeground, fontSize: 12 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  weekCol: { alignItems: "center", gap: 6 },
  weekLetter: { color: colors.mutedForeground, fontSize: 11 },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotDone: { backgroundColor: colors.primary },
  weekDotToday: { borderColor: colors.border, borderWidth: 1 },
  weekNum: { color: colors.mutedForeground, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  cardEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardSlash: { color: colors.brand, fontSize: 16, fontWeight: "800" },
  cardTitle: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 10,
  },
  cardSub: { color: colors.mutedForeground, fontSize: 14, marginTop: 6 },
  cardCount: { color: colors.mutedForeground, fontSize: 12, marginTop: 14 },
  exRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  exNum: { color: colors.mutedForeground, fontSize: 12, width: 20 },
  exName: { color: colors.foreground, fontSize: 14, flex: 1 },
  routinesTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  routineRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  routineRowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  routineBar: { width: 3, height: 28, borderRadius: 2, backgroundColor: colors.brand },
  routineName: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  routineSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  signOut: { color: colors.mutedForeground, fontSize: 13 },
});
