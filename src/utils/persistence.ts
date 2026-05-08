export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PersistedState {
  views: string | null;
  sort: SortState[] | null;
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
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sort = _parseSortState(parsed);
    return {
      views: (parsed.views as string | null) ?? null,
      sort,
      filter: Array.isArray(parsed.filter) ? (parsed.filter as FilterItem[]) : null,
    };
  } catch {
    return null;
  }
}

function _parseSortState(parsed: Record<string, unknown>): SortState[] | null {
  if (!parsed.sort) return null;
  // Legacy single-object format: wrap in array
  if (typeof parsed.sort === 'object' && !Array.isArray(parsed.sort)) {
    const s = parsed.sort as Record<string, unknown>;
    if (typeof s.field === 'string' && (s.direction === 'asc' || s.direction === 'desc')) {
      return [{ field: s.field, direction: s.direction }];
    }
    return null;
  }
  // New array format
  if (Array.isArray(parsed.sort)) {
    const result: SortState[] = [];
    for (const item of parsed.sort) {
      if (typeof item === 'object' && item !== null) {
        const s = item as Record<string, unknown>;
        if (typeof s.field === 'string' && (s.direction === 'asc' || s.direction === 'desc')) {
          result.push({ field: s.field, direction: s.direction });
        }
      }
    }
    return result.length > 0 ? result : null;
  }
  return null;
}

function _getHashParams(): URLSearchParams {
  const raw = window.location.hash;
  const hash = raw.startsWith('#') ? raw.slice(1) : raw;
  return new URLSearchParams(hash);
}

function _setHashParams(params: URLSearchParams): void {
  window.location.hash = '#' + params.toString();
}

export function writeSortToUrl(sorts: SortState[]): void {
  const params = _getHashParams();
  if (sorts.length === 0) {
    params.delete('fv-sort');
  } else {
    const encoded = sorts
      .map(s => `${encodeURIComponent(s.field)}:${s.direction}`)
      .join(',');
    params.set('fv-sort', encoded);
  }
  _setHashParams(params);
}

export function readSortFromUrl(): SortState[] {
  const params = _getHashParams();
  const raw = params.get('fv-sort');
  if (!raw) return [];
  const tokens = raw.split(',');
  const result: SortState[] = [];
  for (const token of tokens) {
    const lastColon = token.lastIndexOf(':');
    if (lastColon === -1) continue;
    const field = decodeURIComponent(token.slice(0, lastColon));
    const direction = token.slice(lastColon + 1) as 'asc' | 'desc';
    if (direction === 'asc' || direction === 'desc') {
      result.push({ field, direction });
    }
  }
  return result;
}

export function writeFilterToUrl(field: string, value: string): void {
  const params = _getHashParams();
  if (value) {
    params.set(`fv-filter-${field}`, value);
  } else {
    params.delete(`fv-filter-${field}`);
  }
  _setHashParams(params);
}

export function clearFilterFromUrl(field: string): void {
  const params = _getHashParams();
  params.delete(`fv-filter-${field}`);
  _setHashParams(params);
}

export function readFiltersFromUrl(): Record<string, string> {
  const params = _getHashParams();
  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('fv-filter-')) {
      filters[key.slice('fv-filter-'.length)] = value;
    }
  }
  return filters;
}