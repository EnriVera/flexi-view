import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FvSwitcher } from '../../components/fv-switcher.js';

describe('FvSwitcher', () => {
  let originalCustomElements: typeof customElements;

  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
    
    vi.stubGlobal('window', {
      location: { hash: '' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Ciclo de vistas', () => {
    it('grid → list en primer click', () => {
      const element = new FvSwitcher();
      (element as any).activeView = 'grid';
      (element as any)._cycle();
      
      expect((element as any).activeView).toBe('list');
    });

    it('list → cards en segundo click', () => {
      const element = new FvSwitcher();
      (element as any).activeView = 'list';
      (element as any)._cycle();
      
      expect((element as any).activeView).toBe('cards');
    });

    it('cards → grid en tercer click (ciclo completo)', () => {
      const element = new FvSwitcher();
      (element as any).activeView = 'cards';
      (element as any)._cycle();
      
      expect((element as any).activeView).toBe('grid');
    });

    it('tres clicks возвращают a grid', () => {
      const element = new FvSwitcher();
      (element as any).activeView = 'grid';
      
      (element as any)._cycle(); // grid → list
      (element as any)._cycle(); // list → cards  
      (element as any)._cycle(); // cards → grid
      
      expect((element as any).activeView).toBe('grid');
    });
  });

  describe('dispatch de eventos', () => {
    it('dispatchea view-change con la nueva vista', () => {
      const element = new FvSwitcher();
      (element as any).activeView = 'grid';
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._cycle();
      
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('view-change');
      expect(event.detail.view).toBe('list');
    });
  });

  describe('sync-url integration', () => {
    it('actualiza hash cuando syncUrl=true', () => {
      vi.stubGlobal('window', {
        location: { hash: '' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      
      const element = new FvSwitcher();
      (element as any).syncUrl = true;
      (element as any).activeView = 'grid';
      
      (element as any)._cycle();
      
      expect(window.location.hash).toBe('view=list');
    });
  });

  describe('targetFor sincronización', () => {
    it('lee view del target si existe', () => {
      const mockTarget = {
        view: 'cards',
        addEventListener: vi.fn(),
      };
      
      // Mock document.getElementById
      vi.stubGlobal('document', {
        getElementById: (id: string) => id === 'dv' ? mockTarget : null,
      });
      
      const element = new FvSwitcher();
      (element as any).targetFor = 'dv';
      (element as any).firstUpdated();
      
      expect((element as any).activeView).toBe('cards');
    });
  });
});