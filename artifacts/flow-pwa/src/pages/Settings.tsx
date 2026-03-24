import { useState, useRef } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useSettings, useUpdateSetting, useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useDB";
import { exportAllData, importAllData, clearAllData } from "@/lib/db";
import { Moon, Sun, Monitor, Download, Upload, Trash2, ChevronLeft, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import type { Category } from "@/lib/db";

const PALETTE = [
  "#b5705b", "#7b9e87", "#c8a45a", "#8a9bb5",
  "#7a9fa0", "#a07a9f", "#9fa07a", "#9f7a7a",
  "#6b8fa0", "#a08b6b", "#8fa06b", "#a06b8f",
];

function CategoryRow({ cat, onEdit }: { cat: Category; onEdit: (c: Category) => void }) {
  const deleteCategory = useDeleteCategory();
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0">
      <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
      <span className="flex-1 text-sm font-semibold truncate">{cat.name}</span>
      <button
        onClick={() => onEdit(cat)}
        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={async () => {
          if (confirm(`Delete "${cat.name}"?`)) {
            await deleteCategory(cat.id!);
            toast.success(`"${cat.name}" deleted`);
          }
        }}
        className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function CategoryEditor({
  category,
  onSave,
  onCancel,
}: {
  category: Partial<Category> | null;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [color, setColor] = useState(category?.color || PALETTE[0]);

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4 mt-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="w-full bg-background border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "#111" : "transparent",
                transform: color === c ? "scale(1.15)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => name.trim() && onSave(name.trim(), color)}
          disabled={!name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all hover:bg-primary/90"
        >
          <Check className="w-4 h-4" /> Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center gap-1 transition-all hover:bg-muted/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const categories = useCategories();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [isNewCat, setIsNewCat] = useState(false);

  const handleExport = async () => {
    try {
      const dataStr = await exportAllData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flow-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch {
      toast.error("Export failed.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await importAllData(json, importMode);
        toast.success(`Data imported (${importMode} mode) successfully!`);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = async () => {
    if (confirm("Are you absolutely sure? This cannot be undone.")) {
      await clearAllData();
      toast.success("All data cleared.");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleSaveCategory = async (name: string, color: string) => {
    if (isNewCat) {
      await addCategory({ name, color });
      toast.success(`"${name}" added`);
    } else if (editingCat?.id) {
      await updateCategory(editingCat.id, { name, color });
      toast.success(`"${name}" updated`);
    }
    setEditingCat(null);
    setIsNewCat(false);
  };

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-10 pb-24 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-serif font-bold text-3xl">Settings</h1>
      </div>

      <div className="space-y-10">
        {/* Appearance */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Appearance</h2>
          <div className="bg-card border rounded-2xl p-1.5 flex gap-1 shadow-sm">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "light" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              <Sun className="w-4 h-4" /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "dark" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "system" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
            >
              <Monitor className="w-4 h-4" /> System
            </button>
          </div>
        </section>

        {/* Waking Hours */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Waking Hours</h2>
          <div className="bg-card border rounded-2xl divide-y shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Wake Time</span>
              <input
                type="time"
                value={settings.wakeStart || "07:00"}
                onChange={(e) => updateSetting("wakeStart", e.target.value)}
                className="bg-background border px-2 py-1 rounded-lg text-sm font-mono focus:outline-none"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Sleep Time</span>
              <input
                type="time"
                value={settings.wakeEnd || "23:00"}
                onChange={(e) => updateSetting("wakeEnd", e.target.value)}
                className="bg-background border px-2 py-1 rounded-lg text-sm font-mono focus:outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            Used to calculate active window in Day Summary
          </p>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categories</h2>
            {!isNewCat && !editingCat && (
              <button
                onClick={() => { setIsNewCat(true); setEditingCat({}); }}
                className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {isNewCat && editingCat && (
            <CategoryEditor
              category={editingCat}
              onSave={handleSaveCategory}
              onCancel={() => { setIsNewCat(false); setEditingCat(null); }}
            />
          )}

          <div className="bg-card border rounded-2xl px-4 shadow-sm mt-3">
            {categories.map((cat) => (
              <div key={cat.id}>
                {editingCat?.id === cat.id && !isNewCat ? (
                  <div className="py-3">
                    <CategoryEditor
                      category={cat}
                      onSave={handleSaveCategory}
                      onCancel={() => setEditingCat(null)}
                    />
                  </div>
                ) : (
                  <CategoryRow cat={cat} onEdit={(c) => { setIsNewCat(false); setEditingCat(c); }} />
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No categories yet. Add one above.</p>
            )}
          </div>
        </section>

        {/* Timer Defaults */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Timer (Minutes)</h2>
          <div className="bg-card border rounded-2xl divide-y shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Focus Session</span>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.timerPomodoro || 25}
                onChange={(e) => updateSetting("timerPomodoro", Number(e.target.value))}
                className="w-16 bg-background border px-2 py-1 rounded-lg text-center font-mono text-sm"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Short Break</span>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.timerShortBreak || 5}
                onChange={(e) => updateSetting("timerShortBreak", Number(e.target.value))}
                className="w-16 bg-background border px-2 py-1 rounded-lg text-center font-mono text-sm"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Long Break</span>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.timerLongBreak || 15}
                onChange={(e) => updateSetting("timerLongBreak", Number(e.target.value))}
                className="w-16 bg-background border px-2 py-1 rounded-lg text-center font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* Heartbeat */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Heartbeat Check-in</h2>
          <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Enable Prompts</span>
              <input
                type="checkbox"
                checked={settings.heartbeatEnabled !== false}
                onChange={(e) => updateSetting("heartbeatEnabled", e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold text-sm text-muted-foreground">Interval</span>
              <select
                value={settings.heartbeatInterval || 30}
                onChange={(e) => updateSetting("heartbeatInterval", Number(e.target.value))}
                className="bg-background border px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Data Management</h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full bg-card border flex items-center justify-between p-4 rounded-2xl hover:bg-muted transition-colors shadow-sm"
            >
              <span className="font-semibold text-sm">Export Backup (JSON)</span>
              <Download className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Import Mode</span>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                  className="bg-background border px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                >
                  <option value="merge">Merge</option>
                  <option value="replace">Replace All</option>
                </select>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors"
              >
                <Upload className="w-4 h-4" /> Select Backup File
              </button>
            </div>

            <button
              onClick={handleClear}
              className="w-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between p-4 rounded-2xl hover:bg-destructive/20 transition-colors"
            >
              <span className="font-bold text-sm">Clear All Data</span>
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
