import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Ruler, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = {
  id: string;
  measured_at: string;
  weight: number | null;
  body_fat: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  thigh: number | null;
};

const FIELDS: { key: keyof Omit<Row, "id" | "measured_at">; label: string; unit: string }[] = [
  { key: "weight", label: "Body weight", unit: "kg" },
  { key: "body_fat", label: "Body fat", unit: "%" },
  { key: "waist", label: "Waist", unit: "cm" },
  { key: "chest", label: "Chest", unit: "cm" },
  { key: "arm", label: "Arm", unit: "cm" },
  { key: "thigh", label: "Thigh", unit: "cm" },
];

export function BodyTracker() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const key = ["body_measurements", user?.id];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("id,measured_at,weight,body_fat,waist,chest,arm,thigh")
        .order("measured_at", { ascending: false })
        .limit(365);
      if (error) throw error;
      return data as Row[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { user_id: user!.id };
      let any = false;
      for (const f of FIELDS) {
        const v = parseFloat((form[f.key] ?? "").replace(",", "."));
        if (!isNaN(v) && v > 0) { payload[f.key] = v; any = true; }
      }
      if (!any) throw new Error("Enter at least one value");
      const { error } = await supabase.from("body_measurements").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Measurement saved");
      setForm({});
      setOpen(false);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_measurements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const weights = rows.filter((r) => r.weight != null).slice().reverse();
  const chart = weights.map((r) => ({ date: format(new Date(r.measured_at), "MMM d"), weight: Number(r.weight) }));
  const latest = weights[weights.length - 1];
  const weekAgo = weights.filter((r) => new Date(r.measured_at).getTime() <= Date.now() - 6 * 864e5).pop();
  const delta = latest && weekAgo ? Number(latest.weight) - Number(weekAgo.weight) : null;
  const latestOf = (k: keyof Row) => rows.find((r) => r[k] != null)?.[k] as number | undefined;

  if (isLoading) return <div className="mt-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 pb-10">
      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center">
          <Ruler className="mb-4 h-14 w-14 text-muted-foreground opacity-50" />
          <h2 className="mb-2 text-xl font-bold">Track your body</h2>
          <p className="mb-6 text-sm text-muted-foreground">Log your body weight and measurements to see how your physique changes over time.</p>
          <button onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground">
            <Plus className="h-5 w-5" /> Log first measurement
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current weight</p>
                <p className="text-3xl font-bold">{latest ? `${Number(latest.weight)} kg` : "—"}</p>
              </div>
              {delta != null && (
                <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                  {delta <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg / week
                </div>
              )}
            </div>
            {chart.length > 1 && (
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="var(--muted-foreground)" fontSize={11} width={32} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FIELDS.slice(1).map((f) => (
              <div key={f.key} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-lg font-bold">{latestOf(f.key) != null ? `${Number(latestOf(f.key))}${f.unit === "%" ? "%" : ""}` : "—"}</p>
              </div>
            ))}
          </div>

          <button onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground">
            <Plus className="h-5 w-5" /> Log measurement
          </button>

          <div className="rounded-2xl border border-border bg-card">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold">History</p>
            {rows.slice(0, 30).map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{format(new Date(r.measured_at), "EEE, MMM d")}</p>
                  <p className="text-xs text-muted-foreground">
                    {FIELDS.filter((f) => r[f.key] != null).map((f) => `${f.label} ${Number(r[f.key])}${f.unit}`).join(" · ")}
                  </p>
                </div>
                <button aria-label="Delete entry" onClick={() => del.mutate(r.id)} className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Log measurement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-xs text-muted-foreground">
                {f.label} ({f.unit})
                <input
                  inputMode="decimal"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
                />
              </label>
            ))}
          </div>
          <button disabled={add.isPending} onClick={() => add.mutate()} className="mt-2 min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-60">
            {add.isPending ? "Saving…" : "Save"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
