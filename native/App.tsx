import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { runTopBackHandler, useBackHandler } from "./src/back";
import { Apple, CalendarDays, Dumbbell, LockKeyhole, Mail, ScrollText, Settings as SettingsIcon, TrendingUp } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { AnimatedPressable, colors, haptic, PrimaryButton, RiseIn, Wordmark } from "./src/ui";
import * as Haptics from "expo-haptics";
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
        <View style={styles.authGlow} pointerEvents="none" />
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
  const [googleBusy, setGoogleBusy] = useState(false);
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

  // Google sign-in via Supabase OAuth. Opens the provider page in an
  // in-app browser and lands back on the ironlog:// scheme.
  const googleSignIn = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: "ironlog", path: "auth/callback" });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Google sign-in is unavailable right now.");
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type === "success" && res.url) {
        const codeMatch = res.url.match(/[?&]code=([^&#]+)/);
        if (codeMatch) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
          if (exErr) throw exErr;
        } else {
          const hash = res.url.split("#")[1] ?? "";
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error: ssErr } = await supabase.auth.setSession({ access_token, refresh_token });
            if (ssErr) throw ssErr;
          }
        }
        // onAuthStateChange picks the session up from here.
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed.";
      setError(/provider|enabled|Unsupported/i.test(msg) ? "Google sign-in is being set up - use email for now." : msg);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.authBody}>
          {/* soft brand glow behind the header */}
          <View style={styles.authGlow} pointerEvents="none" />
          <RiseIn>
            <Wordmark size={20} />
          </RiseIn>
          <RiseIn delay={100} style={{ marginTop: 40 }}>
            <Text style={styles.authTitle}>
              {mode === "signin" ? "Welcome\nBack" : "Create\nAccount"}
            </Text>
            <Text style={styles.authSub}>
              {mode === "signin"
                ? "Sign in to pick up right where you left off."
                : "Start tracking your lifts in seconds."}
            </Text>
          </RiseIn>
          <RiseIn delay={220} style={styles.authForm}>
            <View style={styles.fieldWrap}>
              <Mail size={16} color={colors.mutedForeground} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                style={styles.fieldInput}
              />
            </View>
            <View style={[styles.fieldWrap, { marginTop: 12 }]}>
              <LockKeyhole size={16} color={colors.mutedForeground} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                style={styles.fieldInput}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={{ marginTop: 22 }}>
              <PrimaryButton
                label={busy ? "One moment..." : mode === "signin" ? "Sign In" : "Create Account"}
                onPress={() => void submit()}
              />
            </View>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AnimatedPressable style={styles.googleBtn} onPress={() => void googleSignIn()} disabled={googleBusy}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleText}>{googleBusy ? "Opening Google..." : "Continue with Google"}</Text>
            </AnimatedPressable>
            <Pressable
              onPress={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              style={{ marginTop: 18 }}
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

/** One tab item: the active pill fades in and every tap springs. */
function TabItem({
  t,
  active,
  onChange,
}: {
  t: { key: TabKey; label: string; icon: LucideIcon };
  active: boolean;
  onChange: (t: TabKey) => void;
}) {
  const change = () => {
    haptic(() => Haptics.selectionAsync());
    onChange(t.key);
  };
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: active ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [active, anim]);
  const Icon = t.icon;
  return (
    <AnimatedPressable
      onPress={change}
      style={[
        tabStyles.item,
        {
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(200,242,203,0)", "rgba(200,242,203,0.10)"],
          }),
        },
      ]}
    >
      <Icon
        size={21}
        color={active ? colors.primary : colors.mutedForeground}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <Text style={[tabStyles.label, active && { color: colors.primary }]}>{t.label}</Text>
    </AnimatedPressable>
  );
}

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
      {TABS.map((t) => (
        <TabItem key={t.key} t={t} active={tab === t.key} onChange={onChange} />
      ))}
    </SafeAreaView>
  );
}

const bannerStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#c8f2cb44",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  sub: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  time: { color: colors.primary, fontSize: 18, fontWeight: "800" },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: 9, gap: 3, margin: 4, borderRadius: 20 },
  itemActive: { backgroundColor: "#c8f2cb1a" },
  label: { color: colors.mutedForeground, fontSize: 10, fontWeight: "700" },
});

/** Launch splash: wordmark fades in, brand bar pulses while we restore. */
function SplashMark() {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ alignItems: "center" }}>
      <RiseIn>
        <Wordmark size={32} />
      </RiseIn>
      <Animated.View style={[styles.splashBar, { opacity: pulse }]} />
      <RiseIn delay={220}>
        <Text style={styles.splashTag}>YOUR NEXT REP</Text>
      </RiseIn>
    </View>
  );
}

function AppInner() {
  const [screen, setScreen] = useState<"welcome" | "auth">("welcome");
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [activeDay, setActiveDay] = useState<CustomDay | null>(null);
  const [editingSplit, setEditingSplit] = useState<CustomDay | "new" | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [tab, setTab] = useState<TabKey>("train");
  // Workout left in progress: logger stays mounted but hidden, banner shows.
  const [loggerHidden, setLoggerHidden] = useState(false);
  const [hiddenStartedAt, setHiddenStartedAt] = useState<number | null>(null);
  const [hiddenElapsed, setHiddenElapsed] = useState(0);

  useEffect(() => {
    if (!loggerHidden || !hiddenStartedAt) return;
    const tick = () => setHiddenElapsed(Math.floor((Date.now() - hiddenStartedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loggerHidden, hiddenStartedAt]);

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
      if (activeDay && !loggerHidden) {
        setLoggerHidden(true);
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
  }, [editingSplit, coachOpen, activeDay, session, tab, screen, loggerHidden]);

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

  const insets = useSafeAreaInsets();

  if (restoring || (session && onboarded === null)) {
    return (
      <View style={[styles.flex, { justifyContent: "center", alignItems: "center" }]}>
        <StatusBar style="light" />
        <SplashMark />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
      ) : session && activeDay && !loggerHidden ? (
        <LoggerScreen
          day={activeDay}
          session={session}
          onBack={() => setActiveDay(null)}
          onSaved={() => {
            setActiveDay(null);
            setLoggerHidden(false);
            setHiddenStartedAt(null);
          }}
          onHide={(startedAt) => {
            setHiddenStartedAt(startedAt);
            setLoggerHidden(true);
          }}
        />
      ) : session ? (
        <>
          {/* keyed remount gives every tab switch a soft rise-in */}
          <RiseIn key={tab} style={styles.flex}>
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
          </RiseIn>
          {activeDay && loggerHidden ? (
            <Pressable onPress={() => setLoggerHidden(false)} style={bannerStyles.bar}>
              <View style={bannerStyles.pulse} />
              <View style={{ flex: 1 }}>
                <Text style={bannerStyles.title} numberOfLines={1}>
                  {activeDay.name} in progress
                </Text>
                <Text style={bannerStyles.sub}>Your sets are saved - tap to resume</Text>
              </View>
              <Text style={bannerStyles.time}>
                {String(Math.floor(hiddenElapsed / 60)).padStart(2, "0")}:
                {String(hiddenElapsed % 60).padStart(2, "0")}
              </Text>
            </Pressable>
          ) : null}
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
  authGlow: {
    position: "absolute",
    top: -70,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.brand,
    opacity: 0.07,
  },
  authTitle: {
    color: colors.foreground,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 40,
  },
  authSub: { color: colors.mutedForeground, fontSize: 14, marginTop: 8, lineHeight: 20 },
  authForm: {
    marginTop: 30,
  },
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
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderColor: colors.input,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  fieldInput: { flex: 1, paddingVertical: 13, color: colors.foreground, fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.mutedForeground, fontSize: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 14,
  },
  googleBadge: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  googleG: { color: "#4285F4", fontWeight: "800", fontSize: 17 },
  googleText: { color: "#101411", fontWeight: "700", fontSize: 14 },
  splashTag: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 16,
  },
  splashBar: {
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginTop: 20,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}
