import { describe, it, expect } from 'vitest';
import { applySort, applyFilters } from '../../utils/sort-filter.js';

const items = [
  { name: 'Charlie', age: 30, status: 'active' },
  { name: 'Alice', age: 25, status: 'inactive' },
  { name: 'Bob', age: 35, status: 'active' },
];

describe('applySort', () => {
  it('sorts asc', () => {
    const result = applySort(items, { field: 'name', direction: 'asc' });
    expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts desc', () => {
    const result = applySort(items, { field: 'name', direction: 'desc' });
    expect(result.map(r => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('toggles asc → desc', () => {
    const asc = applySort(items, { field: 'age', direction: 'asc' });
    const desc = applySort(items, { field: 'age', direction: 'desc' });
    expect(asc[0].age).toBe(25);
    expect(desc[0].age).toBe(35);
  });

  it('returns original order when config is null', () => {
    const result = applySort(items, null);
    expect(result).toEqual(items);
  });

  it('does not mutate original array', () => {
    const copy = [...items];
    applySort(items, { field: 'name', direction: 'asc' });
    expect(items).toEqual(copy);
  });
});

describe('applyFilters', () => {
  it('filters by text (case-insensitive includes)', () => {
    const result = applyFilters(items, { name: 'li' });
    expect(result.map(r => r.name)).toEqual(['Charlie', 'Alice']);
  });

  it('applies multiple filters simultaneously', () => {
    const result = applyFilters(items, { name: 'b', status: 'active' });
    expect(result.map(r => r.name)).toEqual(['Bob']);
  });

  it('removes filter when value is empty string', () => {
    const result = applyFilters(items, { name: '' });
    expect(result).toHaveLength(3);
  });

  it('removes filter when value is null', () => {
    const result = applyFilters(items, { name: null });
    expect(result).toHaveLength(3);
  });

  it('returns all items when filters object is empty', () => {
    const result = applyFilters(items, {});
    expect(result).toHaveLength(3);
  });
});
