import { useState } from "react";
import { format, subDays, addMinutes } from "date-fns";
import { Plus, Check, Pencil, Trash2, X, Play, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  useHabits, useHabitLogs, useAddHabit, useUpdateHabit, useDeleteHabit, useToggleHabitLog,
  useCompositions, useAddComposition, useDeleteComposition, useCategories, useAddTimeEntry,
} from "@/hooks/useDB";
import { Drawer } from "vaul";
import type { Habit, Composition, CompositionBlock } from "@/lib/db";
import clsx from "clsx";
import { toast } from "sonner";

const COLORS = ["#C17C5B", "#6B7B5E", "#C4A35A", "#7B7B9E", "#5E7B7B", "#B5697D", "#7B6B9E", "#9E8F7B"];

// ─── Habit Form ──────────────────────────────────────────
function HabitForm({ initial, onSave, onCancel, title }: {
  initial?: Partial<Habit>;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  title: string;
}) {
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
            autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Habit name (e.g. Read 10 pages)"
            className="w-full bg-background border-2 border-border px-4 py-4 text-lg font-bold focus:outline-none focus:border-primary mb-6 placeholder:text-muted-foreground/50 uppercase tracking-wide"
          />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Colour</p>
          <div className="flex gap-2 mb-8 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-10 h-10 flex items-center justify-center transition-transform ${color === c ? "scale-110 outline outline-2 outline-offset-2 outline-foreground/40" : ""}`}
                style={{ backgroundColor: c }}>
                {color === c && <Check className="w-5 h-5 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
          <button onClick={() => name.trim() && onSave(name.trim(), color)} disabled={!name.trim()}
            className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 transition-all border-2 border-primary uppercase tracking-wider">
            Save Habit
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ─── Composition Form ────────────────────────────────────
function CompositionForm({ onSave, onCancel }: {
  onSave: (c: Omit<Composition, 'id'>) => void;
  onCancel: () => void;
}) {
  const categories = useCategories();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [blocks, setBlocks] = useState<CompositionBlock[]>([
    { label: "", categoryId: categories[0]?.id ?? 0, durationMinutes: 30 },
  ]);

  const addBlock = () => setBlocks((b) => [
    ...b,
    { label: "", categoryId: categories[0]?.id ?? 0, durationMinutes: 30 },
  ]);

  const updateBlock = (i: number, field: keyof CompositionBlock, val: string | number) => {
    setBlocks((b) => b.map((bl, idx) => idx === i ? { ...bl, [field]: val } : bl));
  };

  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));

  const totalMins = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);

  return (
    <Drawer.Root open onOpenChange={(open) => !open && onCancel()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-card flex flex-col mt-4 fixed bottom-0 left-0 right-0 z-50 pb-8 px-5 pt-4 border-t-2 border-border max-h-[92vh] overflow-y-auto">
          <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-5" />
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold uppercase tracking-tight">New Composition</h2>
            <button onClick={onCancel} className="w-9 h-9 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Composition name…"
            className="w-full bg-background border-2 border-border px-4 py-3 text-base font-bold focus:outline-none focus:border-primary mb-4 uppercase tracking-wide placeholder:text-muted-foreground/40 placeholder:normal-case" />

          {/* Colour */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-8 h-8 flex items-center justify-center transition-transform ${color === c ? "scale-110 outline outline-2 outline-offset-2 outline-foreground/40" : ""}`}
                style={{ backgroundColor: c }}>
                {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
              </button>
            ))}
          </div>

          {/* Blocks */}
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
            Blocks · {totalMins}m total
          </label>
          <div className="space-y-2 mb-4">
            {blocks.map((bl, i) => (
              <div key={i} className="flex items-center gap-2 bg-background border border-border p-2">
                {/* Category colour dot */}
                <div
                  className="w-3 h-3 flex-shrink-0"
                  style={{ backgroundColor: categories.find(c => c.id === bl.categoryId)?.color ?? "#aaa" }}
                />
                {/* Label */}
                <input
                  type="text"
                  value={bl.label}
                  onChange={(e) => updateBlock(i, "label", e.target.value)}
                  placeholder="Task label"
                  className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wide focus:outline-none placeholder:text-muted-foreground/40 placeholder:normal-case min-w-0"
                />
                {/* Category selector */}
                <select
                  value={bl.categoryId}
                  onChange={(e) => updateBlock(i, "categoryId", Number(e.target.value))}
                  className="text-[10px] font-bold bg-transparent border border-border px-1 py-1 uppercase focus:outline-none max-w-[80px]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {/* Duration */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    value={bl.durationMinutes}
                    min={5} max={180} step={5}
                    onChange={(e) => updateBlock(i, "durationMinutes", Number(e.target.value))}
                    className="w-10 bg-transparent text-center text-xs font-mono font-bold border border-border focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground font-bold">m</span>
                </div>
                <button onClick={() => removeBlock(i)} className="w-6 h-6 flex items-center justify-center text-destructive/60 hover:text-destructive flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addBlock} className="w-full py-2.5 border border-dashed border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors mb-5">
            + Add Block
          </button>

          <button
            onClick={() => name.trim() && blocks.length > 0 && onSave({
              name: name.trim(), color, blocks, createdAt: new Date().toISOString()
            })}
            disabled={!name.trim() || blocks.length === 0}
            className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 transition-all border-2 border-primary uppercase tracking-wider">
            Save Composition
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function Habits() {
  const habits = useHabits();
  const addHabit = useAddHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleLog = useToggleHabitLog();
  const compositions = useCompositions();
  const addComposition = useAddComposition();
  const deleteComposition = useDeleteComposition();
  const addTimeEntry = useAddTimeEntry();
  const categories = useCategories();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const allLogs = useHabitLogs();

  const [tab, setTab] = useState<"habits" | "compose">("habits");
  const [addOpen, setAddOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newCompOpen, setNewCompOpen] = useState(false);

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
    if (confirm(`Delete "${habit.name}"?`)) await deleteHabit(habit.id!);
  };

  const applyComposition = async (comp: Composition) => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");
    let offset = 0;
    for (const block of comp.blocks) {
      const start = addMinutes(now, offset);
      const end = addMinutes(start, block.durationMinutes);
      await addTimeEntry({
        description: block.label || comp.name,
        categoryId: block.categoryId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        date: dateStr,
        type: "manual",
      });
      offset += block.durationMinutes;
    }
    toast.success(`Applied "${comp.name}" — ${comp.blocks.length} blocks added`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-4 border-b-2 border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-primary flex-shrink-0" style={{ borderRadius: "50%" }} />
          <h1 className="font-bold text-3xl uppercase tracking-tight">
            {tab === "habits" ? "Habits" : "Compose"}
          </h1>
        </div>
        <button
          onClick={() => tab === "habits" ? setAddOpen(true) : setNewCompOpen(true)}
          className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors border-2 border-primary"
          data-testid="habits-add-btn"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b-2 border-border flex-shrink-0">
        {(["habits", "compose"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] -mb-[2px]",
              tab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {t === "habits" ? "Habits" : "Daily Compositions"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* ── HABITS TAB ── */}
        {tab === "habits" && (
          <>
            <section className="mt-6 mb-10">
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
                        className={`flex items-center gap-3 px-3 py-3 border transition-all ${isDone ? "bg-card border-border border-l-4" : "bg-background border-border hover:bg-muted/50"}`}
                        style={isDone ? { borderLeftColor: habit.color } : {}}
                      >
                        <motion.div
                          onClick={() => toggleLog(habit.id!, todayStr)}
                          initial={false}
                          animate={{ backgroundColor: isDone ? habit.color : "transparent", borderColor: isDone ? habit.color : "hsl(var(--muted-foreground))" }}
                          className="w-6 h-6 border-2 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          {isDone && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </motion.div>
                        <span
                          onClick={() => toggleLog(habit.id!, todayStr)}
                          className={`flex-1 font-bold cursor-pointer text-sm uppercase tracking-wide ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {habit.name}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border shrink-0">
                          <span className="text-[10px] font-mono font-bold text-foreground">{getStreak(habit.id!)}</span>
                          <span className="text-[9px] uppercase text-muted-foreground font-bold">d</span>
                        </div>
                        <button onClick={() => setEditingHabit(habit)} className="w-7 h-7 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(habit)} className="w-7 h-7 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {habits.length > 0 && (
              <section>
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
                  30-Day Overview
                </h2>
                <div className="bg-card border-2 border-border p-4 overflow-x-auto no-scrollbar">
                  <div className="min-w-max space-y-3">
                    {habits.map((habit) => (
                      <div key={habit.id} className="flex items-center gap-3">
                        <span className="w-16 truncate text-[10px] font-bold text-foreground text-right uppercase tracking-wide">{habit.name}</span>
                        <div className="flex gap-[2px]">
                          {last30Days.map((dateStr) => {
                            const isDone = allLogs.some((l) => l.habitId === habit.id && l.date === dateStr);
                            return (
                              <div key={dateStr} className="w-3 h-3 transition-colors"
                                style={{ backgroundColor: isDone ? habit.color : "hsl(var(--muted))" }} title={dateStr} />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── COMPOSE TAB ── */}
        {tab === "compose" && (
          <section className="mt-6">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">
              Pre-set time blocks you can apply to your timeline in one tap
            </p>
            {compositions.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border bauhaus-hatch">
                <p className="font-bold uppercase tracking-wide text-sm text-muted-foreground">No compositions yet</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Tap + to create your first daily composition</p>
              </div>
            ) : (
              <div className="space-y-[2px]">
                {compositions.map((comp) => {
                  const totalMins = comp.blocks.reduce((a, b) => a + b.durationMinutes, 0);
                  return (
                    <div key={comp.id} className="bg-card border border-border">
                      <div className="flex items-center gap-3 px-3 py-3">
                        <div className="w-3 h-3 flex-shrink-0" style={{ backgroundColor: comp.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm uppercase tracking-wide">{comp.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {comp.blocks.length} blocks · {totalMins}m total
                          </div>
                        </div>
                        {/* Apply */}
                        <button
                          onClick={() => applyComposition(comp)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors border-2 border-primary"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Apply
                        </button>
                        <button
                          onClick={() => confirm(`Delete "${comp.name}"?`) && deleteComposition(comp.id!)}
                          className="w-7 h-7 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Block preview */}
                      <div className="flex h-2 mx-3 mb-3 overflow-hidden gap-[1px]">
                        {comp.blocks.map((bl, i) => {
                          const cat = categories.find(c => c.id === bl.categoryId);
                          const pct = (bl.durationMinutes / totalMins) * 100;
                          return (
                            <div key={i} title={`${bl.label || cat?.name} · ${bl.durationMinutes}m`}
                              style={{ width: `${pct}%`, backgroundColor: cat?.color ?? comp.color }} />
                          );
                        })}
                      </div>
                      {/* Block labels */}
                      <div className="flex flex-wrap gap-1 px-3 pb-3">
                        {comp.blocks.map((bl, i) => {
                          const cat = categories.find(c => c.id === bl.categoryId);
                          return (
                            <div key={i} className="flex items-center gap-1 bg-background border border-border px-2 py-1">
                              <div className="w-1.5 h-1.5" style={{ backgroundColor: cat?.color ?? comp.color }} />
                              <span className="text-[9px] font-bold uppercase tracking-wide text-foreground">
                                {bl.label || cat?.name} · {bl.durationMinutes}m
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {addOpen && <HabitForm title="New Habit" onSave={handleAdd} onCancel={() => setAddOpen(false)} />}
      {editingHabit && (
        <HabitForm title="Edit Habit" initial={editingHabit} onSave={handleEdit} onCancel={() => setEditingHabit(null)} />
      )}
      {newCompOpen && (
        <CompositionForm
          onSave={async (c) => { await addComposition(c); setNewCompOpen(false); }}
          onCancel={() => setNewCompOpen(false)}
        />
      )}
    </div>
  );
}
