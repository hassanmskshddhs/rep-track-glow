import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ChevronRight, Dumbbell, ImagePlus, Pencil, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSplitAccent } from "@/lib/split-accent";
import { sharePlan } from "@/lib/share-plan";
import {
  deleteCardImage,
  getCardImage,
  setCardImage,
} from "@/lib/card-images";

const ImageCropperDialog = lazy(() =>
  import("@/components/ImageCropperDialog").then((m) => ({ default: m.ImageCropperDialog })),
);

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

  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageLoading(true);
    getCardImage(split.id).then((v) => {
      if (cancelled) return;
      setImage(v);
      setImageLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [split.id]);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      if (src) setPending(src);
      else toast.error("Couldn't read image");
    };
    reader.onerror = () => toast.error("Couldn't read image");
    reader.readAsDataURL(file);
  };

  const onCropConfirm = async (dataUrl: string) => {
    try {
      await setCardImage(split.id, dataUrl);
      setImage(dataUrl);
      setPending(null);
      toast.success("Cover updated");
    } catch {
      toast.error("Couldn't set cover image");
    }
  };

  const onRemove = async () => {
    await deleteCardImage(split.id);
    setImage(null);
    toast.success("Cover removed");
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all",
        "hover:-translate-y-0.5 will-change-transform",
        imageLoading && !image && "skeleton-shimmer",
      )}
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        backgroundImage: image
          ? `linear-gradient(180deg, rgba(11,11,12,0.35) 0%, rgba(11,11,12,0.88) 100%), url("${image}")`
          : imageLoading
            ? undefined
            : "linear-gradient(135deg, #161618 0%, #0B0B0C 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition:
          "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      {/* Accent hairline — a thin editorial rule, not a glow */}
      <div
        className="absolute inset-y-0 left-0 w-px"
        style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 60%, transparent)` }}
      />


      {/* Top-right actions */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = "";
            onPick(f);
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            fileRef.current?.click();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors hover:bg-white/20"
          style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.9)" }}
          aria-label="Upload cover image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        {image && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors hover:bg-white/20"
            style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.9)" }}
            aria-label="Remove cover image"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(split.id, split.name);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors hover:bg-destructive/80"
          style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.9)" }}
          aria-label={`Delete ${split.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>


      <Link
        to="/day/$day"
        params={{ day: split.id }}
        className="block p-6 pr-14 min-h-[172px]"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Dumbbell
              className="h-4 w-4"
              style={{ color: `color-mix(in oklab, var(--${accent}) 80%, #ffffff)` }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#94A3B8]">
              Split
            </div>
            <h4 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">
              {split.name}
            </h4>
          </div>
        </div>

        {/* Muscle pills — flat glass, desaturated, editorial */}
        {muscles.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {muscles.slice(0, 4).map((m) => (
              <span
                key={m}
                className="flat-glass px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80"
              >
                {m}
              </span>
            ))}
            {muscles.length > 4 && (
              <span className="flat-glass px-2 py-0.5 text-[10px] font-medium text-white/60">
                +{muscles.length - 4}
              </span>
            )}
          </div>
        ) : split.subtitle ? (
          <p className="mt-3 truncate text-xs text-[#94A3B8]">{split.subtitle}</p>
        ) : null}

        <div className="mt-8 flex items-end justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#94A3B8]">
            {exCount} exercises
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white",
              "flat-glass transition-transform active:scale-95 group-hover:translate-x-0.5",
            )}
          >
            Start <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>


      {/* Hover-only management actions */}
      <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-white/70 hover:text-white"
          onClick={(e) => {
            e.preventDefault();
            const exList = Array.isArray(split.exercises)
              ? (split.exercises as string[]).map((name) => ({ name, sets: 3 }))
              : [];
            sharePlan(
              { routineName: split.name, exercises: exList },
              {
                onCopied: () =>
                  toast.success("Workout Plan copied! Share it with your friends. 🚀"),
                onShared: () => toast.success("Workout Plan shared! 🚀"),
                onError: () => toast.error("Couldn't share workout plan"),
              },
            );
          }}
          aria-label="Share plan"
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-white/70 hover:text-white"
          aria-label="Edit"
        >
          <Link to="/custom/$id/edit" params={{ id: split.id }}>
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>


      {pending !== null && (
        <Suspense fallback={null}>
          <ImageCropperDialog
            open
            imageSrc={pending}
            onCancel={() => setPending(null)}
            onConfirm={onCropConfirm}
          />
        </Suspense>
      )}
    </div>
  );
}
