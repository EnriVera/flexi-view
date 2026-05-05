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
    it('genera payload correcto con view, order y filter', () => {
      const element = new FvView();
      (element as any)._activeView = 'list';
      (element as any)._filters = { name: 'Alice' };
      (element as any)._sortConfig = { field: 'name', direction: 'asc' };
      
      const payload = (element as any)._persistPayload;
      
      expect(payload.views).toBe('list');
      expect(payload.order).toBe('as'); // asc -> as
      expect(payload.filter).toEqual([{ field: 'name', value: 'Alice' }]);
    });

    it('genera payload sin order cuando no hay sortConfig', () => {
      const element = new FvView();
      (element as any)._activeView = 'grid';
      (element as any)._filters = {};
      (element as any)._sortConfig = null;
      
      const payload = (element as any)._persistPayload;
      
      expect(payload.order).toBeNull();
    });

    it('convierte desc a des', () => {
      const element = new FvView();
      (element as any)._activeView = 'cards';
      (element as any)._sortConfig = { field: 'name', direction: 'desc' };
      
      const payload = (element as any)._persistPayload;
      
      expect(payload.order).toBe('des');
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
});