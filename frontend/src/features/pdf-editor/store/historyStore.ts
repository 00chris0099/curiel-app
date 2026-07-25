import { create } from 'zustand';
import { produce } from 'immer';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  description: string;
  snapshot: string;
}

interface HistoryStore {
  entries: HistoryEntry[];
  maxEntries: number;
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearEntries: () => void;
  getEntriesByPage: () => HistoryEntry[];
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  maxEntries: 200,

  addEntry: (entry) => {
    set(
      produce((state: HistoryStore) => {
        const newEntry: HistoryEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        state.entries.unshift(newEntry);
        if (state.entries.length > state.maxEntries) {
          state.entries.pop();
        }
      })
    );
  },

  clearEntries: () => set({ entries: [] }),

  getEntriesByPage: () => {
    return get().entries;
  },
}));
