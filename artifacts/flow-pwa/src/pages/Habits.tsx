import { useState } from "react";
import { format, subDays } from "date-fns";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useHabits, useHabitLogs, useAddHabit, useUpdateHabit, useDeleteHabit, useToggleHabitLog } from "@/hooks/useDB";
import { Drawer } from "vaul";
import type { Habit } from "@/lib/db";

const COLORS = ["#C17C5B", "#6B7B5E", "#C4A35A", "#7B7B9E", "#5E7B7B", "#B5697D", "#7B6B9E", "#9E8F7B"];

interface HabitFormProps {
  initial?: Partial<Habit>;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  title: string;
}

function HabitForm({ initial, onSave, onCancel, title }: HabitFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || COLORS[0]);

  return (
    <Drawer.Root open onOpenChange={(open) => !open && onCancel()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-6" />
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif">{title}</h2>
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name (e.g. Read 10 pages)"
            className="w-full bg-background border-2 border-border px-4 py-4 rounded-xl text-lg font-medium focus:outline-none focus:border-primary mb-6"
          />

          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Color</p>
          <div className="flex gap-3 mb-8 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${color === c ? "scale-110 shadow-md ring-2 ring-offset-2 ring-foreground/30" : ""}`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-5 h-5 text-white" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => name.trim() && onSave(name.trim(), color)}
            disabled={!name.trim()}
            className="w-full py-4 rounded-xl font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all shadow-lg"
          >
            Save Habit
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default function Habits() {
  const habits = useHabits();
  const addHabit = useAddHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleLog = useToggleHabitLog();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const allLogs = useHabitLogs();

  const [addOpen, setAddOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const last30Days = Array.from({ length: 30 }).map((_, i) =>
    format(subDays(new Date(), 29 - i), "yyyy-MM-dd")
  );

  const getStreak = (habitId: number) => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const logged = allLogs.some((l) => l.habitId === habitId && l.date === d);
      if (logged) streak++;
      else if (i > 0) break;
    }
    return streak;
  };

  const handleAdd = async (name: string, color: string) => {
    await addHabit({ name, color, createdAt: new Date().toISOString(), archived: false });
    setAddOpen(false);
  };

  const handleEdit = async (name: string, color: string) => {
    if (!editingHabit?.id) return;
    await updateHabit(editingHabit.id, { name, color });
    setEditingHabit(null);
  };

  const handleDelete = async (habit: Habit) => {
    if (confirm(`Delete "${habit.name}"? This will hide it from future tracking.`)) {
      await deleteHabit(habit.id!);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative px-4 pt-10 pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-bold text-3xl">Habits</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          data-testid="habits-add-btn"
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
              <p className="text-xs mt-1 text-muted-foreground/70">Tap the + to add one</p>
            </div>
          ) : (
            habits.map((habit) => {
              const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === todayStr);
              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isDone ? "bg-card border-transparent shadow-sm" : "bg-background border-border hover:bg-muted/50"}`}
                >
                  {/* Checkbox */}
                  <motion.div
                    onClick={() => toggleLog(habit.id!, todayStr)}
                    initial={false}
                    animate={{
                      backgroundColor: isDone ? habit.color : "transparent",
                      borderColor: isDone ? habit.color : "hsl(var(--muted-foreground))",
                    }}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isDone && <Check className="w-4 h-4 text-white" />}
                  </motion.div>

                  {/* Label */}
                  <span
                    onClick={() => toggleLog(habit.id!, todayStr)}
                    className="flex-1 font-bold cursor-pointer text-foreground"
                  >
                    {habit.name}
                  </span>

                  {/* Streak */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/80 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{getStreak(habit.id!)}</span>
                    <span className="text-[10px] uppercase text-muted-foreground/70 font-semibold">Day</span>
                  </div>

                  {/* Edit / Delete */}
                  <button
                    onClick={() => setEditingHabit(habit)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors shrink-0"
                    aria-label="Edit habit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(habit)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive transition-colors shrink-0"
                    aria-label="Delete habit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 30-Day Heatmap */}
      {habits.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">30-Day Overview</h2>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm overflow-x-auto no-scrollbar">
            <div className="min-w-max space-y-4">
              {habits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-4">
                  <span className="w-20 truncate text-xs font-bold text-foreground text-right">
                    {habit.name}
                  </span>
                  <div className="flex gap-1.5">
                    {last30Days.map((dateStr) => {
                      const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === dateStr);
                      return (
                        <div
                          key={dateStr}
                          className="w-3.5 h-3.5 rounded-sm transition-colors"
                          style={{ backgroundColor: isDone ? habit.color : "hsl(var(--muted))" }}
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
      )}

      {/* Add Habit Form */}
      {addOpen && (
        <HabitForm
          title="New Habit"
          onSave={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      )}

      {/* Edit Habit Form */}
      {editingHabit && (
        <HabitForm
          title="Edit Habit"
          initial={editingHabit}
          onSave={handleEdit}
          onCancel={() => setEditingHabit(null)}
        />
      )}
    </div>
  );
}
