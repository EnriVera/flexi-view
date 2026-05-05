export interface PersistedState {
  views: string | null;
  order: string | null;
  filter: FilterItem[] | null;
}

export interface FilterItem {
  field: string;
  value: unknown;
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
