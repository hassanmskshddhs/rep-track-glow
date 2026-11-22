import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Dumbbell,
  Flame,
  Trophy,
  ChevronRight,
  Activity,
  Calendar,
  Camera,
  Ruler,
  Users,
  Plus,
} from "lucide-react";
import { endOfMonth, format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { cn } from "@/lib/utils";
import { useProgressData } from "@/hooks/useProgressData";
import { BodyTracker } from "@/components/BodyTracker";

// Types
type Tab = "Overview" | "Strength" | "Body" | "More";
type SubView =
  "Main" | "Records" | "Volume" | "Photos" | "Measurements" | "Muscles" | "Consistency";

interface ProgressOverview {
  workoutsThisMonth: number;
  workoutsDiff: number;
  volumeThisMonth: number;
  volumeDiff: number;
  volumeDiffPct: number;
  prsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
}

interface PRRecord {
  ex: string;
  weight: number;
  prev: number;
  date: string;
}

interface ExerciseHistoryPoint {
  date: string;
  val: number;
  fullDate: string;
}

interface LoggedSetLite {
  exercise_name: string;
  weight: number | null;
  reps: number | null;
  created_at: string;
}

interface ProgressData {
  overview: ProgressOverview;
  prs: PRRecord[];
  weeklyVolumeArr: { w: string; val: number }[];
  muscleVolumeArr: { name: string; vol: number; pct: number }[];
  exerciseHistory: Record<string, ExerciseHistoryPoint[]>;
  uniqueExercises: string[];
  sessionDates: string[];
  sets: LoggedSetLite[];
}

export const Route = createFileRoute("/progress")({
  component: ProgressApp,
  head: () => ({
    meta: [
      { title: "Progress — IronLog" },
      {
        name: "description",
        content: "Track your lifting progress, PRs, volume and consistency in IronLog.",
      },
    ],
  }),
});

const SUBVIEW_TITLES: Record<Exclude<SubView, "Main">, string> = {
  Records: "Personal Records",
  Volume: "Training Volume",
  Photos: "Progress Photos",
  Measurements: "Body Measurements",
  Muscles: "Training Progress by Muscle Group",
  Consistency: "Consistency",
};

function ProgressApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [activeView, setActiveView] = useState<SubView>("Main");

  const progressData = useProgressData();

  if (loading || progressData.isLoading)
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <main className="mx-auto max-w-md px-5 pt-10 pb-32">
        <div className="rounded-[24px] border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold tracking-tight">Sign in to see your workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your saved sessions and progress are stored in your account.
          </p>
          <AuthScreen compact />
        </div>
      </main>
    );

  const data = progressData.data as ProgressData | undefined;
  if (!data)
    return <div className="p-10 text-center text-muted-foreground">Failed to load data</div>;

  // Render Sub-Views (if navigated from "More" tab)
  if (activeView !== "Main") {
    return <SubViewRouter view={activeView} onBack={() => setActiveView("Main")} data={data} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-6">
      {/* Greeting — same structure as Home */}
      <header className="pt-5 animate-fade-in">
        <p className="text-[13px] font-medium text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-[1.05] tracking-tight">Progress</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Track your journey. See your results.
        </p>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center justify-between rounded-full border border-border bg-card p-1">
          {(["Overview", "Strength", "Body", "More"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-full py-2 text-[13px] font-semibold transition-all",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6">
        {activeTab === "Overview" && <OverviewTab data={data} />}
        {activeTab === "Strength" && <StrengthTab data={data} />}
        {activeTab === "Body" && <BodyTab />}
        {activeTab === "More" && <MoreTab onNavigate={setActiveView} />}
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// OVERVIEW TAB
// -----------------------------------------------------------------------------
function OverviewTab({ data }: { data: ProgressData }) {
  const currentMonthStart = format(new Date(), "MMM 1");
  const currentMonthEnd = format(endOfMonth(new Date()), "MMM d");

  const { overview } = data;

  return (
    <>
      <section className="animate-fade-in">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-[20px] font-bold tracking-tight">This Month</h3>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {currentMonthStart} - {currentMonthEnd}
          </span>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Dumbbell className="h-5 w-5 text-primary" />}
            value={overview.workoutsThisMonth.toString()}
            label="Workouts"
            change={`${overview.workoutsDiff >= 0 ? "+" : ""}${overview.workoutsDiff} vs last month`}
            positive={overview.workoutsDiff >= 0}
          />
          <MetricCard
            icon={<Activity className="h-5 w-5 text-primary" />}
            value={`${overview.volumeThisMonth.toLocaleString()} kg`}
            label="Total Volume"
            change={`${overview.volumeDiff >= 0 ? "↑" : "↓"} ${Math.abs(overview.volumeDiffPct)}% vs last month`}
            positive={overview.volumeDiff >= 0}
          />
          <MetricCard
            icon={<Trophy className="h-5 w-5 text-amber-500" />}
            value={overview.prsThisMonth.toString()}
            label="New PRs"
            change="This Month"
            positive={true}
          />
          <MetricCard
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            value={overview.workoutsThisMonth > 0 ? "Active" : "Idle"}
            label="Status"
            change={overview.workoutsThisMonth > 0 ? "Keep it up" : "Start working out"}
            positive={overview.workoutsThisMonth > 0}
          />
        </div>
      </section>

      {/* Streaks */}
      <section className="mt-4 flex gap-3 animate-fade-in" aria-label="Streaks">
        <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-border bg-card p-4">
          <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current Streak
            </div>
            <div className="text-lg font-bold tabular-nums">
              {overview.currentStreak} {overview.currentStreak === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-border bg-card p-4">
          <Trophy className="h-8 w-8 text-amber-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Longest Streak
            </div>
            <div className="text-lg font-bold tabular-nums">
              {overview.longestStreak} {overview.longestStreak === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
      </section>

      {/* Motivation Banner */}
      <section className="mt-4 animate-fade-in">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-card p-6 text-center">
          <div className="relative z-10">
            <p className="text-sm font-semibold italic text-secondary-foreground">
              "Small steps every day
              <br />
              lead to big results."
            </p>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-16 opacity-20"
            style={{ background: "linear-gradient(to top, var(--primary), transparent)" }}
          />
        </div>
      </section>
    </>
  );
}

function MetricCard({
  icon,
  value,
  label,
  change,
  positive,
}: {
  icon?: ReactNode;
  value: string;
  label: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="flex h-32 flex-col justify-between rounded-[24px] border border-border bg-card p-4">
      <div className="flex items-start justify-between">{icon || <div className="h-5 w-5" />}</div>
      <div>
        <div className="text-2xl font-extrabold tabular-nums tracking-tight">{value}</div>
        <div className="mb-1 text-xs text-muted-foreground">{label}</div>
        <div
          className={cn("text-[10px] font-bold", positive ? "text-primary" : "text-destructive")}
        >
          {change}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STRENGTH TAB
// -----------------------------------------------------------------------------
function StrengthTab({ data }: { data: ProgressData }) {
  const [metric, setMetric] = useState<"Weight" | "Volume">("Weight");

  const exercises = data.uniqueExercises || [];
  const [selectedExercise, setSelectedExercise] = useState<string>(
    exercises.length > 0 ? exercises[0] : "",
  );

  const history = data.exerciseHistory[selectedExercise] || [];
  // Sort history by date
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime(),
  );

  // Recent sets for the selected exercise
  const recentSets = (data.sets || [])
    .filter((s) => s.exercise_name === selectedExercise)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <section className="animate-fade-in">
      {/* Exercise Selector */}
      <div className="relative flex items-center justify-between overflow-hidden rounded-[24px] border border-border bg-card p-3 px-4">
        <div className="z-10 flex items-center gap-3">
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent font-semibold outline-none"
          >
            {exercises.length === 0 && <option value="">No exercises logged</option>}
            {exercises.map((ex) => (
              <option key={ex} value={ex} className="bg-card">
                {ex}
              </option>
            ))}
          </select>
        </div>
        <ChevronRight className="z-10 h-5 w-5 rotate-90 text-muted-foreground" />
      </div>

      {exercises.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No strength data available.</p>
          <p className="text-sm">Log your first workout to see progress.</p>
        </div>
      ) : (
        <>
          {/* Metric Tabs */}
          <div className="mt-4 flex items-center justify-between rounded-full border border-border bg-card p-1">
            {(["Weight", "Volume"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-xs font-semibold transition-all",
                  metric === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="mt-4 rounded-[24px] border border-border bg-card p-5">
            <div className="mb-2">
              <h3 className="font-bold">{selectedExercise}</h3>
              <p className="text-xs text-muted-foreground">
                {metric === "Weight" ? "Max Weight (kg)" : "Volume (kg)"}
              </p>
            </div>
            <div className="h-48 w-full">
              {sortedHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sortedHistory}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                      itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: "var(--background)",
                        stroke: "var(--primary)",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Not enough data to chart
                </div>
              )}
            </div>
          </div>

          {/* Recent Sets */}
          <div className="mt-8">
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-[20px] font-bold tracking-tight">Recent Sets</h3>
            </div>
            <div className="flex flex-col gap-2">
              {recentSets.map((set, i) => (
                <SetRow
                  key={i}
                  date={format(new Date(set.created_at), "MMM d, yyyy")}
                  weight={`${set.weight} kg`}
                  reps={set.reps?.toString() ?? "—"}
                  isPR={false} // Complex to calculate per-set PR on the fly here, skipping for UI simplicity
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SetRow({
  date,
  weight,
  reps,
  isPR,
}: {
  date: string;
  weight: string;
  reps: string;
  isPR: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">{date}</div>
          <div className="text-sm font-bold tabular-nums">
            {weight} x {reps} reps
          </div>
        </div>
      </div>
      {isPR && (
        <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
          PR
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// BODY TAB
// -----------------------------------------------------------------------------
function BodyTab() {
  return (
    <section className="animate-fade-in">
      <BodyTracker />
    </section>
  );
}

// -----------------------------------------------------------------------------
// MORE TAB (Navigation to Sub-views)
// -----------------------------------------------------------------------------
function MoreTab({ onNavigate }: { onNavigate: (v: SubView) => void }) {
  const links: { label: string; icon: ReactNode; view: SubView }[] = [
    {
      label: "Personal Records",
      icon: <Trophy className="h-5 w-5 text-muted-foreground" />,
      view: "Records",
    },
    {
      label: "Training Volume",
      icon: <Activity className="h-5 w-5 text-muted-foreground" />,
      view: "Volume",
    },
    {
      label: "Progress Photos",
      icon: <Camera className="h-5 w-5 text-muted-foreground" />,
      view: "Photos",
    },
    {
      label: "Body Measurements",
      icon: <Ruler className="h-5 w-5 text-muted-foreground" />,
      view: "Measurements",
    },
    {
      label: "Muscle Progress",
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      view: "Muscles",
    },
    {
      label: "Consistency Calendar",
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      view: "Consistency",
    },
  ];

  return (
    <>
      <section className="animate-fade-in">
        <div className="overflow-hidden rounded-[24px] border border-border bg-card divide-y divide-border">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => onNavigate(link.view)}
              className="tap flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-secondary/60"
            >
              <div className="flex items-center gap-4">
                {link.icon}
                <span className="font-semibold">{link.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 animate-fade-in">
        <div className="rounded-[24px] border border-border bg-card p-5">
          <h4 className="font-bold">Keep going.</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Progress takes time, but it always shows.
          </p>
          <div className="mt-4 flex items-end gap-1">
            <div className="h-8 w-2 rounded-full bg-primary" />
            <div className="h-12 w-2 rounded-full bg-primary" />
            <div className="h-6 w-2 rounded-full bg-primary" />
            <div className="h-10 w-2 rounded-full bg-primary" />
          </div>
        </div>
      </section>
    </>
  );
}

// -----------------------------------------------------------------------------
// SUB-VIEW ROUTER (For "More" tab pages)
// -----------------------------------------------------------------------------
function SubViewRouter({
  view,
  onBack,
  data,
}: {
  view: SubView;
  onBack: () => void;
  data: ProgressData;
}) {
  const renderView = () => {
    switch (view) {
      case "Records":
        return <RecordsView data={data} />;
      case "Volume":
        return <VolumeView data={data} />;
      case "Photos":
        return <PhotosView />;
      case "Measurements":
        return <BodyTab />;
      case "Muscles":
        return <MusclesView data={data} />;
      case "Consistency":
        return <ConsistencyView data={data} />;
      default:
        return null;
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-5 pb-6">
      {/* Same back-link pattern as the workout day page */}
      <header className="pt-5 animate-fade-in">
        <button
          onClick={onBack}
          className="tap inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Progress
        </button>
        <h1 className="mt-3 text-[32px] font-extrabold leading-[1.05] tracking-tight">
          {SUBVIEW_TITLES[view as Exclude<SubView, "Main">] ?? "Progress"}
        </h1>
      </header>
      <div className="mt-6">{renderView()}</div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// RECORDS VIEW
// -----------------------------------------------------------------------------
function RecordsView({ data }: { data: ProgressData }) {
  const prs = data.prs || [];

  return (
    <>
      {/* Banner */}
      <section className="animate-fade-in">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-card p-6 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-extrabold tracking-tight text-amber-500">
            {prs.length} New PRs!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">You're getting stronger this month</p>
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-2 animate-fade-in">
        {prs.length === 0 && (
          <p className="mt-4 text-center text-muted-foreground">No PRs this month yet.</p>
        )}
        {prs.map((pr, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold">{pr.ex}</h3>
                <div className="text-lg font-extrabold tabular-nums">{pr.weight} kg</div>
                <div className="text-[10px] text-muted-foreground">Previous: {pr.prev} kg</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-[10px] text-muted-foreground">
                {format(new Date(pr.date), "MMM d, yy")}
              </div>
              <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">
                +{pr.weight - pr.prev} kg
              </span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

// -----------------------------------------------------------------------------
// VOLUME VIEW
// -----------------------------------------------------------------------------
function VolumeView({ data }: { data: ProgressData }) {
  const [tab, setTab] = useState<"Total" | "Muscle">("Total");

  return (
    <>
      <div className="flex items-center justify-between rounded-full border border-border bg-card p-1 animate-fade-in">
        {(["Total Volume", "By Muscle Group"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m === "Total Volume" ? "Total" : "Muscle")}
            className={cn(
              "flex-1 rounded-full py-2 text-xs font-semibold transition-all",
              (tab === "Total" && m === "Total Volume") ||
                (tab === "Muscle" && m === "By Muscle Group")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {tab === "Total" ? (
        <section className="mt-6 animate-fade-in">
          <h3 className="text-[20px] font-bold tracking-tight">Weekly Volume</h3>
          <p className="mb-4 text-xs text-muted-foreground">Last 4 weeks · Total Volume (kg)</p>

          <div className="relative h-56 w-full rounded-[24px] border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.weeklyVolumeArr}
                margin={{ top: 20, right: 10, left: -10, bottom: 20 }}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="w"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                  }}
                  cursor={{ fill: "var(--secondary)" }}
                />
                <Bar dataKey="val" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <section className="mt-6 animate-fade-in">
          <h3 className="mb-3 text-[20px] font-bold tracking-tight">Volume by Muscle Group</h3>
          <div className="flex flex-col gap-2">
            {data.muscleVolumeArr.length === 0 && (
              <p className="text-muted-foreground">No volume recorded this month.</p>
            )}
            {data.muscleVolumeArr.map((m, i) => {
              const colors = [
                "var(--chart-1)",
                "var(--chart-2)",
                "var(--chart-3)",
                "var(--chart-4)",
                "var(--chart-5)",
                "var(--primary)",
              ];
              const color = colors[i % colors.length];
              return (
                <MuscleRow
                  key={m.name}
                  color={color}
                  name={m.name}
                  weight={`${m.vol.toLocaleString()} kg`}
                  pct={`${m.pct}%`}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function MuscleRow({
  color,
  name,
  weight,
  pct,
}: {
  color: string;
  name: string;
  weight: string;
  pct: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 text-sm">
      <div className="flex w-1/3 items-center gap-3">
        <div
          className="flex h-6 w-6 items-center justify-center rounded text-xs"
          style={{ backgroundColor: color }}
        >
          <Activity className="h-3 w-3 text-background" />
        </div>
        <span className="font-semibold text-secondary-foreground">{name}</span>
      </div>
      <div className="w-1/3 text-center font-bold tabular-nums">{weight}</div>
      <div className="w-1/4 text-right text-xs font-semibold tabular-nums text-muted-foreground">
        {pct}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PHOTOS VIEW (Empty State — capture flow not built yet)
// -----------------------------------------------------------------------------
function PhotosView() {
  return (
    <section className="animate-fade-in">
      <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] border border-border bg-card p-6 text-center">
        <Camera className="mb-4 h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="mb-2 text-xl font-extrabold tracking-tight">Progress Photos</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          A picture is worth a thousand words. Start logging your physique changes visually.
        </p>
        <button className="tap flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-5 w-5" /> Add First Photo
        </button>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// MUSCLES VIEW
// -----------------------------------------------------------------------------
function MusclesView({ data }: { data: ProgressData }) {
  return (
    <>
      <section className="mt-2 flex flex-col gap-4 animate-fade-in sm:flex-row">
        <div className="relative flex h-80 flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-border bg-card">
          {/* Mock Anatomy Vector - in a real app this would be an SVG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <Users className="h-48 w-48 text-primary" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {data.muscleVolumeArr.length === 0 && (
            <p className="text-muted-foreground">No data available.</p>
          )}
          {data.muscleVolumeArr.map((m, i) => {
            const colors = [
              "var(--chart-1)",
              "var(--chart-2)",
              "var(--chart-3)",
              "var(--chart-4)",
              "var(--chart-5)",
              "var(--primary)",
            ];
            const color = colors[i % colors.length];
            return (
              <MuscleProgressRow
                key={m.name}
                name={m.name}
                status="Active"
                val={`${m.pct}% vol`}
                color={color}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-6 flex items-start gap-3 text-[10px] text-muted-foreground animate-fade-in">
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground">
          i
        </div>
        <p>
          Based on your training volume this month. This is an estimate and not a medical measure.
        </p>
      </section>
    </>
  );
}

function MuscleProgressRow({
  name,
  status,
  val,
  color,
}: {
  name: string;
  status: string;
  val: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Activity className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">{name}</div>
          <div className="text-[10px]" style={{ color }}>
            {status}
          </div>
        </div>
      </div>
      <div className="text-xs font-bold tabular-nums" style={{ color }}>
        {val}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONSISTENCY VIEW
// -----------------------------------------------------------------------------
function ConsistencyView({ data }: { data: ProgressData }) {
  const { sessionDates, overview } = data;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // First day of month (0 = Sun, 1 = Mon...)
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const getIntensity = (d: number) => {
    const dateStr = format(new Date(currentYear, currentMonth, d), "yyyy-MM-dd");
    if (sessionDates.includes(dateStr)) return "High";
    return "Rest";
  };

  const getColor = (i: string) => {
    if (i === "High") return "var(--primary)";
    return "var(--card)";
  };

  return (
    <>
      {/* Streaks */}
      <section className="mb-8 flex gap-3 animate-fade-in" aria-label="Streaks">
        <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-border bg-card p-4">
          <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Current Streak
            </div>
            <div className="text-lg font-bold tabular-nums">
              {overview.currentStreak} {overview.currentStreak === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 rounded-[24px] border border-border bg-card p-4">
          <Trophy className="h-8 w-8 text-amber-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Longest Streak
            </div>
            <div className="text-lg font-bold tabular-nums">
              {overview.longestStreak} {overview.longestStreak === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-in">
        <h3 className="mb-4 text-[20px] font-bold tracking-tight">{format(now, "MMMM yyyy")}</h3>

        {/* Calendar Grid */}
        <div className="mb-6 grid grid-cols-7 gap-x-2 gap-y-4 text-center text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[10px] font-bold text-muted-foreground">
              {d}
            </div>
          ))}
          {/* Empty slots for start of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}

          {days.map((d) => {
            const intensity = getIntensity(d);
            const color = getColor(intensity);
            const isRest = intensity === "Rest";

            return (
              <div key={d} className="flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
                    !isRest
                      ? "text-primary-foreground"
                      : "border border-border text-muted-foreground",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {d}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[9px] font-bold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} />{" "}
            Workout Logged
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full border border-border bg-card" /> Rest
          </div>
        </div>
      </section>
    </>
  );
}
