import { useState, useMemo } from "react";
import { format, addMinutes } from "date-fns";
import { Plus, X, Play, Trash2, Check, ChevronDown } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  usePlanTasks, useAddPlanTask, useUpdatePlanTask, useDeletePlanTask,
  useCompositions, useCategories, useAddTimeEntry, useSettings,
} from "@/hooks/useDB";
import type { PlanTask, Composition } from "@/lib/db";
import clsx from "clsx";
import { toast } from "sonner";

const QUADRANTS = [
  { id: 1, label: "Do First", desc: "Urgent + Important", color: "#C17C5B", bg: "var(--hour-dawn)" },
  { id: 2, label: "Schedule", desc: "Not Urgent + Important", color: "#6B7B5E", bg: "var(--hour-afternoon)" },
  { id: 3, label: "Delegate", desc: "Urgent + Not Important", color: "#C4A35A", bg: "var(--hour-morning)" },
  { id: 4, label: "Eliminate", desc: "Not Urgent + Not Important", color: "#9E8F7B", bg: "var(--hour-night)" },
];

function DraggableTask({
  task, catColor, onDelete, onToggle,
}: {
  task: PlanTask;
  catColor?: string;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(task.id),
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
      className="flex items-center gap-1.5 bg-card border border-border px-2 py-1.5 mb-[2px] cursor-grab active:cursor-grabbing select-none"
    >
      {/* Drag handle area */}
      <div {...listeners} {...attributes} className="flex-1 flex items-center gap-1.5 min-w-0">
        {catColor && <div className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: catColor }} />}
        <span className={clsx("text-xs font-bold uppercase tracking-wide truncate", task.completed && "line-through text-muted-foreground")}>
          {task.title}
        </span>
      </div>
      <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">{task.durationMinutes}m</span>
      {task.scheduled && (
        <span className="text-[8px] font-bold uppercase text-primary flex-shrink-0 border border-primary px-1">sched</span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="w-4 h-4 border border-border flex items-center justify-center flex-shrink-0 hover:bg-muted">
        {task.completed && <Check className="w-2.5 h-2.5 text-primary" />}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-4 h-4 text-destructive/50 hover:text-destructive flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function DroppableQuadrant({
  q, tasks, catMap, onDelete, onToggle,
}: {
  q: typeof QUADRANTS[0];
  tasks: PlanTask[];
  catMap: Record<number, string>;
  onDelete: (id: number) => void;
  onToggle: (task: PlanTask) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: String(q.id) });

  return (
    <div
      ref={setNodeRef}
      className="border border-border overflow-hidden flex flex-col"
      style={{
        backgroundColor: isOver ? q.color + "22" : q.bg,
        outline: isOver ? `2px solid ${q.color}` : undefined,
        minHeight: 120,
      }}
    >
      <div className="px-2 py-1.5 flex-shrink-0 border-b border-border/50" style={{ borderLeftColor: q.color, borderLeftWidth: 3 }}>
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: q.color }}>
          Q{q.id} · {q.label}
        </div>
        <div className="text-[8px] text-muted-foreground uppercase tracking-wide">{q.desc}</div>
      </div>
      <div className="flex-1 p-1 overflow-y-auto">
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} catColor={t.categoryId ? catMap[t.categoryId] : undefined} onDelete={() => onDelete(t.id!)} onToggle={() => onToggle(t)} />
        ))}
        {tasks.length === 0 && (
          <p className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wide text-center py-3">
            Drop here
          </p>
        )}
      </div>
    </div>
  );
}

function DroppableBacklog({
  tasks, catMap, onDelete, onToggle,
}: {
  tasks: PlanTask[];
  catMap: Record<number, string>;
  onDelete: (id: number) => void;
  onToggle: (task: PlanTask) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "0" });

  return (
    <div
      ref={setNodeRef}
      className="border-2 border-border"
      style={{ backgroundColor: isOver ? "hsl(var(--muted))" : undefined }}
    >
      {tasks.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wide text-center py-4">
          {isOver ? "Drop to backlog" : "Backlog empty — add tasks above"}
        </p>
      ) : (
        <div className="p-1">
          {tasks.map((t) => (
            <DraggableTask key={t.id} task={t} catColor={t.categoryId ? catMap[t.categoryId] : undefined} onDelete={() => onDelete(t.id!)} onToggle={() => onToggle(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Plan() {
  const today = format(new Date(), "yyyy-MM-dd");
  const tasks = usePlanTasks(today);
  const addTask = useAddPlanTask();
  const updateTask = useUpdatePlanTask();
  const deleteTask = useDeletePlanTask();
  const compositions = useCompositions();
  const categories = useCategories();
  const addTimeEntry = useAddTimeEntry();
  const settings = useSettings();

  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newCatId, setNewCatId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [routineMenuOpen, setRoutineMenuOpen] = useState(false);

  const catMap = useMemo(() => {
    const m: Record<number, string> = {};
    categories.forEach((c) => { if (c.id) m[c.id] = c.color; });
    return m;
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const tasksByQuadrant = useMemo(() => {
    const map: Record<number, PlanTask[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    tasks.forEach((t) => { map[t.quadrant]?.push(t); });
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => String(t.id) === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const taskId = parseInt(String(active.id));
    const newQ = parseInt(String(over.id)) as 0 | 1 | 2 | 3 | 4;
    if (!isNaN(newQ) && newQ >= 0 && newQ <= 4) {
      updateTask(taskId, { quadrant: newQ });
    }
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      quadrant: 0,
      categoryId: newCatId ?? undefined,
      durationMinutes: newDuration,
      date: today,
      scheduled: false,
      completed: false,
    });
    setNewTitle("");
  };

  const loadFromRoutine = async (comp: Composition) => {
    for (const block of comp.blocks) {
      await addTask({
        title: block.label || comp.name,
        quadrant: 0,
        categoryId: block.categoryId,
        durationMinutes: block.durationMinutes,
        date: today,
        scheduled: false,
        completed: false,
      });
    }
    setRoutineMenuOpen(false);
    toast.success(`Loaded ${comp.blocks.length} tasks from "${comp.name}"`);
  };

  const scheduleQ1 = async () => {
    const q1 = tasksByQuadrant[1].filter((t) => !t.scheduled);
    if (q1.length === 0) {
      toast("No unscheduled Q1 tasks");
      return;
    }
    const wakeStart = settings.wakeStart || "07:00";
    const wakeH = parseInt(wakeStart.split(":")[0]);
    const wakeM = parseInt(wakeStart.split(":")[1] || "0");
    let start = new Date();
    // If current time is before wake start, start from wake start
    if (start.getHours() < wakeH || (start.getHours() === wakeH && start.getMinutes() < wakeM)) {
      start = new Date();
      start.setHours(wakeH, wakeM, 0, 0);
    }

    const defaultCatId = categories[0]?.id;
    for (const task of q1) {
      const end = addMinutes(start, task.durationMinutes);
      await addTimeEntry({
        description: task.title,
        categoryId: task.categoryId ?? defaultCatId ?? 0,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        date: today,
        type: "manual",
      });
      await updateTask(task.id!, { scheduled: true });
      start = end;
    }
    toast.success(`Scheduled ${q1.length} Q1 task${q1.length > 1 ? "s" : ""} on Timeline`);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-border flex-shrink-0">
        <div>
          <h1 className="font-bold text-2xl uppercase tracking-tight">Daily Plan</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            {format(new Date(), "EEEE, MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Load from routine */}
          <div className="relative">
            <button
              onClick={() => setRoutineMenuOpen(!routineMenuOpen)}
              className="flex items-center gap-1 px-3 py-2 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
            >
              Routine <ChevronDown className="w-3 h-3" />
            </button>
            {routineMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-card border-2 border-border z-50 min-w-[160px] shadow-md">
                {compositions.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground font-bold uppercase">No routines</p>
                ) : (
                  compositions.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => loadFromRoutine(comp)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="w-2 h-2" style={{ backgroundColor: comp.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">{comp.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Schedule Q1 */}
          <button
            onClick={scheduleQ1}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest border-2 border-primary hover:bg-primary/90 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            Q1
          </button>
        </div>
      </header>

      {/* Add task input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-card">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="Add task to backlog…"
          className="flex-1 bg-transparent text-sm font-bold uppercase tracking-wide focus:outline-none placeholder:text-muted-foreground/40 placeholder:normal-case placeholder:font-normal min-w-0"
        />
        <select
          value={newCatId ?? ""}
          onChange={(e) => setNewCatId(e.target.value ? Number(e.target.value) : null)}
          className="text-[10px] font-bold bg-transparent border border-border px-1 py-1 uppercase focus:outline-none max-w-[80px] flex-shrink-0"
        >
          <option value="">Cat.</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            value={newDuration}
            min={5} max={180} step={5}
            onChange={(e) => setNewDuration(Number(e.target.value))}
            className="w-10 bg-transparent text-center text-xs font-mono font-bold border border-border focus:outline-none"
          />
          <span className="text-[9px] text-muted-foreground font-bold">m</span>
        </div>
        <button
          onClick={handleAddTask}
          disabled={!newTitle.trim()}
          className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Backlog */}
          <div className="mb-3">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
              Backlog — drag into matrix
            </p>
            <DroppableBacklog
              tasks={tasksByQuadrant[0]}
              catMap={catMap}
              onDelete={(id) => deleteTask(id)}
              onToggle={(t) => updateTask(t.id!, { completed: !t.completed })}
            />
          </div>

          {/* 2×2 Eisenhower Matrix */}
          <div className="grid grid-cols-2 gap-[2px]" style={{ background: "hsl(var(--border))" }}>
            {QUADRANTS.map((q) => (
              <DroppableQuadrant
                key={q.id}
                q={q}
                tasks={tasksByQuadrant[q.id] || []}
                catMap={catMap}
                onDelete={(id) => deleteTask(id)}
                onToggle={(t) => updateTask(t.id!, { completed: !t.completed })}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask && (
              <div className="flex items-center gap-1.5 bg-card border-2 border-primary px-2 py-1.5 opacity-90 shadow-lg">
                <span className="text-xs font-bold uppercase tracking-wide">{activeTask.title}</span>
                <span className="text-[9px] font-mono text-muted-foreground">{activeTask.durationMinutes}m</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
