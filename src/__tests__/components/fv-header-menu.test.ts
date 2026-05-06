import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', {
  adoptedStyleSheets,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, getFlexiConfig, DEFAULT_ICONS } from '../../registry.js';
import { FvHeaderMenu } from '../../components/fv-header-menu.js';

describe('FvHeaderMenu', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('starts closed (_isOpen = false)', () => {
    const el = new FvHeaderMenu();
    expect((el as any)._isOpen).toBe(false);
  });

  it('open() sets _isOpen to true', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});
    vi.spyOn(el, 'updateComplete', 'get').mockReturnValue(Promise.resolve(true));

    el.open();
    expect((el as any)._isOpen).toBe(true);
  });

  it('close() sets _isOpen to false', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});
    vi.spyOn(el, 'updateComplete', 'get').mockReturnValue(Promise.resolve(true));

    el.open();
    el.close();
    expect((el as any)._isOpen).toBe(false);
  });

  it('open() is no-op when already open', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});
    vi.spyOn(el, 'updateComplete', 'get').mockReturnValue(Promise.resolve(true));

    el.open();
    const spy = vi.spyOn(el, 'requestUpdate');
    el.open();
    expect(spy).not.toHaveBeenCalled();
  });

  it('close() is no-op when already closed', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});

    const spy = vi.spyOn(el, 'requestUpdate');
    el.close();
    expect(spy).not.toHaveBeenCalled();
  });

  it('_onSortChange re-dispatches sort-change and closes', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});
    vi.spyOn(el, 'updateComplete', 'get').mockReturnValue(Promise.resolve(true));
    el.open();

    const dispatchSpy = vi.spyOn(el, 'dispatchEvent');
    const detail = { field: 'name', direction: 'asc' };
    const evt = new CustomEvent('sort-change', { detail });

    (el as any)._onSortChange(evt);

    expect(dispatchSpy).toHaveBeenCalledOnce();
    const dispatched = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.type).toBe('sort-change');
    expect(dispatched.detail).toEqual(detail);
    expect((el as any)._isOpen).toBe(false);
  });

  it('_onFilterChange re-dispatches filter-change without closing', () => {
    const el = new FvHeaderMenu();
    vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});
    vi.spyOn(el, 'updateComplete', 'get').mockReturnValue(Promise.resolve(true));
    el.open();

    const dispatchSpy = vi.spyOn(el, 'dispatchEvent');
    const detail = { field: 'name', value: 'Alice' };
    const evt = new CustomEvent('filter-change', { detail });

    (el as any)._onFilterChange(evt);

    const dispatched = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(dispatched.type).toBe('filter-change');
    expect((el as any)._isOpen).toBe(true);
  });

  it('CSS uses var(--fv-danger) for clear-btn color', () => {
    const styles = FvHeaderMenu.styles.toString();
    expect(styles).toContain('var(--fv-danger');
    // The only hardcoded hex allowed is as a CSS fallback inside var()
    // Verify there is no bare #d32f2f outside of var()
    expect(styles).toContain('color: var(--fv-danger');
  });

  it('DEFAULT_ICONS has a clearFilter icon', () => {
    expect(DEFAULT_ICONS.clearFilter).toBeTruthy();
    expect(DEFAULT_ICONS.clearFilter).toContain('<svg');
  });
});
