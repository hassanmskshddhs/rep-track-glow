/**
 * Maps the app's exercise names to slugs in the open-source
 * free-exercise-db illustration library (standard fitness-app CDN).
 * Unmapped names fall back to the dumbbell icon in <ExerciseThumb />.
 */
const CDN = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export const EXERCISE_IMAGE_SLUGS: Record<string, string> = {
  // Chest
  "Barbell Bench Press (Flat)": "Barbell_Bench_Press_-_Medium_Grip",
  "Barbell Bench Press (Incline)": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "Barbell Bench Press (Decline)": "Decline_Barbell_Bench_Press",
  "Dumbbell Press (Flat)": "Dumbbell_Bench_Press",
  "Dumbbell Press (Incline)": "Incline_Dumbbell_Press",
  "Dumbbell Press (Decline)": "Decline_Dumbbell_Bench_Press",
  "Dumbbell Chest Fly": "Dumbbell_Flyes",
  "Cable Chest Fly": "Flat_Bench_Cable_Flyes",
  "Cable Crossover": "Cable_Crossover",
  "Chest Press Machine": "Leverage_Chest_Press",
  "Pec Deck Machine": "Butterfly",
  "Incline Smith Machine Press": "Smith_Machine_Incline_Bench_Press",
  "Decline Machine Fly": "Leverage_Decline_Chest_Press",
  "Dips (Chest Focus)": "Dips_-_Chest_Version",
  "Push-Ups": "Pushups",

  // Back
  Deadlift: "Barbell_Deadlift",
  "Romanian Deadlift": "Romanian_Deadlift",
  "Sumo Deadlift": "Sumo_Deadlift",
  "Barbell Row": "Bent_Over_Barbell_Row",
  "Pendlay Row": "Bent_Over_Barbell_Row",
  "Dumbbell Row": "One-Arm_Dumbbell_Row",
  "Chest-Supported Row": "Dumbbell_Incline_Row",
  "T-Bar Row": "Lying_T-Bar_Row",
  "Seated Cable Row": "Seated_Cable_Rows",
  "Seated Cable Row (Wide Grip)": "Elevated_Cable_Rows",
  "Lat Pulldown (Wide Grip)": "Wide-Grip_Lat_Pulldown",
  "Lat Pulldown (Close Grip)": "Close-Grip_Front_Lat_Pulldown",
  "Lat Pulldown (Neutral Grip)": "V-Bar_Pulldown",
  "Pull-Ups": "Pullups",
  "Pull-Ups (Neutral Grip)": "V-Bar_Pullup",
  "Chin-Ups": "Chin-Up",
  "Straight Arm Pulldown": "Straight-Arm_Pulldown",
  "Face Pull": "Face_Pull",
  "Back Extension": "Hyperextensions_Back_Extensions",
  "Shrugs (Barbell)": "Barbell_Shrug",
  "Shrugs (Dumbbell)": "Dumbbell_Shrug",

  // Shoulders
  "Overhead Press (Barbell)": "Barbell_Shoulder_Press",
  "Overhead Press (Dumbbell)": "Dumbbell_Shoulder_Press",
  "Seated DB Shoulder Press": "Dumbbell_Shoulder_Press",
  "Arnold Press": "Arnold_Dumbbell_Press",
  "Machine Shoulder Press": "Machine_Shoulder_Military_Press",
  "Dumbbell Lateral Raise": "Side_Lateral_Raise",
  "Cable Lateral Raise": "Cable_Seated_Lateral_Raise",
  "Machine Lateral Raise": "Side_Lateral_Raise",
  "Front Raise (Dumbbell)": "Front_Dumbbell_Raise",
  "Front Raise (Cable Rope)": "Front_Cable_Raise",
  "Rear Delt Fly (Dumbbell)": "Seated_Bent-Over_Rear_Delt_Raise",
  "Reverse Pec Deck": "Reverse_Machine_Flyes",
  "Upright Row": "Upright_Barbell_Row",

  // Biceps
  "Barbell Curl": "Barbell_Curl",
  "EZ-Bar Curl": "EZ-Bar_Curl",
  "Dumbbell Curl": "Dumbbell_Bicep_Curl",
  "Hammer Curl": "Hammer_Curls",
  "Preacher Curl": "Preacher_Curl",
  "Incline Dumbbell Curl": "Incline_Dumbbell_Curl",
  "Concentration Curl": "Concentration_Curls",
  "Cable Curl": "Lying_Cable_Curl",
  "Cable Face-away Curl": "High_Cable_Curls",
  "Spider Curl": "Spider_Curl",

  // Triceps
  "Triceps Pushdown (Rope)": "Triceps_Pushdown_-_Rope_Attachment",
  "Triceps Pushdown (Bar)": "Triceps_Pushdown",
  "Overhead Triceps Extension (Rope)": "Cable_Rope_Overhead_Triceps_Extension",
  "Overhead Triceps Extension (Dumbbell)": "Dumbbell_One-Arm_Triceps_Extension",
  "Skull Crushers (EZ-Bar)": "EZ-Bar_Skullcrusher",
  "Close-Grip Bench Press": "Close-Grip_Barbell_Bench_Press",
  "Dips (Triceps Focus)": "Dips_-_Triceps_Version",
  "Cable Kickback": "Tricep_Dumbbell_Kickback",

  // Quads
  "Barbell Back Squat": "Barbell_Squat",
  "Barbell Front Squat": "Front_Barbell_Squat",
  "Hack Squat": "Hack_Squat",
  "Leg Press": "Leg_Press",
  "Leg Extension": "Leg_Extensions",
  "Bulgarian Split Squat": "Split_Squat_with_Dumbbells",
  "Walking Lunge": "Barbell_Walking_Lunge",
  "Goblet Squat": "Goblet_Squat",
  "Step-Up": "Dumbbell_Step_Ups",

  // Hamstrings / Glutes
  "Seated Leg Curl": "Seated_Leg_Curl",
  "Lying Leg Curl": "Lying_Leg_Curls",
  "Stiff-Leg Deadlift": "Stiff-Legged_Barbell_Deadlift",
  "Hip Thrust": "Barbell_Hip_Thrust",
  "Glute Bridge": "Barbell_Glute_Bridge",
  "Cable Kickback (Glute)": "One-Legged_Cable_Kickback",
  "Hip Abduction Machine": "Thigh_Abductor",
  "Hip Adduction Machine": "Thigh_Adductor",

  // Calves
  "Standing Calf Raise": "Standing_Calf_Raises",
  "Seated Calf Raise": "Seated_Calf_Raise",
  "Leg Press Calf Raise": "Calf_Press_On_The_Leg_Press_Machine",

  // Core
  Plank: "Plank",
  "Side Plank": "Side_Bridge",
  Crunches: "Crunches",
  "Cable Crunch": "Cable_Crunch",
  "Hanging Leg Raise": "Hanging_Leg_Raise",
  "Hanging Knee Raise": "Knee_Hip_Raise_On_Parallel_Bars",
  "Russian Twist": "Russian_Twist",
  "Ab Wheel Rollout": "Barbell_Ab_Rollout",
  "Abdominal Machine": "Ab_Crunch_Machine",
  "Mountain Climbers": "Mountain_Climbers",

  // Forearms
  "Wrist Curl": "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench",
  "Reverse Wrist Curl": "Palms-Down_Wrist_Curl_Over_A_Bench",
  "Farmer's Carry": "Farmers_Walk",

  // Cardio
  Treadmill: "Running_Treadmill",
  "Stationary Bike": "Recumbent_Bike",
  "Rowing Machine": "Rowing_Stationary",
  Elliptical: "Elliptical_Trainer",
  "Jump Rope": "Rope_Jumping",
  "Stair Climber": "Step_Mill",
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const NORMALIZED: Record<string, string> = Object.fromEntries(
  Object.entries(EXERCISE_IMAGE_SLUGS).map(([k, v]) => [normalize(k), v]),
);

/** Returns image URLs (primary + alternate frame) for an exercise, or [] if unmapped. */
export function exerciseImageUrls(name: string): string[] {
  const slug = EXERCISE_IMAGE_SLUGS[name] ?? NORMALIZED[normalize(name)];
  if (!slug) return [];
  return [`${CDN}/${slug}/0.jpg`, `${CDN}/${slug}/1.jpg`];
}
