export type DayKey = "push" | "pull" | "legs" | "upper";

export type DayConfig = {
  name: string;
  subtitle: string;
  accent: string;
  exercises: string[];
};

export const DAYS: Record<DayKey, DayConfig> = {
  push: {
    name: "Push",
    subtitle: "Chest · Shoulders · Triceps",
    accent: "push",
    exercises: [
      "Incline DB Press",
      "Bar Flat Machine Press",
      "Decline Machine Fly (Panatta)",
      "DB Lateral Raise",
      "Front Rope Raise",
      "Cable Extension",
      "V-Grip Overhead Extension",
    ],
  },
  pull: {
    name: "Pull",
    subtitle: "Back · Biceps · Rear Delts",
    accent: "pull",
    exercises: [
      "Seated Low Row",
      "Lat Pulldown Wide Grip",
      "Straight Arm Pulldown",
      "Cable Face-away Curl",
      "DB Hammer Curl",
      "Reverse Pec Fly",
      "Back Extension",
    ],
  },
  legs: {
    name: "Legs + Abs",
    subtitle: "Quads · Hams · Calves · Core",
    accent: "legs",
    exercises: [
      "Leg Extension",
      "Super Hack Squat",
      "Seated Leg Curl",
      "Adduction",
      "Abduction",
      "Standing Calf Raise Machine",
      "Hanging Leg Raise",
      "Abdominal Machine",
      "Plank",
    ],
  },
  upper: {
    name: "Upper",
    subtitle: "Full Upper Body",
    accent: "upper",
    exercises: [
      "Seated DB Shoulder Press",
      "Machine Lateral Raise",
      "Incline Bar Smith Machine",
      "Pec Fly",
      "Seated Row Machine Wide Grip",
      "Pull-ups Neutral Grip",
      "EZ Bar Pushdown",
      "Preacher Curl",
      "Shrugs (Multi)",
    ],
  },
};

export const DAY_KEYS: DayKey[] = ["push", "pull", "legs", "upper"];

export const ACCENT_OPTIONS = ["push", "pull", "legs", "upper", "primary"] as const;

export function isBuiltInDay(key: string): key is DayKey {
  return (DAY_KEYS as string[]).includes(key);
}
