import { useState } from "react";
import { format, subDays } from "date-fns";
import { Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useHabits, useHabitLogs, useAddHabit, useToggleHabitLog } from "@/hooks/useDB";
import { Drawer } from "vaul";

export default function Habits() {
  const habits = useHabits();
  const addHabit = useAddHabit();
  const toggleLog = useToggleHabitLog();
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const allLogs = useHabitLogs(); // gets all for the heatmap calculation

  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState("#C17C5B");

  const colors = ["#C17C5B", "#6B7B5E", "#C4A35A", "#7B7B9E", "#5E7B7B", "#B5697D"];

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    await addHabit({
      name: newHabitName,
      color: newHabitColor,
      createdAt: new Date().toISOString(),
      archived: false
    });
    setNewHabitName("");
    setAddDrawerOpen(false);
  };

  // Generate last 30 days for heatmap
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    return format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
  });

  const getStreak = (habitId: number) => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const logged = allLogs.some(l => l.habitId === habitId && l.date === d);
      if (logged) streak++;
      else if (i > 0) break; // If not logged today (i=0), it might still be a streak if they log it later. If i>0 and missed, streak breaks.
    }
    return streak;
  };

  return (
    <div className="flex flex-col h-full bg-background relative px-4 pt-10 pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-bold text-3xl">Habits</h1>
        <button 
          onClick={() => setAddDrawerOpen(true)}
          className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Today's Checklist */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Today</h2>
        <div className="space-y-3">
          {habits.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground">
              <p>No habits tracked yet.</p>
            </div>
          ) : (
            habits.map(habit => {
              const isDone = allLogs.some(l => l.habitId === habit.id && l.date === todayStr);
              return (
                <div 
                  key={habit.id}
                  onClick={() => toggleLog(habit.id!, todayStr)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${isDone ? 'bg-card border-transparent shadow-sm' : 'bg-background border-border hover:bg-muted/50'}`}
                >
                  <motion.div 
                    initial={false}
                    animate={{ backgroundColor: isDone ? habit.color : 'transparent', borderColor: isDone ? habit.color : 'hsl(var(--muted-foreground))' }}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0"
                  >
                    {isDone && <Check className="w-4 h-4 text-white" />}
                  </motion.div>
                  
                  <div className="flex-1 flex flex-col">
                    <span className={`font-bold transition-colors ${isDone ? 'text-foreground' : 'text-foreground'}`}>
                      {habit.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/80">
                    <span className="text-xs font-bold text-muted-foreground">{getStreak(habit.id!)}</span>
                    <span className="text-[10px] uppercase text-muted-foreground/70 font-semibold">Day</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 30-Day Heatmap */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">30-Day Overview</h2>
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm overflow-x-auto no-scrollbar">
          <div className="min-w-max space-y-4">
            {habits.map(habit => (
              <div key={habit.id} className="flex items-center gap-4">
                <span className="w-20 truncate text-xs font-bold text-foreground text-right">{habit.name}</span>
                <div className="flex gap-1.5">
                  {last30Days.map(dateStr => {
                    const isDone = allLogs.some(l => l.habitId === habit.id && l.date === dateStr);
                    return (
                      <div 
                        key={dateStr}
                        className="w-3.5 h-3.5 rounded-sm transition-colors"
                        style={{ backgroundColor: isDone ? habit.color : 'var(--color-muted)' }}
                        title={dateStr}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add Habit Drawer */}
      <Drawer.Root open={addDrawerOpen} onOpenChange={setAddDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-bold font-serif mb-6">New Habit</h2>
            
            <input 
              autoFocus
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Habit name (e.g. Read 10 pages)"
              className="w-full bg-background border-2 border-border px-4 py-4 rounded-xl text-lg font-medium focus:outline-none focus:border-primary mb-6"
            />

            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Color</label>
            <div className="flex gap-3 mb-8">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setNewHabitColor(color)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${newHabitColor === color ? 'scale-110 shadow-md ring-2 ring-offset-2 ring-background' : ''}`}
                  style={{ backgroundColor: color }}
                >
                  {newHabitColor === color && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>

            <button
              onClick={handleAddHabit}
              disabled={!newHabitName.trim()}
              className="w-full py-4 rounded-xl font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all shadow-lg"
            >
              Create Habit
            </button>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
