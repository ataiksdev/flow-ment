import { useState, useEffect, useCallback } from 'react';
import { 
  initDB, emitDbChange, dbEvents, 
  TimeEntry, Category, Habit, HabitLog, Heartbeat, Setting 
} from '@/lib/db';
import { format } from 'date-fns';

function useLiveQuery<T>(storeName: string | 'all', fetcher: () => Promise<T>, deps: any[] = []): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (err) {
        console.error(`Error fetching ${storeName}:`, err);
      }
    };
    
    load();
    const handler = () => load();
    dbEvents.addEventListener(storeName, handler);
    if (storeName !== 'all') {
      dbEvents.addEventListener('all', handler);
    }
    
    return () => {
      mounted = false;
      dbEvents.removeEventListener(storeName, handler);
      if (storeName !== 'all') {
        dbEvents.removeEventListener('all', handler);
      }
    };
  }, deps);

  return data;
}

// --- Categories ---
export function useCategories() {
  return useLiveQuery('categories', async () => {
    const db = await initDB();
    return db.getAll('categories');
  }) || [];
}

export function useAddCategory() {
  return useCallback(async (category: Omit<Category, 'id'>) => {
    const db = await initDB();
    await db.add('categories', category as Category);
    emitDbChange('categories');
  }, []);
}

export function useUpdateCategory() {
  return useCallback(async (id: number, updates: Partial<Category>) => {
    const db = await initDB();
    const cat = await db.get('categories', id);
    if (cat) {
      await db.put('categories', { ...cat, ...updates });
      emitDbChange('categories');
    }
  }, []);
}

export function useDeleteCategory() {
  return useCallback(async (id: number) => {
    const db = await initDB();
    await db.delete('categories', id);
    emitDbChange('categories');
  }, []);
}

// --- Time Entries ---
export function useTimeEntries(date?: string) {
  return useLiveQuery('timeEntries', async () => {
    const db = await initDB();
    if (date) {
      return db.getAllFromIndex('timeEntries', 'by-date', date);
    }
    return db.getAll('timeEntries');
  }, [date]) || [];
}

export function useAddTimeEntry() {
  return useCallback(async (entry: Omit<TimeEntry, 'id'>) => {
    const db = await initDB();
    await db.add('timeEntries', entry as TimeEntry);
    emitDbChange('timeEntries');
  }, []);
}

export function useUpdateTimeEntry() {
  return useCallback(async (id: number, updates: Partial<TimeEntry>) => {
    const db = await initDB();
    const entry = await db.get('timeEntries', id);
    if (entry) {
      await db.put('timeEntries', { ...entry, ...updates });
      emitDbChange('timeEntries');
    }
  }, []);
}

export function useDeleteTimeEntry() {
  return useCallback(async (id: number) => {
    const db = await initDB();
    await db.delete('timeEntries', id);
    emitDbChange('timeEntries');
  }, []);
}

// --- Habits ---
export function useHabits() {
  return useLiveQuery('habits', async () => {
    const db = await initDB();
    const all = await db.getAll('habits');
    return all.filter(h => !h.archived);
  }) || [];
}

export function useAddHabit() {
  return useCallback(async (habit: Omit<Habit, 'id'>) => {
    const db = await initDB();
    await db.add('habits', habit as Habit);
    emitDbChange('habits');
  }, []);
}

export function useUpdateHabit() {
  return useCallback(async (id: number, updates: Partial<Habit>) => {
    const db = await initDB();
    const h = await db.get('habits', id);
    if (h) {
      await db.put('habits', { ...h, ...updates });
      emitDbChange('habits');
      emitDbChange('habitLogs'); // in case it affects logs visually
    }
  }, []);
}

// --- Habit Logs ---
export function useHabitLogs(date?: string) {
  return useLiveQuery('habitLogs', async () => {
    const db = await initDB();
    if (date) {
      return db.getAllFromIndex('habitLogs', 'by-date', date);
    }
    return db.getAll('habitLogs');
  }, [date]) || [];
}

export function useAllHabitLogs() {
  return useLiveQuery('habitLogs', async () => {
    const db = await initDB();
    return db.getAll('habitLogs');
  }) || [];
}

export function useToggleHabitLog() {
  return useCallback(async (habitId: number, date: string) => {
    const db = await initDB();
    const existing = await db.getFromIndex('habitLogs', 'by-habit-date', [habitId, date]);
    
    if (existing && existing.id) {
      await db.delete('habitLogs', existing.id);
    } else {
      await db.add('habitLogs', { habitId, date });
    }
    emitDbChange('habitLogs');
  }, []);
}

// --- Heartbeats ---
export function useHeartbeats(date?: string) {
  return useLiveQuery('heartbeats', async () => {
    const db = await initDB();
    if (date) {
      return db.getAllFromIndex('heartbeats', 'by-date', date);
    }
    return db.getAll('heartbeats');
  }, [date]) || [];
}

export function useAddHeartbeat() {
  return useCallback(async (hb: Omit<Heartbeat, 'id'>) => {
    const db = await initDB();
    await db.add('heartbeats', hb as Heartbeat);
    emitDbChange('heartbeats');
  }, []);
}

// --- Settings ---
export function useSettings() {
  return useLiveQuery('settings', async () => {
    const db = await initDB();
    const rows = await db.getAll('settings');
    const settingsMap: Record<string, any> = {};
    rows.forEach(r => settingsMap[r.key] = r.value);
    return settingsMap;
  }) || {};
}

export function useUpdateSetting() {
  return useCallback(async (key: string, value: any) => {
    const db = await initDB();
    await db.put('settings', { key, value });
    emitDbChange('settings');
  }, []);
}
