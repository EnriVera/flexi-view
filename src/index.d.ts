import { ColumnConfig } from './types'

// Type exports
export type { ColumnConfig } from './types';
export type { DataViewOptions } from './types';
export type { SortChangeDetail } from './types';
export type { FilterChangeDetail } from './types';
export type { RowClickDetail } from './types';
export type { PersistMode } from './types';
export type { ExportFormat } from './types';
export type { ExportRequestDetail } from './types';
export type { HeaderMenuElement } from './types';
export type { FlexiViewConfig } from './types';
export type { FlexiViewIcons } from './types';
export type { FlexiViewTheme } from './types';
export type { DarkMode } from './types';
export type { Language } from './types';

// JSX types para React - se incluyen automáticamente
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'fv-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        registers?: unknown[]
        fieldGrids?: ColumnConfig[]
        fieldRows?: ColumnConfig[]
        fieldCards?: ColumnConfig[]
        view?: 'grid' | 'list' | 'cards'
        'show-switcher'?: boolean
        'show-search'?: boolean
        'storage-key'?: string
        'sync-url'?: boolean
      }, HTMLElement>
      'fv-switcher': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        for?: string
        activeView?: 'grid' | 'list' | 'cards'
        'sync-url'?: boolean
      }, HTMLElement>
      'fv-search': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        placeholder?: string
        value?: string
        debounce?: boolean
        'debounce-ms'?: number
      }, HTMLElement>
      'fv-grid': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        registers?: unknown[]
        fieldGrids?: ColumnConfig[]
      }, HTMLElement>
      'fv-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        registers?: unknown[]
        fieldRows?: ColumnConfig[]
      }, HTMLElement>
      'fv-cards': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        registers?: unknown[]
        fieldCards?: ColumnConfig[]
      }, HTMLElement>
    }
  }
}