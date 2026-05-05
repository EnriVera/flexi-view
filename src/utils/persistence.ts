import type { SortChangeDetail } from '../types.js';

export interface PersistedState {
  activeView?: string;
  filters?: Record<string, unknown>;
  sortConfig?: SortChangeDetail | null;
}

export function writeState(key: string | undefined, state: PersistedState): void {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(state));
}

export function readState(key: string | undefined): PersistedState | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}
