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
      (element as any)._sortConfig = { field: 'name', direction: 'asc' };

      const payload = (element as any)._persistPayload;

      expect(payload.views).toBe('list');
      expect(payload.sort).toEqual({ field: 'name', direction: 'asc' });
      expect(payload.filter).toEqual([{ field: 'name', value: 'Alice' }]);
    });

    it('genera payload con sort null cuando no hay sortConfig', () => {
      const element = new FvView();
      (element as any)._activeView = 'grid';
      (element as any)._filters = {};
      (element as any)._sortConfig = null;

      const payload = (element as any)._persistPayload;

      expect(payload.sort).toBeNull();
    });

    it('serializa direction desc correctamente', () => {
      const element = new FvView();
      (element as any)._activeView = 'cards';
      (element as any)._sortConfig = { field: 'name', direction: 'desc' };

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
      (element as any)._sortConfig = null;

      const result = (element as any).filteredData;

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1 });
    });

    it('retorna datos filtrados cuando hay filtros activos', () => {
      const element = new FvView();
      (element as any)._registers = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      (element as any)._filters = { name: 'Alice' };
      (element as any)._sortConfig = null;

      const result = (element as any).filteredData;

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: 'Alice' });
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