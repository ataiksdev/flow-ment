import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { format, parseISO } from "date-fns";
import { useCategories, useUpdateTimeEntry, useDeleteTimeEntry } from "@/hooks/useDB";
import { X, Check, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { TimeEntry } from "@/lib/db";

interface EditEntryDrawerProps {
  entry: TimeEntry | null;
  onClose: () => void;
}

export function EditEntryDrawer({ entry, onClose }: EditEntryDrawerProps) {
  const categories = useCategories();
  const updateTimeEntry = useUpdateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (entry) {
      setDescription(entry.description || "");
      setCategoryId(entry.categoryId);
      const start = parseISO(entry.startTime);
      const end = parseISO(entry.endTime);
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(end, "HH:mm"));
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry || !categoryId) return;
    const dateStr = entry.date;
    const startIso = new Date(`${dateStr}T${startTime}:00`).toISOString();
    const endIso = new Date(`${dateStr}T${endTime}:00`).toISOString();
    if (new Date(endIso) <= new Date(startIso)) return;
    await updateTimeEntry(entry.id!, {
      description: description.trim() || "Untitled",
      categoryId,
      startTime: startIso,
      endTime: endIso,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (confirm("Delete this entry?")) {
      await deleteTimeEntry(entry.id!);
      onClose();
    }
  };

  return (
    <Drawer.Root open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-card flex flex-col h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none border-t-2 border-border">
          <div className="p-5 bg-card flex-1 overflow-y-auto">
            <div className="mx-auto w-12 h-0.5 flex-shrink-0 bg-muted-foreground/30 mb-8" />

            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-tight">Edit Entry</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="w-9 h-9 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Drawer.Close asChild>
                    <button className="w-9 h-9 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </Drawer.Close>
                </div>
              </div>

              <div className="space-y-6">
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What were you doing?"
                  className="w-full bg-transparent border-none text-xl font-bold placeholder:text-muted-foreground/50 placeholder:font-normal focus:outline-none focus:ring-0 resize-none uppercase tracking-wide"
                  rows={2}
                />

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                    Category
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                    {categories.map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryId(cat.id!)}
                          className={clsx(
                            "flex items-center gap-2 px-3 py-2 whitespace-nowrap text-xs font-bold uppercase tracking-wide transition-all border-2",
                            isSelected
                              ? "border-transparent text-white"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                          style={isSelected ? { backgroundColor: cat.color } : {}}
                        >
                          {!isSelected && (
                            <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          )}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 bg-background border-2 border-border p-3">
                    <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">
                      From
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-transparent text-lg font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div className="w-5 h-[2px] bg-border flex-shrink-0" />
                  <div className="flex-1 bg-background border-2 border-border p-3">
                    <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">
                      To
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-transparent text-lg font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  {startTime >= endTime && (
                    <p className="text-destructive text-xs font-bold uppercase tracking-wide text-center mb-3">
                      End must be after start
                    </p>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!categoryId || startTime >= endTime}
                    className="w-full py-4 font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 active:scale-95 transition-all border-2 border-primary flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
