import { useState, useRef } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useSettings, useUpdateSetting, useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useDB";
import { exportAllData, importAllData, clearAllData } from "@/lib/db";
import { Moon, Sun, Monitor, Download, Upload, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/lib/db";

const PALETTE = [
  "#b5705b", "#7b9e87", "#c8a45a", "#8a9bb5",
  "#7a9fa0", "#a07a9f", "#9fa07a", "#9f7a7a",
  "#6b8fa0", "#a08b6b", "#8fa06b", "#a06b8f",
];

function CategoryRow({ cat, onEdit }: { cat: Category; onEdit: (c: Category) => void }) {
  const deleteCategory = useDeleteCategory();
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-b-0 border-border">
      {/* Square colour swatch */}
      <span className="w-5 h-5 flex-shrink-0 border border-border/50" style={{ backgroundColor: cat.color }} />
      <span className="flex-1 text-sm font-bold uppercase tracking-wide truncate">{cat.name}</span>
      <button
        onClick={() => onEdit(cat)}
        className="w-7 h-7 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={async () => {
          if (confirm(`Delete "${cat.name}"?`)) {
            await deleteCategory(cat.id!);
            toast.success(`"${cat.name}" deleted`);
          }
        }}
        className="w-7 h-7 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
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
    <div className="bg-card border-2 border-primary p-4 space-y-4 mt-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="w-full bg-background border-2 border-border px-3 py-2 text-sm font-bold uppercase tracking-wide focus:outline-none focus:border-primary placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
      />
      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Colour</p>
        {/* Square swatches */}
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 transition-transform"
              style={{
                backgroundColor: c,
                outline: color === c ? "2px solid hsl(var(--foreground))" : "2px solid transparent",
                outlineOffset: "2px",
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
          className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all hover:bg-primary/90 uppercase tracking-wider"
        >
          <Check className="w-4 h-4" /> Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center border border-border hover:bg-border transition-all"
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
      toast.success("Exported successfully");
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
        toast.success(`Imported (${importMode} mode)`);
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

  const SectionHeader = ({ children }: { children: string }) => (
    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 bauhaus-section-rule">
      {children}
    </h2>
  );

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-8 pb-24 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 border-b-2 border-border pb-4">
        <span className="w-3 h-3 bg-secondary flex-shrink-0" />
        <h1 className="font-bold text-3xl uppercase tracking-tight">Settings</h1>
      </div>

      <div className="space-y-10">
        {/* Appearance */}
        <section>
          <SectionHeader>Appearance</SectionHeader>
          <div className="flex border-2 border-border">
            {(["light", "dark", "system"] as const).map((t, i) => {
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                    i < 2 ? "border-r border-border" : ""
                  } ${
                    theme === t
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t}
                </button>
              );
            })}
          </div>
        </section>

        {/* Waking Hours */}
        <section>
          <SectionHeader>Waking Hours</SectionHeader>
          <div className="bg-card border-2 border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide">Wake</span>
              <input
                type="time"
                value={settings.wakeStart || "07:00"}
                onChange={(e) => updateSetting("wakeStart", e.target.value)}
                className="bg-background border-2 border-border px-2 py-1 text-sm font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide">Sleep</span>
              <input
                type="time"
                value={settings.wakeEnd || "23:00"}
                onChange={(e) => updateSetting("wakeEnd", e.target.value)}
                className="bg-background border-2 border-border px-2 py-1 text-sm font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader>Categories</SectionHeader>
            {!isNewCat && !editingCat && (
              <button
                onClick={() => { setIsNewCat(true); setEditingCat({}); }}
                className="w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
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

          <div className="bg-card border-2 border-border px-4 mt-3">
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
              <p className="text-sm text-muted-foreground py-6 text-center">No categories yet.</p>
            )}
          </div>
        </section>

        {/* Timer Defaults */}
        <section>
          <SectionHeader>Timer (Minutes)</SectionHeader>
          <div className="bg-card border-2 border-border divide-y divide-border">
            {[
              { label: "Focus Session", key: "timerPomodoro", default: 25 },
              { label: "Short Break", key: "timerShortBreak", default: 5 },
              { label: "Long Break", key: "timerLongBreak", default: 15 },
            ].map((item) => (
              <div key={item.key} className="p-4 flex items-center justify-between">
                <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings[item.key as keyof typeof settings] as number || item.default}
                  onChange={(e) => updateSetting(item.key as "timerPomodoro", Number(e.target.value))}
                  className="w-16 bg-background border-2 border-border px-2 py-1 text-center font-mono font-bold text-sm focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Heartbeat */}
        <section>
          <SectionHeader>Heartbeat Check-in</SectionHeader>
          <div className="bg-card border-2 border-border divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide">Enable Prompts</span>
              <input
                type="checkbox"
                checked={settings.heartbeatEnabled !== false}
                onChange={(e) => updateSetting("heartbeatEnabled", e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Interval</span>
              <select
                value={settings.heartbeatInterval || 30}
                onChange={(e) => updateSetting("heartbeatInterval", Number(e.target.value))}
                className="bg-background border-2 border-border px-3 py-1.5 text-sm font-bold focus:outline-none"
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
          <SectionHeader>Data</SectionHeader>
          <div className="space-y-[2px]">
            <button
              onClick={handleExport}
              className="w-full bg-card border-2 border-border flex items-center justify-between p-4 hover:bg-muted transition-colors"
            >
              <span className="font-bold text-sm uppercase tracking-wide">Export Backup (JSON)</span>
              <Download className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="bg-card border-2 border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm uppercase tracking-wide">Import Mode</span>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
                  className="bg-background border-2 border-border px-3 py-1.5 text-sm font-bold focus:outline-none"
                >
                  <option value="merge">Merge</option>
                  <option value="replace">Replace All</option>
                </select>
              </div>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-secondary/10 text-secondary border-2 border-secondary/30 flex items-center justify-center gap-2 py-3 font-bold uppercase tracking-wide transition-colors hover:bg-secondary/20"
              >
                <Upload className="w-4 h-4" /> Select Backup File
              </button>
            </div>

            <button
              onClick={handleClear}
              className="w-full bg-destructive/10 text-destructive border-2 border-destructive/30 flex items-center justify-between p-4 hover:bg-destructive/20 transition-colors"
            >
              <span className="font-bold text-sm uppercase tracking-wide">Clear All Data</span>
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
