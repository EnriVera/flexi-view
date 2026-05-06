export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PersistedState {
  views: string | null;
  sort: SortState | null;
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
    const sort = _parseSortField(parsed);
    return {
      views: (parsed.views as string | null) ?? null,
      sort,
      filter: Array.isArray(parsed.filter) ? (parsed.filter as FilterItem[]) : null,
    };
  } catch {
    return null;
  }
}

function _parseSortField(parsed: Record<string, unknown>): SortState | null {
  if (parsed.sort && typeof parsed.sort === 'object') {
    const s = parsed.sort as Record<string, unknown>;
    if (typeof s.field === 'string' && (s.direction === 'asc' || s.direction === 'desc')) {
      return { field: s.field, direction: s.direction };
    }
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

export function writeSortToUrl(field: string, direction: 'asc' | 'desc'): void {
  const params = _getHashParams();
  params.set('fv-sort', `${field}:${direction}`);
  _setHashParams(params);
}

export function clearSortFromUrl(): void {
  const params = _getHashParams();
  params.delete('fv-sort');
  _setHashParams(params);
}

export function readSortFromUrl(): SortState | null {
  const params = _getHashParams();
  const raw = params.get('fv-sort');
  if (!raw) return null;
  const [field, direction] = raw.split(':');
  if (field && (direction === 'asc' || direction === 'desc')) {
    return { field, direction };
  }
  return null;
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
