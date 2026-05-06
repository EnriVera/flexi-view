import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FvGrid } from '../../components/fv-grid.js';

describe('FvGrid', () => {
  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
  });

  describe('stateless props', () => {
    it('accepts currentSort as a prop without error', () => {
      const el = new FvGrid();
      expect(() => {
        el.currentSort = { field: 'name', direction: 'asc' };
      }).not.toThrow();
      expect(el.currentSort?.field).toBe('name');
    });

    it('accepts currentFilters as a prop without error', () => {
      const el = new FvGrid();
      expect(() => {
        el.currentFilters = { name: 'Alice' };
      }).not.toThrow();
      expect(el.currentFilters.name).toBe('Alice');
    });

    it('does not have _sortField or _sortDir internal state', () => {
      const el = new FvGrid();
      expect((el as any)._sortField).toBeUndefined();
      expect((el as any)._sortDir).toBeUndefined();
    });

    it('currentSort defaults to null', () => {
      const el = new FvGrid();
      expect(el.currentSort).toBeNull();
    });
  });

  describe('header-menu-open event', () => {
    it('dispatches header-menu-open when _onHeaderClick is called', () => {
      const el = new FvGrid();
      const spy = vi.spyOn(el, 'dispatchEvent');
      const col = { field: 'name', title: 'Name', sortable: true };

      (el as any)._onHeaderClick(col);

      expect(spy).toHaveBeenCalledOnce();
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('header-menu-open');
      expect(event.detail.column).toEqual(col);
      expect(event.detail.field).toBe('name');
    });

    it('header-menu-open event bubbles and is composed', () => {
      const el = new FvGrid();
      const spy = vi.spyOn(el, 'dispatchEvent');
      const col = { field: 'age', title: 'Age' };

      (el as any)._onHeaderClick(col);

      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });

  describe('_emitFilter', () => {
    it('dispatches filter-change with the value', () => {
      const el = new FvGrid();
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._emitFilter({ field: 'name', title: 'Name' }, 'Alice');

      expect(spy).toHaveBeenCalled();
      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('filter-change');
      expect(event.detail.field).toBe('name');
      expect(event.detail.value).toBe('Alice');
    });

    it('uses title as field when field is undefined', () => {
      const el = new FvGrid();
      const spy = vi.spyOn(el, 'dispatchEvent');

      (el as any)._emitFilter({ field: undefined, title: 'Name' }, 'test');

      const event = spy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.field).toBe('Name');
    });
  });
});
