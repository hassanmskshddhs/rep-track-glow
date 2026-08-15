// Local-first IronCoach chat history (threads) stored in localStorage.

export type CoachAttachment = {
  kind: "image" | "video";
  /** data URL — videos are dropped from storage to protect quota. */
  url?: string;
  name?: string;
};

export type CoachMessage = {
  role: "user" | "assistant";
  text: string;
  attachments?: CoachAttachment[];
};

export type CoachThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: CoachMessage[];
};

const KEY = "ironlog.coach.threads.v1";
const EVT = "ironlog:coach-threads-changed";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export function readThreads(): CoachThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CoachThread[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function persist(list: CoachThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota — drop attachments from the oldest threads and retry once
    const slim = list.map((t) => ({
      ...t,
      messages: t.messages.map((m) => ({ ...m, attachments: undefined })),
    }));
    try {
      window.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* give up silently */
    }
  }
  window.dispatchEvent(new CustomEvent(EVT));
}

export function createThread(id = newId()): CoachThread {
  const now = Date.now();
  const thread: CoachThread = { id, title: "New chat", createdAt: now, updatedAt: now, messages: [] };
  persist([thread, ...readThreads()]);
  return thread;
}

export function getThread(id: string): CoachThread | undefined {
  return readThreads().find((t) => t.id === id);
}

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Photo / video analysis";
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

/** Strip heavy video data URLs before persisting. */
function slimMessages(messages: CoachMessage[]): CoachMessage[] {
  return messages.map((m) => ({
    ...m,
    attachments: m.attachments?.map((a) =>
      a.kind === "video" ? { kind: a.kind, name: a.name } : a,
    ),
  }));
}

export function saveMessages(id: string, messages: CoachMessage[]) {
  const list = readThreads();
  const idx = list.findIndex((t) => t.id === id);
  const now = Date.now();
  const firstUser = messages.find((m) => m.role === "user");
  if (idx === -1) {
    persist([
      {
        id,
        title: firstUser ? titleFrom(firstUser.text) : "New chat",
        createdAt: now,
        updatedAt: now,
        messages: slimMessages(messages),
      },
      ...list,
    ]);
    return;
  }
  const t = list[idx];
  list[idx] = {
    ...t,
    title: t.title === "New chat" && firstUser ? titleFrom(firstUser.text) : t.title,
    updatedAt: now,
    messages: slimMessages(messages),
  };
  persist(list);
}

export function deleteThread(id: string) {
  persist(readThreads().filter((t) => t.id !== id));
}

export function renameThread(id: string, title: string) {
  const list = readThreads();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], title: title.trim() || list[idx].title };
  persist(list);
}

export function subscribeThreads(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export type ThreadGroup = { label: string; threads: CoachThread[] };

export function groupThreads(list: CoachThread[]): ThreadGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const week = startOfToday - 6 * 86_400_000;

  const groups: ThreadGroup[] = [
    { label: "Today", threads: [] },
    { label: "Yesterday", threads: [] },
    { label: "Previous 7 days", threads: [] },
    { label: "Older", threads: [] },
  ];
  for (const t of list) {
    if (t.updatedAt >= startOfToday) groups[0].threads.push(t);
    else if (t.updatedAt >= startOfYesterday) groups[1].threads.push(t);
    else if (t.updatedAt >= week) groups[2].threads.push(t);
    else groups[3].threads.push(t);
  }
  return groups.filter((g) => g.threads.length > 0);
}
