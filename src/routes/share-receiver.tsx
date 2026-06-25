import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Share2, Check, Copy } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";

const shareSearchSchema = z.object({
  title: z.string().optional().catch(undefined),
  text: z.string().optional().catch(undefined),
  url: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/share-receiver")({
  validateSearch: shareSearchSchema,
  component: ShareReceiverPage,
  head: () => ({
    meta: [
      { title: "Shared to IronLog" },
      { name: "description", content: "Content shared into IronLog from another app." },
    ],
  }),
});

function ShareReceiverPage() {
  const { title, text, url } = useSearch({ from: "/share-receiver" });
  const [copied, setCopied] = useState(false);

  const payload = [title, text, url].filter(Boolean).join("\n").trim();

  useEffect(() => {
    if (typeof window === "undefined" || !payload) return;
    try {
      const stash = {
        title: title ?? null,
        text: text ?? null,
        url: url ?? null,
        receivedAt: new Date().toISOString(),
      };
      window.localStorage.setItem("ironlog:last-shared", JSON.stringify(stash));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [payload, title, text, url]);

  const handleCopy = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 pb-32">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Share2 className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Shared to IronLog</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {payload
            ? "Here's what another app just sent over."
            : "Nothing was shared this time. Try sharing a link or note from another app."}
        </p>
      </div>

      {payload && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          {title && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Title</div>
              <div className="mt-1 text-sm font-medium">{title}</div>
            </div>
          )}
          {text && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Text</div>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm">{text}</div>
            </div>
          )}
          {url && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">URL</div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-sm text-foreground underline-offset-4 hover:underline"
              >
                {url}
              </a>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button asChild className="flex-1">
              <Link to="/">Open IronLog</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
