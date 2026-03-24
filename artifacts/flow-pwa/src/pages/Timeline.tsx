import { useState, useRef, useEffect } from "react";
import { format, addDays, subDays, parseISO, differenceInMinutes } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTimeEntries, useCategories, useSettings } from "@/hooks/useDB";
import { EditEntryDrawer } from "@/components/EditEntryDrawer";
import type { TimeEntry } from "@/lib/db";

const HOUR_HEIGHT = 60; // px per hour

export default function Timeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const dateStr = format(currentDate, "yyyy-MM-dd");
  
  const entries = useTimeEntries(dateStr);
  const categories = useCategories();
  const settings = useSettings();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current time on mount if looking at today
  useEffect(() => {
    if (format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const top = (minutes / 60) * HOUR_HEIGHT;
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: top - 150, behavior: 'smooth' });
        }
      }, 300);
    }
  }, [currentDate]);

  const navigateDay = (direction: number) => {
    setCurrentDate(prev => direction > 0 ? addDays(prev, 1) : subDays(prev, 1));
  };

  // Calculate Now line position
  const now = new Date();
  const isToday = dateStr === format(now, "yyyy-MM-dd");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;

  // Calculate day summary percentages
  const wakeStartStr = settings.wakeStart || "07:00";
  const wakeEndStr = settings.wakeEnd || "23:00";
  const startH = parseInt(wakeStartStr.split(':')[0]);
  const endH = parseInt(wakeEndStr.split(':')[0]);
  const activeHours = Math.max(1, endH - startH);
  const activeMinutes = activeHours * 60;

  const categoryTotals = categories.map(cat => {
    const catEntries = entries.filter(e => e.categoryId === cat.id);
    const mins = catEntries.reduce((acc, entry) => {
      const duration = differenceInMinutes(parseISO(entry.endTime), parseISO(entry.startTime));
      return acc + duration;
    }, 0);
    return { ...cat, minutes: mins, percentage: Math.min(100, (mins / activeMinutes) * 100) };
  }).filter(c => c.minutes > 0).sort((a,b) => b.minutes - a.minutes);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigateDay(-1)} className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-serif font-bold text-lg">
            {format(currentDate, "EEEE")}
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            {format(currentDate, "MMM d")}
          </p>
        </div>
        <button onClick={() => navigateDay(1)} className="p-2 hover:bg-muted rounded-full">
          <ChevronRight className="w-5 h-5" />
        </button>
      </header>

      {/* Timeline Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative py-4">
        <div className="relative pl-16 pr-4" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour grid lines */}
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="absolute left-0 right-4 border-t border-border flex items-center" style={{ top: i * HOUR_HEIGHT }}>
              <span className="absolute -left-14 w-12 text-right text-[10px] font-mono font-medium text-muted-foreground -translate-y-1/2">
                {format(new Date().setHours(i, 0, 0, 0), "HH:mm")}
              </span>
            </div>
          ))}

          {/* Time Entries */}
          {entries.map((entry) => {
            const start = parseISO(entry.startTime);
            const end = parseISO(entry.endTime);
            const startMins = start.getHours() * 60 + start.getMinutes();
            const duration = differenceInMinutes(end, start);
            const top = (startMins / 60) * HOUR_HEIGHT;
            const height = (duration / 60) * HOUR_HEIGHT;
            const cat = categories.find(c => c.id === entry.categoryId);

            return (
              <div 
                key={entry.id}
                onClick={() => setEditingEntry(entry)}
                className="absolute left-16 right-4 rounded-lg overflow-hidden border border-black/5 hover:brightness-95 active:scale-95 transition-all shadow-sm group cursor-pointer"
                style={{
                  top: `${top}px`,
                  height: `${Math.max(height, 20)}px`, // min height for visibility
                  backgroundColor: cat?.color || '#ccc',
                  opacity: 0.9
                }}
              >
                <div className="px-3 py-1.5 h-full flex flex-col justify-start">
                  <div className="text-white text-xs font-bold truncate tracking-wide mix-blend-overlay">
                    {entry.description || cat?.name}
                  </div>
                  {height > 30 && (
                    <div className="text-white/70 text-[10px] font-mono mt-0.5 mix-blend-overlay">
                      {format(start, "HH:mm")} - {format(end, "HH:mm")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* "Now" Line */}
          {isToday && (
            <div 
              className="absolute left-16 right-4 border-t-2 border-destructive z-20 pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-destructive shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Edit Entry Drawer */}
      <EditEntryDrawer entry={editingEntry} onClose={() => setEditingEntry(null)} />

      {/* Footer Day Summary */}
      <div className="sticky bottom-0 z-30 bg-card border-t border-border p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Day Summary</span>
          <span className="text-[10px] font-mono text-muted-foreground">{activeHours}h active</span>
        </div>
        {/* Progress Bar */}
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
          {categoryTotals.map(cat => (
            <div 
              key={cat.id} 
              className="h-full transition-all duration-500" 
              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} 
              title={`${cat.name}: ${Math.round(cat.percentage)}%`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="flex gap-3 mt-3 overflow-x-auto no-scrollbar">
          {categoryTotals.map(cat => (
            <div key={cat.id} className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-[10px] font-medium text-foreground">{cat.name} ({Math.round(cat.minutes/60 * 10)/10}h)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
