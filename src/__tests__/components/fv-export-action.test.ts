import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', {
  adoptedStyleSheets,
  createElement: vi.fn().mockReturnValue({ href: '', download: '', click: vi.fn() }),
});

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});
vi.stubGlobal('Blob', class MockBlob {
  constructor(public parts: string[]) {}
  get _content() { return this.parts.join(''); }
});
vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock'),
  revokeObjectURL: vi.fn(),
});

import { _resetRegistryForTesting, configure, subscribeConfig, DEFAULT_ICONS } from '../../registry.js';
import { FvExportAction } from '../../components/fv-export-action.js';

describe('FvExportAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches fv-export-request before performing export', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.data = [{ name: 'Alice' }];
    el.columns = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-request');
  });

  it('dispatches fv-export-done after successful CSV export', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.data = [{ name: 'Bob' }];
    el.columns = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-done');
  });

  it('dispatches fv-export-error when XLSX loader is not configured', async () => {
    const el = new FvExportAction();
    el.format = 'xlsx';
    el.data = [];
    el.columns = [];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-error');
  });

  it('fv-export-request contains format, columns, and rows', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.data = [{ name: 'Carol' }];
    el.columns = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const requestEvent = spy.mock.calls
      .map(c => c[0] as CustomEvent)
      .find(e => e.type === 'fv-export-request')!;
    expect(requestEvent.detail.format).toBe('csv');
    expect(requestEvent.detail.rows).toEqual([{ name: 'Carol' }]);
    expect(requestEvent.detail.columns).toHaveLength(1);
  });

  it('uses default export icon from DEFAULT_ICONS', () => {
    const el = new FvExportAction();
    // render() calls getFlexiConfig().icons.export — verify default is present
    const icons = DEFAULT_ICONS;
    expect(icons.export).toBeTruthy();
    expect(icons.export).toContain('<svg');
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvExportAction();
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
