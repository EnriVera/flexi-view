# flexi-view

Framework-agnostic multi-view data library built with Web Components (Lit + Shadow DOM).

## Features

- **Multiple views**: Grid, List, and Cards layouts
- **Sorting & Filtering**: Column-based with modal filter selection
- **Export**: CSV and XLSX (via SheetJS)
- **Persistence**: localStorage or sessionStorage
- **URL Sync**: State reflected in URL hash
- **i18n**: English and Spanish translations
- **Theming**: Custom CSS variables for colors, borders, radius
- **Dark Mode**: Light, dark, or auto (system preference)

## Installation

```bash
npm install flexi-view
```

## Quick start

```html
<fv-view storage-key="my-view"></fv-view>

<script type="module">
  import 'flexi-view';
  const view = document.querySelector('fv-view');
  view.data = [...];
  view.columns = [
    { title: 'Name', field: 'name', sortable: true, filterable: true },
    { title: 'Age',  field: 'age',  sortable: true, exportable: true },
  ];
</script>
```

## Configuration

```ts
import { FlexiView } from 'flexi-view';

// Global configuration
FlexiView.configure({
  language: 'es',     // 'en' | 'es' (default: 'en')
  darkMode: 'auto',   // 'light' | 'dark' | 'auto' (default: 'light')
  theme: {
    primary: '#1976d2',
    accent: '#111',
    radius: '6px',
  },
  icons: {
    sortAsc: '<svg>...</svg>',
    // custom icons...
  },
});
```

## Components

| Tag | Description |
|-----|-------------|
| `fv-view` | Root orchestrator — owns sort/filter state, persists to localStorage |
| `fv-grid` | Stateless table view — receives `currentSort` and `currentFilters` as props |
| `fv-list` | List view |
| `fv-cards` | Cards view |
| `fv-header-menu` | Popup menu per column header (sort, filter, export actions) |
| `fv-sort-action` | Standalone sort button — usable outside fv-grid |
| `fv-filter-action` | Standalone filter input with 300ms debounce |
| `fv-export-action` | Standalone export button (CSV built-in; XLSX via SheetJS) |

## Column configuration

```ts
interface ColumnConfig {
  title: string;
  field?: string;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;         // default: true; set false to exclude from exports
  headerMenu?: string | false;  // override per-column; false disables the menu
}
```

## configureGrid options

```ts
import { configureGrid } from 'flexi-view';

configureGrid({
  headerMenu: 'my-custom-menu',           // global custom header menu tag
  export: {
    formats: ['csv', 'xlsx'],
    excelLibrary: () => import('xlsx'),   // lazy-loaded SheetJS for XLSX support
  },
});
```

## XLSX export

XLSX is opt-in and zero-dependency by default. To enable it:

1. Install SheetJS: `npm install xlsx`
2. Configure the loader:

```ts
configureGrid({
  export: {
    formats: ['csv', 'xlsx'],
    excelLibrary: () => import('xlsx'),
  },
});
```

If `excelLibrary` is not configured, clicking Export XLSX dispatches `fv-export-error`.

## Popover support

`fv-header-menu` uses the native `popover="manual"` API for the header popup, positioned via `getBoundingClientRect`. Browsers without native popover support will silently show no popup (no-op). All major browsers as of 2024 support this API.

## Persistence migration — `order` to `sort`

If you have existing localStorage data from a previous version that used the `order` field (`order: 'as' | 'des'`), it will be silently dropped on the next read. Sort state will reset to `null` (no sort). The new shape is:

```json
{ "views": "grid", "sort": { "field": "name", "direction": "asc" }, "filter": null }
```

No action is required — migration is automatic and non-breaking.

## URL sync

When `sync-url` is set, the current view is synced to the URL hash:

```
#view=grid&fv-sort=name:asc&fv-filter-dept=eng
```

- `fv-sort=field:direction` — active sort
- `fv-filter-{field}=value` — active filters

## Events

| Event | Detail | Bubbles |
|-------|--------|---------|
| `sort-change` | `{ field, direction: 'asc'\|'desc'\|null }` | yes |
| `filter-change` | `{ field, value }` | yes |
| `fv-export-request` | `{ format, columns, rows }` | yes |
| `fv-export-done` | — | yes |
| `fv-export-error` | `{ error }` | yes |

## Standalone actions

All action components work independently outside `fv-view`:

```html
<fv-sort-action field="name" direction="asc"></fv-sort-action>
<fv-filter-action field="name"></fv-filter-action>
<fv-export-action format="csv" filename="export"></fv-export-action>
```

## Internationalization (i18n)

FlexiView supports English (`en`) and Spanish (`es`) out of the box.

```ts
FlexiView.configure({ language: 'es' });
```

Translated strings:
- Sort labels (Ascending/Descending)
- View switcher tooltip
- Filter modal (Filter, Clear, Apply, "No values available")
- Header menu actions

## Theming

Customize via CSS variables:

```css
:root {
  --fv-bg: #ffffff;
  --fv-text: #333333;
  --fv-primary: #1976d2;
  --fv-border: #e0e0e0;
  --fv-radius: 6px;
  --fv-font-size: 13px;
}
```

Or via `FlexiView.configure({ theme: {...} })`.

## Dark Mode

```ts
FlexiView.configure({ darkMode: 'dark' });  // or 'auto' or 'light'
```
