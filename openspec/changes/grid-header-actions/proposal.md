# Proposal: grid-header-actions

## Intent

Add a unified, pluggable header-actions system to `fv-grid` so users can sort, filter, and export data through column headers, without coupling those concerns to the grid itself. Today the grid only supports sort via a direct `@click` on the header, filter is dead code, and export does not exist. The architecture also has a latent bug where sort field is lost on reload (only direction is persisted).

The motivation is twofold:

1. **User-facing**: provide a consistent, discoverable column-level menu (sort asc/desc, filter, export) as table-like UIs require.
2. **Library-facing**: keep `flexi-view` framework-agnostic and pluggable. Consumers should be able to swap the header menu, override it per column, or use the underlying actions standalone — never forced into our defaults.

### Success looks like

- Clicking a column header opens a popover with sort/filter/export actions.
- All actions are pluggable via the existing `configureGrid()` registry and per-column overrides.
- Sort and filter state are persisted to localStorage and (optionally) URL, and survive reload — including the sort field, not just the direction.
- The same actions are usable as standalone Web Components outside `fv-grid`.
- `fv-grid` is stateless for sort (single source of truth lives in `fv-view`).

## Scope

### In scope

- New built-in component `fv-header-menu` with sort asc/desc, filter (when `filterable`), and export entries.
- Standalone components `fv-sort-action`, `fv-filter-action`, `fv-export-action`.
- Registry extension: `configureGrid({ headerMenu, actions })`; per-column `ColumnConfig.headerMenu` override.
- Export helpers: CSV (built-in, zero deps) and a hook for Excel via opt-in SheetJS lazy loader.
- Public re-export of `applySort` / `applyFilters` from `sort-filter.ts`.
- Bugfix: persist sort field alongside direction in `PersistedState`.
- Make `fv-grid` stateless for sort (delegate to `fv-view`).
- Forward `storageKey` / `syncUrl` semantics correctly across `fv-view` → `fv-grid` for the new flow.
- Use native `[popover]` API for positioning (no JS-driven floating UI).

### Out of scope

- Multi-column sort (single-column only for v1).
- Advanced filter UIs (range pickers, date pickers, multiselect) — v1 ships a simple text/contains filter input, with the filter component pluggable so consumers can supply richer ones.
- Column reorder / resize / pin.
- Server-side sort/filter integration (current pure-function pipeline stays client-side).
- Adding sort/filter state to URL hash (localStorage only for v1; URL stays only `#view=`).
- Polyfill for `[popover]` on Safari < 17.

## Proposed API

### Registry

```ts
configureGrid({
  controls: { /* existing cell controls */ },
  headerMenu: 'my-header-menu',          // optional, defaults to 'fv-header-menu'
  actions: {                              // optional overrides for built-ins
    sort:   'my-sort-action',
    filter: 'my-filter-action',
    export: 'my-export-action',
  },
  export: {
    formats: ['csv'],                     // default: csv only
    // formats: ['csv', 'xlsx'],          // opt-in; triggers lazy SheetJS load
  },
});
```

### Column config

```ts
interface ColumnConfig {
  // ...existing
  sortable?: boolean;
  filterable?: boolean;        // now actually wired
  exportable?: boolean;        // default true; false hides column from export
  headerMenu?: string | false; // override tag, or false to disable menu for this column
}
```

### Events (bubble from grid → view)

- `sort-change` — `{ field: string, direction: 'asc' | 'desc' | null }`
- `filter-change` — `{ field: string, value: unknown }`
- `export-request` — `{ format: 'csv' | 'xlsx', columns: ColumnConfig[], rows: unknown[] }`

### Standalone components

```html
<fv-sort-action field="name" direction="asc"></fv-sort-action>
<fv-filter-action field="name" value=""></fv-filter-action>
<fv-export-action format="csv" .columns=${cols} .rows=${rows}></fv-export-action>
```

Each emits the matching `*-change` / `*-request` event and can be used outside `fv-grid`.

### Public exports

```ts
export { applySort, applyFilters } from './sort-filter';
```

## Architecture decisions

### 1. Export format default — CSV only, SheetJS opt-in

CSV is built-in and zero-dep. Excel (`xlsx`) requires the consumer to opt in via `configureGrid({ export: { formats: ['csv', 'xlsx'] } })`, which triggers a lazy `import('xlsx')`. Rationale: keep the default bundle small (~200KB SheetJS is too high a baseline cost for a framework-agnostic primitive), let teams that need Excel pay for it explicitly.

### 2. `fv-grid` becomes stateless for sort

Single source of truth moves to `fv-view`. The grid renders headers based on `sortField` / `sortDirection` props passed down, dispatches `sort-change` on click, and never mutates local sort state. This eliminates dual state, fixes the persistence bug at its root, and aligns with the existing filter flow where `fv-view` already owns `_filters`.

### 3. Popover positioning — native `[popover]` API, no polyfill

Use the browser-native `popover` attribute and `popovertarget`. No JS positioning, no floating-ui dep. Documented browser support: Chromium 114+, Firefox 125+, Safari 17+. README will note Safari < 17 is unsupported. Rationale: a popover library would dwarf the rest of the component in bundle size, and `[popover]` is now baseline-available.

## Files to create

- `src/components/fv-header-menu.ts` — default menu component (popover container, lists actions).
- `src/components/fv-sort-action.ts` — standalone sort control.
- `src/components/fv-filter-action.ts` — standalone filter control.
- `src/components/fv-export-action.ts` — standalone export control.
- `src/lib/export.ts` — `toCSV(columns, rows)` + lazy `toXLSX()` hook.

## Files to modify

- `src/components/fv-grid.ts` — render header trigger button + popover slot, drop local `_sortField`/`_sortDir`, accept sort props from parent, wire `filterable` to dispatch `filter-change`.
- `src/components/fv-view.ts` — own sort state, pass `sortField`/`sortDirection` down to `fv-grid`, handle `export-request`, forward `storageKey`/`syncUrl` correctly.
- `src/lib/persistence.ts` — extend `PersistedState.order` to `{ field: string, direction: 'asc' | 'desc' } | null`. Migration: read old shape, drop it (no field to recover).
- `src/lib/registry.ts` — extend `GridConfig` with `headerMenu`, `actions`, `export.formats`.
- `src/lib/types.ts` — add `exportable`, `headerMenu` to `ColumnConfig`; type the new events.
- `src/index.ts` — re-export `applySort`, `applyFilters`, new components.
- `README.md` — document header menu, registry options, popover browser support note.

## Risks

- **Safari < 17 popover gap**: users on older Safari see no menu. Mitigation: document clearly; menu trigger remains a `<button>` with sensible fallback (clicking it does nothing harmful, just no popup). Acceptable for v1.
- **Persistence migration**: existing users with old `order` shape lose their sort on first load after upgrade. Mitigation: silent reset, documented in changelog. No field name was ever stored, so recovery isn't possible.
- **Stateless grid is a breaking-ish change**: anyone reading `fv-grid` sort state imperatively will break. Mitigation: pre-1.0 library, no public API for that today, but call it out in release notes.
- **SheetJS lazy load failure modes**: network errors, CSP `script-src` blocks. Mitigation: `toXLSX()` wraps the dynamic import in try/catch and dispatches `export-error`. CSV export is unaffected.
- **Filter UX scope creep**: shipping only a text input may feel weak per column type. Mitigation: filter is pluggable per column via `actions.filter` override + per-column `headerMenu`; richer filter packs can ship in follow-up changes.
- **Event naming overlap with consumers**: `sort-change`, `filter-change`, `export-request` are generic. Mitigation: events are dispatched from our custom elements only; document them as `flexi-view` events. If collisions reported, prefix with `fv-` in a follow-up.

## Open questions deferred to design

- Exact shape of `applyFilters` predicate when `filterable` is a custom function vs primitive value.
- Whether `fv-export-action` should accept a `transform` callback for cell value formatting (likely yes, but design phase will lock the signature).
- Keyboard navigation inside `fv-header-menu` (arrow keys, escape, focus trap) — design will spec ARIA.
