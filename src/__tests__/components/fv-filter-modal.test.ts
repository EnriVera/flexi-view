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

import { _resetRegistryForTesting, DEFAULT_ICONS } from '../../registry.js';
import { FvFilterModal } from '../../components/fv-filter-modal.js';

describe('FvFilterModal', () => {
  beforeEach(() => {
    defined.clear();
    _resetRegistryForTesting();
    adoptedStyleSheets.length = 0;
  });

  it('dispatches filter-change with selected array when clicking apply', () => {
    const el = new FvFilterModal();
    el.field = 'status';
    el.options = ['active', 'inactive', 'pending'];
    el.selected = [];
    el.open = true;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('active', true);
    (el as any)._onApply();

    // _onApply dispatches filter-change, then closes which dispatches modal-close
    expect(spy).toHaveBeenCalledTimes(2);
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('filter-change');
    expect(event.detail.field).toBe('status');
    expect(event.detail.value).toEqual(['active']);
  });

  it('clears selection and dispatches null when clicking clear', () => {
    const el = new FvFilterModal();
    el.field = 'status';
    el.options = ['active', 'inactive'];
    el.selected = ['active'];
    el.open = true;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onClear();

    // _onClear only dispatches filter-change (does NOT close modal)
    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toBeNull();
  });

  it('dispatches modal-close when clicking backdrop', () => {
    const el = new FvFilterModal();
    el.open = true;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onBackdropClick();

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('modal-close');
  });

  it('dispatches modal-close when clicking close button', () => {
    const el = new FvFilterModal();
    el.open = true;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._close();

    expect(spy).toHaveBeenCalledOnce();
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('modal-close');
  });

  it('accumulates multiple selections when checking multiple', () => {
    const el = new FvFilterModal();
    el.field = 'role';
    el.options = ['admin', 'user', 'guest'];
    el.selected = [];
    el.open = true;
    const spy = vi.spyOn(el, 'dispatchEvent');

    (el as any)._onChange('admin', true);
    (el as any)._onChange('user', true);
    (el as any)._onApply();

    // filter-change + modal-close
    expect(spy).toHaveBeenCalledTimes(2);
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.value).toEqual(['admin', 'user']);
  });

  it('CSS close-btn uses var(--fv-text-muted) not hardcoded #666', () => {
    const styles = FvFilterModal.styles.toString();
    expect(styles).toContain('var(--fv-text-muted');
    expect(styles).not.toContain('color: #666');
  });

  it('DEFAULT_ICONS has a close icon', () => {
    expect(DEFAULT_ICONS.close).toBeTruthy();
    expect(DEFAULT_ICONS.close).toContain('<svg');
  });
});
