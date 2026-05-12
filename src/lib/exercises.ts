export type DayKey = string;

export type DayConfig = {
  name: string;
  subtitle: string;
  accent: string;
  exercises: string[];
};

export const DAYS: Record<string, DayConfig> = {};
export const DAY_KEYS: string[] = [];

export const ACCENT_OPTIONS = ["push", "pull", "legs", "upper", "primary"] as const;

export function isBuiltInDay(_key: string): boolean {
  return false;
}

// ---------- Exercise database ----------

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Cardio",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type ExerciseEntry = { name: string; muscles: MuscleGroup[] };

export const EXERCISE_DB: ExerciseEntry[] = [
  // Chest
  { name: "Incline DB Press", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Bar Flat Machine Press", muscles: ["Chest", "Triceps"] },
  { name: "Decline Machine Fly (Panatta)", muscles: ["Chest"] },
  { name: "Pec Fly", muscles: ["Chest"] },
  { name: "Incline Bar Smith Machine", muscles: ["Chest", "Shoulders"] },
  { name: "Cable Crossover", muscles: ["Chest"] },
  { name: "Push-Ups", muscles: ["Chest", "Triceps", "Core"] },

  // Back
  { name: "Seated Low Row", muscles: ["Back", "Biceps"] },
  { name: "Lat Pulldown Wide Grip", muscles: ["Back", "Biceps"] },
  { name: "Straight Arm Pulldown", muscles: ["Back"] },
  { name: "Seated Row Machine Wide Grip", muscles: ["Back"] },
  { name: "Pull-ups Neutral Grip", muscles: ["Back", "Biceps"] },
  { name: "Barbell Row", muscles: ["Back", "Biceps"] },
  { name: "T-Bar Row", muscles: ["Back"] },
  { name: "Deadlift", muscles: ["Back", "Hamstrings", "Glutes"] },
  { name: "Back Extension", muscles: ["Back", "Glutes"] },

  // Shoulders
  { name: "Seated DB Shoulder Press", muscles: ["Shoulders", "Triceps"] },
  { name: "Machine Lateral Raise", muscles: ["Shoulders"] },
  { name: "DB Lateral Raise", muscles: ["Shoulders"] },
  { name: "Front Rope Raise", muscles: ["Shoulders"] },
  { name: "Reverse Pec Fly", muscles: ["Shoulders", "Back"] },
  { name: "Arnold Press", muscles: ["Shoulders"] },
  { name: "Shrugs (Multi)", muscles: ["Shoulders", "Back"] },

  // Arms
  { name: "Cable Face-away Curl", muscles: ["Biceps"] },
  { name: "DB Hammer Curl", muscles: ["Biceps", "Forearms"] },
  { name: "Preacher Curl", muscles: ["Biceps"] },
  { name: "Barbell Curl", muscles: ["Biceps"] },
  { name: "Cable Extension", muscles: ["Triceps"] },
  { name: "V-Grip Overhead Extension", muscles: ["Triceps"] },
  { name: "EZ Bar Pushdown", muscles: ["Triceps"] },
  { name: "Skullcrushers", muscles: ["Triceps"] },

  // Legs
  { name: "Leg Extension", muscles: ["Quads"] },
  { name: "Super Hack Squat", muscles: ["Quads", "Glutes"] },
  { name: "Barbell Back Squat", muscles: ["Quads", "Glutes"] },
  { name: "Bulgarian Split Squat", muscles: ["Quads", "Glutes"] },
  { name: "Leg Press", muscles: ["Quads", "Glutes"] },
  { name: "Seated Leg Curl", muscles: ["Hamstrings"] },
  { name: "Romanian Deadlift", muscles: ["Hamstrings", "Glutes"] },
  { name: "Hip Thrust", muscles: ["Glutes"] },
  { name: "Adduction", muscles: ["Quads"] },
  { name: "Abduction", muscles: ["Glutes"] },
  { name: "Standing Calf Raise Machine", muscles: ["Calves"] },
  { name: "Seated Calf Raise", muscles: ["Calves"] },

  // Core
  { name: "Hanging Leg Raise", muscles: ["Core"] },
  { name: "Abdominal Machine", muscles: ["Core"] },
  { name: "Plank", muscles: ["Core"] },
  { name: "Cable Crunch", muscles: ["Core"] },
  { name: "Russian Twist", muscles: ["Core"] },

  // Cardio
  { name: "Treadmill", muscles: ["Cardio"] },
  { name: "Stationary Bike", muscles: ["Cardio"] },
  { name: "Rowing Machine", muscles: ["Cardio", "Back"] },
];
