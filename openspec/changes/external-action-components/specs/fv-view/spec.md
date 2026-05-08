# Delta for fv-view

## ADDED Requirements

### Requirement: fv-view MUST emit fv-sort-change on sort state change

`<fv-view>` SHALL dispatch a `fv-sort-change` CustomEvent whenever `_sortConfig` changes. The event MUST bubble and MUST be composed.

| Property | Value |
|----------|-------|
| Event name | `fv-sort-change` |
| `bubbles` | `true` |
| `composed` | `true` |
| Payload | `{ field: string, direction: 'asc' \| 'desc' \| null }` |

#### Scenario: sort applied emits fv-sort-change

- GIVEN a mounted `<fv-view>`
- WHEN `_sortConfig` is updated (field and direction set)
- THEN the element SHALL dispatch `fv-sort-change` with `{ field, direction }`

#### Scenario: sort cleared emits fv-sort-change with null direction

- GIVEN a mounted `<fv-view>` with an active sort
- WHEN sort is cleared (direction reset)
- THEN `fv-sort-change` SHALL be dispatched with `{ field, direction: null }`

#### Scenario: fv-sort-change does not affect localStorage or URL

- GIVEN a mounted `<fv-view>` with `storageKey` set
- WHEN `fv-sort-change` fires
- THEN localStorage and URL sync behavior SHALL remain unchanged

---

### Requirement: fv-view MUST emit fv-filter-change on filter state change

`<fv-view>` SHALL dispatch a `fv-filter-change` CustomEvent whenever `_filters` changes. The event MUST bubble and MUST be composed.

| Property | Value |
|----------|-------|
| Event name | `fv-filter-change` |
| `bubbles` | `true` |
| `composed` | `true` |
| Payload | `{ filters: Record<string, unknown> }` |

#### Scenario: filter added emits fv-filter-change

- GIVEN a mounted `<fv-view>`
- WHEN a filter is applied to any field
- THEN the element SHALL dispatch `fv-filter-change` with the full current `filters` map

#### Scenario: filter removed emits fv-filter-change

- GIVEN a mounted `<fv-view>` with an active filter
- WHEN that filter is removed
- THEN `fv-filter-change` SHALL be dispatched with the updated `filters` map (field absent or empty)

---

### Requirement: fv-view public getters MUST be stable API for external components

`<fv-view>` SHALL expose the following read-only public getters as a stable, documented API:

| Getter | Type | Description |
|--------|------|-------------|
| `registers` | `T[]` | Full unfiltered dataset |
| `fieldGrids` | `ColumnConfig<T>[]` | Grid column config |
| `fieldRows` | `ColumnConfig<T>[]` | List column config |
| `fieldCards` | `ColumnConfig<T>[]` | Cards column config |
| `acceptedViews` | `string[]` | Allowed view types |

External components with `for` attribute MUST use these getters to read initial state.

#### Scenario: external component reads registers on connect

- GIVEN a mounted `<fv-view>` with `registers` data
- WHEN an external action component connects via `for`
- THEN reading `fv-view.registers` SHALL return the full unfiltered dataset
