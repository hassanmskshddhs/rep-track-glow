import { useMemo, useState } from "react";
import { Search, Plus, Check } from "lucide-react";
import { EXERCISE_DB, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

export function ExercisePicker({ selected, onChange }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "All">("All");
  const [custom, setCustom] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return EXERCISE_DB.filter((e) => {
      if (filter !== "All" && !e.muscles.includes(filter)) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, filter]);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((x) => x !== name)
        : [...selected, name],
    );
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (!selected.includes(name)) onChange([...selected, name]);
    setCustom("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises…"
          className="h-10 pl-9"
        />
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

      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-background/40">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No exercises match.
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
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{ex.name}</div>
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
                      {isSel ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom exercise…"
          className="h-10"
        />
        <Button type="button" variant="secondary" onClick={addCustom}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>
    </div>
  );
}
