import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub adoptedStyleSheets before registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', {
  adoptedStyleSheets,
  getElementById: vi.fn().mockReturnValue(null),
});

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

import { _resetRegistryForTesting, configure, subscribeConfig, DEFAULT_ICONS, getFlexiConfig } from '../../registry.js';
import { FvSwitcher } from '../../components/fv-switcher.js';

describe('FvSwitcher', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
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

    it('tres clicks vuelven a grid', () => {
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

      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: (id: string) => id === 'dv' ? mockTarget : null,
      });

      const element = new FvSwitcher();
      (element as any).targetFor = 'dv';
      (element as any).firstUpdated();

      expect((element as any).activeView).toBe('cards');
    });
  });

  describe('icon config integration', () => {
    it('DEFAULT_ICONS has all 3 view icons as SVG strings', () => {
      expect(DEFAULT_ICONS.gridView).toContain('<svg');
      expect(DEFAULT_ICONS.listView).toContain('<svg');
      expect(DEFAULT_ICONS.cardsView).toContain('<svg');
    });

    it('configure() with view icon override is reflected in getFlexiConfig', () => {
      configure({ icons: { gridView: '<span>G</span>' } });
      expect(getFlexiConfig().icons.gridView).toBe('<span>G</span>');
    });

    it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
      const element = new FvSwitcher();
      const updateSpy = vi.spyOn(element, 'requestUpdate').mockImplementation(() => {});

      (element as any)._unsubscribeConfig = subscribeConfig(() => element.requestUpdate());
      configure({ darkMode: 'dark' });
      expect(updateSpy).toHaveBeenCalled();

      updateSpy.mockClear();
      (element as any)._unsubscribeConfig?.();
      configure({ darkMode: 'light' });
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
