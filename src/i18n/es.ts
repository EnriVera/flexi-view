import type { Translations } from './en.js';

export const es: Translations = {
  sort: {
    title: 'Ordenar',
    selectField: 'Seleccioná un campo para ordenar',
    asc: 'Ascendente',
    ascLabel: 'Asc',
    desc: 'Descendente',
    descLabel: 'Desc',
    clear: 'Quitar orden',
    nSorts: (n: number) => n === 1 ? '1 ordenamiento' : `${n} ordenamientos`,
  },
  view: {
    switch: 'Cambiar vista',
    grid: 'Cuadrícula',
    list: 'Lista',
    cards: 'Tarjetas',
  },
  filter: {
    title: 'Filtro',
    noValues: 'No hay valores disponibles',
    apply: 'Aplicar',
    clear: 'Limpiar',
    selected: 'Seleccionados',
    all: 'Todos',
  },
  export: {
    csv: 'Exportar CSV',
    xlsx: 'Exportar Excel',
  },
  search: {
    placeholder: 'Buscar...',
    noResults: 'No se encontraron resultados',
  },
  common: {
    loading: 'Cargando...',
    noData: 'Sin datos',
    error: 'Error',
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
  grid: {
    rows: 'filas',
    of: 'de',
    showing: 'Mostrando',
  },
};