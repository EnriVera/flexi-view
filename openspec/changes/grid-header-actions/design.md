# Design: grid-header-actions

> Technical design for the grid-header-actions change. Reads the proposal at `sdd/grid-header-actions/proposal`.

## 1. Key Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Sort state ownership | `fv-view` owns sort; `fv-grid` is stateless | Eliminates dual-state bug; aligns with existing filter flow. |
| D2 | Header trigger UI | A single button per `<th>` opens `fv-header-menu`; legacy click-to-sort removed | One unified surface; sort is just one action inside the menu. |
| D3 | Popover positioning | Native `popover="manual"` API + JS positioning via `getBoundingClientRect` (no CSS anchor positioning) | Cross-browser today (Chromium 114+/FF 125+/Safari 17+); CSS anchor positioning still has poor support (Safari/FF). |
| D4 | Component prop passing | `fv-grid` sets properties on `<fv-header-menu>` directly via Lit `.prop` bindings | Standard Lit pattern; no event round-trip needed for read-only inputs. |
| D5 | Pluggable header menu | Custom tag via `configureGrid({ headerMenu })` or `column.headerMenu`; must implement `HeaderMenuElement` interface | Component-level extensibility, not slot-based, to allow full UX replacement. |
| D6 | Persisted sort | Replace `order: 'as'\|'des'\|null` with `sort: { field, direction } \| null` | Fixes data loss bug (field never persisted). Old shape silently dropped. |
| D7 | URL sync scope | URL stays `#view=...` only; sort/filter live in localStorage | Proposal scope: out-of-scope for sort/filter URL sync. |
| D8 | Export | CSV built-in via `Blob` + `URL.createObjectURL`; XLSX lazy via `configureGrid({ excelLibrary })` | Zero deps for default; opt-in heavy lib. |
| D9 | Standalone actions | Each emits its own event upward; data flows in via property | Reusable outside `fv-grid`; consumers wire to their own state. |
| D10 | Event names | Keep `sort-change`, `filter-change`; add `fv-export-request` (prefixed) | Existing names already published; new event uses `fv-` prefix to avoid collision. |

## 2. TypeScript Interfaces

```ts
// types.ts additions

export interface ColumnConfig<T = Record<string, unknown>> {
  control?: string;
  params?: Record<string, unknown>;
  title: string;
  field?: keyof T;
  sortable?: boolean;
  filterable?: boolean;            // now wired
  exportable?: boolean;            // default true
  headerMenu?: string | false;     // tag name override, or false to disable
  visible?: boolean | ((row: T, i: number, all: T[]) => boolean);
  disable?: boolean | ((row: T, i: number, all: T[]) => boolean);
}

// New: contract every header menu must implement
export interface HeaderMenuElement<T = Record<string, unknown>> extends HTMLElement {
  column: ColumnConfig<T>;
  data: T[];
  currentSort: SortChangeDetail | null;
  currentFilters: Record<string, unknown>;
  anchor: HTMLElement;             // the <th> button
  open(): void;
  close(): void;
}

// Event detail shapes
export type SortChangeDetail = {
  field: string;
  direction: 'asc' | 'desc' | null;   // null clears sort
};
export type FilterChangeDetail = {
  field: string;
  value: unknown;                      // '' / null / undefined clears
};
export type ExportFormat = 'csv' | 'xlsx';
export type ExportRequestDetail<T = Record<string, unknown>> = {
  format: ExportFormat;
  columns: ColumnConfig<T>[];
  rows: T[];                           // already-filtered+sorted dataset
};
```

```ts
// registry.ts additions
export interface ExcelLibrary {
  utils: { json_to_sheet: (rows: unknown[]) => unknown; book_new: () => unknown; book_append_sheet: (b: unknown, s: unknown, n: string) => void; };
  writeFile: (book: unknown, filename: string) => void;
}

export interface GridConfig {
  controls?: Record<string, ControlLoader>;
  headerMenu?: string;                                  // default tag, e.g. 'my-header-menu'
  actions?: { sort?: string; filter?: string; export?: string };
  export?: {
    formats?: ExportFormat[];                           // default ['csv']
    excelLibrary?: () => Promise<ExcelLibrary>;         // lazy import('xlsx')
  };
}
```

```ts
// persistence.ts new shape
export interface PersistedState {
  views: string | null;
  sort: { field: string; direction: 'asc' | 'desc' } | null;   // NEW shape
  filter: FilterItem[] | null;
}

// Migration: on read, if `order` exists and `sort` does not, drop `order` (field unrecoverable).
// No throw, no warn; legacy users lose only direction (which had no field anyway).
```

## 3. Event Contracts

```ts
// dispatched by fv-grid OR fv-sort-action — bubbles, composed
new CustomEvent<SortChangeDetail>('sort-change', {
  detail: { field: 'name', direction: 'asc' },        // direction:null clears
  bubbles: true, composed: true,
});

// dispatched by fv-grid OR fv-filter-action — bubbles, composed
new CustomEvent<FilterChangeDetail>('filter-change', {
  detail: { field: 'status', value: 'active' },       // ''/null clears
  bubbles: true, composed: true,
});

// dispatched by fv-grid OR fv-export-action — bubbles, composed
// Note: prefixed `fv-` to avoid collision with future browser events
new CustomEvent<ExportRequestDetail>('fv-export-request', {
  detail: { format: 'csv', columns, rows },
  bubbles: true, composed: true,
});
```

## 4. Data Flow

```
                            ┌────────────── fv-view ──────────────┐
                            │ state: _sortConfig, _filters, _data │
                            │ derived: _processedData             │
                            └──┬───────────────────────────────▲──┘
                               │ .data .columns                │ sort-change
                               │ .sort .filters                │ filter-change
                               │ .storageKey .syncUrl          │ fv-export-request
                               ▼                               │
                       ┌─── fv-grid (stateless) ───┐           │
                       │ renders <th> with trigger │           │
                       │ button + slotted menu     │           │
                       └──┬─────────────────────▲──┘           │
                          │ .column .data       │ events       │
                          │ .currentSort        │ bubble up    │
                          │ .currentFilters     │              │
                          ▼                     │              │
                 ┌─ fv-header-menu (popover) ──┐│              │
                 │ contains:                   ││              │
                 │  ├── fv-sort-action ────────┼┘              │
                 │  ├── fv-filter-action ──────┘               │
                 │  └── fv-export-action ──────────────────────┘
                 └─────────────────────────────┘
```

Persistence: `fv-view` writes to localStorage on every state change (existing behavior, unchanged). `_persistPayload` now emits `{ views, sort: {field, direction}, filter }`.

## 5. Component Designs

### 5.1 fv-grid (refactored)

New props (all `@property({ attribute: false })`):

```ts
@property({ attribute: false }) data: T[] = [];
@property({ attribute: false }) columns: ColumnConfig<T>[] = [];
@property({ attribute: false }) sort: SortChangeDetail | null = null;
@property({ attribute: false }) filters: Record<string, unknown> = {};
```

Removed: `_sortField`, `_sortDir`, `_sort()`, click handler on `<span>`.

`_renderHeader(col)` becomes:

```ts
private _renderHeader(col: ColumnConfig<T>) {
  const field = String(col.field ?? col.title);
  const isSorted = this.sort?.field === field;
  const arrow = isSorted ? (this.sort!.direction === 'asc' ? ' ↑' : ' ↓') : '';
  const menuTag = col.headerMenu === false
    ? null
    : (col.headerMenu || gridConfig.headerMenu || 'fv-header-menu');

  return html`
    <th>
      <span class="title">${col.title}${arrow}</span>
      ${menuTag ? html`
        <button
          class="trigger"
          aria-label=${`Open ${col.title} menu`}
          @click=${(e: Event) => this._openMenu(e, col)}
        >⋮</button>
      ` : ''}
    </th>
  `;
}
```

`_openMenu(e, col)` lazily creates a single `<fv-header-menu>` instance per grid (or the configured tag), sets its props, and calls `.open()` (which calls `showPopover()` and positions next to `e.currentTarget`).

### 5.2 fv-header-menu (new)

```ts
@customElement('fv-header-menu')
export class FvHeaderMenu<T> extends LitElement implements HeaderMenuElement<T> {
  @property({ attribute: false }) column!: ColumnConfig<T>;
  @property({ attribute: false }) data: T[] = [];
  @property({ attribute: false }) currentSort: SortChangeDetail | null = null;
  @property({ attribute: false }) currentFilters: Record<string, unknown> = {};
  @property({ attribute: false }) anchor!: HTMLElement;

  static styles = css`
    :host { position: fixed; margin: 0; padding: 4px; border: 1px solid #e0e0e0;
            border-radius: 6px; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    :host([popover]) { inset: unset; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('popover', 'manual');
  }

  open() {
    this.showPopover();
    const r = this.anchor.getBoundingClientRect();
    this.style.top = `${r.bottom + 4}px`;
    this.style.left = `${r.left}px`;
  }
  close() { this.hidePopover(); }

  render() {
    const c = this.column;
    return html`
      ${c.sortable !== false ? html`
        <fv-sort-action
          .field=${String(c.field ?? c.title)}
          .current=${this.currentSort}
          @sort-change=${() => this.close()}
        ></fv-sort-action>` : ''}
      ${c.filterable ? html`
        <fv-filter-action
          .field=${String(c.field ?? c.title)}
          .data=${this.data}
          .current=${this.currentFilters[String(c.field ?? c.title)]}
        ></fv-filter-action>` : ''}
      ${c.exportable !== false ? html`
        <fv-export-action
          .columns=${[c]}
          .rows=${this.data}
          @fv-export-request=${() => this.close()}
        ></fv-export-action>` : ''}
    `;
  }
}
```

Light DOM events bubble through composed:true, reaching `fv-view`.

### 5.3 fv-sort-action / fv-filter-action / fv-export-action (new, standalone)

Each is independently usable. API:

```ts
// fv-sort-action
@property() field!: string;
@property({ attribute: false }) current: SortChangeDetail | null = null;
// renders: [Asc] [Desc] [Clear] buttons
// emits: sort-change { field, direction: 'asc'|'desc'|null }

// fv-filter-action
@property() field!: string;
@property({ attribute: false }) data: unknown[] = [];   // for unique-value list (v1: just a text input)
@property() current: unknown;
// renders: <input type="text"> with debounce
// emits: filter-change { field, value }

// fv-export-action
@property({ attribute: false }) columns: ColumnConfig[] = [];
@property({ attribute: false }) rows: unknown[] = [];
@property({ type: Array }) formats: ExportFormat[] = ['csv'];
// renders: one button per format
// emits: fv-export-request { format, columns, rows } — fv-view performs export
```

Standalone usage example:

```html
<fv-sort-action field="name" .current=${state.sort}
  @sort-change=${e => state.sort = e.detail}></fv-sort-action>
```

### 5.4 fv-view changes

- Remove old `order` write; new `_persistPayload` returns `{ views, sort, filter }`.
- New listener for `fv-export-request`:
  ```ts
  private _onExportRequest = async (e: Event) => {
    const { format, columns, rows } = (e as CustomEvent<ExportRequestDetail>).detail;
    const { performExport } = await import('../lib/export.js');
    await performExport(format, columns, rows);
  };
  ```
- Pass `.sort=${this._sortConfig}` and `.filters=${this._filters}` down into `<fv-grid>`.

### 5.5 lib/export.ts (new)

```ts
export async function performExport<T>(
  format: ExportFormat,
  columns: ColumnConfig<T>[],
  rows: T[],
): Promise<void> {
  const exportable = columns.filter(c => c.exportable !== false && c.field != null);
  if (format === 'csv') return exportCSV(exportable, rows);
  if (format === 'xlsx') return exportXLSX(exportable, rows);
}

function exportCSV<T>(cols: ColumnConfig<T>[], rows: T[]) {
  const header = cols.map(c => quote(c.title)).join(',');
  const body = rows.map(r =>
    cols.map(c => quote(String((r as any)[c.field as string] ?? ''))).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, 'export.csv');
}

async function exportXLSX<T>(cols: ColumnConfig<T>[], rows: T[]) {
  const loader = gridConfig.export?.excelLibrary;
  if (!loader) throw new Error('xlsx requires configureGrid({ export: { excelLibrary } })');
  try {
    const XLSX = await loader();
    const sheet = XLSX.utils.json_to_sheet(rows.map(r => projectRow(r, cols)));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Data');
    XLSX.writeFile(book, 'export.xlsx');
  } catch (err) {
    document.dispatchEvent(new CustomEvent('fv-export-error', { detail: { format, error: err } }));
  }
}
```

## 6. Persistence Migration

```ts
export function readState(key?: string): PersistedState | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState> & { order?: string };
    // Migrate: drop legacy `order` (field never stored, unrecoverable)
    const { order, ...rest } = parsed as any;
    return {
      views: rest.views ?? null,
      sort: rest.sort ?? null,
      filter: rest.filter ?? null,
    };
  } catch { return null; }
}
```

Old write path in `fv-view.willUpdate` and `_persistPayload` is updated to write `sort: this._sortConfig`.

## 7. URL Param Format (out of scope for v1)

URL stays `#view=grid|list|cards`. Sort/filter URL sync is explicitly deferred (see proposal Out section). No new URL params introduced by this change.

## 8. File-by-File Plan

### Create

| File | Purpose |
|------|---------|
| `src/components/fv-header-menu.ts` | Default popover menu, contains 3 actions, anchored to `<th>` button. |
| `src/components/fv-sort-action.ts` | Standalone sort buttons; emits `sort-change`. |
| `src/components/fv-filter-action.ts` | Standalone filter input; emits `filter-change`. |
| `src/components/fv-export-action.ts` | Standalone export buttons; emits `fv-export-request`. |
| `src/lib/export.ts` | `performExport()` — CSV native, XLSX via lazy `excelLibrary` loader. |

### Modify

| File | Change |
|------|--------|
| `src/components/fv-grid.ts` | Drop `_sortField`/`_sortDir`/`_sort`; add `sort`+`filters` props; render trigger button + lazy menu instance; wire `filterable`. |
| `src/components/fv-view.ts` | Update `_persistPayload` to use `sort`; pass `.sort`+`.filters` to `fv-grid`; listen for `fv-export-request`; restore `_sortConfig` from `saved.sort` (with field) on connect. |
| `src/utils/persistence.ts` | New `PersistedState.sort` shape; drop legacy `order` on read. |
| `src/registry.ts` | Add `headerMenu`, `actions`, `export.formats`, `export.excelLibrary` to `GridConfig`; export `gridConfig` getter. |
| `src/types.ts` | Add `exportable`, `headerMenu` to `ColumnConfig`; add `HeaderMenuElement`, `ExportFormat`, `ExportRequestDetail`; widen `SortChangeDetail.direction` with `null`. |
| `src/index.ts` | Re-export `applySort`, `applyFilters`, new components, new types. |
| `README.md` | Header menu docs; popover browser support note (Chromium 114+/FF 125+/Safari 17+); persistence migration note. |

## 9. Open Items Carried From Proposal

- `applyFilters` predicate for `filterable: function` — kept as v1 string-includes only; function-shape filter deferred to follow-up.
- `fv-export-action` cell-transform callback — deferred; v1 uses raw `String(value)`.
- Keyboard nav inside `fv-header-menu` — minimal v1: Escape closes, Tab cycles natively. Arrow-key roving and focus trap deferred.

## 10. Risks / Assumptions

- **Popover positioning on scroll/resize**: `fv-header-menu` repositions only on `open()`. If table scrolls while open, menu drifts — accepted v1 limitation; close on scroll planned for v1.1.
- **Lit `.prop` on lazily-created element**: `fv-grid` creates `<fv-header-menu>` imperatively (not via Lit template) since it's a singleton-per-grid attached to body for popover stacking. Setting properties via `el.column = col` is idiomatic.
- **Composed events crossing shadow boundary**: All three events use `composed: true`; verified `fv-view`'s existing listeners already rely on this for `sort-change`/`filter-change`.
- **`gridConfig` global singleton**: Adding read access to registry config requires exporting an accessor; ensure this stays internal (no `export` from `index.ts`) to keep API surface small.
