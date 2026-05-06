import { describe, it, expect, vi, beforeEach } from 'vitest';

// No CSSStyleSheet stub needed — jsdom supports it natively.
// We stub customElements as it's needed by resolveControl.
const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: (tag: string) => {
    if (defined.has(tag)) return Promise.resolve(defined.get(tag)!);
    return Promise.resolve(undefined as unknown as CustomElementConstructor);
  },
  define: (tag: string, ctor: CustomElementConstructor) => {
    defined.set(tag, ctor);
  },
});

import {
  configureGrid,
  resolveControl,
  _resetRegistryForTesting,
  configure,
  subscribeConfig,
  getFlexiConfig,
  _buildStylesheet,
  LIGHT_TOKENS,
  DARK_TOKENS,
} from '../../registry.js';

describe('configureGrid', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
  });

  it('stores loader and calls it when control is not yet defined', async () => {
    const loader = vi.fn().mockImplementation(() => {
      defined.set('lazy-cell', class extends HTMLElement {});
      return Promise.resolve();
    });
    configureGrid({ controls: { 'lazy-cell': loader } });

    await resolveControl('lazy-cell');

    expect(loader).toHaveBeenCalledOnce();
  });

  it('does not call loader if element is already defined', async () => {
    const loader = vi.fn().mockResolvedValue(undefined);
    configureGrid({ controls: { 'pre-defined': loader } });
    defined.set('pre-defined', class extends HTMLElement {});

    await resolveControl('pre-defined');

    expect(loader).not.toHaveBeenCalled();
  });

  it('accepts controls: undefined without error', () => {
    expect(() => configureGrid({})).not.toThrow();
  });
});

describe('resolveControl', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
  });

  it('calls customElements.whenDefined', async () => {
    const spy = vi.spyOn(customElements, 'whenDefined');
    defined.set('known-cell', class extends HTMLElement {});

    await resolveControl('known-cell');

    expect(spy).toHaveBeenCalledWith('known-cell');
  });
});

describe('_buildStylesheet — pure CSS generation', () => {
  it('light mode: emits :root block with light tokens', () => {
    const css = _buildStylesheet({ darkMode: 'light' });
    expect(css).toContain(':root');
    expect(css).toContain('--fv-bg: #ffffff');
    expect(css).toContain('--fv-primary: #1976d2');
    expect(css).not.toContain('@media');
  });

  it('dark mode: emits :root with dark tokens, no @media', () => {
    const css = _buildStylesheet({ darkMode: 'dark' });
    expect(css).toContain(':root');
    expect(css).toContain('--fv-bg: #1e1e2e');
    expect(css).toContain('--fv-primary: #89b4fa');
    expect(css).not.toContain('@media');
  });

  it('auto mode: emits @media (prefers-color-scheme: dark)', () => {
    const css = _buildStylesheet({ darkMode: 'auto' });
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('--fv-bg: #ffffff'); // light in :root
    expect(css).toContain('--fv-bg: #1e1e2e'); // dark in @media
  });

  it('no darkMode defaults to light tokens', () => {
    const css = _buildStylesheet({});
    expect(css).toContain('--fv-bg: #ffffff');
    expect(css).not.toContain('@media');
  });

  it('consumer theme overrides a token in light mode', () => {
    const css = _buildStylesheet({ darkMode: 'light', theme: { primary: '#6200ea' } });
    expect(css).toContain('--fv-primary: #6200ea');
    // Other tokens unaffected
    expect(css).toContain('--fv-bg: #ffffff');
  });

  it('consumer theme overrides a token in dark mode', () => {
    const css = _buildStylesheet({ darkMode: 'dark', theme: { primary: '#6200ea' } });
    expect(css).toContain('--fv-primary: #6200ea');
    expect(css).toContain('--fv-bg: #1e1e2e');
  });
});

describe('configure — merge behavior', () => {
  beforeEach(() => {
    _resetRegistryForTesting();
  });

  it('returns default icons and light tokens without any configure call', () => {
    const config = getFlexiConfig();
    expect(config.darkMode).toBe('light');
    expect(config.icons.sortAsc).toBeTruthy();
    expect(config.icons.gridView).toBeTruthy();
    expect(config.theme.bg).toBe('#ffffff');
    expect(config.theme.primary).toBe('#1976d2');
  });

  it('deep-merges: second call keeps fields from first', () => {
    configure({ darkMode: 'dark' });
    configure({ icons: { export: '<i class="ti-download">' } });

    const config = getFlexiConfig();
    expect(config.darkMode).toBe('dark');
    expect(config.icons.export).toBe('<i class="ti-download">');
    // Other icon keys remain as defaults
    expect(config.icons.sortAsc).toBeTruthy();
  });

  it('deep-merges icons: second call does not wipe first icon override', () => {
    configure({ icons: { sortAsc: '<span>UP</span>' } });
    configure({ icons: { sortDesc: '<span>DN</span>' } });

    const config = getFlexiConfig();
    expect(config.icons.sortAsc).toBe('<span>UP</span>');
    expect(config.icons.sortDesc).toBe('<span>DN</span>');
  });

  it('notifies subscribers on configure()', () => {
    const cb = vi.fn();
    subscribeConfig(cb);
    configure({ darkMode: 'light' });
    expect(cb).toHaveBeenCalledOnce();
  });

  it('does NOT notify after unsubscribe', () => {
    const cb = vi.fn();
    const unsub = subscribeConfig(cb);
    unsub();
    configure({ darkMode: 'light' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('multiple subscribers all get notified', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribeConfig(cb1);
    subscribeConfig(cb2);
    configure({});
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });
});

describe('configure — adoptedStyleSheets injection', () => {
  beforeEach(() => {
    _resetRegistryForTesting();
    // Clean adoptedStyleSheets between tests
    document.adoptedStyleSheets = [];
  });

  it('adds the sheet to document.adoptedStyleSheets on first configure()', () => {
    configure({ darkMode: 'light' });
    expect(document.adoptedStyleSheets.length).toBe(1);
  });

  it('multiple configure() calls do not duplicate sheets', () => {
    configure({ darkMode: 'light' });
    configure({ darkMode: 'dark' });
    expect(document.adoptedStyleSheets.length).toBe(1);
  });

  it('SSR guard: configure() does not throw when adoptedStyleSheets is undefined', () => {
    const originalDoc = global.document;
    vi.stubGlobal('document', { adoptedStyleSheets: undefined });
    expect(() => configure({ darkMode: 'light' })).not.toThrow();
    vi.stubGlobal('document', originalDoc);
  });
});

describe('_resetRegistryForTesting', () => {
  beforeEach(() => {
    document.adoptedStyleSheets = [];
  });

  it('clears _flexiConfig after reset', () => {
    configure({ darkMode: 'dark', icons: { export: '<x>' } });
    _resetRegistryForTesting();

    const config = getFlexiConfig();
    expect(config.darkMode).toBe('light');
    expect(config.icons.export).not.toBe('<x>');
  });

  it('clears subscribers after reset', () => {
    const cb = vi.fn();
    subscribeConfig(cb);
    configure({ darkMode: 'dark' });
    cb.mockClear();

    _resetRegistryForTesting();
    configure({});

    expect(cb).not.toHaveBeenCalled();
  });

  it('removes the managed sheet from adoptedStyleSheets after reset', () => {
    configure({ darkMode: 'light' });
    expect(document.adoptedStyleSheets.length).toBe(1);

    _resetRegistryForTesting();
    expect(document.adoptedStyleSheets.length).toBe(0);
  });
});
