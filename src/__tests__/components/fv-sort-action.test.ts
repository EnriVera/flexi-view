import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before any registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', { adoptedStyleSheets });

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, configure, subscribeConfig, DEFAULT_ICONS } from '../../registry.js';
import { FvSortAction } from '../../components/fv-sort-action.js';

// Helper to create a mock fv-view target
function makeMockTarget(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, EventListenerOrEventListenerObject[]>();
  return {
    currentSort: null as { field: string; direction: 'asc' | 'desc' | null } | null,
    addEventListener: vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(handler);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    _listeners: listeners,
    ...overrides,
  };
}

describe('FvSortAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches sort-change with asc direction when direction is asc', () => {
    const el = new FvSortAction();
    el.field = 'name';
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('sort-change');
    expect(event.detail.field).toBe('name');
    expect(event.detail.direction).toBe('asc');
  });

  it('dispatches sort-change with desc direction when direction is desc', () => {
    const el = new FvSortAction();
    el.field = 'age';
    el.direction = 'desc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.direction).toBe('desc');
    expect(event.detail.field).toBe('age');
  });

  it('event bubbles and is composed', () => {
    const el = new FvSortAction();
    el.field = 'status';
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('active prop defaults to false', () => {
    const el = new FvSortAction();
    expect(el.active).toBe(false);
  });

  describe('external mode — for attribute (T3)', () => {
    it('has a for property that defaults to undefined', () => {
      const el = new FvSortAction();
      expect((el as any).for).toBeUndefined();
    });

    it('reads initial sort state from target.currentSort when for is set', async () => {
      const target = makeMockTarget({
        currentSort: { field: 'name', direction: 'asc' },
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortAction();
      el.field = 'name';
      (el as any).for = 'my-view';

      await (el as any)._connect();

      expect(el.active).toBe(true);
      expect(el.direction).toBe('asc');
    });

    it('subscribes to fv-sort-change on target when for is set', async () => {
      const target = makeMockTarget({ currentSort: null });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortAction();
      el.field = 'name';
      (el as any).for = 'my-view';

      await (el as any)._connect();

      expect(target.addEventListener).toHaveBeenCalledWith('fv-sort-change', expect.any(Function));
    });

    it('dispatches sort-change on self AND on target when _onClick fires in external mode', async () => {
      const target = makeMockTarget({ currentSort: null });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortAction();
      el.field = 'age';
      el.direction = 'desc';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      const selfSpy = vi.spyOn(el, 'dispatchEvent');
      (el as any)._onClick();

      // Self dispatch
      expect(selfSpy).toHaveBeenCalledOnce();
      const selfEvent = selfSpy.mock.calls[0][0] as CustomEvent;
      expect(selfEvent.type).toBe('sort-change');

      // Target dispatch
      expect(target.dispatchEvent).toHaveBeenCalledOnce();
      const targetEvent = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(targetEvent.type).toBe('sort-change');
      expect(targetEvent.bubbles).toBe(false);
    });

    it('disconnectedCallback removes fv-sort-change listener from target', async () => {
      const target = makeMockTarget({ currentSort: null });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortAction();
      el.field = 'name';
      (el as any).for = 'my-view';
      await (el as any)._connect();
      (el as any)._disconnectExternal();

      expect(target.removeEventListener).toHaveBeenCalledWith('fv-sort-change', expect.any(Function));
    });
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvSortAction();
    const updateSpy = vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});

    // Simulate what connectedCallback does internally (bypass super which needs DOM)
    (el as any)._unsubscribeConfig = subscribeConfig(() => el.requestUpdate());
    configure({ darkMode: 'light' });
    expect(updateSpy).toHaveBeenCalled();

    updateSpy.mockClear();
    // Simulate disconnectedCallback
    (el as any)._unsubscribeConfig?.();
    configure({ darkMode: 'dark' });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
