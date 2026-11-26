import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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
import {
  Check,
  ChevronRight,
  Download,
  LogOut,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { CsvImportGroup, exportHistoryCsv, importHistoryCsv, parseHistoryCsv } from "./data";

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

const hasProfileData = (p: LocalProfile) =>
  !!(p.firstName.trim() || p.displayName.trim() || p.age.trim() || p.weight.trim() || p.height.trim());

export function SettingsScreen({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [draft, setDraft] = useState<LocalProfile>(EMPTY);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<CsvImportGroup[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const pickImport = async () => {
    setImportMsg(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      let text: string;
      if (Platform.OS === "web" && (asset as any).file) {
        text = await (asset as any).file.text();
      } else {
        text = await FileSystem.readAsStringAsync(asset.uri);
      }
      const groups = parseHistoryCsv(text);
      if (groups.length === 0) {
        setImportMsg("No valid rows found. Use the same CSV format IronLog exports.");
        return;
      }
      setImportPreview(groups);
    } catch {
      setImportMsg("Could not read that file. Use the same CSV format IronLog exports.");
    }
  };

  const confirmImport = async () => {
    if (!importPreview || importing) return;
    setImporting(true);
    try {
      const r = await importHistoryCsv(session.user.id, importPreview);
      setImportPreview(null);
      setImportMsg(
        `Imported ${r.sessions} ${r.sessions === 1 ? "workout" : "workouts"} · ${r.sets} sets` +
          (r.skipped > 0 ? ` · ${r.skipped} already in history, skipped` : "") +
          ".",
      );
    } catch {
      setImportMsg("Import failed midway. Safe to re-run: workouts already imported are skipped.");
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const { csv, sessions, sets } = await exportHistoryCsv(session.user.id);
      if (sets === 0) {
        setExportMsg("No logged sets yet - finish a workout first.");
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
      setExportMsg("Export failed - check your connection and try again.");
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
        if (raw) {
          const loaded = { ...EMPTY, ...(JSON.parse(raw) as Partial<LocalProfile>) };
          setDraft(loaded);
          setEditingProfile(!hasProfileData(loaded));
        } else {
          setEditingProfile(true);
        }
      } catch {
        setEditingProfile(true);
      }
    })();
  }, []);

  const save = async () => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
      setSavedTick(true);
      setEditingProfile(false);
      setTimeout(() => setSavedTick(false), 2500);
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
  const initial = greet.charAt(0).toUpperCase();

  const profileChips: string[] = [];
  if (draft.age.trim()) profileChips.push(`${draft.age.trim()} yrs`);
  if (draft.weight.trim()) profileChips.push(`${draft.weight.trim()} kg`);
  if (draft.height.trim()) profileChips.push(`${draft.height.trim()} cm`);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <RiseIn>
          <Wordmark size={20} />
        </RiseIn>
        <RiseIn delay={80}>
          <Text style={styles.title}>Settings</Text>
        </RiseIn>

        <RiseIn delay={140}>
          <View style={styles.accountCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initial}</Text>
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

        <RiseIn delay={200}>
          <Text style={styles.groupLabel}>PROFILE</Text>
          <View style={styles.group}>
            {editingProfile ? (
              <View style={styles.groupPadded}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  style={styles.input}
                  value={draft.firstName}
                  onChangeText={(v) => update("firstName", v)}
                  placeholder="e.g. Hassan"
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
                  <Text style={styles.saveButtonText}>Save profile</Text>
                </Pressable>
                {hasProfileData(draft) ? (
                  <Pressable onPress={() => setEditingProfile(false)} style={styles.cancelEdit}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.onDeviceNote}>Stored on this device only.</Text>
              </View>
            ) : (
              <View style={styles.groupPadded}>
                <View style={styles.profileHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{greet}</Text>
                    <Text style={styles.profileSavedAs}>
                      {savedTick ? "Saved" : "On this device"}
                    </Text>
                  </View>
                  {savedTick ? (
                    <Check size={16} color={colors.primary} strokeWidth={3} />
                  ) : null}
                  <Pressable onPress={() => setEditingProfile(true)} style={styles.editButton} hitSlop={6}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                </View>
                {profileChips.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {profileChips.map((c) => (
                      <View key={c} style={styles.chip}>
                        <Text style={styles.chipText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.profileEmpty}>No body stats added yet.</Text>
                )}
              </View>
            )}
          </View>
        </RiseIn>

        <RiseIn delay={240}>
          <Text style={styles.groupLabel}>PREFERENCES</Text>
          <View style={styles.group}>
            <View style={styles.rowItem}>
              <View style={[styles.rowIcon, { backgroundColor: "#ff845922" }]}>
                <Sparkles size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Coach's Call</Text>
                <Text style={styles.rowSub}>
                  Weight suggestions with the reason behind them, while you log.
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

        <RiseIn delay={280}>
          <Text style={styles.groupLabel}>YOUR DATA</Text>
          <View style={styles.group}>
            <Pressable onPress={() => void exportCsv()} disabled={exporting} style={styles.rowItem}>
              <View style={styles.rowIcon}>
                <Download size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{exporting ? "Preparing..." : "Export history"}</Text>
                <Text style={styles.rowSub}>
                  {exportMsg ?? "Every set you ever logged, as a CSV. Yours forever."}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={() => void pickImport()} style={styles.rowItem}>
              <View style={styles.rowIcon}>
                <Upload size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Import history</Text>
                <Text style={styles.rowSub}>
                  {importMsg ?? "Bring a CSV in. Existing workouts are never duplicated."}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </RiseIn>

        <RiseIn delay={320}>
          <Text style={styles.groupLabel}>ABOUT</Text>
          <View style={styles.group}>
            <View style={styles.rowItem}>
              <View style={styles.rowIcon}>
                <Shield size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Private by default</Text>
                <Text style={styles.rowSub}>
                  Splits and logs stay private to your account. Profile info never leaves this
                  device.
                </Text>
              </View>
            </View>
          </View>
        </RiseIn>

        <RiseIn delay={360}>
          <Pressable onPress={onSignOut} style={styles.signOutRow}>
            <LogOut size={15} color={colors.destructive} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          <Text style={styles.version}>IronLog native · v1.0.0</Text>
        </RiseIn>
      </ScrollView>

      <Modal visible={!!importPreview} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerTitle}>Import these workouts?</Text>
            <Text style={styles.centerBody}>
              {importPreview
                ? `${importPreview.length} ${importPreview.length === 1 ? "workout" : "workouts"} · ${importPreview.reduce((a, g) => a + g.rows.length, 0)} sets found. Workouts already in your history are skipped, never duplicated.`
                : ""}
            </Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setImportPreview(null)} style={styles.centerGhost}>
                <Text style={styles.centerGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmImport()} disabled={importing} style={styles.centerPrimary}>
                <Text style={styles.centerPrimaryText}>{importing ? "Importing..." : "Import"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: 24,
    backgroundColor: "#c8f2cb26",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: colors.primary, fontSize: 20, fontWeight: "800" },
  accountName: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  accountEmail: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },
  groupLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 26,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  groupPadded: { padding: 18 },
  profileHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  profileName: { color: colors.foreground, fontSize: 17, fontWeight: "700" },
  profileSavedAs: { color: colors.primary, fontSize: 11, marginTop: 3 },
  profileEmpty: { color: colors.mutedForeground, fontSize: 13, marginTop: 12 },
  editButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editButtonText: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#c8f2cb1f",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 62 },
  label: { color: colors.foreground, fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 6 },
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
    marginTop: 18,
  },
  saveButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
  cancelEdit: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelEditText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600" },
  onDeviceNote: {
    color: colors.mutedForeground,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 28,
  },
  signOutText: { color: colors.destructive, fontSize: 15, fontWeight: "700" },
  version: {
    color: colors.mutedForeground,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
  },
  centerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  centerTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800", textAlign: "center" },
  centerBody: { color: colors.mutedForeground, fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 21 },
  centerButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
  centerPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  centerPrimaryText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "800" },
  centerGhost: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  centerGhostText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "700" },
});
