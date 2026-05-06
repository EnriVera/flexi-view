import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', { adoptedStyleSheets });

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, configure, subscribeConfig } from '../../registry.js';
import { FvFilterAction } from '../../components/fv-filter-action.js';

describe('FvFilterAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches filter-change with selected array when checking an option', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active', 'inactive', 'pending'];
    el.selected = [];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', true);

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('filter-change');
    expect(event.detail.field).toBe('status');
    expect(event.detail.value).toEqual(['active']);
  });

  it('removes value from selected array when unchecking', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active', 'inactive', 'pending'];
    el.selected = ['active', 'inactive'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', false);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toEqual(['inactive']);
  });

  it('dispatches null when unchecking the last selected option', () => {
    const el = new FvFilterAction();
    el.field = 'status';
    el.options = ['active'];
    el.selected = ['active'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', false);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toBeNull();
  });

  it('accumulates multiple selections', () => {
    const el = new FvFilterAction();
    el.field = 'role';
    el.options = ['admin', 'user'];
    el.selected = ['admin'];
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('user', true);

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toEqual(['admin', 'user']);
  });

  it('CSS .empty uses var(--fv-text-muted) not hardcoded #999', () => {
    const styles = FvFilterAction.styles.toString();
    expect(styles).toContain('var(--fv-text-muted');
    expect(styles).not.toContain('#999');
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvFilterAction();
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
