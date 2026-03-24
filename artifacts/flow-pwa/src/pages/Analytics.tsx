import { useState, useMemo } from "react";
import { format, subDays, parseISO, differenceInMinutes } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTimeEntries, useCategories, useHabits, useAllHabitLogs } from "@/hooks/useDB";
import clsx from "clsx";

type Period = "week" | "month";

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("week");
  const days = period === "week" ? 7 : 30;

  const categories = useCategories();
  const allEntries = useTimeEntries();
  const habits = useHabits();
  const habitLogs = useAllHabitLogs();

  const dateRange = useMemo(() => {
    return Array.from({ length: days }).map((_, i) =>
      format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd")
    );
  }, [days]);

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
          .reduce(
            (sum, e) =>
              sum + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)),
            0
          );
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

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-8 pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b-2 border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-accent flex-shrink-0" />
          <h1 className="font-bold text-3xl uppercase tracking-tight">Analytics</h1>
        </div>

        {/* Bauhaus square toggle */}
        <div className="flex border-2 border-border">
          <button
            onClick={() => setPeriod("week")}
            className={clsx(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-r border-border",
              period === "week"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={clsx(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              period === "month"
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            Month
          </button>
        </div>
      </div>

      {/* Summary Cards — Bauhaus sharp grid */}
      <div className="grid grid-cols-2 gap-[2px] mb-8 bg-border border-2 border-border">
        {[
          { label: "Total Hours", value: `${Math.round(totalHours)}`, unit: "h", accent: "primary" },
          { label: "Daily Avg", value: avgDaily.toFixed(1), unit: "h/d", accent: "secondary" },
          { label: "Top Focus", value: topCategory, unit: "", accent: "accent" },
          { label: "Habit Score", value: `${habitCompletion}`, unit: "%", accent: "primary" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-card p-4 flex flex-col gap-1"
          >
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {card.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground leading-none truncate">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-xs font-bold text-muted-foreground">{card.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
          Time Distribution
        </h2>
        <div className="bg-card border-2 border-border p-4 pt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700, fontFamily: "Space Grotesk" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700, fontFamily: "Space Mono" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  border: "2px solid hsl(var(--border))",
                  borderRadius: 0,
                  boxShadow: "3px 3px 0px hsl(var(--foreground)/0.1)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "Space Grotesk",
                }}
              />
              {categories.map((cat) => (
                <Bar key={cat.id} dataKey={cat.name} stackId="a" fill={cat.color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Focus Areas — Pie + Legend */}
      <div className="mb-8">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
          Focus Areas
        </h2>
        <div className="bg-card border-2 border-border p-4 flex items-center h-52">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 flex flex-col gap-2 max-h-full overflow-y-auto pr-1">
            {pieData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Square swatch */}
                  <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[80px]">
                    {cat.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground">
                  {Math.round(cat.value)}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
