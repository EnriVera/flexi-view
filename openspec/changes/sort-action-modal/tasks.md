# Tasks: sort-action-modal

> Delivery strategy: `single-pr`
> Artifact store: `hybrid`

---

## PHASE 1 — i18n (unblocks all rendering)

### [x] T-01 · Add i18n keys to en.ts
- **Spec ref**: §1
- **File**: `src/i18n/en.ts`
- **Depends on**: nothing (first task)
- Extend the `sort` namespace:
  ```ts
  title: 'Sort',
  selectField: 'Select a field to sort',
  ```
  Existing keys (`asc`, `desc`, `clear`) are preserved.
- NOTE: the implementation uses `sort.selectField` (design's key name) — not `sort.noField` as the spec §1 lists. The design is the authoritative implementation contract for key names.

### [x] T-02 · Add i18n keys to es.ts
- **Spec ref**: §1
- **File**: `src/i18n/es.ts`
- **Depends on**: T-01 (es.ts uses `Translations` type from en.ts; compiler errors until T-01 is done)
- Add:
  ```ts
  title: 'Ordenar',
  selectField: 'Seleccioná un campo para ordenar',
  ```

---

## PHASE 2 — fv-sort-button (new internal component)

### [x] T-03 · Create fv-sort-button.ts
- **Spec ref**: §2
- **File**: `src/components/fv-sort-button.ts` (NEW)
- **Depends on**: T-02
- Copy of current `src/components/fv-sort-action.ts` with these changes:
  - `@customElement('fv-sort-button')`
  - Class name: `FvSortButton`
  - All `[fv-sort-action]` console strings → `[fv-sort-button]`
  - Named export: `export class FvSortButton`
- NOT added to `src/index.ts` (internal component)

### [x] T-04 · Update fv-header-menu.ts
- **Spec ref**: §5
- **File**: `src/components/fv-header-menu.ts`
- **Depends on**: T-03
- Changes:
  1. Add `import './fv-sort-button.js';`
  2. Remove `import './fv-sort-action.js';`
  3. Replace both `<fv-sort-action` template tags (lines 171, 177) → `<fv-sort-button`
  4. Replace corresponding `</fv-sort-action>` closing tags → `</fv-sort-button>`

---

## PHASE 3 — fv-sort-action full rewrite

### [x] T-05 · fv-sort-action — properties, state, _connect, persistence helpers
- **Spec ref**: §4 (API, Internal state, Persistence §6)
- **File**: `src/components/fv-sort-action.ts`
- **Depends on**: T-02 (i18n types complete); can run in parallel with T-03/T-04
- Implement:
  - Properties: `for` (attr), `registerOrder` (array + JSON attr parsed in `willUpdate`), `storageKey` (`storage-key`), `syncUrl` (`sync-url` boolean)
  - `@state()`: `_modalOpen`, `_selectedField`, `_activeSort`, `_targetOwnsUrl`
  - `_connect()`:
    1. `await customElements.whenDefined('fv-view')`
    2. resolve target by id with one rAF retry
    3. detect `_targetOwnsUrl = target.hasAttribute('sync-url')`
    4. hydration precedence: `readSortFromUrl()` > `localStorage[storageKey+'-sort']` > `target.currentSort`
    5. set `_activeSort`, dispatch `sort-change` to target with hydrated state
    6. subscribe `fv-sort-change` listener on target
  - Private: `_writeStorage()`, `_readStorage()`
  - Imports from `../utils/persistence.js`: `writeSortToUrl`, `clearSortFromUrl`, `readSortFromUrl`
  - `_onSortChangeFromView`: updates `_activeSort`, re-renders, calls `_writePersistence()`
  - `disconnectedCallback`: unsubscribe config + remove external listener

### [x] T-06 · fv-sort-action — render template (chip + inline modal)
- **Spec ref**: §4 (Button rendering, §3 layout)
- **File**: `src/components/fv-sort-action.ts`
- **Depends on**: T-05
- Chip structure:
  ```
  div.chip
    button.main[aria-pressed][title](@click=_openModal)
      span.label — inactive: t().sort.title | active: "${fieldTitle} - ${dirLabel}"
    button.clear (only when _activeSort)(@click=_onClear) — ×
  ```
- Modal structure (when `_modalOpen`):
  ```
  div.backdrop[position:fixed](@ click=_closeModal)
    div.modal[role=dialog][aria-modal=true][aria-labelledby](@click=stopPropagation)
      div.header
        span#modal-title — t().sort.title
        button.close-btn(@click=_closeModal)
      div.body[display:flex]
        div.fields
          button.field-item[aria-pressed](per registerOrder entry)
          OR <p class="empty"> when empty
        div.divider
        div.actions
          (when _selectedField)
            button.dir.asc[aria-pressed](@click=_onApply('asc'))
            button.dir.desc[aria-pressed](@click=_onApply('desc'))
          (else)
            <p class="empty">${t().sort.selectField}</p>
  ```
- CSS: chip styles mirror `fv-filter-action`; modal shell + two-column layout mirrors `fv-filter-modal`

### [x] T-07 · fv-sort-action — event handlers
- **Spec ref**: §4 (Behavior table, Clear button behavior, Close triggers, Inbound sync)
- **File**: `src/components/fv-sort-action.ts`
- **Depends on**: T-05 (state exists); parallel with T-06
- Implement:
  - `_openModal()`: guard `if (this._modalOpen) return;`; set `_modalOpen = true`; `_selectedField = _activeSort?.field ?? null`
  - `_selectField(field)`: sets `_selectedField`
  - `_onApply(direction)`: toggle-to-clear when `_activeSort?.field === _selectedField && _activeSort?.direction === direction`; else sets `_activeSort = { field: _selectedField, direction }`; calls `_emit()` + `_writePersistence()`; sets `_modalOpen = false`
  - `_onClear()`: `_activeSort = null`; `_emit({ field: '', direction: null })`; `_writePersistence()`; focus main button via `updateComplete.then()`
  - `_closeModal()`: `_modalOpen = false` (no emit)
  - `_emit(detail)`: dispatches `sort-change` (bubbles+composed) on self; non-bubbling on `_target` if set
  - `_writePersistence()`: `_writeStorage()` unless `_targetOwnsUrl`; `writeSortToUrl`/`clearSortFromUrl` unless `_targetOwnsUrl`
  - Keyboard: capture `keydown` on `document` in `connectedCallback` (capture phase); Escape → `_closeModal()` when `_modalOpen`; `ArrowDown`/`ArrowUp` move focus between `.field-item` buttons

---

## PHASE 4 — Tests

### [x] T-08 · Create fv-sort-button.test.ts
- **Spec ref**: §9 Scenario 12 (chip backward-compat); design Test Strategy
- **File**: `src/__tests__/components/fv-sort-button.test.ts` (NEW)
- **Depends on**: T-03
- **Parallel with**: T-09, T-10
- Copy of `fv-sort-action.test.ts`, replace:
  - Import `FvSortButton` from `../../components/fv-sort-button.js`
  - All `FvSortAction` → `FvSortButton`
  - All `[fv-sort-action]` strings → `[fv-sort-button]`
- All existing tests should pass unchanged (behavior is byte-identical)

### [x] T-09 · Rewrite fv-sort-action.test.ts
- **Spec ref**: §9 Scenarios 1–11, 13, 14; design Test Strategy
- **File**: `src/__tests__/components/fv-sort-action.test.ts` (REWRITE)
- **Depends on**: T-05, T-06, T-07
- **Parallel with**: T-08, T-10
- Test suites:
  1. **Rendering** (Scenarios 1, 2): inactive label = `t().sort.title`; `aria-pressed=false`; no × button; active label = `"${title} - ${dirLabel}"`; `aria-pressed=true`; × button present
  2. **registerOrder** (Scenario 11): array property; JSON string attribute; malformed JSON → console.warn + fallback `[]`
  3. **Modal open/close** (Scenarios 2, 5, 6): main click opens; Escape closes; backdrop click closes; no `sort-change` emitted on close-without-select; double-click guard prevents re-open
  4. **Field selection**: clicking field sets `_selectedField`; opening modal preselects `_activeSort.field`
  5. **Apply** (Scenarios 2, 3): direction click emits correct detail; toggle-to-clear emits `direction: null`; `_modalOpen = false` after apply
  6. **Clear × button** (Scenario 4): emits `{ field: '', direction: null }`; `_activeSort = null`; focus returns to main button
  7. **Persistence write-back** (Scenario 9): `_writeStorage` called when `storageKey` set; `writeSortToUrl` called when `syncUrl && !_targetOwnsUrl`; neither called when `_targetOwnsUrl=true`
  8. **Persistence hydration** (Scenarios 7, 8): URL > localStorage > target.currentSort precedence; `sort-change` dispatched to target on connect
  9. **Inbound sync** (Scenario 10): `fv-sort-change` from target updates `_activeSort`
  10. **No target** (Scenario 14): console.warn; component renders; modal opens; event bubbles
  11. **Keyboard** (Scenario 13): Escape closes modal; `_openModal` guard

### [x] T-10 · Spot-check fv-header-menu.test.ts
- **Spec ref**: §9 Scenario 12
- **File**: `src/__tests__/components/fv-header-menu.test.ts`
- **Depends on**: T-04
- **Parallel with**: T-08, T-09
- Current tests do NOT query `fv-sort-action` by tag and do NOT import `FvSortAction` — confirmed by reading the file.
- Action: run the suite; if any selector for `fv-sort-action` appears (e.g. from a future addition), update to `fv-sort-button`.
- Expected outcome: all 8 existing tests pass without modification.

---

## Dependency Graph

```
T-01 → T-02 ─┬─→ T-03 → T-04 → T-10
              │         ↘ T-08
              └─→ T-05 → T-06
                       ↘ T-07
                   T-05+T-06+T-07 → T-09
```

Minimum critical path: T-01 → T-02 → T-05 → T-06+T-07 → T-09

---

## Review Workload Forecast

| Metric | Value |
|---|---|
| Estimated changed lines | ~420 (fv-sort-action ~250, fv-sort-button ~70, fv-header-menu ~10, i18n ~4, tests ~200) |
| 400-line budget risk | Moderate (slightly above threshold) |
| Chained PRs recommended | No — change is cohesive; splitting leaves fv-header-menu in a broken intermediate state |
| Decision needed before apply | No |
| Delivery strategy | `single-pr` |
