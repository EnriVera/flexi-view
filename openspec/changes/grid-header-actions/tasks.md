# Tasks: grid-header-actions

> Delivery: Single PR (pre-1.0 contained feature)
> Total tasks: 18 | Sequential chains: 3 | Parallel groups: 4
> Estimated lines changed: ~750–900 (new files ~550, modified ~300)
> Chained PRs recommended: No

---

## Legend

- `[SEQ]` — must run after previous task in its chain
- `[PAR]` — can run in parallel with other `[PAR]` tasks in the same group
- `[BLOCK:X]` — blocked until task X is complete
- Spec ref column maps to requirement domains in the spec artifact

---

## Phase 0 — Foundation (no dependencies; all parallel)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T01 | `[PAR]` Update `src/types.ts`: add `HeaderMenuElement<T>` interface, `ExportFormat`, `ExportRequestDetail`; widen `SortChangeDetail.direction` to include `null`; add `exportable?` and `headerMenu?: string \| false` to `ColumnConfig`; update `PersistedState.sort` to `{ field, direction } \| null` | modify | pluggable-header, export, sort-filter delta | No imports from other src files — safe to do first |
| T02 | `[PAR]` Update `src/registry.ts`: add `headerMenu?`, `actions?`, and `export?: { formats?, excelLibrary? }` to `GridConfig`; export internal `gridConfig` accessor | modify | pluggable-header, export | Depends only on types — do after T01 or alongside since types are structural |
| T03 | `[PAR]` Fix `src/utils/persistence.ts`: replace `order:'as'/'des'` shape with `sort: { field, direction } \| null`; silently drop legacy `order` on `readState`; add URL `?sort=field:dir` sync on write/read | modify | sort-filter delta, data-view-core delta (D6, D7) | Bug fix — persistence before any component touches state |

> T01, T02, T03 can all start simultaneously. T02 logically reads types but registry.ts has its own shape — both can be edited in one pass if done by same person.

---

## Phase 1 — fv-grid stateless refactor (BLOCK: T01)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T04 | `[SEQ]` Refactor `src/components/fv-grid.ts`: remove `_sortField`/`_sortDir` local state; add `@property() currentSort` and `@property() currentFilters` props; replace header click calling `_sort()` with a trigger button that opens `fv-header-menu`; wire `filterable` columns to pass `currentFilters` | modify | data-grid delta | Requires types from T01. This unblocks T07 (fv-header-menu integration) |

---

## Phase 2 — Standalone action components (BLOCK: T01; parallel with each other)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T05 | `[PAR]` Create `src/components/fv-sort-action.ts`: accepts `field`, `direction`, `column` props; dispatches `sort-change` `{field, direction}`; renders asc/desc buttons; works standalone outside fv-grid | create | standalone-actions | Pure Lit component, no external deps beyond types |
| T06 | `[PAR]` Create `src/components/fv-filter-action.ts`: accepts `field`, `value`, `column` props; dispatches `filter-change` `{field, value}`; text input; empty value clears filter | create | standalone-actions | Pure Lit component |
| T08 | `[PAR]` Create `src/lib/export.ts`: CSV export via `Blob` (zero deps); XLSX lazy-load via injected `excelLibrary` factory; export helper receives `{ format, columns, rows }`; on SheetJS load failure dispatches `export-error` | create | export | Pure utility, no Lit — safe to author in parallel with components |
| T09 | `[PAR]` Create `src/components/fv-export-action.ts`: accepts `format`, `columns`, `rows` props; dispatches `fv-export-request`; XLSX path lazy-loads SheetJS from `gridConfig.export.excelLibrary` | create | standalone-actions, export | Depends on T08 (export.ts) and T02 (gridConfig accessor) |

> T05, T06, T08 can start as soon as T01 is done. T09 waits for T08 and T02 in addition to T01.

---

## Phase 3 — fv-header-menu (BLOCK: T04, T05, T06, T09)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T07 | `[SEQ]` Create `src/components/fv-header-menu.ts`: native `popover="manual"` popup; `open(anchor)`/`close()` implementing `HeaderMenuElement<T>`; `getBoundingClientRect` positioning; composes `fv-sort-action`, `fv-filter-action`, `fv-export-action` conditionally per column config; closes on outside click/Escape | create | fv-header-menu, pluggable-header | Must wait for all standalone actions (T05, T06, T09) and the fv-grid trigger surface (T04) |

---

## Phase 4 — fv-view wiring (BLOCK: T03, T04, T07)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T10 | `[SEQ]` Update `src/components/fv-view.ts`: move sort state ownership here (remove from fv-grid); pass `currentSort`/`currentFilters` down to fv-grid; listen for `fv-export-request` and delegate to `export.ts`; call updated `_persistPayload` with `sort:{field,direction}`; restore `sort.field` on `connectedCallback` | modify | data-view-core delta | Requires persistence fix (T03), fv-grid stateless (T04), and fv-header-menu to exist (T07) |

---

## Phase 5 — Tests (interleaved per component; can start as soon as each unit is done)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T11 | `[PAR]` Tests for `fv-sort-action` + `fv-filter-action` — 4 standalone-actions scenarios | test | standalone-actions | After T05, T06 |
| T12 | `[PAR]` Tests for `fv-export-action` + `export.ts` — 4 export scenarios | test | export | After T08, T09 |
| T13 | `[PAR]` Tests for `fv-header-menu` — 8 scenarios (popup lifecycle, sort actions, filter panel, export) | test | fv-header-menu | After T07 |
| T14 | `[PAR]` Tests for pluggable header — 4 scenarios (global override, per-column override, false disables, contract check) | test | pluggable-header | After T07, T10 |
| T15 | `[PAR]` Tests for fv-grid delta — 4 scenarios (stateless sort/filter props, trigger opens menu, filterable wired) | test | data-grid delta | After T04 |
| T16 | `[PAR]` Tests for persistence + URL sync — 5 sort-filter scenarios + 3 URL sync scenarios | test | sort-filter delta, data-view-core delta | After T03, T10 |

---

## Phase 6 — Exports + docs (BLOCK: all prior phases)

| # | Task | Type | Spec Ref | Notes |
|---|------|------|----------|-------|
| T17 | `[SEQ]` Update `src/index.ts`: re-export `applySort`, `applyFilters`; export new components (`fv-header-menu`, `fv-sort-action`, `fv-filter-action`, `fv-export-action`) and new types (`HeaderMenuElement`, `ExportFormat`, `ExportRequestDetail`) | modify | sort-filter delta | Must be last — exports only what's fully implemented |
| T18 | `[SEQ]` Update `README.md`: add popover browser support note; add migration note for `order` → `sort` shape change; document `configureGrid` new options | modify | — | Last task; references final API surface |

---

## Dependency Graph (sequential chains)

```
T01 ──┬──> T04 ──> T07 ──> T10 ──> T17 ──> T18
      ├──> T05 ──>  ↑
      └──> T06 ──>  ↑
T02 ──────> T09 ──> ↑
T03 ──────────────> T10
T08 ──────> T09
```

Tests (T11–T16) hang off each component/phase and run as soon as their target is done.

---

## Review Workload Forecast

| Metric | Estimate |
|--------|----------|
| New files | 5 (`fv-header-menu.ts`, `fv-sort-action.ts`, `fv-filter-action.ts`, `fv-export-action.ts`, `export.ts`) |
| Modified files | 6 (`types.ts`, `registry.ts`, `persistence.ts`, `fv-grid.ts`, `fv-view.ts`, `index.ts`) + `README.md` |
| Estimated new lines | ~550–600 |
| Estimated modified lines | ~250–300 |
| Total estimated delta | ~800–900 lines |
| 400-line budget risk | Medium (exceeds 400 but all cohesive feature — no unrelated churn) |
| Chained PRs recommended | No — pre-1.0 library, single contained feature, no external consumers |
| Decision needed before apply | No |

---

## Risks

1. **T07 is the critical path bottleneck** — fv-header-menu is blocked by 4 tasks (T04, T05, T06, T09). Any slip there delays T10 and everything downstream.
2. **T09 has two blockers** (T02 + T08) in addition to T01 — export action can't be authored until both registry accessor and export utility exist.
3. **T03 (persistence fix) is a bug fix masquerading as a feature task** — if it regresses existing sort behaviour, T16 tests will catch it, but fv-view (T10) will need re-testing too.
4. **fv-header-menu uses imperative DOM** (single instance per grid, body-level popover stacking per design D) — test coverage in T13 must cover open/close lifecycle explicitly; jsdom may not support `popover` natively (check test environment).
