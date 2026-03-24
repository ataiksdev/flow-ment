import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface TimeEntry {
  id?: number;
  description: string;
  categoryId: number;
  startTime: string; // ISO
  endTime: string; // ISO
  date: string; // YYYY-MM-DD
  type: 'manual' | 'pomodoro' | 'heartbeat';
}

export interface Category {
  id?: number;
  name: string;
  color: string;
  icon: string;
}

export interface Habit {
  id?: number;
  name: string;
  color: string;
  createdAt: string; // ISO
  archived: boolean;
}

export interface HabitLog {
  id?: number;
  habitId: number;
  date: string; // YYYY-MM-DD
}

export interface Heartbeat {
  id?: number;
  note: string;
  categoryId?: number;
  timestamp: string; // ISO
  date: string; // YYYY-MM-DD
}

export interface Setting {
  key: string;
  value: any;
}

interface FlowDB extends DBSchema {
  timeEntries: {
    key: number;
    value: TimeEntry;
    indexes: { 'by-date': string };
  };
  categories: {
    key: number;
    value: Category;
  };
  habits: {
    key: number;
    value: Habit;
  };
  habitLogs: {
    key: number;
    value: HabitLog;
    indexes: { 'by-date': string; 'by-habit': number; 'by-habit-date': [number, string] };
  };
  heartbeats: {
    key: number;
    value: Heartbeat;
    indexes: { 'by-date': string };
  };
  settings: {
    key: string;
    value: Setting;
  };
}

const DB_NAME = 'flow-pwa';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FlowDB>> | null = null;

const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Deep Work', color: '#6B7B5E', icon: 'brain' }, // sage
  { name: 'Creative', color: '#C17C5B', icon: 'pen-tool' }, // terracotta
  { name: 'Meeting', color: '#7B7B9E', icon: 'users' }, // slate
  { name: 'Learning', color: '#C4A35A', icon: 'book-open' }, // amber
  { name: 'Exercise', color: '#5E7B7B', icon: 'activity' }, // teal
  { name: 'Rest', color: '#9E8F7B', icon: 'coffee' }, // warm beige
  { name: 'Social', color: '#B5697D', icon: 'message-circle' }, // dusty rose
  { name: 'Admin', color: '#7B6B9E', icon: 'inbox' }, // muted violet
];

const DEFAULT_SETTINGS: Setting[] = [
  { key: 'theme', value: 'system' },
  { key: 'timerPomodoro', value: 25 },
  { key: 'timerShortBreak', value: 5 },
  { key: 'timerLongBreak', value: 15 },
  { key: 'heartbeatInterval', value: 30 }, // mins
  { key: 'heartbeatEnabled', value: true },
  { key: 'wakeStart', value: '07:00' },
  { key: 'wakeEnd', value: '23:00' },
];

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<FlowDB>(DB_NAME, DB_VERSION, {
      async upgrade(db) {
        if (!db.objectStoreNames.contains('timeEntries')) {
          const store = db.createObjectStore('timeEntries', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('habits')) {
          db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('habitLogs')) {
          const store = db.createObjectStore('habitLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
          store.createIndex('by-habit', 'habitId');
          store.createIndex('by-habit-date', ['habitId', 'date']);
        }
        if (!db.objectStoreNames.contains('heartbeats')) {
          const store = db.createObjectStore('heartbeats', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    }).then(async (db) => {
      // Seed default categories
      const tx = db.transaction(['categories', 'settings'], 'readwrite');
      const cats = await tx.objectStore('categories').getAll();
      if (cats.length === 0) {
        for (const c of DEFAULT_CATEGORIES) {
          await tx.objectStore('categories').add(c);
        }
      }
      // Seed default settings
      const settings = await tx.objectStore('settings').getAll();
      if (settings.length === 0) {
        for (const s of DEFAULT_SETTINGS) {
          await tx.objectStore('settings').add(s);
        }
      }
      await tx.done;
      return db;
    });
  }
  return dbPromise;
}

// Global EventTarget to trigger React re-renders on DB changes
export const dbEvents = new EventTarget();

export function emitDbChange(storeName: keyof FlowDB | 'all') {
  dbEvents.dispatchEvent(new Event(storeName));
  if (storeName !== 'all') {
    dbEvents.dispatchEvent(new Event('all'));
  }
}

// Data Export/Import
export async function exportAllData() {
  const db = await initDB();
  const stores: (keyof FlowDB)[] = ['timeEntries', 'categories', 'habits', 'habitLogs', 'heartbeats', 'settings'];
  const exportData: Record<string, any[]> = {};
  
  for (const storeName of stores) {
    exportData[storeName] = await db.getAll(storeName);
  }
  
  return JSON.stringify(exportData, null, 2);
}

export async function importAllData(jsonString: string, mode: 'merge' | 'replace') {
  const data = JSON.parse(jsonString);
  const db = await initDB();
  const stores: (keyof FlowDB)[] = ['timeEntries', 'categories', 'habits', 'habitLogs', 'heartbeats', 'settings'];
  
  const tx = db.transaction(stores, 'readwrite');
  
  for (const storeName of stores) {
    if (data[storeName] && Array.isArray(data[storeName])) {
      const store = tx.objectStore(storeName);
      if (mode === 'replace') {
        await store.clear();
      }
      for (const item of data[storeName]) {
        await store.put(item);
      }
    }
  }
  
  await tx.done;
  emitDbChange('all');
}

export async function clearAllData() {
  const db = await initDB();
  const stores: (keyof FlowDB)[] = ['timeEntries', 'categories', 'habits', 'habitLogs', 'heartbeats'];
  const tx = db.transaction(stores, 'readwrite');
  for (const storeName of stores) {
    await tx.objectStore(storeName).clear();
  }
  await tx.done;
  emitDbChange('all');
}
