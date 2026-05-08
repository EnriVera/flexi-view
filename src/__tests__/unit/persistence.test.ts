import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readState,
  writeState,
  writeSortToUrl,
  readSortFromUrl,
  writeFilterToUrl,
  readFiltersFromUrl,
} from '../../utils/persistence.js';

const KEY = 'test-persist-key';

describe('persistence — writeState / readState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes and reads state with new sort shape', () => {
    writeState(KEY, { views: 'grid', sort: [{ field: 'name', direction: 'asc' }], filter: null });
    const state = readState(KEY);
    expect(state?.sort).toHaveLength(1);
    expect(state?.sort?.[0].field).toBe('name');
    expect(state?.sort?.[0].direction).toBe('asc');
  });

  it('reads state with null sort', () => {
    writeState(KEY, { views: 'list', sort: null, filter: null });
    const state = readState(KEY);
    expect(state?.sort).toBeNull();
    expect(state?.views).toBe('list');
  });

  it('silently drops legacy order field — returns null sort', () => {
    localStorage.setItem(KEY, JSON.stringify({ views: 'grid', order: 'as', filter: null }));
    const state = readState(KEY);
    expect(state?.sort).toBeNull();
  });

  it('write no-ops when key is undefined', () => {
    writeState(undefined, { views: 'grid', sort: null, filter: null });
    expect(localStorage.length).toBe(0);
  });

  it('read returns null when key is undefined', () => {
    expect(readState(undefined)).toBeNull();
  });

  it('read returns null when nothing stored', () => {
    expect(readState(KEY)).toBeNull();
  });

  it('round-trips filter array correctly', () => {
    writeState(KEY, {
      views: 'cards',
      sort: null,
      filter: [{ field: 'dept', value: 'eng' }],
    });
    const state = readState(KEY);
    expect(state?.filter?.[0]?.field).toBe('dept');
    expect(state?.filter?.[0]?.value).toBe('eng');
  });

  it('overwrites existing state on write', () => {
    writeState(KEY, { views: 'grid', sort: null, filter: null });
    writeState(KEY, { views: 'cards', sort: [{ field: 'age', direction: 'desc' }], filter: null });
    const state = readState(KEY);
    expect(state?.views).toBe('cards');
    expect(state?.sort?.[0].direction).toBe('desc');
  });
});

describe('URL sort sync — multi-sort', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { hash: '#' },
    });
  });

  it('writeSortToUrl encodes single sort as field:direction', () => {
    window.location.hash = '#';
    writeSortToUrl([{ field: 'name', direction: 'asc' }]);
    const params = new URLSearchParams(window.location.hash.slice(1));
    expect(params.get('fv-sort')).toBe('name:asc');
  });

  it('writeSortToUrl encodes multiple sorts as comma-separated', () => {
    window.location.hash = '#';
    writeSortToUrl([
      { field: 'role', direction: 'asc' },
      { field: 'name', direction: 'desc' },
    ]);
    const params = new URLSearchParams(window.location.hash.slice(1));
    expect(params.get('fv-sort')).toBe('role:asc,name:desc');
  });

  it('writeSortToUrl with empty array clears the param', () => {
    window.location.hash = '#fv-sort=role:asc,name:desc';
    writeSortToUrl([]);
    const params = new URLSearchParams(window.location.hash.slice(1));
    expect(params.get('fv-sort')).toBeNull();
  });

  it('readSortFromUrl decodes single sort as length-1 array', () => {
    window.location.hash = '#fv-sort=age%3Adesc';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(1);
    expect(sorts[0].field).toBe('age');
    expect(sorts[0].direction).toBe('desc');
  });

  it('readSortFromUrl decodes comma-separated multi-sort', () => {
    window.location.hash = '#fv-sort=role%3Aasc,name%3Adesc';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(2);
    expect(sorts[0].field).toBe('role');
    expect(sorts[0].direction).toBe('asc');
    expect(sorts[1].field).toBe('name');
    expect(sorts[1].direction).toBe('desc');
  });

  it('readSortFromUrl parses legacy single-criterion as length-1 array', () => {
    window.location.hash = '#fv-sort=name%3Aasc';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(1);
    expect(sorts[0].field).toBe('name');
    expect(sorts[0].direction).toBe('asc');
  });

  it('readSortFromUrl drops invalid tokens silently', () => {
    window.location.hash = '#fv-sort=role%3Aasc,badtoken,name%3Adesc';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(2);
    expect(sorts[0].field).toBe('role');
    expect(sorts[0].direction).toBe('asc');
    expect(sorts[1].field).toBe('name');
    expect(sorts[1].direction).toBe('desc');
  });

  it('readSortFromUrl handles percent-encoded field names', () => {
    window.location.hash = '#fv-sort=user%20name%3Aasc';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(1);
    expect(sorts[0].field).toBe('user name');
    expect(sorts[0].direction).toBe('asc');
  });

  it('readSortFromUrl returns empty array when no param', () => {
    window.location.hash = '#';
    const sorts = readSortFromUrl();
    expect(sorts).toEqual([]);
  });

  it('readSortFromUrl drops tokens with invalid direction', () => {
    window.location.hash = '#fv-sort=role%3Aasc,name%3Ainvalid';
    const sorts = readSortFromUrl();
    expect(sorts).toHaveLength(1);
    expect(sorts[0].field).toBe('role');
    expect(sorts[0].direction).toBe('asc');
  });
});

describe('URL filter sync', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { hash: '#' },
    });
  });

  it('writeFilterToUrl sets fv-filter-{field} in hash', () => {
    window.location.hash = '#';
    writeFilterToUrl('name', 'Alice');
    const params = new URLSearchParams(window.location.hash.slice(1));
    expect(params.get('fv-filter-name')).toBe('Alice');
  });

  it('writeFilterToUrl with empty value removes the param', () => {
    window.location.hash = '#fv-filter-name=Alice';
    writeFilterToUrl('name', '');
    const params = new URLSearchParams(window.location.hash.slice(1));
    expect(params.get('fv-filter-name')).toBeNull();
  });

  it('readFiltersFromUrl returns all fv-filter-* params', () => {
    window.location.hash = '#fv-filter-name=Bob&fv-filter-dept=eng';
    const filters = readFiltersFromUrl();
    expect(filters.name).toBe('Bob');
    expect(filters.dept).toBe('eng');
  });

  it('readFiltersFromUrl returns empty object when no filter params', () => {
    window.location.hash = '#';
    const filters = readFiltersFromUrl();
    expect(Object.keys(filters)).toHaveLength(0);
  });
});