export const en = {
  sort: {
    asc: 'Ascending',
    desc: 'Descending',
  },
  view: {
    switch: 'Switch view',
    grid: 'Grid',
    list: 'List',
    cards: 'Cards',
  },
  filter: {
    title: 'Filter',
    noValues: 'No values available',
    apply: 'Apply',
    clear: 'Clear',
    selected: 'Selected',
    all: 'All',
  },
  export: {
    csv: 'Export CSV',
    xlsx: 'Export Excel',
  },
  search: {
    placeholder: 'Search...',
    noResults: 'No results found',
  },
  common: {
    loading: 'Loading...',
    noData: 'No data',
    error: 'Error',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
  },
  grid: {
    rows: 'rows',
    of: 'of',
    showing: 'Showing',
  },
} as const;

export type Translations = typeof en;