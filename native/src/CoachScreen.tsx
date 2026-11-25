import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { colors, RiseIn } from "./ui";
import { supabase } from "./supabase";

// Streams through the deployed web app's server route, same as the web client.
const COACH_API = "https://ironlog-orcin.vercel.app/api/coach";
// Same storage key as the web app so threads carry over.
const THREADS_KEY = "ironlog.coach.threads.v1";
const PROFILE_KEY = "ironlog.profile.v1";

export type CoachAttachment = { kind: "image"; url: string; name?: string };
export type CoachMessage = { role: "user" | "assistant"; text: string; attachments?: CoachAttachment[] };
export type CoachThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: CoachMessage[];
};

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

async function readThreads(): Promise<CoachThread[]> {
  try {
    const raw = await AsyncStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CoachThread[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

async function persist(list: CoachThread[]) {
  try {
    await AsyncStorage.setItem(THREADS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function groupThreads(threads: CoachThread[]): { label: string; threads: CoachThread[] }[] {
  const now = Date.now();
  const day = 86400000;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const groups: Record<string, CoachThread[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    Older: [],
  };
  for (const t of threads) {
    if (t.updatedAt >= todayStart) groups["Today"].push(t);
    else if (t.updatedAt >= todayStart - day) groups["Yesterday"].push(t);
    else if (t.updatedAt >= now - 7 * day) groups["Previous 7 days"].push(t);
    else groups["Older"].push(t);
  }
  return Object.entries(groups)
    .filter(([, ts]) => ts.length > 0)
    .map(([label, ts]) => ({ label, threads: ts }));
}

/** POST the conversation and stream the reply over SSE via XHR (works on RN + web). */
function streamCoach(
  accessToken: string,
  context: string,
  messages: CoachMessage[],
  onDelta: (acc: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", COACH_API);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    let seen = 0;
    let buffer = "";
    let acc = "";

    const digest = (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            acc += delta;
            onDelta(acc);
          }
        } catch {
          /* partial chunk */
        }
      }
    };

    xhr.onprogress = () => {
      const next = xhr.responseText.slice(seen);
      seen = xhr.responseText.length;
      digest(next);
    };
    xhr.onload = () => {
      digest(xhr.responseText.slice(seen) + "\n");
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(acc);
      } else {
        reject(new Error(xhr.responseText || `Coach unavailable (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("No connection — check your internet."));
    xhr.ontimeout = () => reject(new Error("Coach took too long — try again."));
    xhr.timeout = 120000;
    xhr.send(
      JSON.stringify({
        context,
        messages: messages.map((m) => {
          const images = (m.attachments ?? []).filter((a) => a.kind === "image");
          if (images.length === 0) return { role: m.role, content: m.text };
          const note =
            (m.text || "") +
            (images.length === 1
              ? "\n\n[Attached photo: analyze it.]"
              : `\n\n[${images.length} attached photos: analyze them.]`);
          return {
            role: m.role,
            content: [
              { type: "text", text: note },
              ...images.map((a) => ({ type: "image_url", image_url: { url: a.url } })),
            ],
          };
        }),
      }),
    );
  });
}

/** Minimal markdown: **bold** segments, so coach replies don't show raw asterisks. */
function RichText({ text, base, bold }: { text: string; base: object; bold: object }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <Text style={base}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={bold}>{p}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

export function CoachScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const [threads, setThreads] = useState<CoachThread[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [attachments, setAttachments] = useState<CoachAttachment[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sendTimesRef = useRef<number[]>([]);
  const listRef = useRef<FlatList<CoachMessage>>(null);

  const reload = useCallback(async () => {
    setThreads(await readThreads());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openChat = async (id: string | null) => {
    if (id === null) {
      const now = Date.now();
      const thread: CoachThread = { id: newId(), title: "New chat", createdAt: now, updatedAt: now, messages: [] };
      await persist([thread, ...(await readThreads())]);
      setChatId(thread.id);
      setMessages([]);
    } else {
      const t = (await readThreads()).find((x) => x.id === id);
      setChatId(id);
      setMessages(t?.messages ?? []);
    }
  };

  const saveMessages = async (id: string, msgs: CoachMessage[]) => {
    const list = await readThreads();
    const idx = list.findIndex((t) => t.id === id);
    const now = Date.now();
    const firstUser = msgs.find((m) => m.role === "user");
    if (idx === -1) {
      await persist([
        { id, title: firstUser ? titleFrom(firstUser.text) : "New chat", createdAt: now, updatedAt: now, messages: msgs },
        ...list,
      ]);
    } else {
      const t = list[idx];
      list[idx] = {
        ...t,
        title: t.title === "New chat" && firstUser ? titleFrom(firstUser.text) : t.title,
        updatedAt: now,
        messages: msgs,
      };
      await persist(list);
    }
    void reload();
  };

  const buildContext = async (): Promise<string> => {
    const bits: string[] = [];
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { displayName?: string; firstName?: string; age?: string; weight?: string; height?: string };
        const name = (p.displayName ?? "").trim() || (p.firstName ?? "").trim();
        if (name) bits.push(`Name: ${name}`);
        if (p.age) bits.push(`Age: ${p.age}`);
        if (p.weight) bits.push(`Bodyweight: ${p.weight} kg`);
        if (p.height) bits.push(`Height: ${p.height} cm`);
      }
    } catch {
      /* ignore */
    }
    try {
      const { data } = await supabase
        .from("set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (data && data.length > 0) {
        const byEx = new Map<string, string[]>();
        for (const r of data) {
          const arr = byEx.get(r.exercise_name) ?? [];
          if (arr.length < 4) arr.push(`${r.weight ?? "?"}kg x ${r.reps ?? "?"}`);
          byEx.set(r.exercise_name, arr);
        }
        bits.push(
          "Recent logged sets (newest first):\n" +
            [...byEx.entries()].map(([ex, sets]) => `- ${ex}: ${sets.join(", ")}`).join("\n"),
        );
      } else {
        bits.push("No workouts logged yet.");
      }
    } catch {
      bits.push("No workouts logged yet.");
    }
    return bits.join("\n");
  };

  const pickImage = async () => {
    if (attachments.length >= 3) {
      setNotice("Up to 3 photos per message.");
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        base64: false,
      });
      const asset = res.assets?.[0];
      if (res.canceled || !asset) return;
      const max = 1024;
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
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) throw new Error("no base64");
      setAttachments((cur) => [
        ...cur,
        { kind: "image", url: `data:image/jpeg;base64,${manipulated.base64}`, name: asset.fileName ?? "photo.jpg" },
      ]);
    } catch {
      setNotice("Couldn't read that image.");
    }
  };

  const send = async () => {
    const text = input.replace(/\s+/g, " ").trim().slice(0, 4000);
    if ((!text && attachments.length === 0) || streaming || !chatId) return;

    const now = Date.now();
    const recentSends = sendTimesRef.current.filter((t) => now - t < 60000);
    if (recentSends.length >= 8 || (recentSends.length > 0 && now - recentSends[recentSends.length - 1] < 3000)) {
      setNotice("Easy champ — give the coach a couple seconds.");
      return;
    }
    sendTimesRef.current = [...recentSends, now];

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setNotice("Sign in to chat with IronCoach.");
      return;
    }

    const userMsg: CoachMessage = { role: "user", text, attachments: attachments.length ? attachments : undefined };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setAttachments([]);
    setStreaming(true);
    void saveMessages(chatId, history);

    try {
      const context = await buildContext();
      const finalText = await streamCoach(accessToken, context, history, (acc) => {
        setMessages((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", text: acc };
          return copy;
        });
      });
      const finalMessages: CoachMessage[] = [
        ...history,
        { role: "assistant", text: finalText || "I didn't catch that — try again?" },
      ];
      setMessages(finalMessages);
      void saveMessages(chatId, finalMessages);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Coach unavailable");
      setMessages(history);
    } finally {
      setStreaming(false);
    }
  };

  const deleteThread = async (id: string) => {
    await persist((await readThreads()).filter((t) => t.id !== id));
    setDeleting(null);
    void reload();
  };

  // ---------- thread list ----------
  if (chatId === null) {
    const groups = groupThreads(threads);
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <RiseIn>
            <View style={styles.coachHeader}>
              <View style={styles.coachIcon}>
                <Text style={{ fontSize: 22 }}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachTitle}>IronCoach</Text>
                <Text style={styles.coachSub}>Training · nutrition · recovery</Text>
              </View>
            </View>
          </RiseIn>

          <RiseIn delay={80}>
            <Pressable style={styles.newChatButton} onPress={() => void openChat(null)}>
              <Text style={styles.newChatText}>+ New chat</Text>
            </Pressable>
          </RiseIn>

          {groups.length === 0 ? (
            <Text style={styles.emptyThreads}>
              No conversations yet. Ask about your program, nutrition, recovery — anything training.
            </Text>
          ) : (
            groups.map((g, gi) => (
              <RiseIn key={g.label} delay={140 + gi * 60}>
                <Text style={styles.groupLabel}>{g.label.toUpperCase()}</Text>
                {g.threads.map((t) => (
                  <View key={t.id} style={styles.threadRow}>
                    <Pressable style={{ flex: 1 }} onPress={() => void openChat(t.id)}>
                      <Text style={styles.threadTitle} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setDeleting(t.id)} hitSlop={8}>
                      <Text style={styles.threadDelete}>🗑</Text>
                    </Pressable>
                  </View>
                ))}
              </RiseIn>
            ))
          )}
        </ScrollView>

        <Modal visible={!!deleting} transparent animationType="fade">
          <View style={styles.centerBackdrop}>
            <View style={styles.centerCard}>
              <Text style={styles.centerTitle}>Delete this chat?</Text>
              <Text style={styles.centerSub}>This conversation will be removed from this device.</Text>
              <View style={styles.centerButtons}>
                <Pressable onPress={() => setDeleting(null)} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={styles.mutedButton}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => deleting && void deleteThread(deleting)} style={styles.dangerButton}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ---------- chat ----------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={styles.chatTopBar}>
        <Pressable onPress={() => { setChatId(null); void reload(); }} hitSlop={12}>
          <Text style={styles.backText}>← Chats</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
          <Text style={styles.chatTitle}>IronCoach</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ fontSize: 36 }}>🤖</Text>
            <Text style={styles.emptyChatTitle}>Your coach sees your log.</Text>
            <Text style={styles.emptyChatSub}>
              Ask about progression, plateaus, nutrition or recovery — answers use your actual logged sets.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.bubbleUser : styles.bubbleCoach,
            ]}
          >
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.attachRow}>
                {item.attachments.map((a, k) => (
                  <Image key={k} source={{ uri: a.url }} style={styles.attachImg} />
                ))}
              </View>
            )}
            {item.text ? (
              <RichText
                text={item.text}
                base={item.role === "user" ? styles.bubbleTextUser : styles.bubbleText}
                bold={item.role === "user" ? styles.bubbleBoldUser : styles.bubbleBold}
              />
            ) : item.attachments && item.attachments.length > 0 ? null : (
              <Text style={styles.typing}>● ● ●</Text>
            )}
          </View>
        )}
      />

      {attachments.length > 0 && (
        <View style={styles.pendingRow}>
          {attachments.map((a, k) => (
            <View key={k}>
              <Image source={{ uri: a.url }} style={styles.pendingImg} />
              <Pressable
                onPress={() => setAttachments((cur) => cur.filter((_, i) => i !== k))}
                style={styles.pendingRemove}
                hitSlop={6}
              >
                <Text style={styles.pendingRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.inputBar}>
        <Pressable onPress={() => void pickImage()} disabled={streaming} style={styles.attachButton} hitSlop={6}>
          <Text style={styles.attachButtonText}>📷</Text>
        </Pressable>
        <TextInput
          style={styles.chatInput}
          placeholder="Ask IronCoach..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
        />
        <Pressable
          onPress={() => void send()}
          disabled={streaming || (!input.trim() && attachments.length === 0)}
          style={[styles.sendButton, (streaming || (!input.trim() && attachments.length === 0)) && { opacity: 0.4 }]}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </Pressable>
      </View>

      <Modal visible={!!notice} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.centerCard}>
            <Text style={styles.centerSub}>{notice}</Text>
            <View style={styles.centerButtons}>
              <Pressable onPress={() => setNotice(null)} style={styles.okButton}>
                <Text style={styles.okButtonText}>OK</Text>
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
  backText: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  coachIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  coachTitle: { color: colors.foreground, fontSize: 22, fontWeight: "800" },
  coachSub: { color: colors.mutedForeground, fontSize: 13, marginTop: 2 },
  newChatButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  newChatText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "800" },
  emptyThreads: { color: colors.mutedForeground, fontSize: 13, marginTop: 24, lineHeight: 20, textAlign: "center" },
  groupLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 6,
  },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
    gap: 10,
  },
  threadTitle: { color: colors.foreground, fontSize: 15, fontWeight: "600" },
  threadDelete: { fontSize: 15, opacity: 0.6 },
  chatTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTitle: { color: colors.foreground, fontSize: 16, fontWeight: "800" },
  emptyChatTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800", marginTop: 14 },
  emptyChatSub: {
    color: colors.mutedForeground,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 30,
  },
  bubble: { maxWidth: "86%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleCoach: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: colors.primaryForeground, fontSize: 15, lineHeight: 22 },
  bubbleBold: { color: colors.primary, fontWeight: "800" as const },
  bubbleBoldUser: { color: colors.primaryForeground, fontWeight: "800" as const },
  typing: { color: colors.mutedForeground, fontSize: 12, letterSpacing: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 15,
    maxHeight: 110,
  },
  attachRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  attachImg: { width: 140, height: 140, borderRadius: 10 },
  pendingRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  pendingImg: { width: 56, height: 56, borderRadius: 8 },
  pendingRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingRemoveText: { color: "#fff", fontSize: 13, fontWeight: "700", marginTop: -1 },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.input,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  attachButtonText: { fontSize: 17 },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: { color: colors.primaryForeground, fontSize: 20, fontWeight: "800" },
  centerBackdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "center", padding: 24 },
  centerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
  },
  centerTitle: { color: colors.foreground, fontSize: 18, fontWeight: "800" },
  centerSub: { color: colors.mutedForeground, fontSize: 14, marginTop: 8, lineHeight: 20 },
  centerButtons: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 18 },
  mutedButton: { color: colors.mutedForeground, fontSize: 15, fontWeight: "600" },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  dangerButtonText: { color: colors.destructive, fontSize: 15, fontWeight: "700" },
  okButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  okButtonText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "700" },
});
