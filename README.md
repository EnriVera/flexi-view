# flexi-view

Framework-agnostic multi-view data library built with Web Components (Lit + Shadow DOM).

## Features

- **Multiple views**: Grid, List, and Cards — each with independent column definitions
- **View isolation**: only views with field configs are rendered and accessible
- **Single-button switcher**: cycles through available views; hidden when only one view is configured
- **Sorting & Filtering**: column-based with modal filter selection
- **Export**: CSV and XLSX (via SheetJS)
- **Persistence**: localStorage or sessionStorage
- **URL Sync**: state reflected in URL hash, guarded against inaccessible views
- **i18n**: English and Spanish translations
- **Theming**: CSS custom properties for colors, borders, radius
- **Dark Mode**: light, dark, or auto (system preference)

## Installation

```bash
npm install flexi-view
# or
pnpm add flexi-view
```

## Quick start

```html
<fv-view id="my-view" view="grid"></fv-view>

<script type="module">
  import 'flexi-view';

  const view = document.querySelector('fv-view');
  view.registers = [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob',   role: 'user'  },
  ];
  view.fieldGrids = [
    { field: 'id',   title: 'ID' },
    { field: 'name', title: 'Name' },
    { field: 'role', title: 'Role' },
  ];
</script>
```

## Global configuration

```ts
import { FlexiView } from 'flexi-view';

FlexiView.configure({
  language: 'es',     // 'en' | 'es' (default: 'en')
  darkMode: 'auto',   // 'light' | 'dark' | 'auto' (default: 'light')
  theme: {
    primary: '#6366f1',
    accent:  '#8b5cf6',
    radius:  '8px',
  },
  icons: {
    gridView:  '<svg>...</svg>',
    listView:  '<svg>...</svg>',
    cardsView: '<svg>...</svg>',
    // ...
  },
});
```

## Components

| Tag | Description |
|-----|-------------|
| `fv-view` | Root orchestrator — owns sort/filter/view state, persists to localStorage |
| `fv-switcher` | View switcher — single cycling button; connect to `fv-view` via `for` attribute |
| `fv-search` | Standalone search input — connect to `fv-view` via `for` attribute |
| `fv-grid` | Stateless table view |
| `fv-list` | List / rows view |
| `fv-cards` | Cards view |
| `fv-header-menu` | Popup menu per column header (sort, filter, export actions) |
| `fv-sort-action` | Standalone sort button |
| `fv-filter-action` | Standalone filter input (300ms debounce) |
| `fv-export-action` | Standalone export button (CSV built-in; XLSX via SheetJS) |

## Per-view field configuration

Each view gets its own column definition. Only views with a non-empty field config are accessible.

```html
<fv-view id="users" view="grid"></fv-view>

<script type="module">
  import 'flexi-view';
  const view = document.querySelector('#users');

  view.registers = [...];

  // Grid: full column set
  view.fieldGrids = [
    { field: 'id',      title: 'ID' },
    { field: 'name',    title: 'Name' },
    { field: 'email',   title: 'Email' },
    { field: 'role',    title: 'Role',   control: 'fv-badge' },
    { field: 'created', title: 'Created', control: 'fv-date' },
  ];

  // Cards: compact set — only these three fields shown in card view
  view.fieldCards = [
    { field: 'name',   title: 'Name' },
    { field: 'role',   title: 'Role',   control: 'fv-badge' },
    { field: 'status', title: 'Status', control: 'fv-badge' },
  ];

  // fieldRows not set → List view is not accessible
</script>
```

**View isolation rules:**
- `fieldGrids` set → grid view available
- `fieldRows` set → list view available
- `fieldCards` set → cards view available
- Only 1 view configured → switcher is hidden entirely
- Navigating to `#view=list` when list is not configured → silently falls back to the first available view

## fv-switcher (external)

Use an external `fv-switcher` when you want the switcher outside of `fv-view` (e.g. in a toolbar).

```html
<fv-switcher for="my-view" sync-url></fv-switcher>
<fv-view id="my-view" ...></fv-view>
```

The switcher automatically reads `acceptedViews` from the target and only cycles through configured views.

## fv-search (external)

```html
<fv-search for="my-view" placeholder="Search..." debounce></fv-search>
<fv-view id="my-view" show-search="false" ...></fv-view>
```

## fv-view attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `view` | `'grid' \| 'list' \| 'cards'` | `'grid'` | Initial active view |
| `show-switcher` | boolean | `true` | Show the built-in switcher |
| `show-search` | boolean | `true` | Show the built-in search bar |
| `sync-url` | boolean | `false` | Reflect view/sort/filter in URL hash |
| `storage-key` | string | — | localStorage key for persistence |

## Column configuration

```ts
interface ColumnConfig {
  field?: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;         // default: true; set false to exclude from exports
  control?: string;             // custom cell renderer tag (e.g. 'fv-badge', 'fv-date')
  params?: Record<string, unknown>; // extra props forwarded to the control
  headerMenu?: string | false;  // override per-column; false disables the popup menu
}
```

## configureGrid options

```ts
import { configureGrid } from 'flexi-view';

configureGrid({
  headerMenu: 'my-custom-menu',          // global custom header menu tag
  export: {
    formats: ['csv', 'xlsx'],
    excelLibrary: () => import('xlsx'),  // lazy-loaded SheetJS for XLSX
  },
});
```

## XLSX export

Zero-dependency by default. To enable XLSX:

1. `npm install xlsx`
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

## URL sync

When `sync-url` is active, state is reflected in the hash:

```
#view=grid&fv-sort=name:asc&fv-filter-role=admin
```

- `view` — active view (validated against `acceptedViews` on load and navigation)
- `fv-sort=field:direction` — active sort
- `fv-filter-{field}=value` — active filters

## Events

| Event | Detail | Bubbles |
|-------|--------|---------|
| `view-change` | `{ view }` | yes |
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

```ts
FlexiView.configure({ language: 'es' }); // 'en' | 'es'
```

Translated strings: sort labels, view switcher tooltip, filter modal, header menu actions.

## Theming

```css
:root {
  --fv-bg:         #ffffff;
  --fv-text:       #333333;
  --fv-primary:    #6366f1;
  --fv-accent:     #8b5cf6;
  --fv-border:     #e0e0e0;
  --fv-radius:     6px;
  --fv-font-size:  14px;
}
```

Or via `FlexiView.configure({ theme: {...} })`.

## Dark Mode

```ts
FlexiView.configure({ darkMode: 'dark' }); // 'light' | 'dark' | 'auto'
```
