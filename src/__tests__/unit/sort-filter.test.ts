import { describe, it, expect } from 'vitest';
import { applySort, applyFilters } from '../../utils/sort-filter.js';

const items = [
  { name: 'Charlie', age: 30, status: 'active' },
  { name: 'Alice', age: 25, status: 'inactive' },
  { name: 'Bob', age: 35, status: 'active' },
];

describe('applySort — multi-criterion', () => {
  it('returns same reference when sorts is empty', () => {
    const result = applySort(items, []);
    expect(result).toBe(items);
  });

  it('sorts asc with single criterion', () => {
    const result = applySort(items, [{ field: 'name', direction: 'asc' }]);
    expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts desc with single criterion', () => {
    const result = applySort(items, [{ field: 'name', direction: 'desc' }]);
    expect(result.map(r => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });

  it('does not mutate original array', () => {
    const copy = [...items];
    applySort(items, [{ field: 'name', direction: 'asc' }]);
    expect(items).toEqual(copy);
  });

  it('applies tiebreak with two-criterion sort', () => {
    const data = [
      { role: 'admin', name: 'Charlie' },
      { role: 'admin', name: 'Alice' },
      { role: 'user', name: 'Bob' },
    ];
    const result = applySort(data, [
      { field: 'role', direction: 'asc' },
      { field: 'name', direction: 'desc' },
    ]);
    // admin role asc, then name desc within same role: Z→A
    expect(result.map(r => r.name)).toEqual(['Charlie', 'Alice', 'Bob']);
  });

  it('null/undefined sort first in asc direction', () => {
    const data = [
      { name: 'Bob', age: null },
      { name: 'Alice', age: 25 },
      { name: 'Carol', age: undefined },
    ];
    const result = applySort(data, [{ field: 'age', direction: 'asc' }]);
    expect(result[0].name).toBe('Bob'); // null first
    expect(result[1].name).toBe('Carol'); // undefined second
    expect(result[2].name).toBe('Alice'); // defined last
  });

  it('null/undefined sort first in desc direction', () => {
    const data = [
      { name: 'Bob', age: null },
      { name: 'Alice', age: 25 },
      { name: 'Carol', age: undefined },
    ];
    const result = applySort(data, [{ field: 'age', direction: 'desc' }]);
    expect(result[0].name).toBe('Bob'); // null first even in desc!
    expect(result[1].name).toBe('Carol');
    expect(result[2].name).toBe('Alice');
  });

  it('cascades three criteria', () => {
    const data = [
      { a: 'x', b: 'b', c: 3 },
      { a: 'x', b: 'a', c: 1 },
      { a: 'x', b: 'a', c: 2 },
      { a: 'y', b: 'a', c: 0 },
    ];
    const result = applySort(data, [
      { field: 'a', direction: 'asc' },
      { field: 'b', direction: 'asc' },
      { field: 'c', direction: 'asc' },
    ]);
    // a=x items before a=y (a asc); within a=x: b=a before b=b (b asc); within b=a: c asc
    expect(result.map(r => `${r.a}${r.b}${r.c}`)).toEqual(['xa1', 'xa2', 'xb3', 'ya0']);
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
