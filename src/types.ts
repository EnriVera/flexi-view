export interface ColumnConfig<T = Record<string, unknown>> {
  control: string;
  params?: Record<string, unknown>;
  title: string;
  field?: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean | ((row: T, index: number, allData: T[]) => boolean);
  disable?: boolean | ((row: T, index: number, allData: T[]) => boolean);
}

export interface DataViewOptions<T = Record<string, unknown>> {
  data: T[];
  columns: ColumnConfig<T>[];
  view?: 'grid' | 'list' | 'cards';
  storageKey?: string;
}

export type SortChangeDetail = { field: string; direction: 'asc' | 'desc' };
export type FilterChangeDetail = { field: string; value: unknown };
export type RowClickDetail<T> = { item: T; index: number };
export type PersistMode = 'local' | 'session' | 'none';
