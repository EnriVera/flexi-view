import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureGrid, resolveControl, _resetRegistryForTesting } from '../../registry.js';

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
