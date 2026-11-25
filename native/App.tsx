import React, { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { runTopBackHandler, useBackHandler } from "./src/back";
import { Apple, CalendarDays, Dumbbell, ScrollText, Settings as SettingsIcon, TrendingUp } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { colors, PrimaryButton, RiseIn, Wordmark } from "./src/ui";
import { TrainScreen } from "./src/TrainScreen";
import { LoggerScreen } from "./src/LoggerScreen";
import { HistoryScreen } from "./src/HistoryScreen";
import { ProgressScreen } from "./src/ProgressScreen";
import { PlanScreen } from "./src/PlanScreen";
import { SettingsScreen } from "./src/SettingsScreen";
import { SplitEditorScreen } from "./src/SplitEditorScreen";
import { NutritionScreen } from "./src/NutritionScreen";
import { CoachScreen } from "./src/CoachScreen";
import { OnboardingScreen } from "./src/OnboardingScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomDay } from "./src/data";

type TabKey = "train" | "plan" | "history" | "progress" | "fuel" | "settings";

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.welcomeBody}>
        <RiseIn>
          <Wordmark size={26} />
        </RiseIn>
        <RiseIn delay={120} style={{ marginTop: 48 }}>
          <Text style={styles.heroTitle}>Your next{"\n"}rep.</Text>
        </RiseIn>
        <RiseIn delay={220} style={{ marginTop: 14 }}>
          <Text style={styles.heroSub}>
            Track every lift. Crush every PR. Built for the gym floor, not the desk.
          </Text>
        </RiseIn>
      </View>
      <RiseIn delay={340} style={styles.footer}>
        <PrimaryButton label="Get started" onPress={onStart} />
      </RiseIn>
    </SafeAreaView>
  );
}

function AuthScreen({
  onBack,
  onSignedIn,
}: {
  onBack: () => void;
  onSignedIn: (s: Session) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) onSignedIn(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onSignedIn(data.session);
        } else {
          setError("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.authBody}>
          <RiseIn>
            <Wordmark size={18} />
          </RiseIn>
          <RiseIn delay={100} style={{ marginTop: 36 }}>
            <Text style={styles.authTitle}>
              {mode === "signin" ? "Welcome back" : "Create account"}
            </Text>
            <Text style={styles.authSub}>
              {mode === "signin"
                ? "Sign in to continue logging."
                : "Start tracking your lifts in seconds."}
            </Text>
          </RiseIn>
          <RiseIn delay={200} style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={{ marginTop: 24 }}>
              <PrimaryButton
                label={busy ? "One moment..." : mode === "signin" ? "Sign in" : "Create account"}
                onPress={() => void submit()}
              />
            </View>
            <Pressable
              onPress={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              style={{ marginTop: 16 }}
            >
              <Text style={styles.switchMode}>
                {mode === "signin" ? (
                  <>
                    No account? <Text style={styles.switchModeStrong}>Sign up</Text>
                  </>
                ) : (
                  <>
                    Have an account? <Text style={styles.switchModeStrong}>Sign in</Text>
                  </>
                )}
              </Text>
            </Pressable>
          </RiseIn>
        </View>
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.switchMode}>Back</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import type { LucideIcon } from "lucide-react-native";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "train", label: "Train", icon: Dumbbell },
  { key: "plan", label: "Plan", icon: CalendarDays },
  { key: "history", label: "History", icon: ScrollText },
  { key: "progress", label: "Progress", icon: TrendingUp },
  { key: "fuel", label: "Fuel", icon: Apple },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

/** Bottom navigation bar with vector icons. */
function TabBar({
  tab,
  onChange,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <SafeAreaView style={tabStyles.bar}>
      {TABS.map((t) => {
        const active = tab === t.key;
        const Icon = t.icon;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={tabStyles.item}>
            <Icon
              size={21}
              color={active ? colors.primary : colors.mutedForeground}
              strokeWidth={active ? 2.4 : 1.8}
            />
            <Text style={[tabStyles.label, active && { color: colors.primary }]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: 9, gap: 3 },
  label: { color: colors.mutedForeground, fontSize: 10, fontWeight: "700" },
});

export default function App() {
  const [screen, setScreen] = useState<"welcome" | "auth">("welcome");
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [activeDay, setActiveDay] = useState<CustomDay | null>(null);
  const [editingSplit, setEditingSplit] = useState<CustomDay | "new" | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>("train");

  // Android hardware back: let open modals/sub-views handle it first, then walk
  // the app hierarchy up (editor -> coach -> logger -> first tab), exit only at root.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (runTopBackHandler()) return true;
      if (editingSplit) {
        setEditingSplit(null);
        return true;
      }
      if (coachOpen) {
        setCoachOpen(false);
        return true;
      }
      if (activeDay) {
        setActiveDay(null);
        return true;
      }
      if (session && tab !== "train") {
        setTab("train");
        return true;
      }
      if (!session && screen === "auth") {
        setScreen("welcome");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [editingSplit, coachOpen, activeDay, session, tab, screen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setRestoring(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setOnboarded(null);
      return;
    }
    AsyncStorage.getItem(`ironlog:onboarded:${session.user.id}`)
      .then((v) => setOnboarded(v === "1"))
      .catch(() => setOnboarded(true));
  }, [session]);

  if (restoring || (session && onboarded === null)) {
    return (
      <View style={[styles.flex, { justifyContent: "center" }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      {session && editingSplit ? (
        <SplitEditorScreen
          session={session}
          existing={editingSplit === "new" ? null : editingSplit}
          onDone={() => setEditingSplit(null)}
          onBack={() => setEditingSplit(null)}
        />
      ) : session && onboarded === false ? (
        <OnboardingScreen userId={session.user.id} onDone={() => setOnboarded(true)} />
      ) : session && coachOpen ? (
        <CoachScreen session={session} onBack={() => setCoachOpen(false)} />
      ) : session && activeDay ? (
        <LoggerScreen
          day={activeDay}
          session={session}
          onBack={() => setActiveDay(null)}
          onSaved={() => setActiveDay(null)}
        />
      ) : session ? (
        <>
          <View style={styles.flex}>
            {tab === "train" ? (
            <TrainScreen
              session={session}
              onSignOut={() => {
                setActiveDay(null);
                void supabase.auth.signOut();
              }}
              onOpenDay={(d) => setActiveDay(d)}
              onOpenCoach={() => setCoachOpen(true)}
            />
          ) : tab === "plan" ? (
            <PlanScreen
              session={session}
              onOpenDay={(d) => setActiveDay(d)}
              onNewSplit={() => setEditingSplit("new")}
              onEditSplit={(d) => setEditingSplit(d)}
            />
          ) : tab === "history" ? (
            <HistoryScreen session={session} />
          ) : tab === "progress" ? (
            <ProgressScreen session={session} />
          ) : tab === "fuel" ? (
            <NutritionScreen session={session} />
          ) : (
            <SettingsScreen
              session={session}
              onSignOut={() => {
                setActiveDay(null);
                setTab("train");
                void supabase.auth.signOut();
              }}
            />
          )}
          </View>
          <TabBar tab={tab} onChange={setTab} />
        </>
      ) : screen === "welcome" ? (
        <WelcomeScreen onStart={() => setScreen("auth")} />
      ) : (
        <AuthScreen onBack={() => setScreen("welcome")} onSignedIn={(s) => setSession(s)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  welcomeBody: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  heroTitle: {
    color: colors.foreground,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 48,
  },
  heroSub: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  authBody: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  authTitle: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  authSub: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
  card: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "600", marginBottom: 6 },
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
  switchMode: {
    color: colors.mutedForeground,
    fontSize: 14,
    textAlign: "center",
  },
  switchModeStrong: { color: colors.primary, fontWeight: "700" },
  backLink: { paddingVertical: 16, alignItems: "center" },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 12 },
});
