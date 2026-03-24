import { useState, useRef } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useSettings, useUpdateSetting, useCategories } from "@/hooks/useDB";
import { exportAllData, importAllData, clearAllData } from "@/lib/db";
import { Moon, Sun, Monitor, Download, Upload, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const categories = useCategories();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const handleExport = async () => {
    try {
      const dataStr = await exportAllData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch (e) {
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
      } catch (err) {
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

  return (
    <div className="flex flex-col h-full bg-background px-4 pt-10 pb-24 overflow-y-auto relative z-50">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-serif font-bold text-3xl">Settings</h1>
      </div>

      <div className="space-y-10">
        {/* Appearance */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Appearance</h2>
          <div className="bg-card border rounded-2xl p-1.5 flex gap-1 shadow-sm">
            <button onClick={() => setTheme("light")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "light" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <Sun className="w-4 h-4" /> Light
            </button>
            <button onClick={() => setTheme("dark")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "dark" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <Moon className="w-4 h-4" /> Dark
            </button>
            <button onClick={() => setTheme("system")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme === "system" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>
              <Monitor className="w-4 h-4" /> System
            </button>
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
                value={settings.timerPomodoro || 25} 
                onChange={(e) => updateSetting("timerPomodoro", Number(e.target.value))}
                className="w-16 bg-background border px-2 py-1 rounded-lg text-center font-mono text-sm"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Short Break</span>
              <input 
                type="number" 
                value={settings.timerShortBreak || 5} 
                onChange={(e) => updateSetting("timerShortBreak", Number(e.target.value))}
                className="w-16 bg-background border px-2 py-1 rounded-lg text-center font-mono text-sm"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-semibold text-sm">Long Break</span>
              <input 
                type="number" 
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

        {/* Data */}
        <section>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Data Management</h2>
          <div className="space-y-3">
            <button onClick={handleExport} className="w-full bg-card border flex items-center justify-between p-4 rounded-2xl hover:bg-muted transition-colors shadow-sm">
              <span className="font-semibold text-sm">Export Backup (JSON)</span>
              <Download className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Import Mode</span>
                <select 
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="bg-background border px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                >
                  <option value="merge">Merge</option>
                  <option value="replace">Replace All</option>
                </select>
              </div>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors">
                <Upload className="w-4 h-4" /> Select Backup File
              </button>
            </div>

            <button onClick={handleClear} className="w-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-between p-4 rounded-2xl hover:bg-destructive/20 transition-colors">
              <span className="font-bold text-sm">Clear All Data</span>
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
