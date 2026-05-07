import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

export function ExerciseChart({ userId, exercise }: { userId: string; exercise: string }) {
  const { data } = useQuery({
    queryKey: ["chart", userId, exercise],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("created_at, weight, reps")
        .eq("user_id", userId)
        .eq("exercise_name", exercise)
        .not("weight", "is", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      // group by day, take top weight that day
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        const w = Number(r.weight) || 0;
        map.set(d, Math.max(map.get(d) ?? 0, w));
      }
      return Array.from(map, ([date, weight]) => ({ date, weight }));
    },
  });

  if (!data || data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        <TrendingUp className="mr-2 h-4 w-4" />
        Log at least 2 sessions to see your progression.
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="oklch(0.3 0.015 250)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 250)" }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.02 250)" }} />
          <Tooltip
            contentStyle={{ background: "oklch(0.21 0.014 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "oklch(0.97 0.005 250)" }}
          />
          <Line type="monotone" dataKey="weight" stroke="oklch(0.78 0.19 80)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.78 0.19 80)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
