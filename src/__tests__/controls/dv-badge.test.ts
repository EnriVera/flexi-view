import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DvBadge } from '../../controls/dv-badge.js';

describe('DvBadge', () => {
  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
  });

  describe('Props', () => {
    it('acepta item y params como properties', () => {
      const element = new DvBadge();
      (element as any).item = { status: 'active' };
      (element as any).params = { field: 'status' };
      
      expect((element as any).item.status).toBe('active');
      expect((element as any).params.field).toBe('status');
    });

    it('acepta color en params', () => {
      const element = new DvBadge();
      (element as any).params = { field: 'status', color: '#ff0000' };
      
      expect((element as any).params.color).toBe('#ff0000');
    });
  });
});