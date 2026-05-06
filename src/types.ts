export interface ColumnConfig<T = Record<string, unknown>> {
  control?: string;
  params?: Record<string, unknown>;
  title: string;
  field?: keyof T;
  headerMenu?: string | false;
  visible?: boolean | ((row: T, index: number, allData: T[]) => boolean);
  disable?: boolean | ((row: T, index: number, allData: T[]) => boolean);
}

export interface DataViewOptions<T = Record<string, unknown>> {
  data: T[];
  columns: ColumnConfig<T>[];
  view?: 'grid' | 'list' | 'cards';
  storageKey?: string;
}

export type ExportFormat = 'csv' | 'xlsx';

export type Language = 'es' | 'en';

export type SortChangeDetail = { field: string; direction: 'asc' | 'desc' | null };
export type FilterChangeDetail = { field: string; value: unknown };
export type RowClickDetail<T> = { item: T; index: number };
export type PersistMode = 'local' | 'session' | 'none';

export interface ExportRequestDetail {
  format: ExportFormat;
  columns: ColumnConfig[];
  rows: Record<string, unknown>[];
}

export interface HeaderMenuElement<T = Record<string, unknown>> {
  column: ColumnConfig<T>;
  columns: ColumnConfig<T>[];
  data: T[];
  filteredData: T[];
  currentSort: SortChangeDetail | null;
  currentFilters: Record<string, unknown>;
  anchor: HTMLElement | null;
  open(): void;
  close(): void;
}

export type DarkMode = 'light' | 'dark' | 'auto';

// Icon value type: can be SVG string (existing), React component, or render function
export type FlexiViewIconValue = string | ((props?: Record<string, unknown>) => HTMLElement);

export interface FlexiViewIcons {
  sortAsc?: FlexiViewIconValue;
  sortDesc?: FlexiViewIconValue;
  filter?: FlexiViewIconValue;
  clearFilter?: FlexiViewIconValue;
  close?: FlexiViewIconValue;
  export?: FlexiViewIconValue;
  gridView?: FlexiViewIconValue;
  listView?: FlexiViewIconValue;
  cardsView?: FlexiViewIconValue;
}

export interface FlexiViewTheme {
  bg?: string;
  headerBg?: string;
  headerText?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  rowHover?: string;
  accent?: string;
  primary?: string;
  danger?: string;
  radius?: string;
  fontSize?: string;
}

export interface FlexiViewConfig {
  language?: Language;
  icons?: FlexiViewIcons;
  theme?: Partial<FlexiViewTheme>;
  darkMode?: DarkMode;
}
