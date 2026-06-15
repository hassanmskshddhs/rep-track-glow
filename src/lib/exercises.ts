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

// Comprehensive, deduped library covering the standard gym variety.
export const EXERCISE_DB: ExerciseEntry[] = [
  // ===== Chest =====
  { name: "Barbell Bench Press (Flat)", muscles: ["Chest", "Triceps", "Shoulders"] },
  { name: "Barbell Bench Press (Incline)", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Barbell Bench Press (Decline)", muscles: ["Chest", "Triceps"] },
  { name: "Dumbbell Press (Flat)", muscles: ["Chest", "Triceps", "Shoulders"] },
  { name: "Dumbbell Press (Incline)", muscles: ["Chest", "Shoulders", "Triceps"] },
  { name: "Dumbbell Press (Decline)", muscles: ["Chest", "Triceps"] },
  { name: "Dumbbell Chest Fly", muscles: ["Chest"] },
  { name: "Cable Chest Fly", muscles: ["Chest"] },
  { name: "Cable Crossover", muscles: ["Chest"] },
  { name: "Chest Press Machine", muscles: ["Chest", "Triceps"] },
  { name: "Pec Deck Machine", muscles: ["Chest"] },
  { name: "Incline Smith Machine Press", muscles: ["Chest", "Shoulders"] },
  { name: "Decline Machine Fly", muscles: ["Chest"] },
  { name: "Dips (Chest Focus)", muscles: ["Chest", "Triceps"] },
  { name: "Push-Ups", muscles: ["Chest", "Triceps", "Core"] },

  // ===== Back =====
  { name: "Deadlift", muscles: ["Back", "Hamstrings", "Glutes"] },
  { name: "Romanian Deadlift", muscles: ["Hamstrings", "Glutes", "Back"] },
  { name: "Sumo Deadlift", muscles: ["Back", "Glutes", "Hamstrings"] },
  { name: "Barbell Row", muscles: ["Back", "Biceps"] },
  { name: "Pendlay Row", muscles: ["Back", "Biceps"] },
  { name: "Dumbbell Row", muscles: ["Back", "Biceps"] },
  { name: "Chest-Supported Row", muscles: ["Back", "Biceps"] },
  { name: "T-Bar Row", muscles: ["Back", "Biceps"] },
  { name: "Seated Cable Row", muscles: ["Back", "Biceps"] },
  { name: "Seated Cable Row (Wide Grip)", muscles: ["Back"] },
  { name: "Lat Pulldown (Wide Grip)", muscles: ["Back", "Biceps"] },
  { name: "Lat Pulldown (Close Grip)", muscles: ["Back", "Biceps"] },
  { name: "Lat Pulldown (Neutral Grip)", muscles: ["Back", "Biceps"] },
  { name: "Pull-Ups", muscles: ["Back", "Biceps"] },
  { name: "Pull-Ups (Neutral Grip)", muscles: ["Back", "Biceps"] },
  { name: "Chin-Ups", muscles: ["Back", "Biceps"] },
  { name: "Straight Arm Pulldown", muscles: ["Back"] },
  { name: "Face Pull", muscles: ["Shoulders", "Back"] },
  { name: "Back Extension", muscles: ["Back", "Glutes"] },
  { name: "Shrugs (Barbell)", muscles: ["Back", "Shoulders"] },
  { name: "Shrugs (Dumbbell)", muscles: ["Back", "Shoulders"] },

  // ===== Shoulders =====
  { name: "Overhead Press (Barbell)", muscles: ["Shoulders", "Triceps"] },
  { name: "Overhead Press (Dumbbell)", muscles: ["Shoulders", "Triceps"] },
  { name: "Seated DB Shoulder Press", muscles: ["Shoulders", "Triceps"] },
  { name: "Arnold Press", muscles: ["Shoulders"] },
  { name: "Machine Shoulder Press", muscles: ["Shoulders", "Triceps"] },
  { name: "Dumbbell Lateral Raise", muscles: ["Shoulders"] },
  { name: "Cable Lateral Raise", muscles: ["Shoulders"] },
  { name: "Machine Lateral Raise", muscles: ["Shoulders"] },
  { name: "Front Raise (Dumbbell)", muscles: ["Shoulders"] },
  { name: "Front Raise (Cable Rope)", muscles: ["Shoulders"] },
  { name: "Rear Delt Fly (Dumbbell)", muscles: ["Shoulders", "Back"] },
  { name: "Reverse Pec Deck", muscles: ["Shoulders", "Back"] },
  { name: "Upright Row", muscles: ["Shoulders", "Back"] },

  // ===== Biceps =====
  { name: "Barbell Curl", muscles: ["Biceps"] },
  { name: "EZ-Bar Curl", muscles: ["Biceps"] },
  { name: "Dumbbell Curl", muscles: ["Biceps"] },
  { name: "Hammer Curl", muscles: ["Biceps", "Forearms"] },
  { name: "Preacher Curl", muscles: ["Biceps"] },
  { name: "Incline Dumbbell Curl", muscles: ["Biceps"] },
  { name: "Concentration Curl", muscles: ["Biceps"] },
  { name: "Cable Curl", muscles: ["Biceps"] },
  { name: "Cable Face-away Curl", muscles: ["Biceps"] },
  { name: "Spider Curl", muscles: ["Biceps"] },

  // ===== Triceps =====
  { name: "Triceps Pushdown (Rope)", muscles: ["Triceps"] },
  { name: "Triceps Pushdown (Bar)", muscles: ["Triceps"] },
  { name: "Overhead Triceps Extension (Rope)", muscles: ["Triceps"] },
  { name: "Overhead Triceps Extension (Dumbbell)", muscles: ["Triceps"] },
  { name: "Skull Crushers (EZ-Bar)", muscles: ["Triceps"] },
  { name: "Close-Grip Bench Press", muscles: ["Triceps", "Chest"] },
  { name: "Dips (Triceps Focus)", muscles: ["Triceps", "Chest"] },
  { name: "Cable Kickback", muscles: ["Triceps"] },

  // ===== Legs — Quads =====
  { name: "Barbell Back Squat", muscles: ["Quads", "Glutes"] },
  { name: "Barbell Front Squat", muscles: ["Quads", "Core"] },
  { name: "Hack Squat", muscles: ["Quads", "Glutes"] },
  { name: "Leg Press", muscles: ["Quads", "Glutes"] },
  { name: "Leg Extension", muscles: ["Quads"] },
  { name: "Bulgarian Split Squat", muscles: ["Quads", "Glutes"] },
  { name: "Walking Lunge", muscles: ["Quads", "Glutes"] },
  { name: "Goblet Squat", muscles: ["Quads", "Glutes"] },
  { name: "Step-Up", muscles: ["Quads", "Glutes"] },

  // ===== Legs — Hamstrings / Glutes =====
  { name: "Seated Leg Curl", muscles: ["Hamstrings"] },
  { name: "Lying Leg Curl", muscles: ["Hamstrings"] },
  { name: "Stiff-Leg Deadlift", muscles: ["Hamstrings", "Glutes"] },
  { name: "Hip Thrust", muscles: ["Glutes"] },
  { name: "Glute Bridge", muscles: ["Glutes"] },
  { name: "Cable Kickback (Glute)", muscles: ["Glutes"] },
  { name: "Hip Abduction Machine", muscles: ["Glutes"] },
  { name: "Hip Adduction Machine", muscles: ["Quads"] },

  // ===== Calves =====
  { name: "Standing Calf Raise", muscles: ["Calves"] },
  { name: "Seated Calf Raise", muscles: ["Calves"] },
  { name: "Leg Press Calf Raise", muscles: ["Calves"] },

  // ===== Core =====
  { name: "Plank", muscles: ["Core"] },
  { name: "Side Plank", muscles: ["Core"] },
  { name: "Crunches", muscles: ["Core"] },
  { name: "Cable Crunch", muscles: ["Core"] },
  { name: "Hanging Leg Raise", muscles: ["Core"] },
  { name: "Hanging Knee Raise", muscles: ["Core"] },
  { name: "Russian Twist", muscles: ["Core"] },
  { name: "Ab Wheel Rollout", muscles: ["Core"] },
  { name: "Abdominal Machine", muscles: ["Core"] },
  { name: "Mountain Climbers", muscles: ["Core", "Cardio"] },

  // ===== Forearms =====
  { name: "Wrist Curl", muscles: ["Forearms"] },
  { name: "Reverse Wrist Curl", muscles: ["Forearms"] },
  { name: "Farmer's Carry", muscles: ["Forearms", "Core"] },

  // ===== Cardio =====
  { name: "Treadmill", muscles: ["Cardio"] },
  { name: "Stationary Bike", muscles: ["Cardio"] },
  { name: "Rowing Machine", muscles: ["Cardio", "Back"] },
  { name: "Elliptical", muscles: ["Cardio"] },
  { name: "Jump Rope", muscles: ["Cardio", "Calves"] },
  { name: "Stair Climber", muscles: ["Cardio", "Glutes"] },
];
