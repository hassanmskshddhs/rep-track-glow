import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, Flame, Trophy, ChevronRight, Activity, Calendar, Camera, Ruler, Users, Settings } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

  if (loading) return <div className="p-10 text-center text-[#9CA3AF]">Loading…</div>;
  if (!user) return <AuthScreen />;

  // Render Sub-Views (if navigated from "More" tab)
  if (activeView !== "Main") {
    return <SubViewRouter view={activeView} onBack={() => setActiveView("Main")} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-foreground pb-24 font-sans">
      <header className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Iron Log</span>
          </div>
          <Calendar className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-[#9CA3AF]">Track your journey. See your results.</p>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center justify-between rounded-full bg-[#1A1C23] p-1">
          {(["Overview", "Strength", "Body", "More"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition-all",
                activeTab === tab
                  ? "bg-[#22C55E] text-primary-foreground shadow-sm"
                  : "text-[#9CA3AF] hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5">
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "Strength" && <StrengthTab />}
        {activeTab === "Body" && <BodyTab />}
        {activeTab === "More" && <MoreTab onNavigate={setActiveView} />}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// OVERVIEW TAB
// -----------------------------------------------------------------------------
function OverviewTab() {
  const currentMonthStart = format(new Date(), "MMM 1");
  const currentMonthEnd = format(new Date(), "MMM 31");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#22C55E]">This Month</h2>
        <span className="text-xs font-semibold text-[#9CA3AF] uppercase">
          {currentMonthStart} - {currentMonthEnd}
        </span>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={<Dumbbell className="h-5 w-5 text-[#22C55E]" />}
          value="18"
          label="Workouts"
          change="+ 3 vs last month"
          positive={true}
        />
        <MetricCard
          value="245,600 kg"
          label="Total Volume"
          change="↑ 12% vs last month"
          positive={true}
        />
        <MetricCard
          icon={<Trophy className="h-5 w-5 text-[#F59E0B]" />}
          value="7"
          label="New PRs"
          change="↑ 3 vs last month"
          positive={true}
        />
        <MetricCard
          icon={<Activity className="h-5 w-5 text-[#22C55E]" />}
          value="85%"
          label="Consistency"
          change="↑ 10% vs last month"
          positive={true}
        />
      </div>

      {/* Streaks */}
      <div className="mt-4 flex gap-4">
        <div className="flex-1 rounded-2xl bg-[#1A1C23] p-4 flex items-center gap-3">
          <Flame className="h-8 w-8 text-[#F97316]" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Current Streak</div>
            <div className="text-lg font-bold">5 days</div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-[#1A1C23] p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-[#F59E0B]" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Longest Streak</div>
            <div className="text-lg font-bold">14 days</div>
          </div>
        </div>
      </div>

      {/* Motivation Banner */}
      <div className="mt-4 relative overflow-hidden rounded-2xl bg-[#13151A] p-6 text-center border border-[#1A1C23]">
        <div className="relative z-10">
          <p className="text-sm font-semibold italic text-[#D1D5DB]">
            "Small steps every day<br/>lead to big results."
          </p>
        </div>
        {/* Placeholder for mountain graphic */}
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20" style={{ background: "linear-gradient(to top, #22C55E, transparent)" }} />
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label, change, positive }: any) {
  return (
    <div className="rounded-2xl bg-[#1A1C23] p-4 flex flex-col justify-between h-32">
      <div className="flex items-start justify-between">
        {icon || <div className="h-5 w-5" />}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
        <div className={cn("text-[10px] font-bold", positive ? "text-[#22C55E]" : "text-[#EF4444]")}>
          {change}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STRENGTH TAB
// -----------------------------------------------------------------------------
function StrengthTab() {
  const [metric, setMetric] = useState<"Weight" | "Estimated 1RM" | "Volume">("Weight");
  
  // Mock chart data
  const data = [
    { date: "Aug 1", val: 55 },
    { date: "Aug 8", val: 58 },
    { date: "Aug 15", val: 62 },
    { date: "Aug 22", val: 70 },
    { date: "Aug 29", val: 75 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Exercise Selector */}
      <div className="flex items-center justify-between rounded-xl bg-[#1A1C23] p-3 px-4">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-5 w-5 text-[#9CA3AF]" />
          <span className="font-semibold">Bench Press</span>
        </div>
        <ChevronRight className="h-5 w-5 text-[#9CA3AF] rotate-90" />
      </div>

      {/* Metric Tabs */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-[#1A1C23] p-1">
        {(["Weight", "Estimated 1RM", "Volume"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold transition-all",
              metric === m ? "bg-[#22C55E] text-primary-foreground" : "text-[#9CA3AF]"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6">
        <div className="mb-2">
          <h3 className="font-bold">Bench Press</h3>
          <p className="text-xs text-[#9CA3AF]">Weight (kg)</p>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--card)", border: "none", borderRadius: "8px", color: "var(--foreground)" }}
                itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
              />
              <Line 
                type="monotone" 
                dataKey="val" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: "var(--foreground)", stroke: "var(--primary)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sets */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Recent Sets</h3>
          <span className="text-xs text-[#9CA3AF]">View all {'>'}</span>
        </div>
        <div className="flex flex-col gap-3">
          <SetRow date="Aug 28, 2026" weight="75 kg" reps="8" isPR={true} />
          <SetRow date="Aug 24, 2026" weight="72.5 kg" reps="8" />
          <SetRow date="Aug 20, 2026" weight="70 kg" reps="8" />
          <SetRow date="Aug 16, 2026" weight="67.5 kg" reps="8" />
        </div>
      </div>
    </div>
  );
}

function SetRow({ date, weight, reps, isPR }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#1A1C23] p-3 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2D35]">
          <span className="text-[#9CA3AF] text-xs font-bold">{'>'}</span>
        </div>
        <div>
          <div className="text-[10px] text-[#9CA3AF]">{date}</div>
          <div className="text-sm font-bold">{weight} x {reps} reps</div>
        </div>
      </div>
      {isPR && (
        <span className="rounded bg-[#22C55E] px-2 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
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
  const data = [
    { date: "Aug 1", val: 60 },
    { date: "Aug 8", val: 60.5 },
    { date: "Aug 15", val: 61 },
    { date: "Aug 22", val: 61.5 },
    { date: "Aug 29", val: 62 },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Body Weight</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold">60 kg</span>
            <ArrowLeft className="h-4 w-4 text-[#9CA3AF]" />
            <span className="text-2xl font-bold">62 kg</span>
          </div>
        </div>
        <span className="font-bold text-[#22C55E]">+2 kg</span>
      </div>

      {/* Chart */}
      <div className="mt-6 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip 
              contentStyle={{ backgroundColor: "var(--card)", border: "none", borderRadius: "8px", color: "var(--foreground)" }}
            />
            <Line 
              type="monotone" 
              dataKey="val" 
              stroke="var(--primary)" 
              strokeWidth={3} 
              dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Measurements List */}
      <div className="mt-8">
        <h3 className="font-bold mb-4">Measurements</h3>
        <div className="flex flex-col gap-3">
          <MeasurementRow icon={<Activity />} label="Body Fat %" oldVal="10.5%" newVal="10.2%" change="-0.3%" pos={true} />
          <MeasurementRow icon={<Users />} label="Chest" oldVal="88 cm" newVal="90 cm" change="+2 cm" pos={true} />
          <MeasurementRow icon={<Dumbbell />} label="Arms" oldVal="30 cm" newVal="31.5 cm" change="+1.5 cm" pos={true} />
          <MeasurementRow icon={<Ruler />} label="Waist" oldVal="72 cm" newVal="71 cm" change="-1 cm" pos={true} />
          <MeasurementRow icon={<Activity />} label="Thigh" oldVal="52 cm" newVal="53.5 cm" change="+1.5 cm" pos={true} />
        </div>
      </div>

      <button className="mt-6 w-full rounded-full border border-[#22C55E] text-[#22C55E] font-bold py-3 flex items-center justify-center gap-2 transition-colors hover:bg-[#22C55E]/10">
        <span className="text-lg">+</span> Log New Measurement
      </button>
    </div>
  );
}

function MeasurementRow({ icon, label, oldVal, newVal, change, pos }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3 w-1/3">
        <div className="text-[#9CA3AF] h-4 w-4">{icon}</div>
        <span className="text-[#D1D5DB]">{label}</span>
      </div>
      <div className="flex items-center gap-2 w-1/3 justify-center text-[#9CA3AF]">
        <span>{oldVal}</span>
        <ArrowLeft className="h-3 w-3" />
        <span className="text-foreground">{newVal}</span>
      </div>
      <div className={cn("w-1/4 text-right font-bold", pos ? "text-[#22C55E]" : "text-[#EF4444]")}>
        {change}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MORE TAB (Navigation to Sub-views)
// -----------------------------------------------------------------------------
function MoreTab({ onNavigate }: { onNavigate: (v: SubView) => void }) {
  const links = [
    { label: "Personal Records", icon: <Trophy className="h-5 w-5 text-[#9CA3AF]" />, view: "Records" as SubView },
    { label: "Training Volume", icon: <Activity className="h-5 w-5 text-[#9CA3AF]" />, view: "Volume" as SubView },
    { label: "Progress Photos", icon: <Camera className="h-5 w-5 text-[#9CA3AF]" />, view: "Photos" as SubView },
    { label: "Body Measurements", icon: <Ruler className="h-5 w-5 text-[#9CA3AF]" />, view: "Measurements" as SubView },
    { label: "Muscle Progress", icon: <Users className="h-5 w-5 text-[#9CA3AF]" />, view: "Muscles" as SubView },
    { label: "Consistency Calendar", icon: <Calendar className="h-5 w-5 text-[#9CA3AF]" />, view: "Consistency" as SubView },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => onNavigate(link.view)}
            className="flex items-center justify-between rounded-xl bg-[#1A1C23] p-4 transition-colors hover:bg-[#2A2D35]"
          >
            <div className="flex items-center gap-4">
              {link.icon}
              <span className="font-semibold">{link.label}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl bg-[#1A1C23] p-5">
        <h4 className="font-bold mb-2">Keep going.</h4>
        <p className="text-sm text-[#9CA3AF]">Progress takes time, but it always shows.</p>
        <div className="mt-4 flex gap-1">
          <div className="h-8 w-2 bg-[#22C55E] rounded-full" />
          <div className="h-12 w-2 bg-[#22C55E] rounded-full" />
          <div className="h-6 w-2 bg-[#22C55E] rounded-full" />
          <div className="h-10 w-2 bg-[#22C55E] rounded-full" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-VIEW ROUTER (For "More" tab pages)
// -----------------------------------------------------------------------------
function SubViewRouter({ view, onBack }: { view: SubView; onBack: () => void }) {
  const renderView = () => {
    switch (view) {
      case "Records": return <RecordsView />;
      case "Volume": return <VolumeView />;
      case "Photos": return <PhotosView />;
      case "Measurements": return <MeasurementsView />;
      case "Muscles": return <MusclesView />;
      case "Consistency": return <ConsistencyView />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-foreground pb-24 font-sans animate-in slide-in-from-right-8 duration-300">
      <header className="px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 bg-[#0B0C10]/90 backdrop-blur-md z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">{view === "Records" ? "Personal Records" : view === "Volume" ? "Training Volume" : view === "Photos" ? "Progress Photos" : view === "Measurements" ? "Body Measurements" : view === "Muscles" ? "Training Progress by Muscle Group" : "Consistency"}</h1>
        {view === "Records" ? <Trophy className="h-6 w-6 text-[#F59E0B]" /> : <div className="w-6" />}
      </header>
      <main className="px-5">
        {renderView()}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PHOTOS VIEW
// -----------------------------------------------------------------------------
function PhotosView() {
  const [angle, setAngle] = useState("Front");
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between rounded-lg bg-[#1A1C23] p-1 mt-2 mb-6">
        {(["Front", "Side", "Back"]).map((m) => (
          <button
            key={m}
            onClick={() => setAngle(m)}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-semibold transition-all",
              angle === m ? "bg-[#22C55E] text-primary-foreground" : "text-[#9CA3AF]"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl bg-[#1A1C23] h-96 overflow-hidden border border-[#27272A] flex items-center justify-center">
        {/* Placeholder for before/after slider */}
        <div className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-[#22C55E] flex items-end p-4 bg-[#2A2D35]/50">
          <div>
            <div className="text-xs font-bold bg-background/80 px-2 py-1 rounded">Aug 1, 2026</div>
            <div className="text-[10px] bg-background/80 px-2 py-1 mt-1 rounded inline-block">60 kg</div>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 flex items-end justify-end p-4 bg-[#1A1C23]/50 text-right">
          <div>
            <div className="text-xs font-bold bg-background/80 px-2 py-1 rounded">Aug 29, 2026</div>
            <div className="text-[10px] bg-background/80 px-2 py-1 mt-1 rounded inline-block">62 kg</div>
          </div>
        </div>
        {/* Slider Handle Mock */}
        <div className="absolute inset-y-0 left-1/2 -ml-3 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full bg-[#22C55E] flex items-center justify-center border-2 border-white text-primary-foreground font-bold text-[8px] z-10 shadow-lg">
            {'<>'}
          </div>
        </div>
      </div>

      <button className="mt-6 w-full rounded-full border border-[#22C55E] text-[#22C55E] font-bold py-3 flex items-center justify-center gap-2 transition-colors hover:bg-[#22C55E]/10">
        <Camera className="h-5 w-5" /> Add New Progress Photo
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MEASUREMENTS VIEW
// -----------------------------------------------------------------------------
function MeasurementsView() {
  return <BodyTab />; // Reuse the BodyTab since it's identical to the measurements view
}

// -----------------------------------------------------------------------------
// MUSCLES VIEW
// -----------------------------------------------------------------------------
function MusclesView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row gap-6 mt-6">
        <div className="flex-1 flex justify-center h-80 bg-[#1A1C23] rounded-2xl items-center relative overflow-hidden border border-[#27272A]">
          {/* Mock Anatomy Vector - in a real app this would be an SVG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <Users className="h-48 w-48 text-[#22C55E]" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
          <MuscleProgressRow name="Chest" status="Excellent" val="+18%" color="var(--primary)" />
          <MuscleProgressRow name="Back" status="Good" val="+14%" color="var(--primary)" />
          <MuscleProgressRow name="Shoulders" status="Moderate" val="+7%" color="#EAB308" />
          <MuscleProgressRow name="Arms" status="Moderate" val="+6%" color="#F59E0B" />
          <MuscleProgressRow name="Legs" status="Good" val="+12%" color="var(--primary)" />
        </div>
      </div>

      <div className="mt-8 flex gap-3 text-[#9CA3AF] text-[10px] items-start">
        <div className="h-4 w-4 rounded-full border border-[#9CA3AF] flex items-center justify-center shrink-0">i</div>
        <p>Based on your training volume, exercise selection, and PRs. This is an estimate and not a medical measure.</p>
      </div>
    </div>
  );
}

function MuscleProgressRow({ name, status, val, color }: any) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#1A1C23] p-3 border border-[#27272A]">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-[#2A2D35] flex items-center justify-center">
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
function ConsistencyView() {
  // Generate a mock month grid
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const getIntensity = (d: number) => {
    if ([4, 11, 12, 13, 14, 25].includes(d)) return "High";
    if ([10, 17, 24, 26, 27].includes(d)) return "Medium";
    if ([18, 20, 21, 28, 31].includes(d)) return "Light";
    return "Rest";
  };

  const getColor = (i: string) => {
    if (i === "High") return "var(--primary)";
    if (i === "Medium") return "#16A34A";
    if (i === "Light") return "#15803D";
    return "var(--card)";
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Streaks */}
      <div className="mt-2 flex gap-4 mb-8">
        <div className="flex-1 rounded-2xl bg-[#1A1C23] border border-[#27272A] p-4 flex items-center gap-3">
          <Flame className="h-8 w-8 text-[#F97316]" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Current Streak</div>
            <div className="text-lg font-bold">5 days</div>
          </div>
        </div>
        <div className="flex-1 rounded-2xl bg-[#1A1C23] border border-[#27272A] p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-[#F59E0B]" fill="currentColor" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Longest Streak</div>
            <div className="text-lg font-bold">14 days</div>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4">August 2026</h3>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm mb-6">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-[10px] text-[#9CA3AF] font-bold">{d}</div>
        ))}
        {/* Empty slots for start of month (e.g. 6 days) */}
        {Array.from({ length: 6 }).map((_, i) => <div key={`e-${i}`} />)}
        
        {days.map(d => {
          const intensity = getIntensity(d);
          const color = getColor(intensity);
          const isRest = intensity === "Rest";
          
          return (
            <div key={d} className="flex items-center justify-center">
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-110",
                  !isRest ? "text-primary-foreground shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "text-[#9CA3AF] border border-[#27272A]"
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
      <div className="flex items-center justify-center gap-4 text-[9px] text-[#9CA3AF] font-bold mt-8 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#22C55E]" /> Workout (High)</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#16A34A]" /> Workout (Medium)</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#15803D]" /> Workout (Light)</div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#1A1C23] border border-[#27272A]" /> Rest</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// RECORDS VIEW
// -----------------------------------------------------------------------------
function RecordsView() {
  const prs = [
    { ex: "Bench Press", date: "Aug 28, 2026", weight: "80 kg", prev: "75 kg", diff: "+5 kg" },
    { ex: "Squat", date: "Aug 24, 2026", weight: "110 kg", prev: "100 kg", diff: "+10 kg" },
    { ex: "Pull Up", date: "Aug 20, 2026", weight: "+20 kg", prev: "+15 kg", diff: "+5 kg" },
    { ex: "Deadlift", date: "Aug 15, 2026", weight: "140 kg", prev: "130 kg", diff: "+10 kg" },
    { ex: "Shoulder Press", date: "Aug 10, 2026", weight: "60 kg", prev: "55 kg", diff: "+5 kg" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Banner */}
      <div className="mt-2 rounded-2xl bg-[#13151A] border border-[#1A1C23] p-6 text-center relative overflow-hidden">
        <Trophy className="mx-auto h-12 w-12 text-[#F59E0B] mb-3" />
        <h2 className="text-xl font-bold text-[#F59E0B]">New PR!</h2>
        <p className="mt-1 text-sm text-[#9CA3AF]">You're getting stronger</p>
        <div className="absolute top-4 right-4 text-[#9CA3AF]"><ArrowLeft className="h-4 w-4 rotate-45" /></div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {prs.map((pr) => (
          <div key={pr.ex} className="flex items-center justify-between rounded-xl bg-[#1A1C23] p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2A2D35]">
                <Dumbbell className="h-6 w-6 text-[#9CA3AF]" />
              </div>
              <div>
                <h3 className="font-bold">{pr.ex}</h3>
                <div className="text-lg font-bold">{pr.weight}</div>
                <div className="text-[10px] text-[#9CA3AF]">Previous: {pr.prev}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-[10px] text-[#9CA3AF]">{pr.date}</div>
              <span className="rounded bg-[#22C55E]/10 px-2 py-1 text-xs font-bold text-[#22C55E]">
                {pr.diff}
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
function VolumeView() {
  const [tab, setTab] = useState<"Total" | "Muscle">("Total");

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between rounded-lg bg-[#1A1C23] p-1 mt-2">
        {(["Total Volume", "By Muscle Group"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTab(m === "Total Volume" ? "Total" : "Muscle")}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-semibold transition-all",
              (tab === "Total" && m === "Total Volume") || (tab === "Muscle" && m === "By Muscle Group")
                ? "bg-[#22C55E] text-primary-foreground"
                : "text-[#9CA3AF]"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {tab === "Total" ? (
        <div className="mt-8">
          <h3 className="font-bold">Weekly Volume</h3>
          <p className="text-xs text-[#9CA3AF] mb-6">Total Volume (kg)</p>
          
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { w: "W1", label: "Aug 1-7", val: 25000 },
                { w: "W2", label: "Aug 8-14", val: 26500 },
                { w: "W3", label: "Aug 15-21", val: 32000 },
                { w: "W4", label: "Aug 22-28", val: 36200 },
              ]} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="w" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}K`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "var(--card)", border: "none", borderRadius: "8px", color: "var(--foreground)" }}
                  cursor={{ fill: '#2A2D35' }}
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
          <h3 className="font-bold mb-4">Volume by Muscle Group</h3>
          <div className="flex flex-col gap-3">
            <MuscleRow color="#EF4444" name="Chest" weight="12,500 kg" pct="16%" />
            <MuscleRow color="#3B82F6" name="Back" weight="18,000 kg" pct="23%" />
            <MuscleRow color="#F59E0B" name="Legs" weight="25,000 kg" pct="32%" />
            <MuscleRow color="#EAB308" name="Shoulders" weight="8,000 kg" pct="10%" />
            <MuscleRow color="#F97316" name="Arms" weight="7,100 kg" pct="9%" />
            <MuscleRow color="var(--muted-foreground)" name="Others" weight="5,900 kg" pct="8%" />
          </div>
        </div>
      )}
    </div>
  );
}

function MuscleRow({ color, name, weight, pct }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3 w-1/3">
        <div className="h-6 w-6 rounded flex items-center justify-center text-xs" style={{ backgroundColor: color }}>
          <Activity className="h-3 w-3 text-foreground" />
        </div>
        <span className="text-[#D1D5DB] font-semibold">{name}</span>
      </div>
      <div className="w-1/3 text-center font-bold">{weight}</div>
      <div className="w-1/4 text-right text-[#9CA3AF] text-xs font-semibold">{pct}</div>
    </div>
  );
}
