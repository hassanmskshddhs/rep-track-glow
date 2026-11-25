import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarCheck, Dumbbell, Flame, TrendingUp } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Goal = "Build muscle" | "Get stronger" | "Lose fat" | "Stay consistent";

const GOALS: { id: Goal; blurb: string; icon: typeof Dumbbell }[] = [
  { id: "Build muscle", blurb: "Add size with progressive overload", icon: Dumbbell },
  { id: "Get stronger", blurb: "Push your numbers up, week on week", icon: TrendingUp },
  { id: "Lose fat", blurb: "Keep muscle while the scale drops", icon: Flame },
  { id: "Stay consistent", blurb: "Build the habit, session by session", icon: CalendarCheck },
];

const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sedentary (office job, no exercise)" },
  { value: "1.375", label: "Lightly active (1-3 days/week)" },
  { value: "1.55", label: "Moderately active (3-5 days/week)" },
  { value: "1.725", label: "Very active (6-7 days/week)" },
  { value: "1.9", label: "Extra active (physical job and hard exercise)" },
];

const NUTRITION_GOAL: Record<Goal, "Lose" | "Maintain" | "Gain"> = {
  "Build muscle": "Gain",
  "Get stronger": "Gain",
  "Lose fat": "Lose",
  "Stay consistent": "Maintain",
};

function computeTargets(input: {
  sex: "Male" | "Female";
  age: number;
  height: number;
  weight: number;
  activity: number;
  goal: Goal;
}) {
  const { sex, age, height, weight, activity, goal } = input;
  const bmr =
    sex === "Male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * activity;
  const nutritionGoal = NUTRITION_GOAL[goal];
  let calories = tdee;
  if (nutritionGoal === "Lose") calories = tdee - 0.5 * 1100;
  if (nutritionGoal === "Gain") calories = tdee + 0.5 * 1100;
  const protein = weight * 2.0;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(Math.max(0, carbs)),
    fat: Math.round(fat),
    goal: nutritionGoal,
  };
}

function BarbellMark() {
  // Pure SVG + transform animation: a bar with plates that settles into place.
  return (
    <motion.svg
      viewBox="0 0 220 80"
      className="mx-auto h-20 w-56"
      initial="hidden"
      animate="show"
      aria-hidden="true"
    >
      <motion.rect
        x="30"
        y="36"
        width="160"
        height="8"
        rx="4"
        fill="var(--foreground)"
        variants={{ hidden: { scaleX: 0, opacity: 0 }, show: { scaleX: 1, opacity: 1 } }}
        style={{ originX: "50%", originY: "50%" }}
        transition={{ duration: 0.6, ease: EASE }}
      />
      {[
        ["left", 14],
        ["left", 26],
        ["right", 206],
        ["right", 194],
      ].map(([side, x], i) => (
        <motion.rect
          key={i}
          x={Number(x) - 7}
          y={i % 2 === 0 ? 18 : 26}
          width="14"
          height={i % 2 === 0 ? 44 : 28}
          rx="4"
          fill={i % 2 === 0 ? "var(--brand)" : "var(--primary)"}
          variants={{
            hidden: { x: side === "left" ? -60 : 60, opacity: 0 },
            show: { x: 0, opacity: 1 },
          }}
          transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: EASE }}
        />
      ))}
    </motion.svg>
  );
}

const stepVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
};

const stagger = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const rise = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: EASE } },
};

export function Onboarding({ storageKey, onDone }: { storageKey: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("22");
  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("75");
  const [activity, setActivity] = useState("1.55");

  const totalSteps = 4;
  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const statsValid = useMemo(() => {
    const a = parseFloat(age);
    const h = parseFloat(height);
    const w = parseFloat(weight);
    return a >= 10 && a <= 100 && h >= 120 && h <= 230 && w >= 30 && w <= 300;
  }, [age, height, weight]);

  const finish = (withTargets: boolean) => {
    if (withTargets && goal && statsValid) {
      const targets = computeTargets({
        sex,
        age: parseFloat(age),
        height: parseFloat(height),
        weight: parseFloat(weight),
        activity: parseFloat(activity),
        goal,
      });
      try {
        localStorage.setItem("ironlog_macro_targets", JSON.stringify(targets));
        localStorage.setItem("ironlog:goal", goal);
      } catch {
        // Private mode: onboarding still completes; targets just won't persist.
      }
    }
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    onDone();
  };

  const transition = reduceMotion ? { duration: 0.2 } : { duration: 0.45, ease: EASE };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-label="Welcome to IronLog"
    >
      {/* progress */}
      <div
        className="mx-auto w-full max-w-md px-6 pt-6"
        style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
      >
        <div className="h-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ scaleX: (step + 1) / totalSteps }}
            style={{ originX: 0, width: "100%" }}
            transition={transition}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="tap flex items-center gap-1 py-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          ) : (
            <span />
          )}
          <span className="tabular-nums">
            {step + 1} / {totalSteps}
          </span>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-6">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          {step === 0 && (
            <motion.section
              key="welcome"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="text-center"
              >
                <motion.div variants={rise}>
                  <BarbellMark />
                </motion.div>
                <motion.h1 variants={rise} className="forged-title mt-6">
                  Track. Lift. Repeat.
                </motion.h1>
                <motion.p variants={rise} className="mt-3 text-sm leading-6 text-muted-foreground">
                  IronLog remembers every set, so each session starts exactly where the last one
                  left off.
                </motion.p>
                <motion.div variants={rise} className="mt-10">
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="spring-transition flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground"
                  >
                    Get started <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link
                    to="/settings"
                    onClick={() => finish(false)}
                    className="tap mt-4 block py-2 text-sm font-semibold text-muted-foreground"
                  >
                    I already have an account
                  </Link>
                </motion.div>
              </motion.div>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section
              key="goal"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.p variants={rise} className="forged-eyebrow">
                  Your goal
                </motion.p>
                <motion.h2 variants={rise} className="mt-2 text-2xl font-bold tracking-tight">
                  What are you training for?
                </motion.h2>
                <div className="mt-6 space-y-3" role="radiogroup" aria-label="Training goal">
                  {GOALS.map((g) => {
                    const Icon = g.icon;
                    const active = goal === g.id;
                    return (
                      <motion.button
                        variants={rise}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`tap flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${
                          active ? "border-primary bg-primary/10" : "border-border bg-card"
                        }`}
                      >
                        <span
                          className={`icon-well h-11 w-11 ${active ? "text-primary" : "text-muted-foreground"}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-bold">{g.id}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {g.blurb}
                          </span>
                        </span>
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {active && (
                            <motion.svg
                              viewBox="0 0 12 12"
                              className="h-3.5 w-3.5"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.25, ease: EASE }}
                            >
                              <path
                                d="M2 6.5 4.8 9 10 3.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </motion.svg>
                          )}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <motion.div variants={rise} className="mt-8">
                  <button
                    type="button"
                    disabled={!goal}
                    onClick={() => go(2)}
                    className="spring-transition flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              </motion.div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="body"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.p variants={rise} className="forged-eyebrow">
                  Your body
                </motion.p>
                <motion.h2 variants={rise} className="mt-2 text-2xl font-bold tracking-tight">
                  Numbers that tune your plan
                </motion.h2>
                <motion.p variants={rise} className="mt-2 text-sm text-muted-foreground">
                  Used for your calorie and macro targets. You can change them later in Fuel.
                </motion.p>

                <motion.div variants={rise} className="mt-6">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Biological sex
                  </span>
                  <div
                    className="forged-segments mt-2"
                    role="radiogroup"
                    aria-label="Biological sex"
                  >
                    {(["Male", "Female"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={sex === s}
                        aria-current={sex === s ? "page" : undefined}
                        onClick={() => setSex(s)}
                        className="tap font-semibold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={rise} className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Age", value: age, set: setAge, id: "ob-age" },
                    { label: "Height (cm)", value: height, set: setHeight, id: "ob-height" },
                    { label: "Weight (kg)", value: weight, set: setWeight, id: "ob-weight" },
                  ].map((f) => (
                    <div key={f.id}>
                      <label htmlFor={f.id} className="text-xs font-semibold text-muted-foreground">
                        {f.label}
                      </label>
                      <input
                        id={f.id}
                        inputMode="decimal"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-3 text-center text-lg font-bold tabular-nums outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={rise} className="mt-5">
                  <label
                    htmlFor="ob-activity"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Activity level
                  </label>
                  <select
                    id="ob-activity"
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                  >
                    {ACTIVITY_LEVELS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div variants={rise} className="mt-8">
                  <button
                    type="button"
                    disabled={!statsValid}
                    onClick={() => go(3)}
                    className="spring-transition flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                  {!statsValid && (
                    <p className="mt-2 text-center text-xs text-destructive">
                      Check your numbers: age 10-100, height 120-230 cm, weight 30-300 kg.
                    </p>
                  )}
                </motion.div>
              </motion.div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="done"
              custom={dir}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="text-center"
              >
                <motion.div
                  variants={rise}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <motion.svg
                    viewBox="0 0 24 24"
                    className="h-10 w-10"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
                  >
                    <path
                      d="M5 13 10 18 19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.div>
                <motion.h2 variants={rise} className="mt-6 text-2xl font-bold tracking-tight">
                  You're set.
                </motion.h2>
                <motion.p variants={rise} className="mt-3 text-sm leading-6 text-muted-foreground">
                  {goal
                    ? `Goal: ${goal.toLowerCase()}. Your Fuel targets match it, and your routines are ready.`
                    : "Your routines are ready."}{" "}
                  Log your first session and IronLog takes it from there.
                </motion.p>
                <motion.div variants={rise} className="mt-10">
                  <button
                    type="button"
                    onClick={() => finish(true)}
                    className="spring-transition flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground"
                  >
                    Start training <Dumbbell className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => finish(false)}
                    className="tap mt-4 w-full py-2 text-sm font-semibold text-muted-foreground"
                  >
                    Skip setup for now
                  </button>
                </motion.div>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
