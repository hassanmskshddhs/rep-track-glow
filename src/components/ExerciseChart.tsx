import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
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
      // Group by day. For each day track:
      //  - topWeight: heaviest load lifted (kg)
      //  - volume: sum of weight × reps across all sets (progression score)
      const map = new Map<string, { topWeight: number; volume: number }>();
      for (const r of data ?? []) {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        const w = Number(r.weight) || 0;
        const reps = Number(r.reps) || 0;
        const cur = map.get(d) ?? { topWeight: 0, volume: 0 };
        cur.topWeight = Math.max(cur.topWeight, w);
        cur.volume += w * reps;
        map.set(d, cur);
      }
      return Array.from(map, ([date, v]) => ({
        date,
        weight: v.topWeight,
        volume: Math.round(v.volume),
      }));
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
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="oklch(0.3 0.015 250)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 250)" }} tickFormatter={(v) => v.slice(5)} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "oklch(0.78 0.19 80)" }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "oklch(0.68 0.16 230)" }} />
          <Tooltip
            contentStyle={{ background: "oklch(0.21 0.014 250)", border: "1px solid oklch(0.3 0.015 250)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "oklch(0.97 0.005 250)" }}
            formatter={(value: number, name: string) =>
              name === "volume" ? [`${value.toLocaleString()} kg·reps`, "Volume"] : [`${value} kg`, "Top weight"]
            }
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="line" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="volume"
            name="Volume (score)"
            stroke="oklch(0.78 0.19 80)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "oklch(0.78 0.19 80)" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="weight"
            name="Top weight"
            stroke="oklch(0.68 0.16 230)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 2.5, fill: "oklch(0.68 0.16 230)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
