# Tasks: view-tools-v1

## Phase 1: Foundation

- [ ] 1.1 Create `package.json` — name: `view-tools`, deps: `lit`. devDeps: `vite`, `typescript`, `vitest`, `@web/test-runner`, `playwright`, `size-limit`
- [ ] 1.2 Create `tsconfig.json` — strict mode, experimentalDecorators, useDefineForClassFields, target ES2020
- [ ] 1.3 Create `vite.config.ts` — library mode, entry: `src/index.ts`, formats: `['es', 'umd']`, outDir: `dist`
- [ ] 1.4 Create `src/types.ts` — `ColumnConfig<T>`, `DataViewOptions`, `SortChangeDetail`, `FilterChangeDetail`, `RowClickDetail<T>`, `PersistMode` union
- [ ] 1.5 Update `.gitignore` — add `dist/`, `node_modules/`, `.wtr/`

## Phase 2: Built-in Controls

- [ ] 2.1 Create `src/controls/dv-text.ts` — Lit element, renders `item[field]` as string, exposes `item` + `params` properties
- [ ] 2.2 Create `src/controls/dv-number.ts` — same pattern, renders formatted number
- [ ] 2.3 Create `src/controls/dv-date.ts` — same pattern, renders locale date string
- [ ] 2.4 Create `src/controls/dv-badge.ts` — same pattern, renders styled pill using `params.color`

## Phase 3: Core Components

- [ ] 3.1 Create `src/registry.ts` — `configureGrid({ controls })` stores lazy loaders; `resolveControl(tag)` calls `whenDefined` + triggers loader if registered
- [ ] 3.2 Create `src/components/data-grid.ts` — renders `<table>` from `data[]` + `columns[]`; sortable headers emit `sort-change`; filterable headers emit `filter-change`; cells use `resolveControl(col.control)`
- [ ] 3.3 Create `src/components/data-list.ts` — renders `<ul>` rows, each row instantiates configured controls, emits `row-click { item, index }` on click
- [ ] 3.4 Create `src/components/data-cards.ts` — renders CSS grid of cards, each card instantiates configured controls, emits `row-click { item, index }` on click
- [ ] 3.5 Create `src/components/data-view.ts` — owns `activeView`, `filters`, `sortConfig`; applies sort+filter pipeline; delegates to active sub-view; reads/writes persistence storage when `storage-key` attr set
- [ ] 3.6 Create `src/components/view-switcher.ts` — renders view toggle buttons; emits `view-change { view }` on click; reflects active view via attribute
- [ ] 3.7 Create `src/index.ts` — imports + registers all 4 built-in controls and all 5 components; re-exports `ColumnConfig`, `DataViewOptions`, `configureGrid`

## Phase 4: Dev Sandbox

- [ ] 4.1 Create `dev/index.html` — imports `src/index.ts` via Vite, renders `<data-view>` with sample data and all 3 view types togglable
- [ ] 4.2 Create `dev/demo.ts` — sample data array (10+ records), `columns` config using `dv-text`, `dv-number`, `dv-badge`

## Phase 5: Testing

- [ ] 5.1 Vitest — `src/registry.test.ts`: verify `configureGrid` registers loaders, `resolveControl` calls `whenDefined`
- [ ] 5.2 Vitest — `src/components/data-view.sort-filter.test.ts`: verify sort asc/desc and multi-filter logic against spec scenarios
- [ ] 5.3 Vitest — `src/components/data-view.persistence.test.ts`: verify storage-key read/write; verify no-op without storage-key
- [ ] 5.4 @web/test-runner — `data-grid.wtr.ts`: render component in browser, assert sort-change + filter-change events fire with correct detail
- [ ] 5.5 @web/test-runner — `control-contract.wtr.ts`: assert built-in controls auto-register; assert `whenDefined` wait before mount
- [ ] 5.6 Playwright — `e2e/view-switch.spec.ts`: render full `<data-view>`, switch view, verify sub-view mounts and data persists across simulated reload

## Phase 6: Polish

- [ ] 6.1 Create `README.md` — install, basic usage example, `ColumnConfig` API table, CSS vars list, event reference
- [ ] 6.2 Add `size-limit` config to `package.json` — budget: 20KB gzipped; add `size-limit` script
- [ ] 6.3 Update `openspec/changes/view-tools-v1/state.yaml` — mark tasks: done
