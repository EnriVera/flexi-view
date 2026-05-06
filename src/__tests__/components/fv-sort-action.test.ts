import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub adoptedStyleSheets before any registry import
const adoptedStyleSheets: unknown[] = [];
vi.stubGlobal('CSSStyleSheet', class { replaceSync = vi.fn(); });
vi.stubGlobal('document', { adoptedStyleSheets });

const defined = new Map<string, CustomElementConstructor>();
vi.stubGlobal('customElements', {
  get: (tag: string) => defined.get(tag),
  whenDefined: () => Promise.resolve(),
  define: (tag: string, ctor: CustomElementConstructor) => { defined.set(tag, ctor); },
});

import { _resetRegistryForTesting, configure, subscribeConfig, DEFAULT_ICONS } from '../../registry.js';
import { FvSortAction } from '../../components/fv-sort-action.js';

describe('FvSortAction', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches sort-change with asc direction when direction is asc', () => {
    const el = new FvSortAction();
    el.field = 'name';
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('sort-change');
    expect(event.detail.field).toBe('name');
    expect(event.detail.direction).toBe('asc');
  });

  it('dispatches sort-change with desc direction when direction is desc', () => {
    const el = new FvSortAction();
    el.field = 'age';
    el.direction = 'desc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.direction).toBe('desc');
    expect(event.detail.field).toBe('age');
  });

  it('event bubbles and is composed', () => {
    const el = new FvSortAction();
    el.field = 'status';
    el.direction = 'asc';
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClick();

    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('active prop defaults to false', () => {
    const el = new FvSortAction();
    expect(el.active).toBe(false);
  });

  it('subscribeConfig fires requestUpdate; unsubscribe stops it', () => {
    const el = new FvSortAction();
    const updateSpy = vi.spyOn(el, 'requestUpdate').mockImplementation(() => {});

    // Simulate what connectedCallback does internally (bypass super which needs DOM)
    (el as any)._unsubscribeConfig = subscribeConfig(() => el.requestUpdate());
    configure({ darkMode: 'light' });
    expect(updateSpy).toHaveBeenCalled();

    updateSpy.mockClear();
    // Simulate disconnectedCallback
    (el as any)._unsubscribeConfig?.();
    configure({ darkMode: 'dark' });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
