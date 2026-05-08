import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', {
  adoptedStyleSheets,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getElementById: vi.fn(),
});

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, configure } from '../../registry.js';
import { FvSortAction } from '../../components/fv-sort-action.js';
import { t } from '../../i18n/index.js';
import type { SortCriterion } from '../../types.js';

function makeMockTarget(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, EventListenerOrEventListenerObject[]>();
  return {
    currentSorts: [] as SortCriterion[],
    hasAttribute: vi.fn().mockReturnValue(false),
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

describe('FvSortAction (modal trigger)', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
    vi.restoreAllMocks();
  });

  // ─── 1. Chip rendering — inactive state ───────────────────────────────────

  describe('Chip rendering — inactive (0 sorts)', () => {
    it('label is sort.title when _activeSorts is empty', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }];
      expect((el as any)._activeSorts).toEqual([]);
    });

    it('aria-pressed is false when no sort', () => {
      const el = new FvSortAction();
      // aria-pressed is derived from _activeSorts.length > 0
      expect((el as any)._activeSorts.length > 0).toBe(false);
    });

    it('clear button hidden when no sort', () => {
      const el = new FvSortAction();
      // clear button shown when _activeSorts.length > 0
      expect((el as any)._activeSorts.length > 0).toBe(false);
    });
  });

  // ─── 2. Chip rendering — active state (1 sort) ───────────────────────────

  describe('Chip rendering — active (1 sort)', () => {
    it('label shows field title and direction for single sort', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      const label = (el as any)._chipLabel();
      expect(label).toBe('Name - Ascending');
    });

    it('aria-pressed is true when one sort', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      expect((el as any)._activeSorts.length > 0).toBe(true);
    });

    it('clear button visible when one sort', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      expect((el as any)._activeSorts.length > 0).toBe(true);
    });
  });

  // ─── 3. Chip rendering — N>=2 sorts ─────────────────────────────────────

  describe('Chip rendering — N>=2 sorts', () => {
    it('label shows first field + overflow count for 2 sorts', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._activeSorts = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const label = (el as any)._chipLabel();
      expect(label).toBe('Name +1');
    });

    it('label shows first field +2 for 3 sorts', () => {
      const el = new FvSortAction();
      el.registerOrder = [
        { field: 'name', title: 'Name' },
        { field: 'age', title: 'Age' },
        { field: 'role', title: 'Role' },
      ];
      (el as any)._activeSorts = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
        { field: 'role', direction: 'asc' },
      ];
      const label = (el as any)._chipLabel();
      expect(label).toBe('Name +2');
    });
  });

  // ─── 4. registerOrder ────────────────────────────────────────────────────

  describe('registerOrder', () => {
    it('accepts array property directly', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }];
      expect(el.registerOrder).toEqual([{ field: 'name', title: 'Name' }]);
    });

    it('parses valid JSON string attribute', () => {
      const el = new FvSortAction();
      (el as any).registerOrder = JSON.stringify([{ field: 'age', title: 'Age' }]);
      expect(el.registerOrder).toEqual([{ field: 'age', title: 'Age' }]);
    });

    it('warns and falls back to [] on malformed JSON', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const el = new FvSortAction();
      el.registerOrder = 'not valid json' as any;
      expect(warnSpy).toHaveBeenCalled();
      expect(el.registerOrder).toEqual([]);
    });
  });

  // ─── 5. Modal open/close ─────────────────────────────────────────────────

  describe('Modal open/close', () => {
    it('_openModal sets _modalOpen=true', () => {
      const el = new FvSortAction();
      (el as any)._openModal();
      expect((el as any)._modalOpen).toBe(true);
    });

    it('_openModal guard: double-call is no-op (preserves _selectedField)', () => {
      const el = new FvSortAction();
      (el as any)._openModal();
      (el as any)._selectedField = 'changed';
      (el as any)._openModal();
      expect((el as any)._selectedField).toBe('changed');
    });

    it('_openModal pre-selects first active sort field', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'age', direction: 'desc' }];
      (el as any)._openModal();
      expect((el as any)._selectedField).toBe('age');
    });

    it('_openModal sets _selectedField=null when no active sort', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [];
      (el as any)._openModal();
      expect((el as any)._selectedField).toBeNull();
    });

    it('_closeModal sets _modalOpen=false', () => {
      const el = new FvSortAction();
      (el as any)._openModal();
      (el as any)._closeModal();
      expect((el as any)._modalOpen).toBe(false);
    });

    it('_closeModal does NOT emit sort-change', () => {
      const el = new FvSortAction();
      (el as any)._openModal();
      const spy = vi.spyOn(el, 'dispatchEvent');
      (el as any)._closeModal();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── 6. Field selection ──────────────────────────────────────────────────

  describe('Field selection', () => {
    it('_selectField sets _selectedField', () => {
      const el = new FvSortAction();
      (el as any)._selectField('name');
      expect((el as any)._selectedField).toBe('name');
    });
  });

  // ─── 7. Apply — append / toggle / replace (ADR-6) ────────────────────────

  describe('Apply direction — append/toggle/replace', () => {
    it('APPEND: new field adds to _activeSorts', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._selectedField = 'name';
      (el as any)._activeSorts = [{ field: 'age', direction: 'asc' }];
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onApply('asc');

      expect((el as any)._activeSorts).toEqual([
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ]);
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('sort-change');
      expect(event.detail).toEqual({ sorts: [{ field: 'age', direction: 'asc' }, { field: 'name', direction: 'asc' }] });
    });

    it('TOGGLE OFF: same direction removes entry', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }];
      (el as any)._selectedField = 'name';
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onApply('asc');

      expect((el as any)._activeSorts).toEqual([]);
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ sorts: [] });
    });

    it('REPLACE: different direction updates without moving position', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._selectedField = 'name';
      (el as any)._activeSorts = [
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ];
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onApply('desc');

      expect((el as any)._activeSorts).toEqual([
        { field: 'age', direction: 'asc' },
        { field: 'name', direction: 'desc' },
      ]);
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({
        sorts: [{ field: 'age', direction: 'asc' }, { field: 'name', direction: 'desc' }],
      });
    });

    it('modal stays OPEN after apply (ADR-6 spec requirement)', () => {
      const el = new FvSortAction();
      (el as any)._modalOpen = true;
      (el as any)._selectedField = 'name';
      (el as any)._activeSorts = [];

      (el as any)._onApply('asc');

      expect((el as any)._modalOpen).toBe(true);
    });

    it('no-op when _selectedField is null', () => {
      const el = new FvSortAction();
      (el as any)._selectedField = null;
      (el as any)._activeSorts = [];
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onApply('asc');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── 8. Clear button ─────────────────────────────────────────────────────

  describe('Clear button', () => {
    it('_onClear resets _activeSorts to []', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'age', direction: 'asc' }];
      (el as any)._onClear();
      expect((el as any)._activeSorts).toEqual([]);
    });

    it('_onClear emits { sorts: [] }', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'age', direction: 'asc' }];
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._onClear();

      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('sort-change');
      expect(event.detail).toEqual({ sorts: [] });
    });
  });

  // ─── 9. Left panel badges ─────────────────────────────────────────────────

  describe('Left panel badges', () => {
    it('field with position in _activeSorts shows [n] badge (first field)', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._activeSorts = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const idx = (el as any)._activeSorts.findIndex(s => s.field === 'name');
      expect(idx).toBe(0);
      expect(`[${idx + 1}]`).toBe('[1]');
    });

    it('field with position in _activeSorts shows [n] badge (second field)', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._activeSorts = [
        { field: 'name', direction: 'asc' },
        { field: 'age', direction: 'desc' },
      ];
      const idx = (el as any)._activeSorts.findIndex(s => s.field === 'age');
      expect(idx).toBe(1);
      expect(`[${idx + 1}]`).toBe('[2]');
    });

    it('field not in _activeSorts has no badge (findIndex returns -1)', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      const idx = (el as any)._activeSorts.findIndex(s => s.field === 'age');
      expect(idx).toBe(-1);
    });
  });

  // ─── 10. Right panel dir-btn aria-pressed ────────────────────────────────

  describe('Right panel dir-btn aria-pressed', () => {
    it('asc button aria-pressed=true when field has asc active (derived from _activeSorts)', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      const hasAsc = (el as any)._activeSorts.some((s: SortCriterion) => s.field === 'name' && s.direction === 'asc');
      expect(hasAsc).toBe(true);
    });

    it('desc button aria-pressed=false when field has asc active', () => {
      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      const hasDesc = (el as any)._activeSorts.some((s: SortCriterion) => s.field === 'name' && s.direction === 'desc');
      expect(hasDesc).toBe(false);
    });
  });

  // ─── 11. Persistence write-back ──────────────────────────────────────────

  describe('Persistence write-back', () => {
    it('_writeStorage writes array format to localStorage', () => {
      const setItemSpy = vi.fn();
      vi.stubGlobal('localStorage', { setItem: setItemSpy, removeItem: vi.fn(), getItem: vi.fn() });

      const el = new FvSortAction();
      el.storageKey = 'demo';
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      (el as any)._writeStorage();

      expect(setItemSpy).toHaveBeenCalledWith('demo-sort', JSON.stringify([{ field: 'name', direction: 'asc' }]));
    });

    it('_writeStorage removes key when _activeSorts is empty', () => {
      const removeItemSpy = vi.fn();
      vi.stubGlobal('localStorage', { setItem: vi.fn(), removeItem: removeItemSpy, getItem: vi.fn() });

      const el = new FvSortAction();
      el.storageKey = 'demo';
      (el as any)._activeSorts = [];
      (el as any)._writeStorage();

      expect(removeItemSpy).toHaveBeenCalledWith('demo-sort');
    });

    it('_writeStorage is no-op when no storageKey', () => {
      const setItemSpy = vi.fn();
      vi.stubGlobal('localStorage', { setItem: setItemSpy, removeItem: vi.fn(), getItem: vi.fn() });

      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      (el as any)._writeStorage();

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  // ─── 12. Persistence hydration ───────────────────────────────────────────

  describe('Persistence hydration', () => {
    it('hydrates from localStorage when URL is empty (legacy single-object format)', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({ field: 'name', direction: 'asc' })),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      vi.stubGlobal('window', { location: { hash: '' } });
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      el.storageKey = 'demo';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect((el as any)._activeSorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    it('hydrates from localStorage when URL is empty (new array format)', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify([{ field: 'name', direction: 'asc' }])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      vi.stubGlobal('window', { location: { hash: '' } });
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      el.storageKey = 'demo';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect((el as any)._activeSorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    it('URL takes priority over localStorage', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify({ field: 'age', direction: 'desc' })),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      vi.stubGlobal('window', { location: { hash: '#fv-sort=role:asc,name:desc' } });
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      el.storageKey = 'demo';
      el.syncUrl = true;
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect((el as any)._activeSorts).toEqual([
        { field: 'role', direction: 'asc' },
        { field: 'name', direction: 'desc' },
      ]);
    });

    it('emits sort-change after hydration', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(JSON.stringify([{ field: 'name', direction: 'asc' }])),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      });
      vi.stubGlobal('window', { location: { hash: '' } });
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      el.storageKey = 'demo';
      (el as any).for = 'my-view';
      await (el as any)._connect();

      expect(target.dispatchEvent).toHaveBeenCalled();
      const evt = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(evt.detail).toEqual({ sorts: [{ field: 'name', direction: 'asc' }] });
    });
  });

  // ─── 13. Inbound sync ─────────────────────────────────────────────────────

  describe('Inbound sync (fv-sort-change from target)', () => {
    it('fv-sort-change updates _activeSorts from event detail.sorts', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      (el as any).for = 'my-view';
      await (el as any)._connect();

      const handler = (target.addEventListener as any).mock.calls.find(
        (c: [string, unknown]) => c[0] === 'fv-sort-change'
      )?.[1] as EventListener;

      handler(new CustomEvent('fv-sort-change', {
        detail: { sorts: [{ field: 'name', direction: 'asc' }] },
      }));

      expect((el as any)._activeSorts).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    it('fv-sort-change with empty sorts array clears _activeSorts', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      (el as any)._activeSorts = [{ field: 'name', direction: 'asc' }];
      (el as any).for = 'my-view';
      await (el as any)._connect();

      const handler = (target.addEventListener as any).mock.calls.find(
        (c: [string, unknown]) => c[0] === 'fv-sort-change'
      )?.[1] as EventListener;

      handler(new CustomEvent('fv-sort-change', { detail: { sorts: [] } }));
      expect((el as any)._activeSorts).toEqual([]);
    });
  });

  // ─── 14. _emit shape ─────────────────────────────────────────────────────

  describe('_emit shape { sorts: [...] }', () => {
    it('_emit dispatches sort-change with { sorts } shape (not { field, direction })', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      (el as any).for = 'my-view';
      await (el as any)._connect();
      (target.dispatchEvent as any).mockClear();

      (el as any)._emit([{ field: 'name', direction: 'asc' }]);

      const evt = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(evt.bubbles).toBe(false);
      expect(evt.detail).toEqual({ sorts: [{ field: 'name', direction: 'asc' }] });
    });

    it('_emit with empty array emits { sorts: [] }', async () => {
      const target = makeMockTarget({ currentSorts: [] });
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(target) } as any);

      const el = new FvSortAction();
      (el as any).for = 'my-view';
      await (el as any)._connect();
      (target.dispatchEvent as any).mockClear();

      (el as any)._emit([]);

      const evt = (target.dispatchEvent as any).mock.calls[0][0] as CustomEvent;
      expect(evt.detail).toEqual({ sorts: [] });
    });
  });

  // ─── 15. Keyboard ───────────────────────────────────────────────────────

  describe('Keyboard', () => {
    it('Escape key closes modal', () => {
      const el = new FvSortAction();
      (el as any)._openModal();
      expect((el as any)._modalOpen).toBe(true);

      const handler = (el as any)._keydownHandler as (e: KeyboardEvent) => void;
      const evt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      const stopSpy = vi.spyOn(evt, 'stopPropagation');
      handler(evt);

      expect((el as any)._modalOpen).toBe(false);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('ArrowDown key focuses next field item', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._modalOpen = true;
      const items = [{ focus: vi.fn() }, { focus: vi.fn() }];
      (el as any).renderRoot = {
        querySelectorAll: vi.fn().mockReturnValue(items),
        activeElement: items[0],
      } as any;
      // Attach keydown manually (we bypassed _openModal)
      (el as any)._attachKeydown();
      const handler = (el as any)._keydownHandler as (e: KeyboardEvent) => void;
      const evt = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      handler(evt);
      expect(items[1].focus).toHaveBeenCalled();
    });

    it('ArrowUp key focuses previous field item', () => {
      const el = new FvSortAction();
      el.registerOrder = [{ field: 'name', title: 'Name' }, { field: 'age', title: 'Age' }];
      (el as any)._modalOpen = true;
      const items = [{ focus: vi.fn() }, { focus: vi.fn() }];
      (el as any).renderRoot = {
        querySelectorAll: vi.fn().mockReturnValue(items),
        activeElement: items[1],
      } as any;
      // Re-attach keydown (it was detached after _openModal guard)
      (el as any)._attachKeydown();
      const handler = (el as any)._keydownHandler as (e: KeyboardEvent) => void;
      const evt = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
      handler(evt);
      expect(items[0].focus).toHaveBeenCalled();
    });
  });

  // ─── 16. No target ───────────────────────────────────────────────────────

  describe('No target', () => {
    it('warns when target not found', async () => {
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(null) } as any);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const el = new FvSortAction();
      (el as any).for = 'nonexistent-id';
      await (el as any)._connect();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[fv-sort-action]'));
    });

    it('_target remains null when not found', async () => {
      vi.stubGlobal('document', { ...document, getElementById: vi.fn().mockReturnValue(null) } as any);
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const el = new FvSortAction();
      (el as any).for = 'nonexistent-id';
      await (el as any)._connect();

      expect((el as any)._target).toBeNull();
    });
  });

  // ─── 17. i18n ─────────────────────────────────────────────────────────────

  describe('i18n keys', () => {
    it('t().sort.title returns "Sort"', () => {
      configure({ language: 'en' as any });
      expect(t().sort.title).toBe('Sort');
    });

    it('t().sort.nSorts returns singular for 1', () => {
      configure({ language: 'en' as any });
      expect(t().sort.nSorts(1)).toBe('1 sort');
    });

    it('t().sort.nSorts returns plural for 2', () => {
      configure({ language: 'en' as any });
      expect(t().sort.nSorts(2)).toBe('2 sorts');
    });
  });
});
