import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ImagePlus, Sparkles, X, Bot, Square } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "IronCoach — AI Fitness Coach | IronLog" },
      {
        name: "description",
        content:
          "Chat with IronCoach: physique photo analysis, form fixes, nutrition and programming advice tailored to your logged training.",
      },
      { property: "og:title", content: "IronCoach — AI Fitness Coach" },
      {
        property: "og:description",
        content: "Physique analysis, nutrition and training advice built on your own workout history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ChatMessage = { role: "user" | "assistant"; text: string; images?: string[] };

const QUICK_PROMPTS = [
  "Analyze my physique",
  "Critique my routine",
  "I'm stuck on bench — help",
  "Build me a cutting diet",
  "Best rep range for growth?",
  "Supplements actually worth it?",
];

async function fileToDataUrl(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = bitmapUrl;
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
    URL.revokeObjectURL(bitmapUrl);
  }
}

function CoachPage() {
  const { user, loading } = useAuth();
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);

  if (loading) return null;
  if (!user) return <AuthScreen />;

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, 3)) {
      try {
        next.push(await fileToDataUrl(f));
      } catch {
        toast.error("Couldn't read that image");
      }
    }
    setImages((cur) => [...cur, ...next].slice(0, 3));
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && images.length === 0) || streaming) return;

    const userMsg: ChatMessage = { role: "user", text, images };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", text: "" }]);
    setInput("");
    setImages([]);
    setStreaming(true);

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
              m.images && m.images.length > 0
                ? [
                    { type: "text", text: m.text || "Analyze these progress photos." },
                    ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
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
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
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

      if (!acc) {
        setMessages((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = { role: "assistant", text: "I didn't catch that — try again?" };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error((e as Error).message || "Coach unavailable");
      setMessages((cur) => cur.slice(0, -1));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-4 pb-[calc(150px+env(safe-area-inset-bottom))] pt-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card">
          <Bot className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">IronCoach</h1>
          <p className="text-xs text-muted-foreground">
            Your AI training, nutrition & physique coach
          </p>
        </div>
      </header>

      <div className="mt-5 flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Let's get to work
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask me anything about training, diet, or supplements — or upload front/back/side
              progress photos and I'll break down your physique, strengths, weak points and
              symmetry.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground",
              )}
            >
              {m.images && m.images.length > 0 && (
                <div className="mb-2 flex gap-2">
                  {m.images.map((src, k) => (
                    <img
                      key={k}
                      src={src}
                      alt="Progress photo"
                      loading="lazy"
                      className="h-24 w-20 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {m.text ? (
                <div className="whitespace-pre-wrap [&_strong]:font-bold">{m.text}</div>
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
        className="fixed inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={streaming}
                onClick={() => send(p)}
                className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {images.length > 0 && (
            <div className="mb-2 flex gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="Upload preview" className="h-14 w-12 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))}
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
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void pickImages(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Upload progress photo"
              className="h-11 w-11 shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
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
                disabled={!input.trim() && images.length === 0}
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
