# Tasks: external-action-components

**Delivery strategy**: single-pr — ~150-200 lines changed, within 400-line budget.
**TDD mode**: STRICT — write failing test first, then implement, then verify.
**Test command**: `pnpm test` (vitest, 137 baseline tests)

---

## Dependency graph

```
T1 (types) → T2 (fv-view events + getters) → T3 ─┐
                                                    T4 ─┤→ T6 (integration)
                                                    T5 ─┘
```

T1 → T2 are sequential. T3, T4, T5 run in parallel after T2. T6 runs after all three.

---

## T1 — types.ts + index.d.ts

**Spec ref**: Delta for types.ts + index.d.ts
**Files**: `src/types.ts`, `src/index.d.ts`
**Sequential**: must run first — all other tasks import these types.

### TDD steps
1. Write failing test: `ColumnConfig` accepts `exportable?: boolean` (type-level, compile-checked)
2. Write failing test: `FvSortChangeDetail` and `FvFilterChangeDetail` are exported with correct shapes
3. Add `exportable?: boolean` to `ColumnConfig` in `types.ts`
4. Export `FvFilterChangeDetail = { filters: Record<string, unknown> }`; ensure `SortChangeDetail | null` is re-exported if not already
5. Add JSX intrinsic entries for `fv-sort-action`, `fv-filter-action`, `fv-export-action` in `index.d.ts` — each includes `for?: string` plus component-specific attributes
6. `pnpm test` — 137 baseline must still pass

---

## T2 — fv-view: outbound events + public getters

**Spec ref**: Delta for fv-view (fv-sort-change, fv-filter-change, currentSort, currentFilters)
**Files**: `src/components/fv-view.ts`, `src/__tests__/components/fv-view.test.ts`
**Sequential after T1**: uses `FvSortChangeDetail` / `FvFilterChangeDetail` types.

### TDD steps
1. Write failing test: sort action causes `fv-view` to emit `fv-sort-change` with correct `{ field, direction }` payload
2. Write failing test: filter action causes `fv-view` to emit `fv-filter-change` with correct `{ filters }` payload
3. Write failing test: `fv-view.currentSort` getter returns mirror of `_sortConfig`
4. Write failing test: `fv-view.currentFilters` getter returns mirror of `_filters`
5. Write failing test: sort cleared emits `fv-sort-change` with `direction: null`
6. Implement private `_emitStateEvent(name, detail)` helper — dispatches `CustomEvent` with `{ bubbles: true, composed: true }` on `this`
7. Add public getter `currentSort` → `return this._sortConfig`
8. Add public getter `currentFilters` → `return this._filters`
9. Call `_emitStateEvent('fv-sort-change', ...)` at all **5** `_sortConfig` mutation sites:
   - `_onSortChange`
   - `connectedCallback` (localStorage restore)
   - `connectedCallback` (URL restore)
   - `_onHashChange`
   - `_checkStorageChange`
10. Call `_emitStateEvent('fv-filter-change', ...)` at all **5** `_filters` mutation sites:
    - `_onFilterChange`
    - `_onSearch`
    - `connectedCallback` (localStorage restore)
    - `connectedCallback` (URL restore)
    - `_checkStorageChange`
11. `pnpm test` — all new tests pass, 137 baseline intact

---

## T3 — fv-sort-action: `for` attribute + external mode [PARALLEL after T2]

**Spec ref**: fv-sort-action Specification
**Files**: `src/components/fv-sort-action.ts`, `src/__tests__/components/fv-sort-action.test.ts`

### TDD steps
1. Write failing test: when `for` is set, resolves `fv-view` by `getElementById`
2. Write failing test: reads initial sort state from `target.currentSort` on `firstUpdated`
3. Write failing test: subscribes to `fv-sort-change` and updates display when event fires
4. Write failing test: `_onClick` dispatches `sort-change` on self AND on target (`bubbles: false` on target)
5. Write failing test: `disconnectedCallback` removes `fv-sort-change` listener from target
6. Add `@property({ attribute: 'for' }) for?: string`
7. Implement `firstUpdated`: `customElements.whenDefined('fv-view')` → `getElementById` → single rAF retry → `console.warn` once on failure
8. Read `target.currentSort`, update own `active`/`direction`
9. Subscribe `target`'s `fv-sort-change` → update `active`/`direction` from `detail.field === this.field`
10. `_onClick`: keep existing self-dispatch; add target redispatch (new `CustomEvent`, `bubbles: false`)
11. `disconnectedCallback`: `removeEventListener` on `_target`
12. `pnpm test`

---

## T4 — fv-filter-action: `for` attribute + external mode [PARALLEL after T2]

**Spec ref**: fv-filter-action Specification
**Files**: `src/components/fv-filter-action.ts`, `src/__tests__/components/fv-filter-action.test.ts`

### TDD steps
1. Write failing test: when `for` is set, resolves `fv-view` by `getElementById`
2. Write failing test: computes options from `target.registers` (full dataset, NOT `filteredData`)
3. Write failing test: reads initial selected from `target.currentFilters[this.field]`
4. Write failing test: subscribes to `fv-filter-change` and updates `selected` state
5. Write failing test: `_onChange` dispatches `filter-change` on self AND on target
6. Write failing test: `disconnectedCallback` removes `fv-filter-change` listener
7. Add `@property({ attribute: 'for' }) for?: string`
8. Implement `firstUpdated`: resolve target (same rAF retry pattern as T3)
9. Compute options from `target.registers` (full domain) — v1 limitation: one-shot on connect, documented
10. Read initial `selected` from `target.currentFilters[this.field]`
11. Subscribe `fv-filter-change` → update `this.selected` from `detail.filters[this.field]`
12. `_onChange`: self-dispatch + target redispatch (`bubbles: false` on target)
13. `disconnectedCallback`: `removeEventListener` on `_target`
14. `pnpm test`

---

## T5 — fv-export-action: `for` attribute + external mode [PARALLEL after T2]

**Spec ref**: fv-export-action Specification (ADR-3: reads `target.columnDefs` + `target.filteredData`)
**Files**: `src/components/fv-export-action.ts`, `src/__tests__/components/fv-export-action.test.ts`

### TDD steps
1. Write failing test: when `for` is set, resolves `fv-view` by `getElementById`
2. Write failing test: `_onClick` reads `target.filteredData` and `target.columnDefs` at trigger time (not on connect)
3. Write failing test: respects `exportable: false` on columns — filters them out of export
4. Write failing test: injected mode (no `for`) still works unchanged (regression guard)
5. Add `@property({ attribute: 'for' }) for?: string`
6. Implement `firstUpdated`: resolve target (rAF retry), store in `_target`. No event subscription.
7. `_onClick`: when `_target` is set, override `rows = _target.filteredData`, `columns = _target.columnDefs`; filter by `exportable !== false`; call `exportCSV`/`exportXLSX`
8. `pnpm test`

---

## T6 — Integration verification [SEQUENTIAL, after T3 + T4 + T5]

**Spec ref**: cross-component — all specs satisfied
**Files**: no new files; review all test files

### Steps
1. `pnpm test` — full suite passes (baseline 137 + all new tests)
2. Verify no circular imports: `types.ts` must not import from any component
3. Verify injected mode (no `for`) is regression-free in all three action components
4. Confirm `fv-view` emits events at all 10 mutation sites (5 sort + 5 filter) via test coverage
5. Confirm event name collision safety: inbound = `sort-change`/`filter-change`; outbound = `fv-sort-change`/`fv-filter-change`

---

## Review Workload Forecast

| Metric | Value |
|---|---|
| Estimated changed lines | ~150–200 |
| Chained PRs recommended | No |
| 400-line budget risk | Low |
| Decision needed before apply | No |
