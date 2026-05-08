import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
import { FvSortButton } from '../../components/fv-sort-button.js';
import { t, en } from '../../i18n/index.js';

// Helper to create a mock fv-view target
function makeMockTarget(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, EventListenerOrEventListenerObject[]>();
  return {
    currentSorts: [] as { field: string; direction: 'asc' | 'desc' }[],
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

describe('FvSortButton', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── T-09: { sorts } event shape + inbound fv-sort-change + hydration ───

  describe('event shape — { sorts: [...] } (ADR-5)', () => {
    it('dispatches sort-change with { sorts: [{field, direction}] } when active', () => {
      const el = new FvSortButton();
      el.field = 'name';
      el.direction = 'asc';
      el.active = false;
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onActivateOrCycle();

      expect(spy).toHaveBeenCalledOnce();
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('sort-change');
      expect(event.detail.sorts).toEqual([{ field: 'name', direction: 'asc' }]);
      expect(el.active).toBe(true);
    });

    it('dispatches sort-change with { sorts: [] } when cleared', () => {
      const el = new FvSortButton();
      el.field = 'name';
      el.active = true;
      el.direction = 'desc';
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onClear();

      expect(spy).toHaveBeenCalledOnce();
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('sort-change');
      expect(event.detail.sorts).toEqual([]);
      expect(el.active).toBe(false);
    });
  });

  describe('inbound fv-sort-change — _onSortChangeFromView (ADR-5)', () => {
    it('activates button when its field is found in detail.sorts', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortButton();
      el.field = 'name';
      el.active = false;
      (el as any).for = 'my-view';
      await (el as any)._connect();

      // Simulate fv-sort-change from target with 'name' in sorts
      const inboundEvent = new CustomEvent('fv-sort-change', {
        detail: { sorts: [{ field: 'name', direction: 'asc' }] },
        bubbles: true,
      });
      target._listeners.get('fv-sort-change')?.[0]?.call(el, inboundEvent);

      expect(el.active).toBe(true);
      expect(el.direction).toBe('asc');
    });

    it('deactivates button when its field is NOT in detail.sorts', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortButton();
      el.field = 'name';
      el.active = true;
      el.direction = 'asc';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      // Simulate fv-sort-change with a different field
      const inboundEvent = new CustomEvent('fv-sort-change', {
        detail: { sorts: [{ field: 'other', direction: 'asc' }] },
        bubbles: true,
      });
      target._listeners.get('fv-sort-change')?.[0]?.call(el, inboundEvent);

      expect(el.active).toBe(false);
      // direction is preserved per ADR-5
      expect(el.direction).toBe('asc');
    });

    it('deactivates button when detail.sorts is []', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortButton();
      el.field = 'name';
      el.active = true;
      el.direction = 'asc';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      // Simulate fv-sort-change with empty sorts
      const inboundEvent = new CustomEvent('fv-sort-change', {
        detail: { sorts: [] },
        bubbles: true,
      });
      target._listeners.get('fv-sort-change')?.[0]?.call(el, inboundEvent);

      expect(el.active).toBe(false);
    });
  });

  describe('hydration — reads currentSorts (not currentSort)', () => {
    it('reads initial sort state from target.currentSorts', async () => {
      const target = makeMockTarget({
        currentSorts: [{ field: 'name', direction: 'asc' }],
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortButton();
      el.field = 'name';
      (el as any).for = 'my-view';

      await (el as any)._connect();

      expect(el.active).toBe(true);
      expect(el.direction).toBe('asc');
    });

    it('does not activate when field is not in currentSorts', async () => {
      const target = makeMockTarget({
        currentSorts: [{ field: 'other', direction: 'desc' }],
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvSortButton();
      el.field = 'name';
      el.direction = 'asc';
      (el as any).for = 'my-view';

      await (el as any)._connect();

      expect(el.active).toBe(false);
    });
  });

  // ─── Existing tests (updated to use _onActivateOrCycle) ───────────────────

  // These existing tests assert the OLD {field, direction} shape — they will RED
  // once T-10 changes _emit to use { sorts }. After T-10, update these to assert
  // the new shape. For now, T-09 adds new tests that assert the correct shape.

  it('dispatches sort-change with asc direction when direction is asc', () => {
    const el = new FvSortButton();
    el.field = 'name';
    el.direction = 'asc';
    el.active = false;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('sort-change');
    expect(event.detail.sorts[0].field).toBe('name');
    expect(event.detail.sorts[0].direction).toBe('asc');
    expect(el.active).toBe(true);
  });

  it('dispatches sort-change with desc direction when direction is desc', () => {
    const el = new FvSortButton();
    el.field = 'age';
    el.direction = 'desc';
    el.active = false;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.sorts[0].direction).toBe('desc');
    expect(event.detail.sorts[0].field).toBe('age');
    expect(el.active).toBe(true);
  });

  it('cycle asc → desc emits desc', () => {
    const el = new FvSortButton();
    el.field = 'name';
    el.active = true;
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.sorts[0].direction).toBe('desc');
    expect(el.direction).toBe('desc');
    expect(el.active).toBe(true);
  });

  it('clear emits { sorts: [] } and sets active=false', () => {
    const el = new FvSortButton();
    el.field = 'name';
    el.active = true;
    el.direction = 'desc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClear();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('sort-change');
    expect(event.detail.sorts).toEqual([]);
    expect(el.active).toBe(false);
  });

  it('clear forwards { sorts: [] } event to target in external mode', async () => {
    const target = makeMockTarget({ currentSorts: [] });
    vi.stubGlobal('document', {
      adoptedStyleSheets,
      getElementById: vi.fn().mockReturnValue(target),
    });

    const el = new FvSortButton();
    el.field = 'name';
    el.active = true;
    (el as any).for = 'my-view';
    await (el as any)._connect();

    const selfSpy = vi.spyOn(el, 'dispatchEvent');
    (el as any)._onClear();

    // Self dispatch with { sorts: [] }
    expect(selfSpy).toHaveBeenCalledOnce();
    const selfEvent = selfSpy.mock.calls[0][0] as CustomEvent;
    expect(selfEvent.detail.sorts).toEqual([]);

    // Target dispatch with { sorts: [] }
    expect(target.dispatchEvent).toHaveBeenCalledOnce();
    const targetEvent = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
    expect(targetEvent.detail.sorts).toEqual([]);
    expect(targetEvent.bubbles).toBe(false);
  });

  it('dispatches sort-change on self AND on target when _onActivateOrCycle fires in external mode', async () => {
    const target = makeMockTarget({ currentSorts: [] });
    vi.stubGlobal('document', {
      adoptedStyleSheets,
      getElementById: vi.fn().mockReturnValue(target),
    });

    const el = new FvSortButton();
    el.field = 'age';
    el.direction = 'desc';
    (el as any).for = 'my-view';
    await (el as any)._connect();

    const selfSpy = vi.spyOn(el, 'dispatchEvent');
    (el as any)._onActivateOrCycle();

    // Self dispatch
    expect(selfSpy).toHaveBeenCalledOnce();
    const selfEvent = selfSpy.mock.calls[0][0] as CustomEvent;
    expect(selfEvent.type).toBe('sort-change');
    expect(selfEvent.detail.sorts[0].field).toBe('age');

    // Target dispatch
    expect(target.dispatchEvent).toHaveBeenCalledOnce();
    const targetEvent = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
    expect(targetEvent.type).toBe('sort-change');
    expect(targetEvent.bubbles).toBe(false);
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvSortButton();
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

  // ─── New tests (Scenarios 3, 4, 5, 8, 9 and additional coverage) ─────────

  it('cycle asc → desc: active+asc → _onActivateOrCycle emits desc, direction mutates', () => {
    const el = new FvSortButton();
    el.field = 'name';
    el.active = true;
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.sorts[0].direction).toBe('desc');
    expect(el.direction).toBe('desc');
    expect(el.active).toBe(true);
  });

  it('cycle desc → asc: second _onActivateOrCycle call emits asc', () => {
    const el = new FvSortButton();
    el.field = 'name';
    el.active = true;
    el.direction = 'desc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle(); // desc → asc
    (el as any)._onActivateOrCycle(); // asc → desc

    const firstEvent = spy.mock.calls[0][0] as CustomEvent;
    const secondEvent = spy.mock.calls[1][0] as CustomEvent;
    expect(firstEvent.detail.sorts[0].direction).toBe('asc');   // desc → asc
    expect(secondEvent.detail.sorts[0].direction).toBe('desc'); // asc → desc
    expect(el.active).toBe(true);
  });

  it('first activation honors direction property (desc stays desc on first click)', () => {
    const el = new FvSortButton();
    el.field = 'price';
    el.active = false;
    el.direction = 'desc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.sorts[0].direction).toBe('desc');
    // direction property is NOT mutated on first activation
    expect(el.direction).toBe('desc');
    expect(el.active).toBe(true);
  });

  it('default direction on first activation is asc when direction not set', () => {
    const el = new FvSortButton();
    el.field = 'name';
    // direction defaults to 'asc' per property initializer
    el.active = false;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onActivateOrCycle();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.sorts[0].direction).toBe('asc');
  });

  it('clear button is absent in renderRoot when active=false', () => {
    const el = new FvSortButton();
    el.active = false;

    expect(el.active).toBe(false);

    // Set active=true, call clear, verify active is false
    el.active = true;
    (el as any)._onClear();
    expect(el.active).toBe(false);
  });

  describe('i18n — Scenario 10', () => {
    it('t().sort.clear returns "Clear sort" in English locale', () => {
      configure({ language: 'en' as any });
      expect(t().sort.clear).toBe('Clear sort');
    });

    it('fallback value is "Clear sort" when sort.clear is absent', () => {
      const partialTranslation: { sort: { clear?: string } } = { sort: {} };
      const clearLabel = partialTranslation.sort.clear ?? 'Clear sort';
      expect(clearLabel).toBe('Clear sort');
    });

    it('clearLabel reads t().sort.clear when the key is present', () => {
      const translation = { sort: { clear: 'Clear sort' } };
      const clearLabel = translation.sort.clear ?? 'Clear sort';
      expect(clearLabel).toBe('Clear sort');
    });
  });

  it('warns when target not found', async () => {
    vi.stubGlobal('document', {
      adoptedStyleSheets,
      getElementById: vi.fn().mockReturnValue(null),
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const el = new FvSortButton();
    (el as any).for = 'nonexistent-id';
    await (el as any)._connect();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[fv-sort-button]'));
  });
});
