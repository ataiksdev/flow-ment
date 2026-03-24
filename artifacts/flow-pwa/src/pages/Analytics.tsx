import { useState, useMemo } from "react";
import { format, subDays, parseISO, differenceInMinutes } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useTimeEntries, useCategories, useHabits, useAllHabitLogs } from "@/hooks/useDB";
import clsx from "clsx";

type Period = 'week' | 'month';

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('week');
  const days = period === 'week' ? 7 : 30;
  
  const categories = useCategories();
  const allEntries = useTimeEntries(); // Gets all for the period filtering
  const habits = useHabits();
  const habitLogs = useAllHabitLogs();

  // Generate date range
  const dateRange = useMemo(() => {
    return Array.from({ length: days }).map((_, i) => format(subDays(new Date(), (days - 1) - i), "yyyy-MM-dd"));
  }, [days]);

  // Aggregate Data for Bar Chart
  const chartData = useMemo(() => {
    return dateRange.map(date => {
      const dayData: any = { date: format(parseISO(date), period === 'week' ? 'EEE' : 'd') };
      
      const dayEntries = allEntries.filter(e => e.date === date);
      let totalMins = 0;
      
      categories.forEach(cat => {
        const catMins = dayEntries
          .filter(e => e.categoryId === cat.id)
          .reduce((sum, e) => sum + differenceInMinutes(parseISO(e.endTime), parseISO(e.startTime)), 0);
        dayData[cat.name] = Number((catMins / 60).toFixed(1));
        totalMins += catMins;
      });
      dayData.totalHours = totalMins / 60;
      return dayData;
    });
  }, [dateRange, allEntries, categories, period]);

  // Total Summary
  const totalHours = chartData.reduce((sum, day) => sum + (day.totalHours || 0), 0);
  const avgDaily = totalHours / days;

  // Pie Chart Data
  const pieData = useMemo(() => {
    return categories.map(cat => {
      const hours = chartData.reduce((sum, day) => sum + (day[cat.name] || 0), 0);
      return { name: cat.name, value: hours, color: cat.color };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  }, [chartData, categories]);

  const topCategory = pieData.length > 0 ? pieData[0].name : "N/A";

  // Habit Completion %
  const habitCompletion = useMemo(() => {
    if (habits.length === 0) return 0;
    const totalPossible = habits.length * days;
    const actualLogs = habitLogs.filter(l => dateRange.includes(l.date)).length;
    return Math.round((actualLogs / totalPossible) * 100);
  }, [habits, habitLogs, dateRange, days]);

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-10 pb-24 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-bold text-3xl">Analytics</h1>
        <div className="bg-muted p-1 rounded-lg flex gap-1">
          <button 
            onClick={() => setPeriod('week')}
            className={clsx("px-3 py-1 rounded-md text-xs font-bold transition-all", period === 'week' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
          >
            Week
          </button>
          <button 
            onClick={() => setPeriod('month')}
            className={clsx("px-3 py-1 rounded-md text-xs font-bold transition-all", period === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
          >
            Month
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Total Hours</span>
          <span className="text-2xl font-serif font-bold text-foreground">{Math.round(totalHours)}<span className="text-sm font-sans text-muted-foreground ml-1">h</span></span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Daily Avg</span>
          <span className="text-2xl font-serif font-bold text-foreground">{avgDaily.toFixed(1)}<span className="text-sm font-sans text-muted-foreground ml-1">h/d</span></span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Top Focus</span>
          <span className="text-lg font-bold text-foreground leading-tight line-clamp-1 mt-1">{topCategory}</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Habit Success</span>
          <span className="text-2xl font-serif font-bold text-primary">{habitCompletion}<span className="text-sm font-sans ml-1">%</span></span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Time Distribution</h2>
        <div className="bg-card border border-border rounded-2xl p-4 pt-6 shadow-sm h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              {categories.map(cat => (
                <Bar key={cat.id} dataKey={cat.name} stackId="a" fill={cat.color} radius={[0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown (Pie) */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Focus Areas</h2>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center h-48">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
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
          <div className="flex-1 flex flex-col gap-2 max-h-full overflow-y-auto pr-2">
            {pieData.map(cat => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-semibold truncate max-w-[80px]">{cat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{Math.round(cat.value)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
