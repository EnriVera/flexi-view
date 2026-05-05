import { describe, it, expect, beforeEach } from 'vitest';
import { readState, writeState } from '../../utils/persistence.js';

const KEY = 'test-persist-key';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes state to localStorage', () => {
    writeState(KEY, { activeView: 'list', filters: {}, sortConfig: null });
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).activeView).toBe('list');
  });

  it('reads state from localStorage', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ activeView: 'cards', filters: { name: 'alice' }, sortConfig: null })
    );
    const state = readState(KEY);
    expect(state?.activeView).toBe('cards');
    expect(state?.filters?.name).toBe('alice');
  });

  it('write no-ops when key is undefined', () => {
    writeState(undefined, { activeView: 'grid', filters: {}, sortConfig: null });
    expect(localStorage.length).toBe(0);
  });

  it('read returns null when key is undefined', () => {
    expect(readState(undefined)).toBeNull();
  });

  it('read returns null when nothing stored', () => {
    expect(readState(KEY)).toBeNull();
  });

  it('overwrites existing state on write', () => {
    writeState(KEY, { activeView: 'grid', filters: {}, sortConfig: null });
    writeState(KEY, { activeView: 'cards', filters: { dept: 'eng' }, sortConfig: null });
    const state = readState(KEY);
    expect(state?.activeView).toBe('cards');
    expect(state?.filters?.dept).toBe('eng');
  });
});
