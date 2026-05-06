# Delta for sort-filter

## ADDED Requirements

### Requirement: Public applySort and applyFilters Exports

`applySort` and `applyFilters` MUST be exported from the library's public entry point (`src/index.ts`). Consumers MUST be able to import and use them independently of any component.

#### Scenario: applySort imported standalone

- GIVEN `import { applySort } from "@view-tools/core"`
- WHEN called with `(data, { field: "name", direction: "asc" })`
- THEN returns the sorted array without any side effects

#### Scenario: applyFilters imported standalone

- GIVEN `import { applyFilters } from "@view-tools/core"`
- WHEN called with `(data, [{ field: "status", value: "active" }])`
- THEN returns only items matching the filter

## MODIFIED Requirements

### Requirement: Client-side Sort

`<fv-view>` MUST sort the data array when it receives a `sort-change` event. It MUST pass the sorted array to the active sub-view. It MUST support ascending and descending directions. Sort state MUST be a `{ field, direction }` object; `field` MUST be included so that persistence survives page reload.

(Previously: sort state tracked direction only — `field` was not stored, so reload restored direction but applied it to no field)

#### Scenario: Sort ascending

- GIVEN `data` with unsorted items and a sortable column `field: "name"`
- WHEN a `sort-change` event fires with `{ field: "name", direction: "asc" }`
- THEN the active sub-view receives the array sorted A→Z by `name`

#### Scenario: Sort toggle

- GIVEN the current sort is `{ field: "name", direction: "asc" }`
- WHEN `sort-change` fires with `{ field: "name", direction: "desc" }`
- THEN the array is re-sorted Z→A

#### Scenario: Sort field preserved across reload

- GIVEN `storage-key="users"`, `syncUrl: true`, and sort `{ field: "age", direction: "asc" }` applied
- WHEN the page reloads
- THEN sort is restored as `{ field: "age", direction: "asc" }` — both field and direction

### Requirement: Client-side Filter

`<fv-view>` MUST filter the data array when it receives a `filter-change` event. It MUST apply all active filters simultaneously. An empty filter value MUST remove the filter for that field.

#### Scenario: Filter by field

- GIVEN `data` with 10 items and no active filters
- WHEN `filter-change` fires with `{ field: "status", value: "active" }`
- THEN only items where `status === "active"` are passed to the sub-view

#### Scenario: Clear filter

- GIVEN an active filter `{ field: "status", value: "active" }`
- WHEN `filter-change` fires with `{ field: "status", value: "" }`
- THEN all items are passed to the sub-view (filter removed)
