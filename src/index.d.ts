import { ColumnConfig } from './types'

// JSX types para React - se incluyen automáticamente
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'fv-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        data?: unknown[]
        columns?: ColumnConfig[]
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
        data?: unknown[]
        columns?: ColumnConfig[]
      }, HTMLElement>
      'fv-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        data?: unknown[]
        columns?: ColumnConfig[]
      }, HTMLElement>
      'fv-cards': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        data?: unknown[]
        columns?: ColumnConfig[]
      }, HTMLElement>
    }
  }
}