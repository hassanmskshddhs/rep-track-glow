import { Link } from "@tanstack/react-router";
import { ChevronRight, Dumbbell, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { getSplitAccent } from "@/lib/split-accent";
import { sharePlan } from "@/lib/share-plan";

type SplitLike = {
  id: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  exercises: unknown;
  muscle_groups: string[] | null;
};

const iconBtn =
  "tap flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground";

export function SplitCard({
  split,
  onDelete,
}: {
  split: SplitLike;
  onDelete: (id: string, name: string) => void;
}) {
  const accent = getSplitAccent(split.name, split.muscle_groups, split.accent ?? "primary");
  const exCount = Array.isArray(split.exercises) ? (split.exercises as unknown[]).length : 0;
  const muscles = Array.isArray(split.muscle_groups) ? split.muscle_groups : [];

  const share = () => {
    const exList = Array.isArray(split.exercises)
      ? (split.exercises as string[]).map((name) => ({ name, sets: 3 }))
      : [];
    sharePlan(
      { routineName: split.name, exercises: exList },
      {
        onCopied: () => toast.success("Plan copied — share it with a friend"),
        onShared: () => toast.success("Plan shared"),
        onError: () => toast.error("Couldn't share plan"),
      },
    );
  };

  return (
    <div className="surface-card overflow-hidden">
      <Link to="/day/$day" params={{ day: split.id }} className="tap flex items-center gap-3.5 p-4">
        <div
          className="icon-well h-11 w-11 shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, var(--${accent}) 14%, transparent)`,
            color: `var(--${accent})`,
          }}
        >
          <Dumbbell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[16px] font-semibold tracking-tight">{split.name}</h4>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {exCount} exercises
            {muscles.length > 0 ? ` · ${muscles.slice(0, 3).join(", ")}` : split.subtitle ? ` · ${split.subtitle}` : ""}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>
      <div className="flex items-center justify-end gap-0.5 border-t border-border px-2 py-1">
        <button type="button" onClick={share} className={iconBtn} aria-label="Share plan">
          <Share2 className="h-4 w-4" />
        </button>
        <Link to="/custom/$id/edit" params={{ id: split.id }} className={iconBtn} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(split.id, split.name)}
          className={`${iconBtn} hover:text-destructive`}
          aria-label={`Delete ${split.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
