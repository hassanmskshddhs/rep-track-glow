import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseRoutine, type ParsedExercise } from "@/lib/import-routine.functions";
import { matchExercise, musclesForExercises, normalizeMuscleGroups } from "@/lib/match-exercise";
import type { MuscleGroup } from "@/lib/exercises";

export type ImportedDraft = {
  name: string;
  subtitle: string;
  muscleGroups: MuscleGroup[];
  exercises: string[];
};

type Row = ParsedExercise & { matched: boolean };

export function QuickImportDialog({
  open,
  onOpenChange,
  onApply,
  applyLabel = "Save routine",
  applying,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (draft: ImportedDraft) => void | Promise<void>;
  applyLabel?: string;
  applying?: boolean;
}) {
  const parse = useServerFn(parseRoutine);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [groups, setGroups] = useState<MuscleGroup[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setText("");
    setImage(null);
    setRows(null);
    setTitle("");
    setSubtitle("");
    setGroups([]);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.onerror = () => toast.error("Couldn't read that image");
    reader.readAsDataURL(file);
  };

  const run = async () => {
    if (!text.trim() && !image) {
      toast.error("Paste your routine or attach a screenshot first.");
      return;
    }
    setLoading(true);
    try {
      const res = await parse({
        data: { text: text.trim() || undefined, imageDataUrl: image ?? undefined },
      });
      const mapped: Row[] = res.exercises.map((e) => {
        const m = matchExercise(e.name);
        return { ...e, name: m.name, matched: m.matched };
      });
      if (mapped.length === 0) {
        toast.error("No exercises found — try adding more detail.");
        return;
      }
      const mg = normalizeMuscleGroups(res.muscleGroups);
      setTitle(res.name);
      setSubtitle(res.subtitle);
      setGroups(mg.length ? mg : musclesForExercises(mapped.map((r) => r.name)));
      setRows(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!rows) return;
    const names = rows.map((r) => r.name.trim()).filter(Boolean);
    if (!names.length) return toast.error("Add at least one exercise.");
    await onApply({
      name: title.trim() || "Imported Split",
      subtitle: subtitle.trim(),
      muscleGroups: groups,
      exercises: names,
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Quick Import Routine
          </DialogTitle>
          <DialogDescription>
            Paste a routine or upload a screenshot — it becomes a full split.
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <>
            <Tabs defaultValue="text">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">Paste text</TabsTrigger>
                <TabsTrigger value="image">Upload image</TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-3">
                <Textarea
                  rows={9}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Push Day\n1. Bench press 4x8\n2. Incline DB press 3x10\n3. Lateral raise 3x15"}
                />
              </TabsContent>
              <TabsContent value="image" className="mt-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    pickImage(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {image ? (
                    <img
                      src={image}
                      alt="Routine to import"
                      className="max-h-44 rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <ImageUp className="h-6 w-6" />
                      Tap to attach a screenshot or photo
                    </>
                  )}
                </button>
                {image && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-muted-foreground"
                    onClick={() => setImage(null)}
                  >
                    Remove image
                  </Button>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={run} disabled={loading} className="font-bold">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {loading ? "Reading…" : "Parse routine"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Split name
              </label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Subtitle"
                maxLength={120}
              />
            </div>

            <ul className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      value={r.name}
                      onChange={(e) =>
                        setRows((cur) =>
                          (cur ?? []).map((x, idx) =>
                            idx === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      className="h-8 text-sm"
                    />
                    <div className="mt-1 flex gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.sets ? <span>{r.sets} sets</span> : null}
                      {r.reps ? <span>{r.reps} reps</span> : null}
                      {r.weight ? <span>{r.weight}</span> : null}
                      {!r.matched && <span className="text-primary">new exercise</span>}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setRows((cur) => (cur ?? []).filter((_, idx) => idx !== i))}
                    aria-label="Remove exercise"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setRows(null)}>
                Back
              </Button>
              <Button onClick={save} disabled={applying} className="font-bold">
                {applying ? "Saving…" : applyLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
