import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FvView } from '../../components/fv-view.js';

// Mocks para tests
function createStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
}

function createWindowMock() {
  return {
    location: { hash: '' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    history: { pushState: vi.fn() },
  };
}

describe('FvView', () => {
  let storageMock: ReturnType<typeof createStorageMock>;
  let windowMock: ReturnType<typeof createWindowMock>;
  let originalCustomElements: typeof customElements;

  beforeEach(() => {
    storageMock = createStorageMock();
    windowMock = createWindowMock();
    
    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', windowMock);

    // Mock customElements
    originalCustomElements = customElements;
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
  });

  afterEach(() => {
    vi.stubGlobal('customElements', originalCustomElements);
    vi.resetAllMocks();
  });

  describe('_persistPayload', () => {
    it('genera payload correcto con view, sort y filter', () => {
      const element = new FvView();
      (element as any)._activeView = 'list';
      (element as any)._filters = { name: 'Alice' };
      (element as any)._sortCriteria = [{ field: 'name', direction: 'asc' }];

      const payload = (element as any)._persistPayload;

      expect(payload.views).toBe('list');
      expect(payload.sort).toEqual({ field: 'name', direction: 'asc' });
      expect(payload.filter).toEqual([{ field: 'name', value: 'Alice' }]);
    });

    it('genera payload con sort null cuando no hay sortCriteria', () => {
      const element = new FvView();
      (element as any)._activeView = 'grid';
      (element as any)._filters = {};
      (element as any)._sortCriteria = [];

      const payload = (element as any)._persistPayload;

      expect(payload.sort).toBeNull();
    });

    it('serializa direction desc correctamente', () => {
      const element = new FvView();
      (element as any)._activeView = 'cards';
      (element as any)._sortCriteria = [{ field: 'name', direction: 'desc' }];

      const payload = (element as any)._persistPayload;

      expect(payload.sort).toEqual({ field: 'name', direction: 'desc' });
    });

    it('convierte filtros a formato de array', () => {
      const element = new FvView();
      (element as any)._activeView = 'grid';
      (element as any)._filters = { name: 'Alice', age: '25' };
      
      const payload = (element as any)._persistPayload;
      
      expect(payload.filter).toEqual([
        { field: 'name', value: 'Alice' },
        { field: 'age', value: '25' }
      ]);
    });
  });

  describe('willUpdate detecta cambios de view', () => {
    it('llama a writeState cuando view cambia con storageKey', () => {
      storageMock.getItem.mockReturnValue(null);
      
      const element = new FvView();
      (element as any).storageKey = 'test-key';
      (element as any).view = 'cards';
      
      const changedProperties = new Map([['view', 'grid']]);
      (element as any).willUpdate(changedProperties);
      
      expect(storageMock.setItem).toHaveBeenCalled();
    });

    it('actualiza URL cuando syncUrl=true y view cambia', () => {
      const element = new FvView();
      (element as any).syncUrl = true;
      (element as any).view = 'list';
      
      const changedProperties = new Map([['view', 'grid']]);
      (element as any).willUpdate(changedProperties);
      
      expect(windowMock.location.hash).toContain('view=list');
    });
  });

  describe('View type válido', () => {
    it('acepta grid como view válida', () => {
      const element = new FvView();
      (element as any).view = 'grid';
      
      expect(['grid', 'list', 'cards']).toContain((element as any).view);
    });

    it('acepta list como view válida', () => {
      const element = new FvView();
      (element as any).view = 'list';
      
      expect(['grid', 'list', 'cards']).toContain((element as any).view);
    });

    it('acepta cards como view válida', () => {
      const element = new FvView();
      (element as any).view = 'cards';

      expect(['grid', 'list', 'cards']).toContain((element as any).view);
    });
  });

  describe('filteredData getter (T1)', () => {
    it('retorna los registros sin filtros ni sort', () => {
      const element = new FvView();
      (element as any)._registers = [{ id: 1 }, { id: 2 }];
      (element as any)._filters = {};
      (element as any)._sortCriteria = [];

      const result = (element as any).filteredData;

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1 });
    });

    it('retorna datos filtrados cuando hay filtros activos', () => {
      const element = new FvView();
      (element as any)._registers = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      (element as any)._filters = { name: 'Alice' };
      (element as any)._sortCriteria = [];

      const result = (element as any).filteredData;

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('outbound events — fv-sort-change and fv-filter-change (T2)', () => {
    it('emits fv-sort-change when _onSortChange is called with { sorts } shape', () => {
      const element = new FvView();
      const events: CustomEvent[] = [];
      element.addEventListener('fv-sort-change', (e) => events.push(e as CustomEvent));

      (element as any)._onSortChange(new CustomEvent('sort-change', {
        detail: { sorts: [{ field: 'name', direction: 'asc' }] },
        bubbles: true,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].detail.sorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    it('emits fv-sort-change with { sorts: [] } when sort is cleared', () => {
      const element = new FvView();
      const events: CustomEvent[] = [];
      element.addEventListener('fv-sort-change', (e) => events.push(e as CustomEvent));

      (element as any)._onSortChange(new CustomEvent('sort-change', {
        detail: { sorts: [] },
        bubbles: true,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].detail.sorts).toEqual([]);
    });

    it('emits fv-filter-change when _onFilterChange is called with a filter value', () => {
      const element = new FvView();
      const events: CustomEvent[] = [];
      element.addEventListener('fv-filter-change', (e) => events.push(e as CustomEvent));

      (element as any)._onFilterChange(new CustomEvent('filter-change', {
        detail: { field: 'status', value: ['active'] },
        bubbles: true,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].detail.filters).toBeDefined();
      expect(events[0].detail.filters['status']).toEqual(['active']);
    });

    it('emits fv-filter-change with updated map when filter is removed', () => {
      const element = new FvView();
      (element as any)._filters = { status: ['active'], name: 'Alice' };
      const events: CustomEvent[] = [];
      element.addEventListener('fv-filter-change', (e) => events.push(e as CustomEvent));

      (element as any)._onFilterChange(new CustomEvent('filter-change', {
        detail: { field: 'status', value: '' },
        bubbles: true,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].detail.filters['status']).toBeUndefined();
      expect(events[0].detail.filters['name']).toBe('Alice');
    });

    it('emits fv-filter-change when _onSearch is called', () => {
      const element = new FvView();
      (element as any)._fieldGrids = [{ title: 'Name', field: 'name' }];
      const events: CustomEvent[] = [];
      element.addEventListener('fv-filter-change', (e) => events.push(e as CustomEvent));

      (element as any)._onSearch(new CustomEvent('fv-search', {
        detail: { value: 'Alice' },
        bubbles: true,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].detail.filters['__search']).toBe('Alice');
    });
  });

  describe('currentSorts — multi-sort getter (ADR-3: no currentSort alias)', () => {
    it('currentSorts returns _sortCriteria array', () => {
      const element = new FvView();
      (element as any)._sortCriteria = [{ field: 'name', direction: 'asc' }, { field: 'role', direction: 'desc' }];
      expect(element.currentSorts).toEqual([{ field: 'name', direction: 'asc' }, { field: 'role', direction: 'desc' }]);
    });

    it('currentSorts returns [] when no sort configured', () => {
      const element = new FvView();
      (element as any)._sortCriteria = [];
      expect(element.currentSorts).toEqual([]);
    });

    it('currentSorts returns first entry when only one sort', () => {
      const element = new FvView();
      (element as any)._sortCriteria = [{ field: 'name', direction: 'asc' }];
      expect(element.currentSorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });
  });

  describe('_processedData — multi-sort applied (T11)', () => {
    it('applies multi-sort criteria in order', () => {
      const element = new FvView<{ name: string; role: string }>();
      element.registers = [
        { name: 'Bob', role: 'dev' },
        { name: 'Alice', role: 'dev' },
        { name: 'Carol', role: 'mgr' },
      ] as any;
      (element as any)._sortCriteria = [
        { field: 'role', direction: 'asc' },
        { field: 'name', direction: 'desc' },
      ];
      (element as any)._filters = {};

      const result = (element as any)._processedData;

      // Primary: role asc (dev comes before mgr)
      // Within dev: name desc (Bob > Alice)
      expect(result[0]).toEqual({ name: 'Bob', role: 'dev' });
      expect(result[1]).toEqual({ name: 'Alice', role: 'dev' });
      expect(result[2]).toEqual({ name: 'Carol', role: 'mgr' });
    });

    it('returns filtered data without sort when _sortCriteria is empty', () => {
      const element = new FvView<{ name: string }>();
      element.registers = [{ name: 'Charlie' }, { name: 'Alice' }] as any;
      (element as any)._sortCriteria = [];
      (element as any)._filters = {};

      const result = (element as any)._processedData;

      expect(result).toHaveLength(2);
    });
  });

  describe('_onSortChange — stores detail.sorts as _sortCriteria (T11)', () => {
    it('stores { sorts: [...] } as _sortCriteria', () => {
      const element = new FvView();
      const events: CustomEvent[] = [];
      element.addEventListener('fv-sort-change', (e) => events.push(e as CustomEvent));

      (element as any)._onSortChange(new CustomEvent('sort-change', {
        detail: { sorts: [{ field: 'name', direction: 'desc' }] },
        bubbles: true,
      }));

      expect((element as any)._sortCriteria).toEqual([{ field: 'name', direction: 'desc' }]);
      expect(events[0].detail.sorts).toEqual([{ field: 'name', direction: 'desc' }]);
    });

    it('stores { sorts: [] } as empty _sortCriteria', () => {
      const element = new FvView();
      (element as any)._sortCriteria = [{ field: 'name', direction: 'asc' }];
      const events: CustomEvent[] = [];
      element.addEventListener('fv-sort-change', (e) => events.push(e as CustomEvent));

      (element as any)._onSortChange(new CustomEvent('sort-change', {
        detail: { sorts: [] },
        bubbles: true,
      }));

      expect((element as any)._sortCriteria).toEqual([]);
      expect(events[0].detail.sorts).toEqual([]);
    });
  });

  describe('_checkStorageChange — updates _sortCriteria (T11)', () => {
    it('parses saved.sort and sets _sortCriteria as array', () => {
      storageMock.getItem.mockReturnValue(JSON.stringify({
        views: 'grid',
        sort: { field: 'name', direction: 'asc' },
        filter: null,
      }));

      const element = new FvView();
      (element as any).storageKey = 'test-key';
      (element as any)._sortCriteria = [];
      (element as any)._fieldGrids = [{ field: 'name' }];
      (element as any)._fieldRows = [];
      (element as any)._fieldCards = [];
      (element as any)._activeView = 'grid';
      element.view = 'grid';

      (element as any)._lastStorageValue = '';
      (element as any)._checkStorageChange();

      expect((element as any)._sortCriteria).toEqual([{ field: 'name', direction: 'asc' }]);
    });
  });

  describe('_onHashChange — reads multi-sort from URL (T11)', () => {
    it('parses multi-sort URL and sets _sortCriteria', () => {
      windowMock.location.hash = '#fv-sort=role:asc,name:desc';
      storageMock.getItem.mockReturnValue(null);

      const element = new FvView();
      (element as any).syncUrl = true;
      (element as any)._activeView = 'grid';
      (element as any)._fieldGrids = [{ field: 'role' }, { field: 'name' }];
      (element as any)._fieldRows = [];
      (element as any)._fieldCards = [];
      element.view = 'grid';
      const events: CustomEvent[] = [];
      element.addEventListener('fv-sort-change', (e) => events.push(e as CustomEvent));

      (element as any)._onHashChange();

      expect((element as any)._sortCriteria).toEqual([
        { field: 'role', direction: 'asc' },
        { field: 'name', direction: 'desc' },
      ]);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('header menu receives currentSorts (T11)', () => {
    it('sets menu.currentSorts (not menu.currentSort) on _onHeaderMenuOpen', () => {
      const element = new FvView();
      (element as any)._sortCriteria = [{ field: 'name', direction: 'asc' }];
      (element as any)._filters = {};
      (element as any)._fieldGrids = [{ field: 'name', title: 'Name' }];
      (element as any)._fieldRows = [];
      (element as any)._fieldCards = [];
      (element as any)._registers = [];

      const menuCreated: Record<string, unknown> = {};
      vi.stubGlobal('document', {
        createElement: (tag: string) => {
          const mock: any = { addEventListener: vi.fn(), close: vi.fn(), remove: vi.fn(), open: vi.fn() };
          menuCreated[tag] = mock;
          return mock;
        },
        body: { appendChild: vi.fn(), remove: vi.fn() },
      });

      const col = { field: 'name', title: 'Name' };
      (element as any)._onHeaderMenuOpen(new CustomEvent('header-menu-open', {
        detail: { column: col, field: 'name', anchor: null },
        bubbles: true,
      }));

      // currentSorts should be set on the created menu
      expect(menuCreated['fv-header-menu']).toBeDefined();
      expect((menuCreated['fv-header-menu'] as any).currentSorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });
  });

  describe('_onHashChange URL guard (T2)', () => {
    it('cae al primer acceptedView si la URL tiene una vista no aceptada', () => {
      storageMock.getItem.mockReturnValue(null);
      windowMock.location.hash = '#view=list';

      const element = new FvView();
      (element as any).syncUrl = true;
      (element as any)._activeView = 'grid';
      (element as any)._fieldGrids = [{ field: 'id' }];
      (element as any)._fieldCards = [{ field: 'name' }];
      // Only grid and cards are accepted

      (element as any)._onHashChange();

      // 'list' is not in acceptedViews(['grid','cards']), should fall back to 'grid'
      expect((element as any)._activeView).toBe('grid');
    });

    it('aplica la vista de la URL cuando es aceptada', () => {
      storageMock.getItem.mockReturnValue(null);
      windowMock.location.hash = '#view=cards';

      const element = new FvView();
      (element as any).syncUrl = true;
      (element as any)._activeView = 'grid';
      (element as any)._fieldGrids = [{ field: 'id' }];
      (element as any)._fieldCards = [{ field: 'name' }];

      (element as any)._onHashChange();

      expect((element as any)._activeView).toBe('cards');
    });
  });
});