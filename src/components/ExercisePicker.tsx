import { useMemo, useState } from "react";
import { Search, Plus, Check, Sparkles } from "lucide-react";
import {
  EXERCISE_DB,
  MUSCLE_GROUPS,
  type ExerciseEntry,
  type MuscleGroup,
} from "@/lib/exercises";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExerciseThumb } from "./ExerciseThumb";
import { cn } from "@/lib/utils";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

export function ExercisePicker({ selected, onChange }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "All">("All");
  const [customList, setCustomList] = useState<ExerciseEntry[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>("Chest");

  const combined = useMemo(
    () => [...customList, ...EXERCISE_DB],
    [customList],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return combined.filter((e) => {
      if (filter !== "All" && !e.muscles.includes(filter)) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, filter, combined]);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((x) => x !== name)
        : [...selected, name],
    );
  };

  const saveCustom = () => {
    const name = customName.trim();
    if (!name) return;
    if (!combined.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
      setCustomList((cur) => [{ name, muscles: [customMuscle] }, ...cur]);
    }
    if (!selected.includes(name)) onChange([...selected, name]);
    setCustomName("");
    setCustomMuscle("Chest");
    setCustomOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises…"
            className="h-10 pl-9"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCustomOpen(true)}
          className="h-10 shrink-0"
        >
          <Plus className="mr-1 h-4 w-4" /> Custom
        </Button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["All", ...MUSCLE_GROUPS] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setFilter(g)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
              filter === g
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-background/40">
        {filtered.length === 0 ? (
          <div className="space-y-3 p-6 text-center">
            <div className="text-sm text-muted-foreground">
              No exercises match.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomName(q);
                setCustomOpen(true);
              }}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              Add “{q || "custom"}” as custom
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((ex) => {
              const isSel = selected.includes(ex.name);
              return (
                <li key={ex.name}>
                  <button
                    type="button"
                    onClick={() => toggle(ex.name)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <ExerciseThumb name={ex.name} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {ex.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {ex.muscles.join(" · ")}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all",
                        isSel
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {isSel ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setCustomOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Can’t find your exercise? Add Custom
      </Button>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add custom exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveCustom();
                  }
                }}
                placeholder="e.g. Landmine Press"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary muscle group
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map((g) => {
                  const on = customMuscle === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCustomMuscle(g)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCustomOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveCustom} disabled={!customName.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add & select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
