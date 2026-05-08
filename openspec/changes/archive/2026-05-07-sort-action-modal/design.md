# Design: sort-action-modal

## Executive Summary

Resolve the `fv-header-menu` compatibility risk from the proposal by **option (a) — extract the current chip into a new internal component `fv-sort-button`**. Then full-rewrite `fv-sort-action` as a single-button + modal-trigger using a self-hosted modal template (no separate `fv-sort-modal` web component for v1 — the modal is rendered inside the action's shadow root, mirroring how `fv-filter-action` *connects* to a modal but staying lighter for the two-column picker case).

This keeps the public event contract byte-identical, isolates the chip/cycle behavior in a single internal element that `fv-header-menu` already wants, and avoids dual-mode branching inside `fv-sort-action`.

## Architecture

### Component Topology

```
Public:
  fv-sort-action       — single button + inline modal (NEW behavior)
                         consumed by toolbars / app shells

Internal (registered, not in index.ts public re-exports for v1):
  fv-sort-button       — per-direction chip (CURRENT fv-sort-action behavior)
                         consumed only by fv-header-menu

Existing (unchanged signatures):
  fv-header-menu       — now imports fv-sort-button, swaps two tags
  fv-view              — unchanged; consumes SortChangeDetail same as today
```

### Why split the chip out (vs. dual-mode in one element)

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| (a) Extract `fv-sort-button` | Single responsibility per element. Zero branching. New action is a clean rewrite. Internal element can evolve independently. | Two component files. | **CHOSEN** |
| (b) Dual-mode `fv-sort-action` | One tag, both behaviors. | API surface bifurcates by attribute presence. Test matrix doubles. Confuses consumers. | Rejected |
| (c) Inline buttons in `fv-header-menu` | Removes a component. | Loses the styled chip with cycle semantics that consumers may use elsewhere; bigger blast radius for the menu file. | Rejected |

Rationale for (a): the chip *is* a reusable primitive — `fv-header-menu` already proves there are at least two consumers (Asc + Desc) for it. Naming it explicitly (`fv-sort-button`) makes its role obvious and protects `fv-sort-action`'s rewrite from regression-risk in chip behavior.

### Why no separate `fv-sort-modal` element

The proposal listed `fv-sort-modal` as a sibling to `fv-filter-modal`. Closer inspection: `fv-filter-modal` is split out because it is also instantiated **imperatively** by `fv-header-menu` via `document.createElement('fv-filter-modal')` (see `fv-header-menu.ts` lines 113-139). The sort modal has no such dual consumer — only `fv-sort-action` opens it. Splitting it into its own custom element costs one more registration without delivering reuse.

We render the modal template inline inside `fv-sort-action`'s shadow DOM, gated by `_modalOpen`. CSS is copied from `fv-filter-modal` to keep visual parity. If a future change adds a second consumer (e.g. an in-grid "Sort by…" entry), we promote the template into `fv-sort-modal` then.

## Data Flow

### Sort change pipeline (unchanged contract)

```
user clicks asc/desc in fv-sort-action modal
  → _onApply(direction)
  → updates internal _activeSort
  → writes localStorage (if storageKey)
  → writes URL hash via writeSortToUrl (if syncUrl)
  → dispatches CustomEvent('sort-change', SortChangeDetail) — bubbles+composed
  → also retargets to this._target (the fv-view) — non-bubbling, so fv-view's
    own listener fires exactly once
  → fv-view applies sort, re-renders
  → fv-view re-emits 'fv-sort-change' on itself
  → fv-sort-action's _onSortChangeFromView listener picks it up,
    syncs _activeSort if it differs (idempotent)
```

### Hydration order on first connection

```
firstUpdated → _connect():
  1. await customElements.whenDefined('fv-view')
  2. resolve target by id (with one rAF retry, same as today)
  3. read URL via readSortFromUrl()       [highest precedence — user-shared]
  4. else read localStorage[storageKey + '-sort']
  5. else read target.currentSort
  6. set _activeSort from whichever wins
  7. subscribe to target's 'fv-sort-change' event
```

This precedence matches the existing `fv-view` hierarchy (URL > storage > prop), avoiding the three-way drift bug fixed in commit `bff4955`.

### URL ownership (resolves Risk #5)

`fv-view` and `fv-sort-action` may both be configured with `sync-url`. To prevent dueling writes:

- **Reads**: both can read `fv-sort=` from the hash freely (idempotent).
- **Writes**: when `fv-sort-action` has a `for` target AND that target has `sync-url` enabled, `fv-sort-action` **does NOT write to URL** — it lets the view own the hash. Otherwise (no `for`, or target has no `sync-url`), `fv-sort-action` writes.
- Detection: at `_connect()` time, `fv-sort-action` checks `this._target?.hasAttribute('sync-url')`. Cached as `_targetOwnsUrl`.

This rule keeps the action useful in standalone scenarios while preventing race conditions when paired with a sync-url view.

### localStorage namespacing (resolves Risk #4)

`fv-view` writes its full `PersistedState` (views/sort/filter) under the user's `storage-key`. If `fv-sort-action` shares that key, writes will collide.

Decision: **`fv-sort-action` uses a separate sub-key** — `${storageKey}-sort` — storing `JSON.stringify({field, direction})`. This:
- avoids overwriting `fv-view`'s consolidated state
- lets a standalone `fv-sort-action` (no `for` target) persist independently
- documents in spec that consumers wanting unified storage should use only `fv-view`'s key (not pass `storage-key` to the action)

When `_targetOwnsUrl` is true, we additionally skip localStorage writes (target owns persistence end-to-end).

## Component Design

### 1. `fv-sort-button` (new file: `src/components/fv-sort-button.ts`)

**Purpose**: per-direction chip. Pure copy of today's `fv-sort-action`.

**Public API** (identical to current fv-sort-action):
- `field: string`
- `label: string`
- `direction: 'asc' | 'desc'`
- `active: boolean`
- `for?: string`
- Emits: `sort-change` (`SortChangeDetail`), bubbling + composed; retargeted to `for` target.

**Implementation**: byte-for-byte copy of current `fv-sort-action.ts`, with:
- `@customElement('fv-sort-button')`
- Class renamed `FvSortButton`
- Console warnings updated to `[fv-sort-button]`
- Exported as named export `FvSortButton`.

**Registration**: imported by `fv-header-menu.ts`. NOT added to `src/index.ts` public re-exports for v1 (it's internal). Adding it to `index.ts` is a one-line forward-compat change and we'll do it the moment a second consumer materializes.

### 2. `fv-sort-action` (full rewrite)

**Public API**:

| Attribute / Property | Type | Notes |
|---|---|---|
| `for` | string | id of target `fv-view` |
| `registerOrder` | `Array<{field:string,title:string}>` | property OR JSON-string attribute. Empty array → modal shows empty state, button disabled visually but still focusable. |
| `storageKey` (`storage-key`) | string | optional, sub-key `${storageKey}-sort` |
| `syncUrl` (`sync-url`) | boolean | optional |

**State (internal `@state`)**:
- `_modalOpen: boolean` — modal visibility
- `_selectedField: string | null` — left-pane selection (transient — only persists while modal is open)
- `_activeSort: { field: string; direction: 'asc'|'desc' } | null` — applied sort
- `_targetOwnsUrl: boolean` — cached at `_connect()`

**Events**:
- Emits `sort-change` (`SortChangeDetail`), bubbling + composed; retargeted to `_target` non-bubbling.
- `direction: null` when clearing.

**registerOrder attribute parsing**:
```
willUpdate(changed) {
  if (changed.has('registerOrder') && typeof this.registerOrder === 'string') {
    try {
      const parsed = JSON.parse(this.registerOrder);
      if (Array.isArray(parsed)) this.registerOrder = parsed;
      else { console.warn('[fv-sort-action] registerOrder must be an array'); this.registerOrder = []; }
    } catch { console.warn('[fv-sort-action] registerOrder JSON parse failed'); this.registerOrder = []; }
  }
}
```

**Render structure**:
```
:host (inline-block)
  div.chip (inline-flex, bordered — copied from fv-filter-action)
    button.main (aria-pressed=isActive, @click=_openModal)
      span.label   — i18n inactive: t().sort.title
                     active: `${activeFieldTitle} - ${dirLabel}`
    button.clear   (only when _activeSort, @click=_onClear, ×)

  [when _modalOpen]
  div.backdrop (position:fixed, inset:0, z-index:100000, @click=_closeModal)
    div.modal (centered, white, shadow, @click=stopPropagation)
      div.header
        span — t().sort.title
        button.close-btn (@click=_closeModal) — × (icons.close)
      div.body (display:flex)
        div.fields (flex:1, overflow-y:auto, max-height:50vh)
          (for each entry of registerOrder)
          button.field-item (
            aria-pressed = (entry.field === _selectedField)
            @click = () => _selectField(entry.field)
          ) entry.title
          (else: <p class="empty">t().sort.selectField</p>)
        div.divider
        div.actions (flex:1, padding:12px)
          (when _selectedField)
            button.dir.asc (
              aria-pressed = (_activeSort?.field===_selectedField && _activeSort?.direction==='asc')
              @click = () => _onApply('asc')
            ) icons.sortAsc + t().sort.asc
            button.dir.desc (similar for 'desc')
          (else)
            <p class="empty">t().sort.selectField</p>
```

**Behavior table**:

| User action | _selectedField | _activeSort | Result |
|---|---|---|---|
| Click main button | — | — | Open modal. `_selectedField = _activeSort?.field ?? null` (preselect current) |
| Click field row | new | any | `_selectedField = newField` |
| Click asc button | F | null | `_activeSort = {F, asc}`; emit; persist; close modal |
| Click asc button | F | {F, asc} | `_activeSort = null`; emit `direction: null`; persist clear; close modal |
| Click asc button | F | {F, desc} | `_activeSort = {F, asc}`; emit; persist; close modal |
| Click asc button | F | {OtherField, _} | `_activeSort = {F, asc}`; emit; persist; close modal |
| Click clear (×) on chip | — | non-null | `_activeSort = null`; emit `direction: null`; persist clear |
| Backdrop click / Escape | — | — | Close modal, no emit |

**Persistence helpers**:
- Existing in `src/utils/persistence.ts` (verified):
  - `writeSortToUrl(field, direction)` (line 59)
  - `clearSortFromUrl()` (line 65)
  - `readSortFromUrl()` (line 71) → `SortState | null`
  - `readState(key)` / `writeState(key, state)` exist but operate on the *consolidated* `PersistedState` envelope. We do NOT use these — we use the dedicated sub-key.
- `fv-sort-action` localStorage helpers (inline, private):
  - `_writeStorage()`: `localStorage.setItem('${storageKey}-sort', JSON.stringify(_activeSort))` — or `removeItem` when null.
  - `_readStorage()`: parse + validate.

**External listener** (subscribe to target's `fv-sort-change`): identical to today; updates `_activeSort` + re-renders.

### 3. `fv-header-menu.ts` changes

Three edits:
1. Add `import './fv-sort-button.js';`
2. Remove `import './fv-sort-action.js';` (still needed if other paths use it indirectly — but `fv-header-menu` itself no longer needs it. The `index.ts` import keeps it registered globally. Keeping the import in `fv-header-menu.ts` would be dead code; remove it.)
3. Replace the two `<fv-sort-action ...>` tags (lines 171-182) with `<fv-sort-button ...>` — same attributes (`field`, `direction`, `?active`, `@sort-change`).

The `_onSortChange` handler is unchanged (matches `sort-change` event from the new button).

### 4. i18n additions

`src/i18n/en.ts` — extend `sort` namespace:
```ts
sort: {
  title: 'Sort',
  selectField: 'Select a field to sort',
  asc: 'Ascending',
  desc: 'Descending',
  clear: 'Clear sort',
}
```

`src/i18n/es.ts`:
```ts
sort: {
  title: 'Ordenar',
  selectField: 'Seleccioná un campo para ordenar',
  asc: 'Ascendente',
  desc: 'Descendente',
  clear: 'Quitar orden',
}
```

These additions extend the `Translations` type via `en.ts` (es derives from it), so missing keys in es would be a TS error — caught at compile time.

### 5. `src/index.ts`

No changes required for v1. `fv-sort-action` is already imported (line 40) and continues to register (now with new behavior). `fv-sort-button` registers via `fv-header-menu.ts`'s import chain (line 45 in index.ts → fv-header-menu → fv-sort-button). No public re-export needed.

## Decisions (ADR-style)

### ADR-1: Extract `fv-sort-button` as internal component
- **Status**: Accepted
- **Context**: Rewriting `fv-sort-action` to a single-button modal trigger breaks `fv-header-menu`, which mounts two `<fv-sort-action>` chips per column.
- **Decision**: Create `fv-sort-button` as a verbatim copy of today's chip. Update `fv-header-menu` to use the new tag. Rewrite `fv-sort-action` clean.
- **Alternatives rejected**: dual-mode action element (API confusion, test explosion); inline buttons in menu (loses primitive, bigger menu file).
- **Consequences**: One extra component file. `fv-sort-button` not yet in public exports — promote when a second external consumer appears.

### ADR-2: Inline modal template, no separate `fv-sort-modal` element
- **Status**: Accepted
- **Context**: Proposal listed `fv-sort-modal` mirroring `fv-filter-modal`. `fv-filter-modal` is split out because `fv-header-menu` instantiates it imperatively. Sort modal has only one consumer.
- **Decision**: Render modal inside `fv-sort-action` shadow root, gated by `_modalOpen`. Copy `fv-filter-modal` CSS for visual parity.
- **Consequences**: Simpler — one fewer custom element to register. Promotion path open if a second consumer materializes.

### ADR-3: URL ownership defers to `fv-view` when target also has `sync-url`
- **Status**: Accepted
- **Context**: Both elements can independently read/write the `fv-sort=` hash param.
- **Decision**: `fv-sort-action` writes URL only when not paired with a `sync-url`-enabled target. Detected via `target.hasAttribute('sync-url')` at `_connect()`.
- **Consequences**: No dueling writes. Standalone usage still supported. Documented in spec.

### ADR-4: localStorage uses dedicated sub-key `${storageKey}-sort`
- **Status**: Accepted
- **Context**: `fv-view` writes `PersistedState` envelope under `storageKey`. Reusing the same key would clobber.
- **Decision**: Sub-key `${storageKey}-sort` storing `JSON.stringify({field, direction})`. Skip storage writes entirely when `_targetOwnsUrl` (target owns persistence holistically).
- **Consequences**: Two sources of truth coexist safely. Spec must call this out so consumers don't pass `storage-key` to both `fv-view` and `fv-sort-action` expecting unified state.

### ADR-5: `registerOrder` accepts both attribute (JSON) and property
- **Status**: Accepted (spec'd in proposal)
- **Decision**: `willUpdate` parses string → array, warns on bad JSON, falls back to `[]`.
- **Consequences**: Same dual-mode pattern already used elsewhere in the repo (`fieldGrids`).

### ADR-6: `_selectedField` does NOT persist across modal open/close
- **Status**: Accepted
- **Decision**: On modal open, preset `_selectedField = _activeSort?.field ?? null`. Discard on close. Only `_activeSort` persists.
- **Rationale**: Selecting a field without committing direction is a transient UI step, not user intent. Keeps state minimal and avoids "ghost selection" surprises.

## Accessibility

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing the header span id.
- Field list buttons: `aria-pressed` reflects `_selectedField` match.
- Direction buttons: `aria-pressed` reflects `_activeSort` match (signals toggle-to-clear semantics).
- Keyboard: Escape closes modal (already wired via `document.addEventListener('keydown', …, true)`, mirroring `fv-filter-modal` lines 157-168). Tab order: close → field list → direction buttons. Native focus order is acceptable for v1; arrow-key navigation deferred.
- On modal close, focus returns to `button.main` (mirrors `fv-filter-action` pattern, lines 200-204).

## Test Strategy

- **`fv-sort-button.test.ts`**: copy `fv-sort-action.test.ts` verbatim, replace component import + tag references. Confirms chip behavior survives.
- **`fv-sort-action.test.ts`** (rewrite): new suites
  - rendering: button label inactive vs active
  - registerOrder: array property, JSON string attribute, malformed JSON warns
  - modal: open on main click, close on Escape / backdrop / apply
  - selection: click field updates `_selectedField`; preselection on open
  - apply: emits sort-change with correct detail; toggle-to-clear when re-clicking active dir
  - persistence: writes URL/localStorage when configured; reads in URL > storage > target precedence; defers URL to view when target has sync-url
  - external sync: receiving `fv-sort-change` from target updates label
- **`fv-header-menu.test.ts`**: existing tests do not assert on `fv-sort-action` internals; they instantiate `FvHeaderMenu` and check open/close. The tag swap (`fv-sort-action` → `fv-sort-button`) is invisible to these tests. Spot-check any rendering test that queries `fv-sort-action` and update selectors.

## File-Level Change Map

| File | Change |
|---|---|
| `src/components/fv-sort-button.ts` | NEW — copy of current fv-sort-action |
| `src/components/fv-sort-action.ts` | FULL REWRITE — single-button + inline modal |
| `src/components/fv-header-menu.ts` | Import `./fv-sort-button.js`; remove `./fv-sort-action.js` import; swap two tags |
| `src/i18n/en.ts` | Add `sort.title`, `sort.selectField` |
| `src/i18n/es.ts` | Add `sort.title`, `sort.selectField` |
| `src/__tests__/components/fv-sort-button.test.ts` | NEW — copy of fv-sort-action.test.ts |
| `src/__tests__/components/fv-sort-action.test.ts` | REWRITE for new behavior |
| `src/__tests__/components/fv-header-menu.test.ts` | Spot-update tag selectors if any |

## Risks / Open Items

- **Risk: registerOrder JSON attribute parse loop.** If `willUpdate` reassigns `this.registerOrder`, Lit will trigger another update. Mitigated by checking `typeof === 'string'` before reassigning to array (one cycle, then it's an array and the branch never fires again). Confirmed safe.
- **Risk: focus management when modal opens during fast clicks.** Edge case where user double-clicks the main button. Mitigate by guarding `_openModal` with `if (this._modalOpen) return;`.
- **Open: should `fv-sort-button` be exported from `index.ts` for v1?** Recommendation: NO. Promote when a second external consumer appears. Saves bundle exports, keeps surface area honest.
- **Open: empty `registerOrder`.** Button still clickable, modal opens with empty state. Acceptable — clearly signals misconfiguration to the developer.
