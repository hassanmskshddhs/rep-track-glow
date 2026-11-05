import { Link } from "@tanstack/react-router";
import { Dumbbell, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <div className="surface-card group relative">
      <Link
        to="/day/$day"
        params={{ day: split.id }}
        className="tap flex items-center gap-3.5 p-4"
      >
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
            {muscles.length > 0
              ? ` · ${muscles.slice(0, 3).join(", ")}`
              : split.subtitle
                ? ` · ${split.subtitle}`
                : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={`More options for ${split.name}`}
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={share}>
              <Share2 className="h-4 w-4" /> Share plan
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/custom/$id/edit" params={{ id: split.id }}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(split.id, split.name)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>
    </div>
  );
}
