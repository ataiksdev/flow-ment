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

    await addHeartbeat({ note, categoryId, timestamp: iso, date: dateStr });

    const fiveMinsAgo = subMinutes(now, 5);
    await addTimeEntry({
      description: note || "Check-in",
      categoryId,
      startTime: fiveMinsAgo.toISOString(),
      endTime: iso,
      date: dateStr,
      type: "heartbeat",
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
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed bottom-[80px] left-3 right-3 z-40"
        >
          <div className="bg-card border-2 border-border p-5 shadow-[4px_4px_0px_hsl(var(--foreground)/0.12)] flex flex-col gap-4 relative overflow-hidden">
            {/* Bauhaus diagonal hatch accent strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                {/* Pulsing circle — intentional Bauhaus form */}
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full bg-accent opacity-75"
                    style={{ borderRadius: "50%" }}
                  />
                  <span
                    className="relative inline-flex h-3 w-3 bg-accent"
                    style={{ borderRadius: "50%" }}
                  />
                </span>
                <h3 className="font-bold text-base uppercase tracking-wide text-foreground">
                  What are you up to?
                </h3>
              </div>

              <input
                type="text"
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Brief note..."
                className="w-full bg-background border-2 border-border px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-all mb-4 placeholder:font-normal placeholder:text-muted-foreground/60"
              />

              {/* Category chips — square Bauhaus */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1 mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id!)}
                    className={`flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all border-2 ${
                      categoryId === cat.id
                        ? "text-white border-transparent"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                    style={categoryId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={snooze}
                  className="flex-1 py-2.5 font-bold text-sm bg-muted text-muted-foreground hover:bg-border border-2 border-border transition-colors uppercase tracking-wide"
                >
                  Snooze
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-2.5 font-bold text-sm bg-foreground text-background border-2 border-foreground hover:opacity-90 active:scale-95 transition-all uppercase tracking-wide"
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
