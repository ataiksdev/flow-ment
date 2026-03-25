import { useMemo } from "react";
import { format, subDays, eachDayOfInterval, isSameDay, parseISO, differenceInMinutes } from "date-fns";
import { useTimeEntries, useAllHabitLogs } from "@/hooks/useDB";

interface DayData {
  date: Date;
  dateStr: string;
  totalMinutes: number;
  habitCompleted: boolean;
}

export function StreakCalendar() {
  const allEntries = useTimeEntries(); // passing undefined gets all
  const allHabitLogs = useAllHabitLogs();

  const last30Days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return eachDayOfInterval({ start, end });
  }, []);

  const calendarData = useMemo(() => {
    if (!allEntries) return [];

    return last30Days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Calculate total minutes (TimeEntry already includes mirrored TimerSessions)
      const dayEntries = allEntries.filter(e => e.date === dateStr && e.endTime);
      const totalMinutes = dayEntries.reduce((acc, entry) => {
        try {
          const duration = differenceInMinutes(parseISO(entry.endTime), parseISO(entry.startTime));
          return acc + Math.max(0, duration);
        } catch (e) {
          return acc;
        }
      }, 0);

      const habitCompleted = allHabitLogs.some(log => log.date === dateStr);

      return {
        date,
        dateStr,
        totalMinutes,
        habitCompleted
      };
    });
  }, [allEntries, allHabitLogs, last30Days]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const sorted = [...calendarData].reverse();
    // Start checking from yesterday if today isn't done yet, or today if it is
    const today = sorted[0];
    const checkStart = (today?.totalMinutes > 0 || today?.habitCompleted) ? 0 : 1;
    
    for (let i = checkStart; i < sorted.length; i++) {
      if (sorted[i].totalMinutes > 0 || sorted[i].habitCompleted) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [calendarData]);

  const getIntensityClass = (minutes: number) => {
    if (minutes === 0) return "bg-muted/20 border-border/50";
    if (minutes < 30) return "bg-primary/20 border-primary/30";
    if (minutes < 120) return "bg-primary/40 border-primary/50";
    if (minutes < 240) return "bg-primary/70 border-primary/80";
    return "bg-primary border-primary-border shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]";
  };

  return (
    <div className="w-full bg-card border-b-2 border-border p-4 mb-2 overflow-hidden overflow-x-auto no-scrollbar">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-primary bauhaus-diamond"></span>
            Activity Streak
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none">{currentStreak}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Days</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-wider text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-muted/20 border border-border/50"></div>
              <span>Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-primary/60 border border-primary/70"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-primary border border-primary-border shadow-sm"></div>
              <span>Flow</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-accent/80 font-bold">
            <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
            <span>Habit Hit</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 min-w-max pb-2 px-0.5">
        {calendarData.map((day) => {
          const isToday = isSameDay(day.date, new Date());
          return (
            <div
              key={day.dateStr}
              className={`relative w-8 h-10 border-2 flex flex-col items-center justify-between py-1 transition-all ${getIntensityClass(day.totalMinutes)} ${isToday ? 'border-primary shadow-[0_0_0_2px_rgba(var(--primary),0.2)]' : ''}`}
            >
              <span className="text-[9px] font-bold text-foreground/50 leading-none">
                {format(day.date, "dd")}
              </span>
              
              <div className="h-2 flex items-center justify-center">
                {day.habitCompleted && (
                  <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-sm" title="Habit completed" />
                )}
              </div>
              
              {isToday && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-primary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
