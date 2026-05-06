# flexi-view

Framework-agnostic multi-view data library built with Web Components (Lit + Shadow DOM).

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
