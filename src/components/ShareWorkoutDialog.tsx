import { useEffect, useState } from "react";
import { Share2, Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type WorkoutSummary = {
  workoutName: string;
  performedAt: Date;
  totalVolume: number; // kg
  totalSets: number;
  totalReps: number;
  highlights: string[];
  topLifts: { exercise: string; weight: number; reps: number }[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: WorkoutSummary | null;
  onClose: () => void;
};

export function ShareWorkoutDialog({ open, onOpenChange, summary, onClose }: Props) {
  // (image is generated via canvas, no DOM ref needed)
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!summary) return null;

  const dateStr = summary.performedAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const buildText = () => {
    const lines: string[] = [];
    lines.push(`💪 ${summary.workoutName} — ${dateStr}`);
    lines.push(`Volume: ${Math.round(summary.totalVolume).toLocaleString()} kg`);
    lines.push(`${summary.totalSets} sets · ${summary.totalReps} reps`);
    if (summary.highlights.length) {
      lines.push("");
      summary.highlights.forEach((h) => lines.push(`★ ${h}`));
    }
    if (summary.topLifts.length) {
      lines.push("");
      lines.push("Top lifts:");
      summary.topLifts.slice(0, 3).forEach((l) =>
        lines.push(`• ${l.exercise}: ${l.weight}kg × ${l.reps}`)
      );
    }
    lines.push("");
    lines.push("— Logged with IronLog");
    return lines.join("\n");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const downloadImage = async () => {
    try {
      const blob = await renderCardToPng(summary);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${summary.workoutName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (e) {
      toast.error("Couldn't generate image");
    }
  };

  const nativeShare = async () => {
    const text = buildText();
    try {
      if (navigator.share) {
        // Try sharing image too if supported
        try {
          const blob = await renderCardToPng(summary);
          const file = new File([blob], "workout.png", { type: "image/png" });
          if ((navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }).canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: summary.workoutName, text });
            return;
          }
        } catch {
          // ignore, fall back to text
        }
        await navigator.share({ title: summary.workoutName, text });
      } else {
        await copyText();
      }
    } catch {
      // user cancelled — silent
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Workout saved</DialogTitle>
        </DialogHeader>

        <div
          className="relative overflow-hidden rounded-2xl p-5 text-foreground"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--primary) 18%, var(--card)) 0%, var(--card) 60%, color-mix(in oklab, var(--progress) 14%, var(--card)) 100%)",
            border: "1px solid color-mix(in oklab, var(--primary) 30%, var(--border))",
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            IronLog · {dateStr}
          </div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight">{summary.workoutName}</div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Volume" value={`${Math.round(summary.totalVolume).toLocaleString()} kg`} />
            <Stat label="Sets" value={String(summary.totalSets)} />
            <Stat label="Reps" value={String(summary.totalReps)} />
          </div>

          {summary.highlights.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {summary.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--progress) 18%, transparent)",
                    color: "var(--progress)",
                  }}
                >
                  <span>★</span> <span className="truncate">{h}</span>
                </div>
              ))}
            </div>
          )}

          {summary.topLifts.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Top lifts
              </div>
              <ul className="mt-1.5 space-y-1 text-sm">
                {summary.topLifts.slice(0, 3).map((l) => (
                  <li key={l.exercise} className="flex justify-between gap-3">
                    <span className="truncate text-muted-foreground">{l.exercise}</span>
                    <span className="font-bold tabular-nums">
                      {l.weight}kg × {l.reps}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={nativeShare} className="font-bold">
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
          <Button variant="secondary" onClick={copyText}>
            {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="secondary" onClick={downloadImage}>
            <Download className="mr-1 h-4 w-4" /> PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border px-2.5 py-2"
      style={{
        borderColor: "color-mix(in oklab, var(--primary) 25%, var(--border))",
        backgroundColor: "color-mix(in oklab, var(--background) 50%, transparent)",
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

// Render a polished PNG via canvas (no extra deps).
async function renderCardToPng(summary: WorkoutSummary): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1a1410");
  grad.addColorStop(0.5, "#0f0f12");
  grad.addColorStop(1, "#0d1714");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Glow accents
  const glow = ctx.createRadialGradient(W * 0.15, H * 0.1, 50, W * 0.15, H * 0.1, 700);
  glow.addColorStop(0, "rgba(245, 188, 66, 0.35)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.9, H * 0.95, 50, W * 0.9, H * 0.95, 700);
  glow2.addColorStop(0, "rgba(80, 220, 160, 0.25)");
  glow2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const dateStr = summary.performedAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const PAD = 80;
  let y = PAD + 20;

  // Brand
  ctx.fillStyle = "#f5bc42";
  ctx.font = "bold 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`IRONLOG · ${dateStr.toUpperCase()}`, PAD, y);
  y += 70;

  // Title
  ctx.fillStyle = "#fafafa";
  ctx.font = "900 88px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(summary.workoutName, PAD, y);
  y += 60;

  // Stats row
  y += 40;
  const stats = [
    { l: "VOLUME", v: `${Math.round(summary.totalVolume).toLocaleString()} kg` },
    { l: "SETS", v: String(summary.totalSets) },
    { l: "REPS", v: String(summary.totalReps) },
  ];
  const colW = (W - PAD * 2 - 40) / 3;
  stats.forEach((s, i) => {
    const x = PAD + i * (colW + 20);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, x, y, colW, 140, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(245, 188, 66, 0.25)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, colW, 140, 18);
    ctx.stroke();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 22px system-ui";
    ctx.fillText(s.l, x + 22, y + 42);
    ctx.fillStyle = "#fafafa";
    ctx.font = "900 48px system-ui";
    ctx.fillText(s.v, x + 22, y + 100);
  });
  y += 180;

  // Highlights
  if (summary.highlights.length) {
    summary.highlights.slice(0, 3).forEach((h) => {
      ctx.fillStyle = "rgba(80, 220, 160, 0.16)";
      roundRect(ctx, PAD, y, W - PAD * 2, 76, 14);
      ctx.fill();
      ctx.fillStyle = "#5fe8b0";
      ctx.font = "bold 32px system-ui";
      ctx.fillText(`★  ${h}`, PAD + 24, y + 50);
      y += 92;
    });
  }

  // Top lifts
  if (summary.topLifts.length) {
    y += 20;
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 22px system-ui";
    ctx.fillText("TOP LIFTS", PAD, y);
    y += 40;
    summary.topLifts.slice(0, 4).forEach((l) => {
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "500 32px system-ui";
      const ex = l.exercise.length > 28 ? l.exercise.slice(0, 27) + "…" : l.exercise;
      ctx.fillText(ex, PAD, y);
      const right = `${l.weight}kg × ${l.reps}`;
      ctx.fillStyle = "#fafafa";
      ctx.font = "900 32px system-ui";
      const w = ctx.measureText(right).width;
      ctx.fillText(right, W - PAD - w, y);
      y += 50;
    });
  }

  // Footer
  ctx.fillStyle = "#71717a";
  ctx.font = "bold 24px system-ui";
  ctx.fillText("Tracked with IronLog", PAD, H - PAD);

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob failed"))), "image/png")
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
