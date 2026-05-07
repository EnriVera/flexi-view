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

function makeMockExportTarget(overrides: Record<string, unknown> = {}) {
  return {
    filteredData: [] as Record<string, unknown>[],
    columnDefs: [] as Array<{ title: string; field?: string; exportable?: boolean }>,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  };
}

describe('FvExportAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches fv-export-request before performing export', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.registers = [{ name: 'Alice' }];
    el.fieldGrids = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-request');
  });

  it('dispatches fv-export-done after successful CSV export', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.registers = [{ name: 'Bob' }];
    el.fieldGrids = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-done');
  });

  it('dispatches fv-export-error when XLSX loader is not configured', async () => {
    const el = new FvExportAction();
    el.format = 'xlsx';
    el.registers = [];
    el.fieldGrids = [];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const events = spy.mock.calls.map(c => (c[0] as CustomEvent).type);
    expect(events).toContain('fv-export-error');
  });

  it('fv-export-request contains format, columns, and rows', async () => {
    const el = new FvExportAction();
    el.format = 'csv';
    el.registers = [{ name: 'Carol' }];
    el.fieldGrids = [{ title: 'Name', field: 'name' }];
    const spy = vi.spyOn(el, 'dispatchEvent');

    await (el as any)._onClick();

    const requestEvent = spy.mock.calls
      .map(c => c[0] as CustomEvent)
      .find(e => e.type === 'fv-export-request')!;
    expect(requestEvent.detail.format).toBe('csv');
    expect(requestEvent.detail.rows).toEqual([{ name: 'Carol' }]);
    expect(requestEvent.detail.columns).toHaveLength(1);
  });

  describe('external mode — for attribute (T5)', () => {
    it('has a for property that defaults to undefined', () => {
      const el = new FvExportAction();
      expect((el as any).for).toBeUndefined();
    });

    it('resolves fv-view by getElementById when for is set', async () => {
      const target = makeMockExportTarget({
        filteredData: [{ name: 'Alice' }],
        columnDefs: [{ title: 'Name', field: 'name' }],
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        createElement: vi.fn().mockReturnValue({ href: '', download: '', click: vi.fn() }),
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvExportAction();
      (el as any).for = 'my-view';
      el.format = 'csv';
      await (el as any)._connect();

      expect((el as any)._target).toBe(target);
    });

    it('reads target.filteredData and target.columnDefs at click time in external mode', async () => {
      const target = makeMockExportTarget({
        filteredData: [{ name: 'Alice' }, { name: 'Bob' }],
        columnDefs: [{ title: 'Name', field: 'name' }],
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        createElement: vi.fn().mockReturnValue({ href: '', download: '', click: vi.fn() }),
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvExportAction();
      (el as any).for = 'my-view';
      el.format = 'csv';
      el.filename = 'test';
      await (el as any)._connect();

      const spy = vi.spyOn(el, 'dispatchEvent');
      await (el as any)._onClick();

      const requestEvent = spy.mock.calls
        .map(c => c[0] as CustomEvent)
        .find(e => e.type === 'fv-export-request')!;
      expect(requestEvent.detail.rows).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
      expect(requestEvent.detail.columns).toHaveLength(1);
    });

    it('respects exportable: false — filters out non-exportable columns', async () => {
      const target = makeMockExportTarget({
        filteredData: [{ name: 'Alice', secret: 'x' }],
        columnDefs: [
          { title: 'Name', field: 'name', exportable: true },
          { title: 'Secret', field: 'secret', exportable: false },
        ],
      });
      vi.stubGlobal('document', {
        adoptedStyleSheets,
        createElement: vi.fn().mockReturnValue({ href: '', download: '', click: vi.fn() }),
        getElementById: vi.fn().mockReturnValue(target),
      });

      const el = new FvExportAction();
      (el as any).for = 'my-view';
      el.format = 'csv';
      el.filename = 'test';
      await (el as any)._connect();

      const spy = vi.spyOn(el, 'dispatchEvent');
      await (el as any)._onClick();

      const requestEvent = spy.mock.calls
        .map(c => c[0] as CustomEvent)
        .find(e => e.type === 'fv-export-request')!;
      expect(requestEvent.detail.columns).toHaveLength(1);
      expect(requestEvent.detail.columns[0].field).toBe('name');
    });

    it('injected mode (no for) still uses own registers and fieldGrids — regression', async () => {
      const el = new FvExportAction();
      el.format = 'csv';
      el.registers = [{ name: 'Carol' }];
      el.fieldGrids = [{ title: 'Name', field: 'name' }];
      const spy = vi.spyOn(el, 'dispatchEvent');

      await (el as any)._onClick();

      const requestEvent = spy.mock.calls
        .map(c => c[0] as CustomEvent)
        .find(e => e.type === 'fv-export-request')!;
      expect(requestEvent.detail.rows).toEqual([{ name: 'Carol' }]);
      expect(requestEvent.detail.columns[0].field).toBe('name');
    });
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
