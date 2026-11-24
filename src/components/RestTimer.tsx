import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
const PRESETS = [60, 90, 120, 180];
export function RestTimer() {
  const [target, setTarget] = useState(90);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(90);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) {
        setDeadline(null);
        navigator.vibrate?.([150, 100, 150]);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);
  useEffect(() => {
    const start = () => {
      setRemaining(target);
      setDeadline(Date.now() + target * 1000);
    };
    window.addEventListener("ironlog:rest-start", start);
    return () => window.removeEventListener("ironlog:rest-start", start);
  }, [target]);
  function addTime() {
    setRemaining((r) => r + 30);
    if (deadline) setDeadline(deadline + 30000);
  }
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Rest timer">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Rest
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {mm}:{ss}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            aria-label={deadline ? "Pause rest timer" : "Start rest timer"}
            variant="outline"
            onClick={() =>
              setDeadline(deadline ? null : Date.now() + Math.max(remaining, 1) * 1000)
            }
          >
            {deadline ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" onClick={addTime}>
            +30s
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRemaining(0);
              setDeadline(null);
            }}
          >
            Skip
          </Button>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${Math.min((remaining / target) * 100, 100)}%` }}
        />
      </div>
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">
          Rest settings
        </summary>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant={target === p ? "default" : "secondary"}
              onClick={() => {
                setTarget(p);
                setRemaining(p);
                setDeadline(null);
              }}
            >
              {p}s
            </Button>
          ))}
          <Button
            aria-label="Reset rest timer"
            variant="outline"
            onClick={() => {
              setRemaining(target);
              setDeadline(null);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </details>
    </section>
  );
}
