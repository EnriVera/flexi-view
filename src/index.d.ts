import { ColumnConfig } from './types'

// JSX types para React - se incluyen automáticamente
declare module 'react' {
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