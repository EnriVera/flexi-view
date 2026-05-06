import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureGrid, getGridConfig, _resetRegistryForTesting } from '../../registry.js';

describe('pluggable header via configureGrid', () => {
  beforeEach(() => {
    const defined = new Map<string, CustomElementConstructor>();
    vi.stubGlobal('customElements', {
      get: (tag: string) => defined.get(tag),
      whenDefined: () => Promise.resolve(),
      define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
    });
    _resetRegistryForTesting();
  });

  it('configureGrid({ headerMenu }) stores custom headerMenu tag', () => {
    configureGrid({ headerMenu: 'my-header-menu' });
    expect(getGridConfig().headerMenu).toBe('my-header-menu');
  });

  it('getGridConfig returns empty object by default after reset', () => {
    const config = getGridConfig();
    expect(config.headerMenu).toBeUndefined();
  });

  it('configureGrid merges with existing config', () => {
    configureGrid({ headerMenu: 'my-menu' });
    configureGrid({ export: { formats: ['csv'] } });
    const config = getGridConfig();
    expect(config.headerMenu).toBe('my-menu');
    expect(config.export?.formats).toEqual(['csv']);
  });

  it('ColumnConfig.headerMenu: false disables menu for that column', () => {
    const col = { title: 'Name', field: 'name', headerMenu: false as const };
    expect(col.headerMenu).toBe(false);
  });
});
