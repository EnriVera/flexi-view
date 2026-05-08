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

function makeFilterChangeEvent(field: string, value: string[] | null) {
  return new CustomEvent('filter-change', {
    detail: { field, value },
    bubbles: true,
    composed: true,
  });
}

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

  it('_onModalFilterChange dispatches filter-change with selected values', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.selected = [];
    const spy = vi.spyOn(el, 'dispatchEvent');

    const event = makeFilterChangeEvent('status', ['active']);
    event.stopPropagation = vi.fn();
    (el as any)._onModalFilterChange(event);

    expect(spy).toHaveBeenCalledOnce();
    const dispatched = spy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.type).toBe('filter-change');
    expect(dispatched.detail.field).toBe('status');
    expect(dispatched.detail.value).toEqual(['active']);
    expect(el.selected).toEqual(['active']);
  });

  it('_onModalFilterChange removes value from selected when fewer values', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.selected = ['active', 'inactive'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    const event = makeFilterChangeEvent('status', ['inactive']);
    event.stopPropagation = vi.fn();
    (el as any)._onModalFilterChange(event);

    const dispatched = spy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.detail.value).toEqual(['inactive']);
    expect(el.selected).toEqual(['inactive']);
  });

  it('_onModalFilterChange dispatches null when value is null', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.selected = ['active'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    const event = makeFilterChangeEvent('status', null);
    event.stopPropagation = vi.fn();
    (el as any)._onModalFilterChange(event);

    const dispatched = spy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.detail.value).toBeNull();
    expect(el.selected).toEqual([]);
  });

  it('_onModalFilterChange accumulates multiple selections', () => {
    const el = new FvFilterAction();
    el.field = 'role';
    el.selected = ['admin'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    const event = makeFilterChangeEvent('role', ['admin', 'user']);
    event.stopPropagation = vi.fn();
    (el as any)._onModalFilterChange(event);

    const dispatched = spy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.detail.value).toEqual(['admin', 'user']);
  });

  it('_onClear dispatches null and resets selected', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.selected = ['active', 'inactive'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClear();

    expect(spy).toHaveBeenCalledOnce();
    const dispatched = spy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.type).toBe('filter-change');
    expect(dispatched.detail.field).toBe('status');
    expect(dispatched.detail.value).toBeNull();
    expect(el.selected).toEqual([]);
  });

  it('_openModal sets _modalOpen to true', () => {
    const el = new FvFilterAction();
    expect((el as any)._modalOpen).toBe(false);

    (el as any)._openModal();

    expect((el as any)._modalOpen).toBe(true);
  });

  it('_onModalClose sets _modalOpen to false', () => {
    const el = new FvFilterAction();
    (el as any)._modalOpen = true;

    (el as any)._onModalClose();

    expect((el as any)._modalOpen).toBe(false);
  });

  it('CSS uses var(--fv-text-muted) not hardcoded #999', () => {
    const styles = FvFilterAction.styles.toString();
    expect(styles).toContain('var(--fv-text-muted');
    expect(styles).not.toContain('#999');
  });

  describe('external mode — for attribute', () => {
    it('has a for property that defaults to undefined', () => {
      const el = new FvFilterAction();
      expect((el as any).for).toBeUndefined();
    });

    it('computes options from target.registers on connect', async () => {
      const target = makeMockFilterTarget({
        registers: [
          { status: 'active' },
          { status: 'inactive' },
          { status: 'active' },
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
      expect(el.options).toHaveLength(2);
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
      const target = makeMockFilterTarget({ registers: [], currentFilters: {} });
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

    it('_onClear forwards null to target in external mode', async () => {
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
      el.selected = ['active'];
      (el as any).for = 'my-view';
      await (el as any)._connect();

      const selfSpy = vi.spyOn(el, 'dispatchEvent');
      (el as any)._onClear();

      expect(selfSpy).toHaveBeenCalledOnce();
      const selfEvent = selfSpy.mock.calls[0][0] as CustomEvent;
      expect(selfEvent.type).toBe('filter-change');

      expect(target.dispatchEvent).toHaveBeenCalledOnce();
      const targetEvent = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(targetEvent.type).toBe('filter-change');
      expect(targetEvent.bubbles).toBe(false);
      expect(targetEvent.detail.value).toBeNull();
    });

    it('disconnectedCallback removes fv-filter-change listener from target', async () => {
      const target = makeMockFilterTarget({ registers: [], currentFilters: {} });
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
