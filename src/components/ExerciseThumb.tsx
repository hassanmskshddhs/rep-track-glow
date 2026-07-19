import { useState, useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[()'".]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function candidates(name: string): string[] {
  const slug = slugify(name);
  // Open-source exercise image dataset (free-exercise-db). Many entries may
  // not match; fallback SVG handles misses cleanly.
  return [
    `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${slug}/images/0.jpg`,
  ];
}

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export function ExerciseThumb({ name, size = 48, className }: Props) {
  const urls = useMemo(() => candidates(name), [name]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = urls[idx];

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl bg-muted/40",
        className,
      )}
      style={{
        width: size,
        height: size,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {failed || !src ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
          <Dumbbell className="h-5 w-5" />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => {
            if (idx < urls.length - 1) setIdx(idx + 1);
            else setFailed(true);
          }}
        />
      )}
    </div>
  );
}
