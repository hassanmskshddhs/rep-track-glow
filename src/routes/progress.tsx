import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Dumbbell, Flame, Trophy, ChevronRight, Activity, Calendar, Camera, Ruler, Users, Settings, Plus } from "lucide-react";
import { format } from "date-fns";
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

// Types
type Tab = "Overview" | "Strength" | "Body" | "More";
type SubView = "Main" | "Records" | "Volume" | "Photos" | "Measurements" | "Muscles" | "Consistency";

export const Route = createFileRoute("/progress")({
  component: ProgressApp,
});

function ProgressApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [activeView, setActiveView] = useState<SubView>("Main");

  const progressData = useProgressData();

  if (loading || progressData.isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;
  
  const data = progressData.data;
  if (!data) return <div className="p-10 text-center text-muted-foreground">Failed to load data</div>;

  // Render Sub-Views (if navigated from "More" tab)
  if (activeView !== "Main") {
    return <SubViewRouter view={activeView} onBack={() => setActiveView("Main")} data={data} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans">
      <header className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Dumbbell className="h-5 w-5 text-background" />
            </div>
            <span className="text-lg font-bold">Iron Log</span>
          </div>
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
        
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-muted-foreground">Track your journey. See your results.</p>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center justify-between rounded-full bg-card p-1 border border-border">
          {(["Overview", "Strength", "Body", "More"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition-all",
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5">
        {activeTab === "Overview" && <OverviewTab data={data} />}
        {activeTab === "Strength" && <StrengthTab data={data} />}
        {activeTab === "Body" && <BodyTab />}
        {activeTab === "More" && <MoreTab onNavigate={setActiveView} />}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// OVERVIEW TAB
// -----------------------------------------------------------------------------
function OverviewTab({ data }: { data: any }) {
  const currentMonthStart = format(new Date(), "MMM 1");
  const currentMonthEnd = format(new Date(), "MMM 31");
  
  const { overview } = data;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">This Month</h2>
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          {currentMonthStart} - {currentMonthEnd}
        </span>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={<Dumbbell className="h-5 w-5 text-primary" />}
          value={overview.workoutsThisMonth.toString()}
          label="Workouts"
          change={`${overview.workoutsDiff >= 0 ? '+' : ''}${overview.workoutsDiff} vs last month`}
          positive={overview.workoutsDiff >= 0}
        />
        <MetricCard
          value={`${overview.volumeThisMonth.toLocaleString()} kg`}
          label="Total Volume"
          change={`${overview.volumeDiff >= 0 ? '↑' : '↓'} ${Math.abs(overview.volumeDiffPct)}% vs last month`}
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
          icon={<Activity className="h-5 w-5 text-primary" />}
          value={`${overview.workoutsThisMonth > 0 ? 'Active' : 'Idle'}`}
          label="Status"
          change={overview.workoutsThisMonth > 0 ? 'Keep it up' : 'Start working out'}
          positive={overview.workoutsThisMonth > 0}
        />
      </div>

      {/* Streaks */}
      <div className="mt-4 flex gap-4">
        <div className="flex-1 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Streak</div>
            <div className="text-lg font-bold">{overview.currentStreak} {overview.currentStreak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Longest Streak</div>
            <div className="text-lg font-bold">{overview.longestStreak} {overview.longestStreak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
      </div>

      {/* Motivation Banner */}
      <div className="mt-4 relative overflow-hidden rounded-2xl bg-card border border-border p-6 text-center">
        <div className="relative z-10">
          <p className="text-sm font-semibold italic text-secondary-foreground">
            "Small steps every day<br/>lead to big results."
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20" style={{ background: "linear-gradient(to top, var(--primary), transparent)" }} />
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, change, positive }: any) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex flex-col justify-between h-32">
      <div className="flex items-start justify-between">
        {icon || <div className="h-5 w-5" />}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={cn("text-[10px] font-bold", positive ? "text-primary" : "text-destructive")}>
          {change}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STRENGTH TAB
// -----------------------------------------------------------------------------
function StrengthTab({ data }: { data: any }) {
  const [metric, setMetric] = useState<"Weight" | "Volume">("Weight");
  
  const exercises = data.uniqueExercises || [];
  const [selectedExercise, setSelectedExercise] = useState<string>(exercises.length > 0 ? exercises[0] : "");
  
  const history = data.exerciseHistory[selectedExercise] || [];
  // Sort history by date
  const sortedHistory = [...history].sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

  // Recent sets for the selected exercise
  const recentSets = (data.sets || [])
    .filter((s: any) => s.exercise_name === selectedExercise)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Exercise Selector */}
      <div className="flex items-center justify-between rounded-xl bg-card border border-border p-3 px-4 relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
          <select 
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="font-semibold bg-transparent outline-none appearance-none cursor-pointer"
          >
            {exercises.length === 0 && <option value="">No exercises logged</option>}
            {exercises.map((ex: string) => (
              <option key={ex} value={ex} className="bg-card">{ex}</option>
            ))}
          </select>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 z-10" />
      </div>

      {exercises.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No strength data available.</p>
          <p className="text-sm">Log your first workout to see progress.</p>
        </div>
      ) : (
        <>
          {/* Metric Tabs */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-card border border-border p-1">
            {(["Weight", "Volume"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-semibold transition-all",
                  metric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="mt-6 glass rounded-2xl p-4">
            <div className="mb-2">
              <h3 className="font-bold">{selectedExercise}</h3>
              <p className="text-xs text-muted-foreground">Max Weight (kg)</p>
            </div>
            <div className="h-48 w-full">
              {sortedHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
                      itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="val" 
                      stroke="var(--primary)" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }} 
                      activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data to chart</div>
              )}
            </div>
          </div>

          {/* Recent Sets */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Recent Sets</h3>
            </div>
            <div className="flex flex-col gap-3">
              {recentSets.map((set: any, i: number) => (
                <SetRow 
                  key={i} 
                  date={format(new Date(set.created_at), "MMM d, yyyy")} 
                  weight={`${set.weight} kg`} 
                  reps={set.reps?.toString()} 
                  isPR={false} // Complex to calculate per-set PR on the fly here, skipping for UI simplicity
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SetRow({ date, weight, reps, isPR }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card border border-border p-3 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
          <span className="text-muted-foreground text-xs font-bold">{'>'}</span>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">{date}</div>
          <div className="text-sm font-bold">{weight} x {reps} reps</div>
        </div>
      </div>
      {isPR && (
        <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
          PR
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// BODY TAB (Empty State)
// -----------------------------------------------------------------------------
function BodyTab() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mt-12 flex flex-col items-center justify-center text-center p-6 bg-card border border-border rounded-2xl">
        <Ruler className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Track Your Body</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Log your body weight and measurements to see how your physique changes over time.
        </p>
        <button className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 transition-colors hover:bg-primary/90">
          <Plus className="h-5 w-5" /> Log First Measurement
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MORE TAB (Navigation to Sub-views)
// -----------------------------------------------------------------------------
function MoreTab({ onNavigate }: { onNavigate: (v: SubView) => void }) {
  const links = [
    { label: "Personal Records", icon: <Trophy className="h-5 w-5 text-muted-foreground" />, view: "Records" as SubView },
    { label: "Training Volume", icon: <Activity className="h-5 w-5 text-muted-foreground" />, view: "Volume" as SubView },
    { label: "Progress Photos", icon: <Camera className="h-5 w-5 text-muted-foreground" />, view: "Photos" as SubView },
    { label: "Body Measurements", icon: <Ruler className="h-5 w-5 text-muted-foreground" />, view: "Measurements" as SubView },
    { label: "Muscle Progress", icon: <Users className="h-5 w-5 text-muted-foreground" />, view: "Muscles" as SubView },
    { label: "Consistency Calendar", icon: <Calendar className="h-5 w-5 text-muted-foreground" />, view: "Consistency" as SubView },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => onNavigate(link.view)}
            className="flex items-center justify-between rounded-xl bg-card border border-border p-4 transition-colors hover:bg-secondary"
          >
            <div className="flex items-center gap-4">
              {link.icon}
              <span className="font-semibold">{link.label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-card border border-border p-5">
        <h4 className="font-bold mb-2">Keep going.</h4>
        <p className="text-sm text-muted-foreground">Progress takes time, but it always shows.</p>
        <div className="mt-4 flex gap-1">
          <div className="h-8 w-2 bg-primary rounded-full" />
          <div className="h-12 w-2 bg-primary rounded-full" />
          <div className="h-6 w-2 bg-primary rounded-full" />
          <div className="h-10 w-2 bg-primary rounded-full" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-VIEW ROUTER (For "More" tab pages)
// -----------------------------------------------------------------------------
function SubViewRouter({ view, onBack, data }: { view: SubView; onBack: () => void, data: any }) {
  const renderView = () => {
    switch (view) {
      case "Records": return <RecordsView data={data} />;
      case "Volume": return <VolumeView data={data} />;
      case "Photos": return <PhotosView />;
      case "Measurements": return <BodyTab />;
      case "Muscles": return <MusclesView data={data} />;
      case "Consistency": return <ConsistencyView data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-sans animate-in slide-in-from-right-8 duration-300">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-border">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">{view === "Records" ? "Personal Records" : view === "Volume" ? "Training Volume" : view === "Photos" ? "Progress Photos" : view === "Measurements" ? "Body Measurements" : view === "Muscles" ? "Training Progress by Muscle Group" : "Consistency"}</h1>
        {view === "Records" ? <Trophy className="h-6 w-6 text-amber-500" /> : <div className="w-6" />}
      </header>
      <main className="px-5 pt-4">
        {renderView()}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// RECORDS VIEW
// -----------------------------------------------------------------------------
function RecordsView({ data }: { data: any }) {
  const prs = data.prs || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Banner */}
      <div className="mt-2 rounded-2xl bg-card border border-border p-6 text-center relative overflow-hidden">
        <Trophy className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold text-amber-500">{prs.length} New PRs!</h2>
        <p className="mt-1 text-sm text-muted-foreground">You're getting stronger this month</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {prs.length === 0 && <p className="text-center text-muted-foreground mt-4">No PRs this month yet.</p>}
        {prs.map((pr: any, i: number) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-card border border-border p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold">{pr.ex}</h3>
                <div className="text-lg font-bold">{pr.weight} kg</div>
                <div className="text-[10px] text-muted-foreground">Previous: {pr.prev} kg</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-[10px] text-muted-foreground">{format(new Date(pr.date), "MMM d, yy")}</div>
              <span className="rounded bg-primary/20 px-2 py-1 text-xs font-bold text-primary">
                +{pr.weight - pr.prev} kg
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VOLUME VIEW
// -----------------------------------------------------------------------------
function VolumeView({ data }: { data: any }) {
  const [tab, setTab] = useState<"Total" | "Muscle">("Total");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between rounded-lg bg-card border border-border p-1 mt-2">
        {(["Total Volume", "By Muscle Group"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m === "Total Volume" ? "Total" : "Muscle")}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-semibold transition-all",
              (tab === "Total" && m === "Total Volume") || (tab === "Muscle" && m === "By Muscle Group")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {tab === "Total" ? (
        <div className="mt-8">
          <h3 className="font-bold">Weekly Volume (Last 4 Weeks)</h3>
          <p className="text-xs text-muted-foreground mb-6">Total Volume (kg)</p>
          
          <div className="h-56 w-full relative glass rounded-2xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyVolumeArr} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="w" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
                  cursor={{ fill: 'var(--secondary)' }}
                />
                <Bar 
                  dataKey="val" 
                  fill="var(--primary)" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="font-bold mb-4">Volume by Muscle Group (This Month)</h3>
          <div className="flex flex-col gap-3">
            {data.muscleVolumeArr.length === 0 && <p className="text-muted-foreground">No volume recorded this month.</p>}
            {data.muscleVolumeArr.map((m: any, i: number) => {
              const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)"];
              const color = colors[i % colors.length];
              return (
                <MuscleRow key={m.name} color={color} name={m.name} weight={`${m.vol.toLocaleString()} kg`} pct={`${m.pct}%`} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MuscleRow({ color, name, weight, pct }: any) {
  return (
    <div className="flex items-center justify-between text-sm bg-card border border-border p-3 rounded-xl">
      <div className="flex items-center gap-3 w-1/3">
        <div className="h-6 w-6 rounded flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
          <Activity className="h-3 w-3 text-background" />
        </div>
        <span className="text-secondary-foreground font-semibold">{name}</span>
      </div>
      <div className="w-1/3 text-center font-bold">{weight}</div>
      <div className="w-1/4 text-right text-muted-foreground text-xs font-semibold">{pct}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PHOTOS VIEW (Empty State)
// -----------------------------------------------------------------------------
function PhotosView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="mt-12 flex flex-col items-center justify-center text-center p-6 bg-card border border-border rounded-2xl">
        <Camera className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Progress Photos</h2>
        <p className="text-sm text-muted-foreground mb-6">
          A picture is worth a thousand words. Start logging your physique changes visually.
        </p>
        <button className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 transition-colors hover:bg-primary/90">
          <Plus className="h-5 w-5" /> Add First Photo
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MUSCLES VIEW
// -----------------------------------------------------------------------------
function MusclesView({ data }: { data: any }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row gap-6 mt-6">
        <div className="flex-1 flex justify-center h-80 bg-card rounded-2xl items-center relative overflow-hidden border border-border">
          {/* Mock Anatomy Vector - in a real app this would be an SVG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <Users className="h-48 w-48 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
           {data.muscleVolumeArr.length === 0 && <p className="text-muted-foreground">No data available.</p>}
           {data.muscleVolumeArr.map((m: any, i: number) => {
              const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)"];
              const color = colors[i % colors.length];
              return (
                <MuscleProgressRow key={m.name} name={m.name} status="Active" val={`${m.pct}% vol`} color={color} />
              );
            })}
        </div>
      </div>

      <div className="mt-8 flex gap-3 text-muted-foreground text-[10px] items-start">
        <div className="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center shrink-0">i</div>
        <p>Based on your training volume this month. This is an estimate and not a medical measure.</p>
      </div>
    </div>
  );
}

function MuscleProgressRow({ name, status, val, color }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center">
          <Activity className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <div className="text-xs font-bold text-foreground">{name}</div>
          <div className="text-[10px]" style={{ color }}>{status}</div>
        </div>
      </div>
      <div className="text-xs font-bold" style={{ color }}>{val}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONSISTENCY VIEW
// -----------------------------------------------------------------------------
function ConsistencyView({ data }: { data: any }) {
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Streaks */}
      <div className="mt-2 flex gap-4 mb-8">
        <div className="flex-1 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Streak</div>
            <div className="text-lg font-bold">{overview.currentStreak} {overview.currentStreak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Longest Streak</div>
            <div className="text-lg font-bold">{overview.longestStreak} {overview.longestStreak === 1 ? 'day' : 'days'}</div>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4">{format(now, "MMMM yyyy")}</h3>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm mb-6">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground font-bold">{d}</div>
        ))}
        {/* Empty slots for start of month */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        
        {days.map(d => {
          const intensity = getIntensity(d);
          const color = getColor(intensity);
          const isRest = intensity === "Rest";
          
          return (
            <div key={d} className="flex items-center justify-center">
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-transform",
                  !isRest ? "text-primary-foreground shadow-[0_0_8px_var(--primary)]" : "text-muted-foreground border border-border"
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
      <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground font-bold mt-8 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} /> Workout Logged</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-card border border-border" /> Rest</div>
      </div>
    </div>
  );
}
