import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FvCards } from '../../components/fv-cards.js';

describe('FvCards', () => {
  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
  });

  describe('_renderField', () => {
    it('retorna vacío cuando visible=false', () => {
      const element = new FvCards();
      const row = { name: 'Alice', id: 1 };
      const col = { field: 'id', title: 'ID', visible: false };
      
      const result = (element as any)._renderField(row, col, 0);
      const html = result.strings.join('');
      
      // Debe retornar template vacío
      expect(html).toBe('');
    });

    // Los tests de render con valores requieren lifecycle completo de Lit
    // Se跳过an por ahora - cubiertos por tests de integración E2E
  });

  describe('_rowClick', () => {
    it('dispatchea row-click con item e index', () => {
      const element = new FvCards();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._rowClick({ title: 'Alice' }, 0);
      
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('row-click');
      expect(event.detail.item.title).toBe('Alice');
      expect(event.detail.index).toBe(0);
    });
  });
});