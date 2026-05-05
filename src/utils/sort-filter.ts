import type { SortChangeDetail } from '../types.js';

export type { SortChangeDetail };
export type Filters = Record<string, unknown>;

export function applySort<T>(data: T[], config: SortChangeDetail | null): T[] {
  if (!config) return data;
  const { field, direction } = config;
  return [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[field];
    const bVal = (b as Record<string, unknown>)[field];
    let cmp = 0;
    if (aVal == null && bVal == null) cmp = 0;
    else if (aVal == null) cmp = -1;
    else if (bVal == null) cmp = 1;
    else if (aVal < bVal) cmp = -1;
    else if (aVal > bVal) cmp = 1;
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function applyFilters<T>(data: T[], filters: Filters): T[] {
  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v !== '' && v != null
  );
  if (activeFilters.length === 0) return data;
  return data.filter(row => {
    return activeFilters.every(([field, value]) => {
      const rowVal = (row as Record<string, unknown>)[field];
      if (typeof rowVal === 'number') return String(rowVal) === String(value);
      return String(rowVal ?? '').toLowerCase().includes(String(value).toLowerCase());
    });
  });
}
