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
      //  - reps: total reps across all sets
      //  - volume: sum of weight × reps across all sets (progression score)
      const map = new Map<string, { topWeight: number; reps: number; volume: number }>();
      for (const r of data ?? []) {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        const w = Number(r.weight) || 0;
        const reps = Number(r.reps) || 0;
        const cur = map.get(d) ?? { topWeight: 0, reps: 0, volume: 0 };
        cur.topWeight = Math.max(cur.topWeight, w);
        cur.reps += reps;
        cur.volume += w * reps;
        map.set(d, cur);
      }
      return Array.from(map, ([date, v]) => ({
        date,
        reps: v.reps,
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
          <CartesianGrid stroke="#262629" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#A0A0A5" }} tickFormatter={(v) => v.slice(5)} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#FFFFFF" }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#636366" }} />
          <Tooltip
            contentStyle={{ background: "#18181A", border: "1px solid #262629", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#FFFFFF" }}
            formatter={(value: number, name: string) =>
              name === "volume" ? [`${value.toLocaleString()} kg·reps`, "Volume"] : [`${value} reps`, "Reps"]
            }
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="line" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke="#FFFFFF"
            strokeWidth={2}
            dot={{ r: 2, fill: "#FFFFFF", strokeWidth: 0 }}
            activeDot={{ r: 3, fill: "#FFFFFF", strokeWidth: 0 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="reps"
            name="Reps"
            stroke="#636366"
            strokeWidth={1.5}
            dot={{ r: 2, fill: "#636366", strokeWidth: 0 }}
            activeDot={{ r: 3, fill: "#636366", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
