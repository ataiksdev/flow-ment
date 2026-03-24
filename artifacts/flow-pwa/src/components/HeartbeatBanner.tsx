import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHeartbeat } from "@/providers/HeartbeatProvider";
import { useCategories, useAddHeartbeat, useAddTimeEntry } from "@/hooks/useDB";
import { format, subMinutes } from "date-fns";

export function HeartbeatBanner() {
  const { isPromptVisible, hidePrompt, snooze } = useHeartbeat();
  const categories = useCategories();
  const addHeartbeat = useAddHeartbeat();
  const addTimeEntry = useAddTimeEntry();

  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Reset state when visible
  useEffect(() => {
    if (isPromptVisible) {
      setNote("");
      if (categories.length > 0) setCategoryId(categories[0].id!);
    }
  }, [isPromptVisible, categories]);

  const handleSave = async () => {
    if (!categoryId) return;
    
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");
    const iso = now.toISOString();

    // Log heartbeat
    await addHeartbeat({
      note,
      categoryId,
      timestamp: iso,
      date: dateStr
    });

    // Optionally add a tiny 5-min block to timeline for continuity
    const fiveMinsAgo = subMinutes(now, 5);
    await addTimeEntry({
      description: note || "Check-in",
      categoryId,
      startTime: fiveMinsAgo.toISOString(),
      endTime: iso,
      date: dateStr,
      type: 'heartbeat'
    });

    hidePrompt();
  };

  return (
    <AnimatePresence>
      {isPromptVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-[80px] left-4 right-4 z-40"
        >
          <div className="bg-card border-2 border-border p-5 rounded-2xl shadow-xl shadow-black/10 flex flex-col gap-4 relative overflow-hidden">
            {/* Subtle animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
                <h3 className="font-serif font-bold text-lg text-foreground">What are you up to right now?</h3>
              </div>

              <input
                type="text"
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Brief note..."
                className="w-full bg-background border px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all mb-4"
              />

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1 mb-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id!)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      categoryId === cat.id 
                        ? 'text-white scale-105 shadow-sm' 
                        : 'bg-background border text-muted-foreground hover:bg-muted'
                    }`}
                    style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={snooze}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-muted text-muted-foreground hover:bg-border transition-colors"
                >
                  Snooze
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-2.5 rounded-xl font-bold text-sm bg-foreground text-background hover:scale-[1.02] active:scale-95 transition-transform shadow-md"
                >
                  Log It
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
