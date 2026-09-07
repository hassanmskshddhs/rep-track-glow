import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isSameMonth, parseISO, subMonths, startOfDay, differenceInDays, format, getWeek, subWeeks } from "date-fns";

// Muscle mapping helper
const MUSCLE_MAP: Record<string, string> = {
  "Bench Press": "Chest",
  "Incline Bench Press": "Chest",
  "Push Up": "Chest",
  "Dumbbell Press": "Chest",
  "Cable Crossover": "Chest",
  "Flys": "Chest",
  "Fly": "Chest",

  "Pull Up": "Back",
  "Lat Pulldown": "Back",
  "Barbell Row": "Back",
  "Dumbbell Row": "Back",
  "Deadlift": "Back",
  "Row": "Back",

  "Squat": "Legs",
  "Leg Press": "Legs",
  "Bulgarian Split Squat": "Legs",
  "Leg Extension": "Legs",
  "Leg Curl": "Legs",
  "Calf Raise": "Legs",
  "Lunge": "Legs",

  "Shoulder Press": "Shoulders",
  "Overhead Press": "Shoulders",
  "Lateral Raise": "Shoulders",
  "Front Raise": "Shoulders",
  "Delt": "Shoulders",

  "Bicep Curl": "Arms",
  "Tricep Extension": "Arms",
  "Skull Crusher": "Arms",
  "Hammer Curl": "Arms",
  "Pushdown": "Arms",
  "Curl": "Arms",
};

export function getMuscleGroup(exerciseName: string): string {
  for (const [key, val] of Object.entries(MUSCLE_MAP)) {
    if (exerciseName.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return "Others";
}

export function useProgressData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["progress_data", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("No user");

      // Fetch all sessions and sets
      const [sessionsRes, setsRes] = await Promise.all([
        supabase.from("workout_sessions").select("id, performed_at, created_at").eq("user_id", user.id).order('performed_at', { ascending: true }),
        supabase.from("set_logs").select("exercise_name, weight, reps, created_at").eq("user_id", user.id).order('created_at', { ascending: true })
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (setsRes.error) throw setsRes.error;

      const sessions = sessionsRes.data || [];
      const sets = setsRes.data || [];

      const now = new Date();
      const lastMonth = subMonths(now, 1);

      // --- 1. Workouts Count ---
      let workoutsThisMonth = 0;
      let workoutsLastMonth = 0;
      
      const sessionDates: string[] = []; // YYYY-MM-DD
      
      for (const s of sessions) {
        const dateStr = s.performed_at || s.created_at;
        const d = parseISO(dateStr);
        if (isSameMonth(d, now)) workoutsThisMonth++;
        if (isSameMonth(d, lastMonth)) workoutsLastMonth++;
        
        const formattedDate = format(d, "yyyy-MM-dd");
        if (!sessionDates.includes(formattedDate)) {
          sessionDates.push(formattedDate);
        }
      }

      // --- 2. Streaks ---
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      if (sessionDates.length > 0) {
        sessionDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        tempStreak = 1;
        longestStreak = 1;
        
        for (let i = 1; i < sessionDates.length; i++) {
          const prev = parseISO(sessionDates[i-1]);
          const curr = parseISO(sessionDates[i]);
          const diff = differenceInDays(startOfDay(curr), startOfDay(prev));
          
          if (diff === 1) {
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else if (diff > 1) {
            tempStreak = 1;
          }
        }
        
        // Calculate current streak from today
        const lastDate = parseISO(sessionDates[sessionDates.length - 1]);
        const diffToToday = differenceInDays(startOfDay(now), startOfDay(lastDate));
        if (diffToToday <= 1) {
          currentStreak = tempStreak;
        } else {
          currentStreak = 0;
        }
      }

      // --- 3. Volume & PRs & Chart Data ---
      let volumeThisMonth = 0;
      let volumeLastMonth = 0;
      
      // PR mapping: exercise_name -> { weight, date, prevWeight }
      const maxWeights: Record<string, { weight: number, date: string }> = {};
      const newPRsThisMonth: any[] = [];
      
      // Volume by week for the last 4 weeks
      const weeklyVolume: Record<string, number> = {};
      // Volume by muscle group (all time or this month, let's do this month)
      const muscleVolume: Record<string, number> = {
        "Chest": 0,
        "Back": 0,
        "Legs": 0,
        "Shoulders": 0,
        "Arms": 0,
        "Others": 0
      };

      // Chart data: exercise -> array of { date, weight }
      const exerciseHistory: Record<string, {date: string, val: number, fullDate: string}[]> = {};
      // List of unique exercises
      const uniqueExercises = new Set<string>();

      for (const set of sets) {
        const date = parseISO(set.created_at);
        const w = set.weight || 0;
        const r = set.reps || 0;
        const vol = w * r;
        
        uniqueExercises.add(set.exercise_name);

        if (isSameMonth(date, now)) {
          volumeThisMonth += vol;
          muscleVolume[getMuscleGroup(set.exercise_name)] += vol;
        }
        if (isSameMonth(date, lastMonth)) {
          volumeLastMonth += vol;
        }

        // Weekly Volume (Last 4 weeks logic)
        const weekDiff = differenceInDays(now, date) / 7;
        if (weekDiff <= 4 && weekDiff >= 0) {
          // Group by W1, W2 etc. (W1 being oldest, W4 being current week)
          const weekNum = 4 - Math.floor(weekDiff);
          if (weekNum >= 1 && weekNum <= 4) {
            const key = `W${weekNum}`;
            weeklyVolume[key] = (weeklyVolume[key] || 0) + vol;
          }
        }

        // PR Tracking
        if (!maxWeights[set.exercise_name]) {
          maxWeights[set.exercise_name] = { weight: w, date: set.created_at };
          if (isSameMonth(date, now)) {
            newPRsThisMonth.push({ ex: set.exercise_name, weight: w, prev: 0, date: set.created_at });
          }
        } else {
          const currentMax = maxWeights[set.exercise_name].weight;
          if (w > currentMax) {
            if (isSameMonth(date, now)) {
              newPRsThisMonth.push({ ex: set.exercise_name, weight: w, prev: currentMax, date: set.created_at });
            }
            maxWeights[set.exercise_name] = { weight: w, date: set.created_at };
          }
        }

        // History Chart Data (store max weight per day)
        const formattedDate = format(date, "MMM d");
        if (!exerciseHistory[set.exercise_name]) exerciseHistory[set.exercise_name] = [];
        
        const historyArr = exerciseHistory[set.exercise_name];
        const existingDay = historyArr.find(h => h.date === formattedDate);
        if (existingDay) {
          if (w > existingDay.val) existingDay.val = w;
        } else {
          historyArr.push({ date: formattedDate, fullDate: set.created_at, val: w });
        }
      }

      // Format weekly volume array
      const weeklyVolumeArr = [
        { w: "W1", val: weeklyVolume["W1"] || 0 },
        { w: "W2", val: weeklyVolume["W2"] || 0 },
        { w: "W3", val: weeklyVolume["W3"] || 0 },
        { w: "W4", val: weeklyVolume["W4"] || 0 },
      ];

      // Format muscle volume array
      const totalMuscleVolume = Object.values(muscleVolume).reduce((a, b) => a + b, 0);
      const muscleVolumeArr = Object.entries(muscleVolume)
        .map(([name, vol]) => ({
          name,
          vol,
          pct: totalMuscleVolume > 0 ? Math.round((vol / totalMuscleVolume) * 100) : 0
        }))
        .filter(m => m.vol > 0)
        .sort((a, b) => b.vol - a.vol);

      return {
        overview: {
          workoutsThisMonth,
          workoutsDiff: workoutsThisMonth - workoutsLastMonth,
          volumeThisMonth,
          volumeDiff: volumeThisMonth - volumeLastMonth,
          volumeDiffPct: volumeLastMonth > 0 ? Math.round(((volumeThisMonth - volumeLastMonth) / volumeLastMonth) * 100) : 0,
          prsThisMonth: newPRsThisMonth.length,
          currentStreak,
          longestStreak
        },
        prs: newPRsThisMonth.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        allTimePRs: maxWeights,
        weeklyVolumeArr,
        muscleVolumeArr,
        exerciseHistory,
        uniqueExercises: Array.from(uniqueExercises),
        sessionDates,
        sets
      };
    }
  });
}
