import { ReactNode, useState, useEffect } from "react";
import { Drawer } from "vaul";
import { format, subMinutes } from "date-fns";
import { useCategories, useAddTimeEntry } from "@/hooks/useDB";
import { X, Check } from "lucide-react";
import clsx from "clsx";

export function QuickEntryDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const categories = useCategories();
  const addTimeEntry = useAddTimeEntry();

  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  
  // Format defaults for time inputs (HH:mm)
  const now = new Date();
  const thirtyMinsAgo = subMinutes(now, 30);
  
  const [startTime, setStartTime] = useState(format(thirtyMinsAgo, "HH:mm"));
  const [endTime, setEndTime] = useState(format(now, "HH:mm"));

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setDescription("");
      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id!);
      }
      const currentNow = new Date();
      setStartTime(format(subMinutes(currentNow, 30), "HH:mm"));
      setEndTime(format(currentNow, "HH:mm"));
    }
  }, [open, categories, categoryId]);

  const handleSave = async () => {
    if (!categoryId) return;
    
    // Construct ISO strings
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const startIso = new Date(`${dateStr}T${startTime}:00`).toISOString();
    const endIso = new Date(`${dateStr}T${endTime}:00`).toISOString();

    await addTimeEntry({
      description,
      categoryId,
      startTime: startIso,
      endTime: endIso,
      date: dateStr,
      type: 'manual'
    });

    setOpen(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        {children}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50 focus:outline-none">
          <div className="p-4 bg-card flex-1 rounded-t-[2rem]">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-8" />
            
            <div className="max-w-md mx-auto px-2 pb-safe">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-serif">Quick Entry</h2>
                <Drawer.Close asChild>
                  <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </Drawer.Close>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <textarea
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What were you doing?"
                    className="w-full bg-transparent border-none text-xl font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-0 resize-none"
                    rows={2}
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Category</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1 -mx-1">
                    {categories.map(cat => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryId(cat.id!)}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 border",
                            isSelected 
                              ? "border-transparent text-white shadow-md scale-105" 
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                          style={isSelected ? { backgroundColor: cat.color } : {}}
                        >
                          {!isSelected && (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          )}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex-1 bg-background border rounded-xl p-3">
                    <label className="text-xs text-muted-foreground block mb-1">From</label>
                    <input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-transparent text-lg font-mono font-medium focus:outline-none" 
                    />
                  </div>
                  <div className="w-4 h-[2px] bg-border" />
                  <div className="flex-1 bg-background border rounded-xl p-3">
                    <label className="text-xs text-muted-foreground block mb-1">To</label>
                    <input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-transparent text-lg font-mono font-medium focus:outline-none" 
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-6">
                  <button
                    onClick={handleSave}
                    disabled={!description.trim() || !categoryId}
                    className="w-full py-4 rounded-xl font-bold text-primary-foreground bg-primary disabled:opacity-50 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" /> Save Entry
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
