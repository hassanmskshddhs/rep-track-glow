import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Sparkles, X, Trash2, ImagePlus, Check } from "lucide-react-native";
import { colors } from "./ui";
import { useBackHandler } from "./back";
import { createCustomDay, CustomDay, getSplitAccent } from "./data";
import { supabase } from "./supabase";

const IMPORT_API = "https://ironlog-orcin.vercel.app/api/import";

type ParsedExercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
};

type ParsedRoutine = {
  name: string;
  subtitle: string;
  muscleGroups: string[];
  exercises: ParsedExercise[];
};

export function QuickImportSheet({
  visible,
  userId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSaved: (day: CustomDay) => void;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRoutine | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [rows, setRows] = useState<ParsedExercise[]>([]);

  useBackHandler(visible, () => {
    if (visible) {
      handleClose();
      return true;
    }
    return false;
  });

  const reset = () => {
    setText("");
    setImage(null);
    setParsing(false);
    setSaving(false);
    setError(null);
    setParsed(null);
    setRows([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    setError(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        base64: false,
      });
      const asset = res.assets?.[0];
      if (res.canceled || !asset) return;
      const max = 1280;
      const scale = Math.min(1, max / Math.max(asset.width || max, asset.height || max));
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        scale < 1
          ? [
              {
                resize: {
                  width: Math.round((asset.width || max) * scale),
                  height: Math.round((asset.height || max) * scale),
                },
              },
            ]
          : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) throw new Error("no base64");
      setImage(`data:image/jpeg;base64,${manipulated.base64}`);
    } catch {
      setError("Couldn't read that image.");
    }
  };

  const parse = async () => {
    if (!text.trim() && !image) {
      setError("Paste your routine or attach a screenshot first.");
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session expired — sign in again.");
      const res = await fetch(IMPORT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          text: text.trim() || undefined,
          image: image ?? undefined,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Import failed — try again.");
      }
      const out = (await res.json()) as ParsedRoutine;
      if (!out.exercises?.length) {
        throw new Error("No exercises found — try adding more detail.");
      }
      setParsed(out);
      setTitle(out.name);
      setSubtitle(out.subtitle);
      setRows(out.exercises);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed — try again.");
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    const names = rows.map((r) => r.name.trim()).filter(Boolean);
    if (!names.length) {
      setError("Keep at least one exercise.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const name = title.trim() || "Imported Split";
      const muscleGroups = parsed?.muscleGroups ?? [];
      const { id } = await createCustomDay(userId, {
        name,
        subtitle: subtitle.trim() || null,
        accent: getSplitAccent(name, muscleGroups, "primary"),
        muscle_groups: muscleGroups,
        exercises: names,
      });
      const now = new Date().toISOString();
      const day: CustomDay = {
        id,
        user_id: userId,
        created_at: now,
        updated_at: now,
        name,
        subtitle: subtitle.trim() || null,
        accent: getSplitAccent(name, muscleGroups, "primary"),
        muscle_groups: muscleGroups,
        exercises: names,
      };
      reset();
      onSaved(day);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the split.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Sparkles color={colors.brand} size={18} strokeWidth={2.2} />
            <Text style={styles.headerTitle}>Quick Import</Text>
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
            <X color={colors.mutedForeground} size={20} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!parsed ? (
            <>
              <Text style={styles.lead}>
                Paste any workout plan, or attach a screenshot of one. IronCoach turns it into a
                split you can edit and save.
              </Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder={"Push Day\nBench Press 4x8\nIncline DB Press 3x10-12..."}
                placeholderTextColor={colors.mutedForeground}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
              {image ? (
                <View style={styles.imageWrap}>
                  <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
                  <Pressable onPress={() => setImage(null)} style={styles.imageRemove} hitSlop={8}>
                    <X color={colors.foreground} size={14} strokeWidth={2.5} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickImage} style={styles.attachButton}>
                  <ImagePlus color={colors.mutedForeground} size={16} strokeWidth={2} />
                  <Text style={styles.attachText}>Attach a screenshot</Text>
                </Pressable>
              )}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                onPress={() => void parse()}
                style={[styles.primaryButton, parsing && styles.buttonDisabled]}
                disabled={parsing}
              >
                {parsing ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Sparkles color={colors.primaryForeground} size={16} strokeWidth={2.4} />
                    <Text style={styles.primaryButtonText}>Parse with AI</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.lead}>Looking good? Edit anything, then save it as a split.</Text>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.field}
                value={title}
                onChangeText={setTitle}
                placeholder="Split name"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={styles.fieldLabel}>SUBTITLE</Text>
              <TextInput
                style={styles.field}
                value={subtitle}
                onChangeText={setSubtitle}
                placeholder="Chest · Shoulders · Triceps"
                placeholderTextColor={colors.mutedForeground}
              />
              {parsed.muscleGroups.length ? (
                <View style={styles.chipsRow}>
                  {parsed.muscleGroups.map((m) => (
                    <View key={m} style={styles.chip}>
                      <Text style={styles.chipText}>{m}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>EXERCISES</Text>
              {rows.map((r, i) => (
                <View key={`${i}-${r.name}`} style={styles.exRow}>
                  <View style={styles.exIndex}>
                    <Text style={styles.exIndexText}>{String(i + 1).padStart(2, "0")}</Text>
                  </View>
                  <View style={styles.exMain}>
                    <TextInput
                      style={styles.exName}
                      value={r.name}
                      onChangeText={(v) =>
                        setRows((cur) => cur.map((x, j) => (j === i ? { ...x, name: v } : x)))
                      }
                    />
                    <Text style={styles.exMeta}>
                      {[r.sets ? `${r.sets} sets` : null, r.reps, r.weight]
                        .filter(Boolean)
                        .join(" · ") || " "}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setRows((cur) => cur.filter((_, j) => j !== i))}
                    hitSlop={10}
                    style={styles.exRemove}
                  >
                    <Trash2 color={colors.destructive} size={16} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.previewButtons}>
                <Pressable onPress={() => setParsed(null)} style={styles.ghostButton}>
                  <Text style={styles.ghostButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  onPress={() => void save()}
                  style={[styles.primaryButton, styles.saveButton, saving && styles.buttonDisabled]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Check color={colors.primaryForeground} size={16} strokeWidth={2.6} />
                      <Text style={styles.primaryButtonText}>Save split</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  closeButton: { padding: 4 },
  scroll: { padding: 20, paddingBottom: 48 },
  lead: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    color: colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 160,
    padding: 14,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },
  attachText: { color: colors.mutedForeground, fontSize: 13, fontWeight: "600" },
  imageWrap: { marginTop: 12, borderRadius: 14, overflow: "hidden", alignSelf: "flex-start" },
  imagePreview: { width: 140, height: 140, borderRadius: 14 },
  imageRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(16,20,17,0.85)",
    borderRadius: 999,
    padding: 5,
  },
  errorText: { color: colors.destructive, fontSize: 13, marginTop: 14 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  primaryButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.6 },
  fieldLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: 18,
    marginBottom: 8,
  },
  field: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  chipText: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  exIndex: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  exIndexText: { color: colors.brand, fontSize: 11, fontWeight: "800" },
  exMain: { flex: 1 },
  exName: { color: colors.foreground, fontSize: 14, fontWeight: "700", padding: 0 },
  exMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  exRemove: { padding: 6 },
  previewButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  ghostButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 18,
  },
  ghostButtonText: { color: colors.mutedForeground, fontSize: 14, fontWeight: "700" },
  saveButton: { flex: 2 },
});
