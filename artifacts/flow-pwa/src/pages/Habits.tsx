import { useState } from "react";
import { format, subDays } from "date-fns";
import { Plus, Check, Pencil, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useHabits, useHabitLogs, useAddHabit, useUpdateHabit, useDeleteHabit, useToggleHabitLog } from "@/hooks/useDB";
import { Drawer } from "vaul";
import type { Habit } from "@/lib/db";

// Square swatches — pure Bauhaus geometry
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
        <Drawer.Content className="bg-card flex flex-col mt-24 fixed bottom-0 left-0 right-0 z-50 pb-8 px-6 pt-4 border-t-2 border-border">
          <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-6" />
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-tight">{title}</h2>
            <button onClick={onCancel} className="w-9 h-9 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Habit name (e.g. Read 10 pages)"
            className="w-full bg-background border-2 border-border px-4 py-4 text-lg font-bold focus:outline-none focus:border-primary mb-6 placeholder:text-muted-foreground/50 uppercase tracking-wide"
          />

          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Colour</p>
          {/* Square swatches — Bauhaus */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-10 h-10 flex items-center justify-center transition-transform ${
                  color === c ? "scale-110 outline outline-2 outline-offset-2 outline-foreground/40" : ""
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-5 h-5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => name.trim() && onSave(name.trim(), color)}
            disabled={!name.trim()}
            className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all border-2 border-primary uppercase tracking-wider"
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
    if (confirm(`Delete "${habit.name}"?`)) {
      await deleteHabit(habit.id!);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative px-4 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b-2 border-border pb-4">
        <div className="flex items-center gap-3">
          {/* Bauhaus circle accent */}
          <span className="w-3 h-3 bg-primary flex-shrink-0" style={{ borderRadius: "50%" }} />
          <h1 className="font-bold text-3xl uppercase tracking-tight">Habits</h1>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors border-2 border-primary"
          data-testid="habits-add-btn"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Today's Checklist */}
      <section className="mb-10">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
          Today
        </h2>
        <div className="space-y-[2px]">
          {habits.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-border text-muted-foreground bauhaus-hatch">
              <p className="font-bold uppercase tracking-wide text-sm">No habits tracked yet.</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Tap + to add one</p>
            </div>
          ) : (
            habits.map((habit) => {
              const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === todayStr);
              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-3 px-3 py-3 border transition-all ${
                    isDone
                      ? "bg-card border-border border-l-4"
                      : "bg-background border-border hover:bg-muted/50"
                  }`}
                  style={isDone ? { borderLeftColor: habit.color } : {}}
                >
                  {/* Square checkbox — pure Bauhaus */}
                  <motion.div
                    onClick={() => toggleLog(habit.id!, todayStr)}
                    initial={false}
                    animate={{
                      backgroundColor: isDone ? habit.color : "transparent",
                      borderColor: isDone ? habit.color : "hsl(var(--muted-foreground))",
                    }}
                    className="w-6 h-6 border-2 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isDone && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </motion.div>

                  {/* Label */}
                  <span
                    onClick={() => toggleLog(habit.id!, todayStr)}
                    className={`flex-1 font-bold cursor-pointer text-sm uppercase tracking-wide ${
                      isDone ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {habit.name}
                  </span>

                  {/* Streak — square badge */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border shrink-0">
                    <span className="text-[10px] font-mono font-bold text-foreground">{getStreak(habit.id!)}</span>
                    <span className="text-[9px] uppercase text-muted-foreground font-bold">d</span>
                  </div>

                  <button
                    onClick={() => setEditingHabit(habit)}
                    className="w-7 h-7 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
                    aria-label="Edit habit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(habit)}
                    className="w-7 h-7 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
            30-Day Overview
          </h2>
          <div className="bg-card border-2 border-border p-4 overflow-x-auto no-scrollbar">
            <div className="min-w-max space-y-3">
              {habits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-3">
                  <span className="w-16 truncate text-[10px] font-bold text-foreground text-right uppercase tracking-wide">
                    {habit.name}
                  </span>
                  <div className="flex gap-[2px]">
                    {last30Days.map((dateStr) => {
                      const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === dateStr);
                      return (
                        <div
                          key={dateStr}
                          className="w-3 h-3 transition-colors"
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

      {addOpen && (
        <HabitForm title="New Habit" onSave={handleAdd} onCancel={() => setAddOpen(false)} />
      )}
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
