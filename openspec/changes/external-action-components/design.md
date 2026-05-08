# Design: External Action Components

## 1. Architecture Overview

Make `fv-sort-action`, `fv-filter-action`, and `fv-export-action` self-connecting via a `for="view-id"` attribute. Pattern is the **fv-switcher/fv-search hybrid**:

- **fv-switcher pattern** for state sync: read initial state from public getters; listen for outbound events from target.
- **fv-search pattern** for delivery: dispatch on self (bubbles) AND redispatch the event on the target element to guarantee delivery regardless of DOM location.

`fv-view` becomes the single source of truth and the single sync hub. It already holds `_sortConfig`, `_filters`, `_registers`, `_fieldGrids`. It already listens to `sort-change`, `filter-change`, `fv-export-request` ON ITSELF (`addEventListener` in `connectedCallback`). The new requirement is that it must also EMIT outbound state events so external action components can stay in sync.

The in-menu flow (`fv-grid → header-menu-open → fv-view._onHeaderMenuOpen → menu`) is untouched. The menu still receives props imperatively.

---

## 2. Architecture Decisions

### ADR-1: Mount race resolution — use `customElements.whenDefined('fv-view')` + single `requestAnimationFrame` retry

**Problem.** Action components mounted in a parent toolbar can run `firstUpdated` before `fv-view` is upgraded; `getElementById` may return an `HTMLUnknownElement`-like node without the public getters, or null if the element is not yet in DOM.

**Decision.** In each action component's `firstUpdated`:
1. Await `customElements.whenDefined('fv-view')`.
2. Then call `document.getElementById(this.for)`.
3. If still null, retry once on the next `requestAnimationFrame`. If still null, `console.warn` once with the missing id and bail (component stays inert; no throw).

**Rationale.**
- `whenDefined` solves the upgrade race deterministically — no polling, no MutationObserver overhead.
- The single `rAF` retry handles the case where the action component's parent rendered before `fv-view` was inserted into the DOM.
- `MutationObserver` is rejected: overkill for a one-time bind and adds a permanent observer.
- A bare `requestAnimationFrame` (without `whenDefined`) is rejected: `whenDefined` is the canonical solution for the upgrade race and is already supported everywhere Lit runs.

**Rejected alternatives.**
- Pure `rAF` retry loop — works in practice but doesn't express intent; brittle if upgrade is delayed by a slow module load.
- `MutationObserver` on `document.body` — extra resource cost, has to be torn down, no functional benefit here.

---

### ADR-2: Event emission in fv-view — private `_emit` helper called at every state mutation site

**Decision.** Add a private method `_emitStateEvent(name, detail)` on `fv-view` that dispatches a `CustomEvent` on `this` with `bubbles: true, composed: true`. Call it after every `_sortConfig` and `_filters` assignment.

**Mutation sites for `_sortConfig`:**
1. `_onSortChange` — sets `_sortConfig = null` (clear) or `_sortConfig = detail`. Emit `fv-sort-change` after.
2. `connectedCallback` — sets `_sortConfig` from `saved.sort` (storage). Emit `fv-sort-change` after.
3. `connectedCallback` — sets `_sortConfig` from URL. Emit `fv-sort-change` after.
4. `_onHashChange` — sets `_sortConfig` from URL. Emit `fv-sort-change` after.
5. `_checkStorageChange` — sets `_sortConfig` from cross-tab storage poll. Emit `fv-sort-change` after.

**Mutation sites for `_filters`:**
1. `_onFilterChange` — assigns `_filters` (add or remove). Emit `fv-filter-change` after.
2. `_onSearch` — assigns `_filters` (search add/remove). Emit `fv-filter-change` after.
3. `connectedCallback` — assigns `_filters` from storage. Emit `fv-filter-change` after.
4. `connectedCallback` — assigns `_filters` from URL. Emit `fv-filter-change` after.
5. `_checkStorageChange` — assigns `_filters` from cross-tab storage poll. Emit `fv-filter-change` after.

**Event payloads.**
- `fv-sort-change` → `detail: SortChangeDetail | null` (mirrors `_sortConfig`)
- `fv-filter-change` → `detail: { filters: Record<string, unknown> }` (the full filter map; consumers compare against their own `field`)

**Rationale.** A helper avoids drift between the 5+ mutation sites. Emitting full filter map (not per-field deltas) lets external components recompute their own active state with one comparison, and matches the existing `_filters` shape that `fv-header-menu` already consumes via `currentFilters`.

**Self-emit safety.** `fv-view` listens to `sort-change` and `filter-change` (the inbound names from menu/external) on itself. The new outbound names are `fv-sort-change` and `fv-filter-change` — different names, no listener collision, no infinite loop.

---

### ADR-3: fv-export-action external mode — read `columnDefs` getter, not `fieldGrids` directly

**Decision.** When `for` is set, `fv-export-action` reads:
- `rows` from `target.filteredData` (already public, returns post-sort/filter data)
- `columns` from `target.columnDefs` (already public, currently returns `_fieldGrids`)

**Rationale.** `columnDefs` is the documented public surface for "what columns are active right now". Today it returns `_fieldGrids`, but the active-view-aware version is forthcoming (cards/list views). Reading the getter future-proofs export to follow the active view automatically without changes to the action component.

`fieldGrids` setter/getter remains for the in-menu path (where the menu receives `fieldGrids` as a prop). Not used externally.

---

### ADR-4: Event delivery — fv-search style (self-dispatch + target redispatch)

**Decision.** Action components, when `for` is set, do BOTH on user interaction:
1. `this.dispatchEvent(new CustomEvent('sort-change', { bubbles: true, composed: true, ... }))` — for any ancestor analytics listeners and for the in-menu case where the event bubbles to `fv-view`.
2. `this._target.dispatchEvent(new CustomEvent('sort-change', { bubbles: false, ... }))` — guaranteed delivery to `fv-view`'s self-listener regardless of DOM location.

**Rationale.** `fv-view` registers its sort/filter listeners with `this.addEventListener(...)` in `connectedCallback`. When the action component is inside `fv-view`, bubbling delivers it. When the action component is in a sibling toolbar, bubbling does NOT reach `fv-view`. Direct redispatch on the target solves this without changing the listener setup. fv-search already proves this pattern.

The redispatch uses a fresh CustomEvent (do NOT re-dispatch the same Event object — DOM throws on already-dispatched events). `bubbles: false` on the redispatch avoids double-handling if any ancestor listener exists.

**No imperative target methods.** We do NOT add `target.applySort()` / `target.applyFilter()`. Keeping the contract event-only preserves a single inbound API surface.

---

### ADR-5: Shared logic — duplicate, do not abstract (yet)

**Decision.** Each action component duplicates ~10 lines of `for` + `_target` resolution + connect/disconnect cleanup. No mixin, no base class.

**Rationale.**
- 3 components × ~10 lines = 30 lines. A mixin would cost ~25 lines + a new file + indirection.
- Lit mixins interact awkwardly with `@customElement` and decorator typing; would force a generic constraint shared by three otherwise-independent components.
- The shared shape (resolve target, subscribe to one or two events, unsubscribe on disconnect) is small enough that reading each component is faster than tracing through a mixin.
- If a 4th external action emerges later, revisit (Rule of Three+1).

**Rejected.** `ExternalActionMixin<TBase>` with `for`, `_target`, `_resolveTarget()`, `_onTargetEvent` slots — premature abstraction.

---

## 3. Implementation Plan (per file)

### `src/types.ts`

- Add `exportable?: boolean` to `ColumnConfig` interface (currently only honored by `lib/export.ts` via implicit shape).
- Add event detail type for the new filter event:
  - `FvFilterChangeDetail = { filters: Record<string, unknown> }`
- `SortChangeDetail` already exists — reuse for `fv-sort-change` (allow `null` payload to express "cleared").

### `src/index.d.ts`

- Add JSX intrinsic element entries for:
  - `fv-sort-action` — props: `field`, `direction`, `active`, `for`
  - `fv-filter-action` — props: `field`, `selected`, `options`, `for`
  - `fv-export-action` — props: `format`, `filename`, `registers`, `fieldGrids`, `for`

### `src/components/fv-view.ts`

1. Add private method `_emitStateEvent(name: 'fv-sort-change' | 'fv-filter-change', detail: unknown)` that dispatches a bubbling, composed CustomEvent on `this`.
2. In `_onSortChange`: after both branches (clear and set) call `this._emitStateEvent('fv-sort-change', this._sortConfig)`.
3. In `_onFilterChange`: after both branches call `this._emitStateEvent('fv-filter-change', { filters: this._filters })`.
4. In `_onSearch`: after `_filters` assignment call the same filter emit.
5. In `connectedCallback`: after the storage/URL-driven assignments to `_sortConfig` and `_filters`, emit once for sort and once for filter (only if state was actually loaded — guard on truthy/non-empty).
6. In `_onHashChange`: after `_sortConfig` assignment, emit `fv-sort-change`.
7. In `_checkStorageChange`: after each of `_filters`/`_sortConfig` assignments emit the corresponding event.
8. No changes to listeners on `this` — the inbound names (`sort-change`, `filter-change`) remain.

### `src/components/fv-sort-action.ts`

1. Add `@property({ attribute: 'for' }) for?: string`.
2. Add private fields `_target?: HTMLElement` and `_onTargetSort = (e: Event) => { ... }`.
3. In `firstUpdated`: if `this.for` is set, run target resolution (ADR-1). On success:
   - Read `target.columnDefs` is not needed — sort-action only needs `_sortConfig` reflection.
   - Read initial state via a new `target.currentSort` getter? — NO: piggy-back on the first emitted `fv-sort-change`. Instead, expose `_sortConfig` indirectly: read `target` `getAttribute('data-sort-field')` is brittle. **Final approach:** add a public getter `get currentSort(): SortChangeDetail | null { return this._sortConfig; }` on `fv-view` (cheap, mirrors existing `currentSort` already passed to menu). Sort-action reads it on connect to set `active` and `direction`.
   - Subscribe `target.addEventListener('fv-sort-change', this._onTargetSort)`.
   - The handler updates `this.active` and `this.direction` based on whether `detail?.field === this.field`.
4. In `_onClick`: after the existing self-dispatch, also dispatch on `_target` (ADR-4) when `_target` is set.
5. In `disconnectedCallback`: remove the listener from `_target`.

### `src/components/fv-filter-action.ts`

1. Add `@property({ attribute: 'for' }) for?: string`.
2. Add `_target` and `_onTargetFilter` private fields.
3. In `firstUpdated`: if `this.for` set, resolve target (ADR-1). On success:
   - Compute `this.options` from `target.registers` — extract unique string values for `this.field`. (Per proposal: derive from full domain `registers`, NOT `filteredData`.)
   - Read initial `this.selected` from `target.currentFilters` getter (add public getter `get currentFilters(): Record<string, unknown> { return this._filters; }` on `fv-view`).
   - Subscribe `target.addEventListener('fv-filter-change', this._onTargetFilter)`.
   - Handler reads `detail.filters[this.field]` and updates `this.selected` (normalize to `string[]`).
   - Also subscribe to a `registers`-changed signal — for v1, recompute options once on connect; document that external changes to `registers` after mount won't refresh options. (Out of scope — no event emitted today on registers change.)
4. In `_onChange`: after self-dispatch, also dispatch on `_target` (ADR-4).
5. `disconnectedCallback`: remove listener.

### `src/components/fv-export-action.ts`

1. Add `@property({ attribute: 'for' }) for?: string`.
2. Add `_target` private field.
3. In `firstUpdated`: resolve target (ADR-1). Store in `_target`. No subscription needed — export reads on demand.
4. In `_onClick`: when `_target` is set, override local `registers` and `fieldGrids` for this invocation:
   - `const rows = this._target ? (this._target as any).filteredData : this.registers;`
   - `const columns = this._target ? (this._target as any).columnDefs : this.fieldGrids;`
   - Use `rows`/`columns` for the `CustomEvent` detail and the `exportCSV`/`exportXLSX` calls.
5. No teardown beyond clearing `_target` reference in `disconnectedCallback`.

---

## 4. Event Flow Diagrams

### External sort flow

```
User clicks fv-sort-action[for="myView"]
        |
        v
fv-sort-action._onClick
        |
        +--> dispatchEvent('sort-change') on self        (bubbles up; no-op if outside fv-view)
        |
        +--> _target.dispatchEvent('sort-change')        (direct; lands on fv-view self-listener)
                      |
                      v
              fv-view._onSortChange
                      |
                      +--> _sortConfig = detail
                      +--> persist (storage/url)
                      +--> _emitStateEvent('fv-sort-change', _sortConfig)
                                |
                                v
                  fv-view dispatches 'fv-sort-change' on self (bubbles, composed)
                                |
                                v
                  fv-sort-action._onTargetSort  (and any other external listener)
                                |
                                +--> updates this.active / this.direction
                                +--> requestUpdate (re-render reflects state)
```

### External filter flow

```
User toggles checkbox in fv-filter-action[for="myView"]
        |
        v
fv-filter-action._onChange
        |
        +--> dispatchEvent('filter-change') on self
        +--> _target.dispatchEvent('filter-change')
                      |
                      v
              fv-view._onFilterChange
                      |
                      +--> _filters = { ...next }
                      +--> persist
                      +--> _emitStateEvent('fv-filter-change', { filters: _filters })
                                |
                                v
                  fv-filter-action._onTargetFilter
                                |
                                +--> this.selected = normalize(detail.filters[this.field])
```

### External export flow (no event roundtrip needed)

```
User clicks fv-export-action[for="myView"]
        |
        v
fv-export-action._onClick
        |
        +--> rows    = _target.filteredData
        +--> columns = _target.columnDefs
        +--> dispatchEvent('fv-export-request', { rows, columns, format })
        +--> exportCSV(rows, columns, filename)   OR   exportXLSX(...)
        +--> dispatchEvent('fv-export-done')   on success
        +--> dispatchEvent('fv-export-error')  on failure
```

### In-menu flow (UNCHANGED — regression check)

```
fv-grid → 'header-menu-open' → fv-view._onHeaderMenuOpen
  → creates menu element, sets props (column, fieldGrids, registers, filteredData, currentSort, currentFilters, anchor)
  → menu emits 'sort-change' / 'filter-change' / 'fv-export-request'
  → fv-view internal handlers fire
  → NEW SIDE EFFECT: fv-view also emits fv-sort-change / fv-filter-change
    (external listeners stay in sync even when state changes via menu — desired)
```

---

## 5. Public Contract Additions

New public surface on `fv-view`:

| Member | Kind | Type | Notes |
|---|---|---|---|
| `currentSort` | getter | `SortChangeDetail \| null` | Mirrors `_sortConfig`. |
| `currentFilters` | getter | `Record<string, unknown>` | Mirrors `_filters`. |
| `fv-sort-change` | event | `CustomEvent<SortChangeDetail \| null>` | Bubbles, composed. Fires on every `_sortConfig` mutation. |
| `fv-filter-change` | event | `CustomEvent<{ filters: Record<string, unknown> }>` | Bubbles, composed. Fires on every `_filters` mutation. |

New public surface on action components: `for` attribute on all three.

---

## 6. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Emitting outbound events during `connectedCallback` may fire before external listeners attached (action components mount AFTER fv-view). | External components read initial state from `currentSort` / `currentFilters` getters in their own `firstUpdated`, so they don't depend on catching the initial emission. |
| `fv-filter-action` external `options` are computed once on connect; new `registers` after mount won't refresh options. | Document. Out of scope for v1. |
| Public event contract expansion (`fv-sort-change`, `fv-filter-change`) is now semver-stable. | Document in spec; payloads are simple and won't change shape. |
| Direct redispatch on target sets `bubbles: false` — any listener on a common ancestor between action component and fv-view will not see the redispatched event (only the self-dispatched one). | Acceptable: the self-dispatched event preserves the existing bubble semantics. The direct redispatch is purely for delivery to the target. |
| Reading `(target as any).filteredData` casts away types. | Minor; `fv-view` exports its class, so a follow-up can introduce a `FvViewLike` interface in `types.ts` if external TS users complain. |
