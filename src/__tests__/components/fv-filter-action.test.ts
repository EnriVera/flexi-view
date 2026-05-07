import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', { adoptedStyleSheets });

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, configure, subscribeConfig } from '../../registry.js';
import { FvFilterAction } from '../../components/fv-filter-action.js';

function makeMockFilterTarget(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, EventListenerOrEventListenerObject[]>();
  return {
    registers: [] as Record<string, unknown>[],
    currentFilters: {} as Record<string, unknown>,
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

describe('FvFilterAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches filter-change with selected array when checking an option', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active', 'inactive', 'pending'];
    el.selected = [];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', true);

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('filter-change');
    expect(event.detail.field).toBe('status');
    expect(event.detail.value).toEqual(['active']);
  });

  it('removes value from selected array when unchecking', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active', 'inactive', 'pending'];
    el.selected = ['active', 'inactive'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', false);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toEqual(['inactive']);
  });

  it('dispatches null when unchecking the last selected option', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active'];
    el.selected = ['active'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', false);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toBeNull();
  });

  it('accumulates multiple selections', () => {
    const el = new FvFilterAction();
    el.field = 'role';
    el.options = ['admin', 'user'];
    el.selected = ['admin'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('user', true);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toEqual(['admin', 'user']);
  });

  it('CSS .empty uses var(--fv-text-muted) not hardcoded #999', () => {
    const styles = FvFilterAction.styles.toString();
    expect(styles).toContain('var(--fv-text-muted');
    expect(styles).not.toContain('#999');
  });

  describe('external mode — for attribute (T4)', () => {
    it('has a for property that defaults to undefined', () => {
      const el = new FvFilterAction();
      expect((el as any).for).toBeUndefined();
    });

    it('computes options from target.registers on connect', async () => {
      const target = makeMockFilterTarget({
        registers: [
          { status: 'active' },
          { status: 'inactive' },
          { status: 'active' }, // duplicate — should deduplicate
        ],
        currentFilters: {},
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvFilterAction();
      el.field = 'status';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect(el.options).toContain('active');
      expect(el.options).toContain('inactive');
      expect(el.options).toHaveLength(2); // deduped
    });

    it('reads initial selected from target.currentFilters[field]', async () => {
      const target = makeMockFilterTarget({
        registers: [{ status: 'active' }],
        currentFilters: { status: ['active'] },
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvFilterAction();
      el.field = 'status';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect(el.selected).toEqual(['active']);
    });

    it('subscribes to fv-filter-change on target', async () => {
      const target = makeMockFilterTarget({
        registers: [],
        currentFilters: {},
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvFilterAction();
      el.field = 'status';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect(target.addEventListener).toHaveBeenCalledWith('fv-filter-change', expect.any(Function));
    });

    it('dispatches filter-change on self AND on target when _onChange fires in external mode', async () => {
      const target = makeMockFilterTarget({
        registers: [{ status: 'active' }],
        currentFilters: {},
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvFilterAction();
      el.field = 'status';
      el.selected = [];
      (el as any).for = 'my-view';
      await (el as any)._connect();

      const selfSpy = vi.spyOn(el, 'dispatchEvent');
      (el as any)._onChange('active', true);

      // Self dispatch
      expect(selfSpy).toHaveBeenCalledOnce();
      const selfEvent = selfSpy.mock.calls[0][0] as CustomEvent;
      expect(selfEvent.type).toBe('filter-change');

      // Target dispatch
      expect(target.dispatchEvent).toHaveBeenCalledOnce();
      const targetEvent = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(targetEvent.type).toBe('filter-change');
      expect(targetEvent.bubbles).toBe(false);
    });

    it('disconnectedCallback removes fv-filter-change listener from target', async () => {
      const target = makeMockFilterTarget({
        registers: [],
        currentFilters: {},
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvFilterAction();
      el.field = 'status';
      (el as any).for = 'my-view';
      await (el as any)._connect();
      (el as any)._disconnectExternal();

      expect(target.removeEventListener).toHaveBeenCalledWith('fv-filter-change', expect.any(Function));
    });
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvFilterAction();
    const updateSpy = vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});

    (el as any)._unsubscribeConfig = subscribeConfig(() => el.requestUpdate());
    configure({ darkMode: 'dark' });
    expect(updateSpy).toHaveBeenCalled();

    updateSpy.mockClear();
    (el as any)._unsubscribeConfig?.();
    configure({ darkMode: 'light' });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
