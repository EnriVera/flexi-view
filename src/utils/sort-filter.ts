import type { SortChangeDetail } from '../types.js';

export type { SortChangeDetail };
export type Filters = Record<string, unknown>;

export function applySort<T>(data: T[], config: SortChangeDetail | null): T[] {
  if (!config) return data;
  const { field, direction } = config;
  return [...data].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[field];
    const bVal = (b as Record<string, unknown>)[field];
    let cmp = 0;
    if (aVal == null && bVal == null) cmp = 0;
    else if (aVal == null) cmp = -1;
    else if (bVal == null) cmp = 1;
    else if (aVal < bVal) cmp = -1;
    else if (aVal > bVal) cmp = 1;
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function applyFilters<T>(data: T[], filters: Filters): T[] {
  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v !== '' && v != null
  );
  
  // Manejar búsqueda general (search en múltiples campos)
  const searchFilter = activeFilters.find(([field]) => field === '__search');
  const searchValue = searchFilter ? String(searchFilter[1]).toLowerCase() : null;
  const searchFields = searchFilter ? filters['__searchFields'] as string[] : null;
  
  // Filtrar los filtros normales (excluir los especiales)
  const normalFilters = activeFilters.filter(
    ([field]) => field !== '__search' && field !== '__searchFields'
  );
  
  if (normalFilters.length === 0 && !searchValue) return data;
  
  return data.filter(row => {
    const rowObj = row as Record<string, unknown>;
    
    // Si hay búsqueda general, verificar si alguno de los campos contiene el texto
    if (searchValue && searchFields) {
      const matchesSearch = searchFields.some(field => {
        const rowVal = rowObj[field];
        return rowVal != null && String(rowVal).toLowerCase().includes(searchValue);
      });
      if (!matchesSearch) return false;
    }
    
    // Verificar filtros normales
    return normalFilters.every(([field, value]) => {
      const rowVal = rowObj[field];
      if (Array.isArray(value)) {
        return value.includes(String(rowVal ?? ''));
      }
      if (typeof rowVal === 'number') return String(rowVal) === String(value);
      return String(rowVal ?? '').toLowerCase().includes(String(value).toLowerCase());
    });
  });
}
