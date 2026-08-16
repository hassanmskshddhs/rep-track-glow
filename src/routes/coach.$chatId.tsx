import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Bot, Check, Copy, ImagePlus, Sparkles, Square, Video, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getThread, saveMessages, type CoachAttachment, type CoachMessage } from "@/lib/coach-chats";

export const Route = createFileRoute("/coach/$chatId")({
  component: CoachChatRoute,
});

const QUICK_PROMPTS = [
  "Analyze my physique",
  "Check my squat form (video)",
  "Critique my routine",
  "Build me a cutting diet",
  "Sprint speed program",
  "My shoulder hurts — what now?",
  "Supplements actually worth it?",
];

const MAX_VIDEO_BYTES = 18 * 1024 * 1024;

async function imageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = objectUrl;
    });
    const max = 1024;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy answer"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function CoachChatRoute() {
  const { chatId } = Route.useParams();
  return <CoachChat key={chatId} chatId={chatId} />;
}

function CoachChat({ chatId }: { chatId: string }) {
  const { user } = useAuth();
  const profile = useProfile();

  const { data: recent } = useQuery({
    queryKey: ["coach-history", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("set_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(80);
      return data ?? [];
    },
  });

  const context = useMemo(() => {
    const bits: string[] = [];
    const name = profile.displayName.trim() || profile.firstName.trim();
    if (name) bits.push(`Name: ${name}`);
    if (profile.age) bits.push(`Age: ${profile.age}`);
    if (profile.weight) bits.push(`Bodyweight: ${profile.weight} kg`);
    if (profile.height) bits.push(`Height: ${profile.height} cm`);
    if (recent && recent.length > 0) {
      const byEx = new Map<string, string[]>();
      for (const r of recent) {
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
    return bits.join("\n");
  }, [profile, recent]);

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<CoachAttachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMessages(getThread(chatId)?.messages ?? []);
    setHydrated(true);
    inputRef.current?.focus();
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: CoachAttachment[] = [];
    for (const f of Array.from(files).slice(0, 3)) {
      try {
        next.push({ kind: "image", url: await imageToDataUrl(f), name: f.name });
      } catch {
        toast.error("Couldn't read that image");
      }
    }
    setAttachments((cur) => [...cur, ...next].slice(0, 4));
  };

  const pickVideo = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.size > MAX_VIDEO_BYTES) {
      toast.error("Video too large — keep form clips under ~18MB (5-10 seconds).");
      return;
    }
    try {
      const url = await fileToDataUrl(f);
      const att: CoachAttachment = { kind: "video", url, name: f.name };
      setAttachments((cur) => [...cur, att].slice(0, 4));
    } catch {
      toast.error("Couldn't read that video");
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && attachments.length === 0) || streaming) return;

    const userMsg: CoachMessage = { role: "user", text, attachments };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", text: "" }]);
    saveMessages(chatId, history);
    setInput("");
    setAttachments([]);
    setStreaming(true);
    inputRef.current?.focus();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          context,
          messages: history.map((m) => ({
            role: m.role,
            content:
              m.attachments && m.attachments.length > 0
                ? [
                    {
                      type: "text",
                      text:
                        m.text ||
                        (m.attachments.some((a) => a.kind === "video")
                          ? "Do a frame-by-frame form check on this clip."
                          : "Analyze these progress photos."),
                    },
                    ...m.attachments
                      .filter((a) => a.url)
                      .map((a) =>
                        a.kind === "video"
                          ? { type: "video_url", video_url: { url: a.url } }
                          : { type: "image_url", image_url: { url: a.url } },
                      ),
                  ]
                : m.text,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.text();
        throw new Error(msg || "Coach unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
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
              setMessages((cur) => {
                const copy = [...cur];
                copy[copy.length - 1] = { role: "assistant", text: acc };
                return copy;
              });
            }
          } catch {
            /* partial chunk */
          }
        }
      }

      const finalText = acc || "I didn't catch that — try again?";
      const finalMessages: CoachMessage[] = [...history, { role: "assistant", text: finalText }];
      setMessages(finalMessages);
      saveMessages(chatId, finalMessages);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((cur) => {
          const trimmedList = cur.filter((m, i) => !(i === cur.length - 1 && !m.text));
          saveMessages(chatId, trimmedList);
          return trimmedList;
        });
        return;
      }
      toast.error((e as Error).message || "Coach unavailable");
      setMessages(history);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col pb-[calc(160px+env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
          <Bot className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">IronCoach</h1>
          <p className="text-xs text-muted-foreground">
            Training · nutrition · rehab · form checks — بالعربي أو English
          </p>
        </div>
      </header>

      <div className="mt-5 flex-1 space-y-4">
        {hydrated && messages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Let's get to work
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask me anything about lifting, sport performance, nutrition, mobility or injuries.
              Upload progress photos for a physique breakdown, or a short clip of your squat,
              deadlift or sprint for a frame-by-frame form and biomechanics check.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground",
              )}
            >
              {m.attachments && m.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {m.attachments.map((a, k) =>
                    a.kind === "video" ? (
                      a.url ? (
                        <video
                          key={k}
                          src={a.url}
                          controls
                          playsInline
                          className="h-40 w-auto max-w-full rounded-lg bg-black object-cover"
                        />
                      ) : (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px]"
                        >
                          <Video className="h-3 w-3" /> {a.name ?? "video"}
                        </span>
                      )
                    ) : (
                      <img
                        key={k}
                        src={a.url}
                        alt="Progress photo"
                        loading="lazy"
                        className="h-24 w-20 rounded-lg object-cover"
                      />
                    ),
                  )}
                </div>
              )}
              {m.text ? (
                <>
                  <div className="whitespace-pre-wrap [&_strong]:font-bold">{m.text}</div>
                  {m.role === "assistant" && !(streaming && i === messages.length - 1) && (
                    <CopyButton text={m.text} />
                  )}
                </>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-border/60 bg-background/95"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={streaming}
                onClick={() => void send(p)}
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative">
                  {a.kind === "video" ? (
                    <video src={a.url} className="h-14 w-20 rounded-lg bg-black object-cover" muted />
                  ) : (
                    <img src={a.url} alt="Upload preview" className="h-14 w-12 rounded-lg object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => setAttachments((cur) => cur.filter((_, k) => k !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 text-muted-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void pickImages(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                void pickVideo(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Upload progress photo"
              className="h-11 w-11 shrink-0"
              onClick={() => imageRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Upload form-check video"
              className="h-11 w-11 shrink-0"
              onClick={() => videoRef.current?.click()}
            >
              <Video className="h-4 w-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Ask IronCoach anything…"
              className="max-h-32 min-h-11 resize-none py-3"
            />
            {streaming ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Stop"
                className="h-11 w-11 shrink-0"
                onClick={() => abortRef.current?.abort()}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                aria-label="Send message"
                className="h-11 w-11 shrink-0"
                onClick={() => void send()}
                disabled={!input.trim() && attachments.length === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
