import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { colors, RiseIn, Wordmark } from "./ui";
import { Check, Download, Mail, Shield, Sparkles, User } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { exportHistoryCsv } from "./data";

// Same storage key and shape as the web profile (src/lib/profile.ts)
const PROFILE_KEY = "ironlog.profile.v1";

type LocalProfile = {
  firstName: string;
  displayName: string;
  age: string;
  weight: string;
  height: string;
};

const EMPTY: LocalProfile = { firstName: "", displayName: "", age: "", weight: "", height: "" };

export function SettingsScreen({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [draft, setDraft] = useState<LocalProfile>(EMPTY);
  const [savedTick, setSavedTick] = useState(false);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const { csv, sessions, sets } = await exportHistoryCsv(session.user.id);
      if (sets === 0) {
        setExportMsg("No logged sets yet — finish a workout first.");
        return;
      }
      const uri = `${FileSystem.cacheDirectory}ironlog-history.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Your IronLog history" });
        setExportMsg(`${sessions} workouts · ${sets} sets exported. Yours forever.`);
      } else {
        setExportMsg("Sharing is not available on this device.");
      }
    } catch {
      setExportMsg("Export failed — check your connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("ironlog:coach:enabled")
      .then((v) => setCoachEnabled(v !== "0"))
      .catch(() => {});
  }, []);

  const toggleCoach = (v: boolean) => {
    setCoachEnabled(v);
    AsyncStorage.setItem("ironlog:coach:enabled", v ? "1" : "0").catch(() => {});
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setDraft({ ...EMPTY, ...(JSON.parse(raw) as Partial<LocalProfile>) });
      } catch {
        /* keep empty */
      }
    })();
  }, []);

  const save = async () => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const update = (k: keyof LocalProfile, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const email = session.user.email ?? "";
  const fullName =
    (session.user.user_metadata?.full_name as string | undefined) ??
    (session.user.user_metadata?.name as string | undefined);
  const greet =
    draft.displayName.trim() ||
    draft.firstName.trim() ||
    (fullName ? fullName.split(/\s+/)[0] : "Athlete");

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <RiseIn>
          <Wordmark size={20} />
        </RiseIn>
        <RiseIn delay={100}>
          <Text style={styles.title}>Settings</Text>
        </RiseIn>

        <RiseIn delay={160}>
          <View style={styles.accountCard}>
            <View style={styles.avatar}>
              <User size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName} numberOfLines={1}>
                {greet}
              </Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={220}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={styles.sectionBadge}>SAVED ON DEVICE</Text>
            </View>
            <Text style={styles.sectionSub}>
              Personal info stays on this device - used to greet you across the app.
            </Text>

            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={draft.firstName}
              onChangeText={(v) => update("firstName", v)}
              placeholder="Alex"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={draft.displayName}
              onChangeText={(v) => update("displayName", v)}
              placeholder="Used in welcome message"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  value={draft.age}
                  onChangeText={(v) => update("age", v)}
                  placeholder="years"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={draft.weight}
                  onChangeText={(v) => update("weight", v)}
                  placeholder="e.g. 78"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={draft.height}
              onChangeText={(v) => update("height", v)}
              placeholder="e.g. 178"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />

            <Pressable onPress={save} style={styles.saveButton}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {savedTick ? <Check size={15} color={colors.primaryForeground} strokeWidth={3} /> : null}
                <Text style={styles.saveButtonText}>{savedTick ? "Saved" : "Save profile"}</Text>
              </View>
            </Pressable>
          </View>
        </RiseIn>

        <RiseIn delay={240}>
          <View style={styles.section}>
            <View style={styles.coachRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Sparkles size={13} color={colors.brand} />
                  <Text style={styles.sectionLabel}>COACH'S CALL</Text>
                </View>
                <Text style={styles.sectionSub}>
                  Weight suggestions with the reason behind them, shown while you log. Fully
                  optional, your numbers are only ever suggestions until you tap to use them.
                </Text>
              </View>
              <Switch
                value={coachEnabled}
                onValueChange={toggleCoach}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={coachEnabled ? colors.primaryForeground : colors.mutedForeground}
              />
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={260}>
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Download size={13} color={colors.mutedForeground} />
              <Text style={styles.sectionLabel}>YOUR DATA</Text>
            </View>
            <Text style={styles.sectionSub}>
              Every set you ever logged, as a CSV you can open anywhere. No lock-in, no paywall
              on your own history.
            </Text>
            <Pressable onPress={() => void exportCsv()} style={styles.exportButton} disabled={exporting}>
              <Text style={styles.exportButtonText}>
                {exporting ? "Preparing..." : "Export history (CSV)"}
              </Text>
            </Pressable>
            {exportMsg ? <Text style={styles.exportMsg}>{exportMsg}</Text> : null}
          </View>
        </RiseIn>

        <RiseIn delay={280}>
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Shield size={13} color={colors.mutedForeground} />
              <Text style={styles.sectionLabel}>PRIVACY</Text>
            </View>
            <Text style={styles.sectionSub}>
              Your splits and logs are private to your account. Profile info is stored only on
              this device.
            </Text>
          </View>
        </RiseIn>

        <RiseIn delay={340}>
          <Pressable onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          <Text style={styles.version}>IronLog native · v1.0.0</Text>
        </RiseIn>
      </ScrollView>
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
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#c8f2cb26",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22 },
  accountName: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  accountEmail: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  sectionBadge: {
    color: colors.mutedForeground,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 8, lineHeight: 18 },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  exportButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 10,
  },
  exportButtonText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  exportMsg: { color: colors.primary, fontSize: 12, marginTop: 10 },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 6 },
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
  row: { flexDirection: "row", gap: 12 },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
  signOutButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  signOutText: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  version: {
    color: colors.mutedForeground,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
});
