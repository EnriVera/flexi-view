# Delta Spec — multi-sort-action

## Affected Files

| File | Change Type |
|------|-------------|
| `src/types.ts` | BREAKING MODIFIED |
| `src/utils/sort-filter.ts` | MODIFIED |
| `src/i18n/en.ts` + `es.ts` | MODIFIED |
| `src/components/fv-sort-action.ts` | MODIFIED |
| `src/components/fv-sort-button.ts` | MODIFIED (emit shape only) |
| `src/components/fv-view.ts` | MODIFIED |

---

## §1 — Types (`src/types.ts`)

### Requirement: SortCriterion Interface

The system MUST export a new `SortCriterion` interface: `{ field: string; direction: 'asc' | 'desc' }`.

The system MUST re-export a public alias `FvSortCriterion = SortCriterion` for consumer use.

#### Scenario: Interface available as named export

- GIVEN a consumer imports from the package entry point
- WHEN they import `SortCriterion` or `FvSortCriterion`
- THEN both resolve to the same shape `{ field: string; direction: 'asc' | 'desc' }`

---

### Requirement: SortChangeDetail — Breaking Shape Change

`SortChangeDetail` MUST be redefined as `{ sorts: SortCriterion[] }`.

The old shape `{ field: string; direction: 'asc' | 'desc' | null }` is REMOVED. Code reading `detail.field` or `detail.direction` directly MUST be migrated to `detail.sorts[0]`.

The `FvSortChangeDetail` alias MUST point to the new shape.

(Previously: `{ field: string; direction: 'asc' | 'desc' | null }` — single-sort flat object.)

#### Scenario: Empty sorts array signals clear

- GIVEN a `SortChangeDetail` event detail
- WHEN `detail.sorts` is `[]`
- THEN consumers interpret this as "no active sort"

#### Scenario: Single sort

- GIVEN a `SortChangeDetail` event detail
- WHEN `detail.sorts` is `[{ field: 'name', direction: 'asc' }]`
- THEN consumers apply one sort criterion

#### Scenario: Multiple sorts

- GIVEN a `SortChangeDetail` event detail
- WHEN `detail.sorts` contains N entries
- THEN consumers apply them in array order (index 0 = primary sort)

---

## §2 — applySort (`src/utils/sort-filter.ts`)

### Requirement: Multi-Criterion Sort Signature

`applySort` MUST accept `(data: T[], sorts: SortCriterion[]): T[]`.

The old single-criterion overload `(data, config: SortChangeDetail | null)` is REMOVED.

#### Scenario: Empty sorts array is a no-op

- GIVEN `sorts` is `[]`
- WHEN `applySort(data, [])` is called
- THEN the original `data` reference is returned unchanged

#### Scenario: Single criterion sort

- GIVEN `sorts` is `[{ field: 'name', direction: 'asc' }]`
- WHEN `applySort(data, sorts)` is called
- THEN data is sorted ascending by `name`

#### Scenario: Multi-criterion tiebreaking

- GIVEN `sorts` is `[{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }]`
- WHEN two rows have the same `role` value
- THEN those rows are ordered by `name` descending

#### Scenario: Null/undefined values sort first in asc

- GIVEN a row where the sorted field is `null` or `undefined`
- WHEN direction is `'asc'`
- THEN that row appears BEFORE rows with defined values
- AND when direction is `'desc'`, null rows still appear BEFORE defined values

---

## §3 — i18n (`src/i18n/en.ts` + `es.ts`)

### Requirement: Multi-Sort Count Label

Both locale files MUST add `sort.nSorts` key.

- English: `"{n} sorts"` (e.g. `"2 sorts"`)
- Spanish: `"{n} ordenamientos"` (e.g. `"2 ordenamientos"`)

All existing keys (`sort.title`, `sort.selectField`, `sort.asc`, `sort.desc`, `sort.clear`) MUST be preserved unchanged.

#### Scenario: Chip label for N≥2 sorts

- GIVEN `_activeSorts.length >= 2`
- WHEN rendering the chip label
- THEN the label is composed using `sort.nSorts` with the count interpolated

---

## §4 — fv-sort-action (`src/components/fv-sort-action.ts`)

### Requirement: Internal State — Multi-Sort Array

`_activeSort: { field, direction } | null` MUST be replaced by `_activeSorts: SortCriterion[]`.

`_selectedField: string | null` remains unchanged.

### Requirement: Chip Label and ARIA

| State | Label | aria-pressed | × button |
|-------|-------|-------------|---------|
| 0 sorts | `t().sort.title` | `"false"` | hidden |
| 1 sort | `"<fieldTitle> - <dirLabel>"` | `"true"` | visible |
| N≥2 sorts | `"<firstFieldTitle> +<N-1>"` | `"true"` | visible |

#### Scenario: No active sort — chip is inactive

- GIVEN `_activeSorts` is `[]`
- WHEN the chip renders
- THEN label equals `t().sort.title`, `aria-pressed="false"`, no × button

#### Scenario: One active sort — chip shows field and direction

- GIVEN `_activeSorts` is `[{ field: 'name', direction: 'asc' }]`
- WHEN the chip renders
- THEN label is `"Name - Ascending"`, `aria-pressed="true"`, × button is visible

#### Scenario: Two active sorts — chip shows first field + overflow count

- GIVEN `_activeSorts` is `[{ field: 'name', direction: 'asc' }, { field: 'role', direction: 'desc' }]`
- WHEN the chip renders
- THEN label is `"Name +1"`, `aria-pressed="true"`, × button is visible

#### Scenario: Three active sorts — overflow count increments

- GIVEN `_activeSorts.length` is `3`
- WHEN the chip renders
- THEN label is `"<firstFieldTitle> +2"`

---

### Requirement: Modal Open/Close Semantics

The modal MUST stay open while the user composes a multi-sort list.

The modal MUST close ONLY on: Escape key, backdrop click, close button click.

No `sort-change` event MUST be emitted on close-without-changes.

#### Scenario: Modal stays open after applying a sort direction

- GIVEN the modal is open and a field is selected
- WHEN the user clicks Asc or Desc
- THEN `sort-change` is emitted AND the modal remains open

#### Scenario: Escape closes modal without emitting

- GIVEN the modal is open
- WHEN the user presses Escape
- THEN the modal closes AND no `sort-change` event is dispatched

#### Scenario: Backdrop click closes modal without emitting

- GIVEN the modal is open
- WHEN the user clicks the backdrop area
- THEN the modal closes AND no `sort-change` event is dispatched

---

### Requirement: Left Panel Field Items — Sort Badge

Each field item in the left panel MUST display a 1-based badge `[n]` when that field is present in `_activeSorts` at index n.

`aria-pressed` on a field item MUST be `"true"` when the field has any active sort.

Clicking a field item MUST update `_selectedField` and update the right panel without emitting a `sort-change`.

#### Scenario: Unactive field has no badge and aria-pressed false

- GIVEN `_activeSorts` does not include field `"name"`
- WHEN the left panel renders
- THEN the Name item has no badge and `aria-pressed="false"`

#### Scenario: Active field shows position badge

- GIVEN `_activeSorts` is `[{ field: 'role', ... }, { field: 'name', ... }]`
- WHEN the left panel renders
- THEN "Role" shows `[1]`, "Name" shows `[2]`, both have `aria-pressed="true"`

#### Scenario: Clicking a field updates right panel, modal stays open

- GIVEN the modal is open
- WHEN the user clicks a field item
- THEN `_selectedField` is set to that field, the right panel updates, no `sort-change` is emitted

---

### Requirement: Right Panel Asc/Desc Apply Logic

Clicking Asc or Desc on `_selectedField` MUST follow these rules:

| Condition | Result |
|-----------|--------|
| Field NOT in `_activeSorts` | APPEND `{field, direction}` to end of array |
| Field in `_activeSorts`, SAME direction | REMOVE entry (toggle off) |
| Field in `_activeSorts`, DIFFERENT direction | REPLACE direction, preserve position |

After each apply, `sort-change` MUST be emitted with `{ sorts: [..._activeSorts] }`. Modal MUST remain open.

#### Scenario: Append new sort

- GIVEN `_activeSorts` is `[{ field: 'role', direction: 'asc' }]` and `_selectedField` is `'name'`
- WHEN user clicks Asc
- THEN `_activeSorts` becomes `[{field:'role',direction:'asc'},{field:'name',direction:'asc'}]`
- AND `sort-change` is emitted with that array

#### Scenario: Toggle off existing sort

- GIVEN `_activeSorts` contains `{ field: 'name', direction: 'asc' }` and `_selectedField` is `'name'`
- WHEN user clicks Asc
- THEN the `'name'` entry is removed from `_activeSorts`
- AND `sort-change` is emitted with the reduced array

#### Scenario: Replace direction, preserve position

- GIVEN `_activeSorts` is `[{field:'role',direction:'asc'},{field:'name',direction:'asc'}]` and `_selectedField` is `'name'`
- WHEN user clicks Desc
- THEN `_activeSorts` becomes `[{field:'role',direction:'asc'},{field:'name',direction:'desc'}]`
- AND position of `'name'` remains index 1

---

### Requirement: Clear All Sorts

Clicking the × chip button MUST set `_activeSorts = []`, emit `{ sorts: [] }`, and focus the main chip button.

#### Scenario: Clear resets state and focuses chip

- GIVEN `_activeSorts` has one or more entries
- WHEN the × button is clicked
- THEN `_activeSorts` becomes `[]`, `sort-change` emits `{ sorts: [] }`, main button receives focus

---

### Requirement: Keyboard Navigation

ArrowUp/ArrowDown MUST cycle focus through field items in the left panel when the modal is open.

#### Scenario: ArrowDown wraps focus through field list

- GIVEN the modal is open with field items rendered
- WHEN the user presses ArrowDown
- THEN focus moves to the next field item, wrapping at the end

---

## §5 — fv-sort-button (`src/components/fv-sort-button.ts`)

### Requirement: Uniform Event Shape

`fv-sort-button` MUST emit `{ sorts: [] }` for clear and `{ sorts: [{ field, direction }] }` for active sort.

Internal `_activeSort: { field, direction } | null` remains (single-field logic unchanged). Only the emitted event shape changes.

#### Scenario: Active single-field sort emit

- GIVEN `_activeSort` is `{ field: 'name', direction: 'asc' }`
- WHEN the button emits `sort-change`
- THEN `detail` is `{ sorts: [{ field: 'name', direction: 'asc' }] }`

#### Scenario: Clear sort emit

- GIVEN a sort was active
- WHEN the user clears it
- THEN `detail` is `{ sorts: [] }`

---

## §6 — fv-view (`src/components/fv-view.ts`)

### Requirement: Multi-Sort State and Processing

`_sortConfig: SortChangeDetail | null` MUST be replaced by `_sortCriteria: SortCriterion[]` (initialized to `[]`).

`_onSortChange(e)` MUST read `e.detail.sorts` and store it as `_sortCriteria`.

`_processedData` MUST call `applySort(filtered, this._sortCriteria)`.

The `currentSort` property (used for hydration) MUST be replaced by `currentSorts: SortCriterion[]`. A read-only `currentSort` alias returning `currentSorts[0] ?? null` MAY be kept for one release cycle for backward compat with `fv-sort-button` and `fv-header-menu` hydration callers.

#### Scenario: fv-view applies multi-sort to processed data

- GIVEN `_sortCriteria` is `[{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }]`
- WHEN `_processedData` is computed
- THEN data is sorted by role ASC, then by name DESC for ties

#### Scenario: fv-view reacts to sort-change from fv-sort-button

- GIVEN `fv-sort-button` emits `{ sorts: [{ field: 'name', direction: 'asc' }] }`
- WHEN `_onSortChange` handles the event
- THEN `_sortCriteria` is replaced with that single-entry array (column-header sort replaces multi-sort)

---

## §7 — Persistence (`src/components/fv-sort-action.ts` persistence helpers)

### Requirement: URL Hash — Multi-Sort Format

URL hash key `fv-sort` MUST encode sorts as comma-separated `field:direction` pairs in priority order.

Example: `fv-sort=role:asc,name:desc`

On read, the system MUST split on `,`, then split each token on `:`, validate `direction === 'asc' || 'desc'`, and silently drop invalid tokens.

Legacy single-criterion format (`fv-sort=name:asc`, no comma, one colon) MUST be parsed as a length-1 array.

#### Scenario: URL round-trip for multi-sort

- GIVEN `_activeSorts` is `[{field:'role',direction:'asc'},{field:'name',direction:'desc'}]`
- WHEN persisted to URL and the page reloads
- THEN `_activeSorts` is hydrated with the same two entries in the same order

#### Scenario: Legacy URL migration

- GIVEN URL contains `fv-sort=name:asc` (old single-sort format)
- WHEN `_readSortFromUrl` parses it
- THEN result is `[{ field: 'name', direction: 'asc' }]`

#### Scenario: Invalid URL token is dropped

- GIVEN URL contains `fv-sort=role:asc,badtoken,name:desc`
- WHEN parsed
- THEN result is `[{field:'role',direction:'asc'},{field:'name',direction:'desc'}]` (badtoken silently dropped)

---

### Requirement: localStorage — Multi-Sort Format

`localStorage[{storageKey}-sort]` MUST store `JSON.stringify(SortCriterion[])` or be removed when empty.

On read, the system MUST parse and validate each entry has `field: string` and `direction: 'asc' | 'desc'`, dropping invalid entries.

Legacy read: if parsed value is a single object `{ field, direction }` (not an array), it MUST be wrapped in an array.

#### Scenario: localStorage round-trip

- GIVEN `_activeSorts` has two entries
- WHEN written to localStorage and read back
- THEN the same two-entry array is returned

#### Scenario: Legacy localStorage migration

- GIVEN localStorage contains `{ "field": "name", "direction": "asc" }` (old single object)
- WHEN `_readStorage` parses it
- THEN result is `[{ field: 'name', direction: 'asc' }]`

---

### Requirement: Hydration Priority

Priority order MUST remain: URL hash > localStorage > `target.currentSorts`.

If none exist, `_activeSorts` starts as `[]`.

#### Scenario: URL takes priority over localStorage

- GIVEN URL has `fv-sort=role:asc` and localStorage has a different sort
- WHEN `_connect()` runs hydration
- THEN `_activeSorts` reflects the URL value

---

## Breaking Change Notice

`SortChangeDetail` shape changes from `{ field, direction }` to `{ sorts: SortCriterion[] }`. Any consumer reading `detail.field` or `detail.direction` directly MUST migrate. This is a major breaking change — version bump required.
