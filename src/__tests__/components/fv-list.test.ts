import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FvList } from '../../components/fv-list.js';

describe('FvList', () => {
  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
  });

  describe('_rowClick', () => {
    it('dispatchea row-click con item e index', () => {
      const element = new FvList();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._rowClick({ name: 'Alice' }, 0);
      
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('row-click');
      expect(event.detail.item.name).toBe('Alice');
      expect(event.detail.index).toBe(0);
    });

    it('pasa el index correcto', () => {
      const element = new FvList();
      const dispatchSpy = vi.spyOn(element, 'dispatchEvent');
      
      (element as any)._rowClick({ name: 'Bob' }, 5);
      
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.index).toBe(5);
    });
  });
});