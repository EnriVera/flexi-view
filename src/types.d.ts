import type { ColumnConfig, SortChangeDetail, FilterChangeDetail, RowClickDetail } from './types.js'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'data-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        data?: unknown[]
        columns?: ColumnConfig[]
        view?: 'grid' | 'list' | 'cards'
        'show-switcher'?: boolean
        'storage-key'?: string
      }, HTMLElement>
      'data-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        for?: string
        activeView?: 'grid' | 'list' | 'cards'
      }, HTMLElement>
    }
  }
}

export {}