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

  describe('_sort', () => {
    it('dispatchea sort-change con direction asc cuando es primer sort', () => {
      const element = new FvGrid();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      (element as any).columns = [{ field: 'name', title: 'Name', sortable: true }];
      
      const col = (element as any).columns[0];
      (element as any)._sort(col);
      
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('sort-change');
      expect(event.detail.field).toBe('name');
      expect(event.detail.direction).toBe('asc');
    });

    it('toggle direction a desc en segundo click', () => {
      const element = new FvGrid();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      (element as any)._sortField = 'name';
      (element as any)._sortDir = 'asc';
      (element as any).columns = [{ field: 'name', title: 'Name', sortable: true }];
      
      const col = (element as any).columns[0];
      (element as any)._sort(col);
      
      expect((element as any)._sortDir).toBe('desc');
    });

    it('resetea a asc cuando cambia de campo', () => {
      const element = new FvGrid();
      (element as any)._sortField = 'name';
      (element as any)._sortDir = 'desc';
      (element as any).columns = [{ field: 'age', title: 'Age', sortable: true }];
      
      const col = (element as any).columns[0];
      (element as any)._sort(col);
      
      expect((element as any)._sortField).toBe('age');
      expect((element as any)._sortDir).toBe('asc');
    });
  });

  describe('_emitFilter', () => {
    it('dispatchea filter-change con el valor', () => {
      const element = new FvGrid();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._emitFilter({ field: 'name', title: 'Name' }, 'Alice');
      
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('filter-change');
      expect(event.detail.field).toBe('name');
      expect(event.detail.value).toBe('Alice');
    });

    it('usa title como field cuando field es undefined', () => {
      const element = new FvGrid();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._emitFilter({ field: undefined, title: 'Name' }, 'test');
      
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.field).toBe('Name');
    });
  });

  // Los tests de _renderCell requieren lifecycle completo de Lit
  // Se跳过an por ahora - cubiertos por tests de integración E2E
});