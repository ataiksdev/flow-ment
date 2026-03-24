import { useState, useMemo } from "react";
import { format, subDays, parseISO, differenceInMinutes } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTimeEntries, useCategories, useHabits, useAllHabitLogs, useGoals, useAddGoal, useDeleteGoal } from "@/hooks/useDB";
import { Plus, X, Trash2, Target } from "lucide-react";
import { Drawer } from "vaul";
import clsx from "clsx";

type Period = "week" | "month";

const GOAL_COLORS = ["#C17C5B", "#6B7B5E", "#C4A35A", "#7B7B9E", "#5E7B7B", "#B5697D", "#7B6B9E", "#9E8F7B"];

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("week");
  const days = period === "week" ? 7 : 30;

  const categories = useCategories();
  const allEntries = useTimeEntries();
  const habits = useHabits();
  const habitLogs = useAllHabitLogs();
  const goals = useGoals();
  const addGoal = useAddGoal();
  const deleteGoal = useDeleteGoal();

  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalColor, setNewGoalColor] = useState(GOAL_COLORS[0]);
  const [newGoalTarget, setNewGoalTarget] = useState(120);
  const [newGoalCats, setNewGoalCats] = useState<number[]>([]);

  const dateRange = useMemo(
    () => Array.from({ length: days }).map((_, i) => format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd")),
    [days]
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const last7Days = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), i), "yyyy-MM-dd")),
    []
  );

  const chartData = useMemo(() => {
    return dateRange.map((date) => {
      const dayData: Record<string, string | number> = {
        date: format(parseISO(date), period === "week" ? "EEE" : "d"),
      };
      const dayEntries = allEntries.filter((e) => e.date === date);
      let totalMins = 0;
      categories.forEach((cat) => {
        const catMins = dayEntries
          .filter((e) => e.categoryId === cat.id)
          .reduce((sum, e) => sum + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)), 0);
        dayData[cat.name] = Number((catMins / 60).toFixed(1));
        totalMins += catMins;
      });
      dayData.totalHours = totalMins / 60;
      return dayData;
    });
  }, [dateRange, allEntries, categories, period]);

  const totalHours = chartData.reduce((sum, day) => sum + ((day.totalHours as number) || 0), 0);
  const avgDaily = totalHours / days;

  const pieData = useMemo(() => {
    return categories
      .map((cat) => {
        const hours = chartData.reduce((sum, day) => sum + ((day[cat.name] as number) || 0), 0);
        return { name: cat.name, value: hours, color: cat.color };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [chartData, categories]);

  const topCategory = pieData.length > 0 ? pieData[0].name : "—";

  const habitCompletion = useMemo(() => {
    if (habits.length === 0) return 0;
    const totalPossible = habits.length * days;
    const actualLogs = habitLogs.filter((l) => dateRange.includes(l.date)).length;
    return Math.round((actualLogs / totalPossible) * 100);
  }, [habits, habitLogs, dateRange, days]);

  // Goals progress computation
  const goalProgress = useMemo(() => {
    return goals.map((goal) => {
      const weekMins = last7Days.reduce((acc, date) => {
        const dayEntries = allEntries.filter((e) => e.date === date && goal.linkedCategoryIds.includes(e.categoryId));
        return acc + dayEntries.reduce((s, e) => s + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)), 0);
      }, 0);
      const todayMins = allEntries
        .filter((e) => e.date === todayStr && goal.linkedCategoryIds.includes(e.categoryId))
        .reduce((s, e) => s + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)), 0);
      const pct = Math.min(100, Math.round((weekMins / Math.max(1, goal.weeklyTargetMinutes)) * 100));
      const linkedCatNames = categories
        .filter((c) => goal.linkedCategoryIds.includes(c.id!))
        .map((c) => c.name);
      return { ...goal, weekMins, todayMins, pct, linkedCatNames };
    });
  }, [goals, allEntries, categories, last7Days, todayStr]);

  const saveGoal = async () => {
    if (!newGoalName.trim()) return;
    await addGoal({
      name: newGoalName.trim(),
      color: newGoalColor,
      weeklyTargetMinutes: newGoalTarget,
      linkedCategoryIds: newGoalCats,
      createdAt: new Date().toISOString(),
    });
    setNewGoalName("");
    setNewGoalCats([]);
    setGoalDrawerOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-6 pb-4 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b-2 border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-accent flex-shrink-0" />
          <h1 className="font-bold text-3xl uppercase tracking-tight">Analytics</h1>
        </div>
        <div className="flex border-2 border-border">
          {(["week", "month"] as Period[]).map((p, i) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx("px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
                i === 0 && "border-r border-border",
                period === p ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted")}>
              {p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-[2px] mb-8 bg-border border-2 border-border">
        {[
          { label: "Total Hours", value: `${Math.round(totalHours)}`, unit: "h" },
          { label: "Daily Avg", value: avgDaily.toFixed(1), unit: "h/d" },
          { label: "Top Focus", value: topCategory, unit: "" },
          { label: "Habit Score", value: `${habitCompletion}`, unit: "%" },
        ].map((card) => (
          <div key={card.label} className="bg-card p-4 flex flex-col gap-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{card.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground leading-none truncate">{card.value}</span>
              {card.unit && <span className="text-xs font-bold text-muted-foreground">{card.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Goals / OKRs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bauhaus-section-rule">
            Goals & OKRs
          </h2>
          <button
            onClick={() => setGoalDrawerOpen(true)}
            className="w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 border border-primary"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="border-2 border-dashed border-border p-5 text-center">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">No goals yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Tap + to add your first OKR</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goalProgress.map((goal) => (
              <div key={goal.id} className="bg-card border-2 border-border p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: goal.color }} />
                      <span className="font-bold text-sm uppercase tracking-wide truncate">{goal.name}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-mono ml-4">
                      {goal.linkedCatNames.join(" · ") || "No categories linked"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-lg font-bold font-mono" style={{ color: goal.color }}>
                      {goal.pct}%
                    </span>
                    <button onClick={() => deleteGoal(goal.id!)} className="w-6 h-6 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-muted border border-border overflow-hidden mb-1.5">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${goal.pct}%`, backgroundColor: goal.color }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-mono text-muted-foreground">
                    {Math.round(goal.weekMins)}m / {goal.weeklyTargetMinutes}m this week
                  </p>
                  {goal.todayMins > 0 && (
                    <p className="text-[9px] font-bold" style={{ color: goal.color }}>
                      +{goal.todayMins}m today
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
          Time Distribution
        </h2>
        <div className="bg-card border-2 border-border p-4 pt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ border: "2px solid hsl(var(--border))", borderRadius: 0, fontSize: 11, fontWeight: 700 }} />
              {categories.map((cat) => (
                <Bar key={cat.id} dataKey={cat.name} stackId="a" fill={cat.color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
          Focus Areas
        </h2>
        <div className="bg-card border-2 border-border p-4 flex items-center h-52">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            {pieData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[80px]">{cat.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{Math.round(cat.value)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Goal Drawer */}
      <Drawer.Root open={goalDrawerOpen} onOpenChange={setGoalDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col mt-4 fixed bottom-0 left-0 right-0 z-50 pb-8 px-5 pt-4 border-t-2 border-border max-h-[85vh] overflow-y-auto">
            <div className="mx-auto w-12 h-0.5 bg-muted-foreground/30 mb-5" />
            <h2 className="text-xl font-bold uppercase tracking-tight mb-5">New Goal / OKR</h2>

            <input type="text" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)}
              placeholder="Goal name (e.g. Build SaaS)"
              className="w-full bg-background border-2 border-border px-4 py-3 text-base font-bold focus:outline-none focus:border-primary mb-4 uppercase tracking-wide placeholder:text-muted-foreground/40 placeholder:normal-case" />

            {/* Colour */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {GOAL_COLORS.map((c) => (
                <button key={c} onClick={() => setNewGoalColor(c)}
                  className={`w-8 h-8 flex items-center justify-center ${newGoalColor === c ? "outline outline-2 outline-offset-2 outline-foreground/40 scale-110" : ""}`}
                  style={{ backgroundColor: c }}>
                  {newGoalColor === c && <X className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>

            {/* Weekly target */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Weekly Target</label>
              <input type="number" value={newGoalTarget} min={30} max={2400} step={30}
                onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                className="w-20 bg-background border-2 border-border px-2 py-2 text-sm font-mono font-bold focus:outline-none text-center" />
              <span className="text-[10px] text-muted-foreground font-bold">min / week</span>
            </div>

            {/* Linked categories */}
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
              Linked Categories
            </label>
            <div className="flex gap-2 flex-wrap mb-5">
              {categories.map((cat) => {
                const isLinked = newGoalCats.includes(cat.id!);
                return (
                  <button key={cat.id} onClick={() => setNewGoalCats(
                    isLinked ? newGoalCats.filter((id) => id !== cat.id) : [...newGoalCats, cat.id!]
                  )}
                    className={clsx("flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-all",
                      isLinked ? "border-transparent text-white" : "border-border bg-background text-foreground hover:bg-muted")}
                    style={isLinked ? { backgroundColor: cat.color } : {}}>
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <button onClick={saveGoal} disabled={!newGoalName.trim()}
              className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 transition-all border-2 border-primary uppercase tracking-wider">
              Save Goal
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
