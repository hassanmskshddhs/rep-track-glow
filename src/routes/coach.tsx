import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, MessageSquarePlus, PanelLeft, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  createThread,
  deleteThread,
  groupThreads,
  newId,
  readThreads,
  subscribeThreads,
  type CoachThread,
} from "@/lib/coach-chats";

export const Route = createFileRoute("/coach")({
  component: CoachLayout,
  head: () => ({
    meta: [
      { title: "IronCoach — AI Fitness & Performance Coach | IronLog" },
      {
        name: "description",
        content:
          "Chat with IronCoach: physique photo analysis, video form checks, nutrition, rehab and sport-specific programming built on your logged training.",
      },
      { property: "og:title", content: "IronCoach — AI Fitness & Performance Coach" },
      {
        property: "og:description",
        content: "Video form checks, physique analysis and elite coaching built on your own workout history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function useThreads() {
  const [threads, setThreads] = useState<CoachThread[]>([]);
  useEffect(() => {
    const sync = () => setThreads(readThreads());
    sync();
    return subscribeThreads(sync);
  }, []);
  return threads;
}

function ThreadList({
  threads,
  activeId,
  onPick,
}: {
  threads: CoachThread[];
  activeId?: string;
  onPick: () => void;
}) {
  const navigate = useNavigate();
  const groups = groupThreads(threads);

  if (threads.length === 0)
    return (
      <p className="px-3 py-6 text-xs text-muted-foreground">
        No conversations yet. Start one with “+ New chat”.
      </p>
    );

  return (
    <div className="space-y-4 pb-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </p>
          <div className="space-y-0.5">
            {g.threads.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded-xl px-2 transition-colors",
                  t.id === activeId ? "bg-card" : "hover:bg-card/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    void navigate({ to: "/coach/$chatId", params: { chatId: t.id } });
                    onPick();
                  }}
                  className="flex-1 truncate py-2 text-left text-sm text-foreground"
                >
                  {t.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${t.title}`}
                  onClick={() => {
                    deleteThread(t.id);
                    if (t.id === activeId) void navigate({ to: "/coach" });
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CoachLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { chatId?: string };
  const threads = useThreads();
  const [open, setOpen] = useState(false);

  const startNew = useCallback(() => {
    const id = newId();
    createThread(id);
    setOpen(false);
    void navigate({ to: "/coach/$chatId", params: { chatId: id } });
  }, [navigate]);

  if (loading) return null;
  if (!user) return <AuthScreen />;

  const sidebar = (
    <div className="flex h-full flex-col">
      <Button onClick={startNew} className="mx-2 mb-3 gap-2">
        <MessageSquarePlus className="h-4 w-4" />
        New chat
      </Button>
      <div className="flex-1 overflow-y-auto">
        <ThreadList threads={threads} activeId={params.chatId} onPick={() => setOpen(false)} />
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 pt-6">
      <aside className="sticky top-6 hidden h-[calc(100dvh-9rem)] w-64 shrink-0 rounded-2xl border border-border bg-background/40 py-3 lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-4 pb-3">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold tracking-tight">Chat history</span>
        </div>
        {sidebar}
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[80vw] max-w-xs p-0 pt-4">
          <SheetHeader className="px-4 pb-2 text-left">
            <SheetTitle className="text-base">Chat history</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open chat history"
            className="h-9 w-9"
            onClick={() => setOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={startNew}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
