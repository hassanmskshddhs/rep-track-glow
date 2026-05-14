import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [target, setTarget] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          setFlash((f) => f + 1);
          if (typeof window !== "undefined" && "Audio" in window) {
            try {
              // Simple beep via WebAudio
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.frequency.value = 880;
              o.connect(g); g.connect(ctx.destination);
              g.gain.setValueAtTime(0.2, ctx.currentTime);
              o.start();
              o.stop(ctx.currentTime + 0.25);
            } catch {}
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const setPreset = (s: number) => { setTarget(s); setRemaining(s); setRunning(false); };
  const adjust = (delta: number) => {
    setTarget((t) => Math.max(15, t + delta));
    setRemaining((r) => Math.max(0, r + delta));
  };
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = target ? (remaining / target) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-[var(--gradient-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Timer className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">Rest Timer</h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="text-5xl font-extrabold tabular-nums tracking-tight text-primary">
            {mm}:{ss}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width] duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p}
            variant={target === p ? "default" : "secondary"}
            size="sm"
            onClick={() => setPreset(p)}
          >
            {p}s
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="secondary" onClick={() => adjust(-15)}><Minus className="h-4 w-4" /></Button>
          <Button size="icon" variant="secondary" onClick={() => adjust(15)}><Plus className="h-4 w-4" /></Button>
          <Button size="icon" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="secondary" onClick={() => { setRemaining(target); setRunning(false); }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
