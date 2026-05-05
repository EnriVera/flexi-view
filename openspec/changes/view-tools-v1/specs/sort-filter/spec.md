# sort-filter Specification

## Purpose

Client-side sort and filter logic executed by `<data-view>`. Sub-views emit intent events; the wrapper applies logic and re-renders.

## Requirements

### Requirement: Client-side Sort

`<data-view>` MUST sort the data array when it receives a `sort-change` event. It MUST pass the sorted array to the active sub-view. It MUST support ascending and descending directions.

#### Scenario: Sort ascending

- GIVEN `data` with unsorted items and a sortable column `field: "name"`
- WHEN a `sort-change` event fires with `{ field: "name", direction: "asc" }`
- THEN the active sub-view receives the array sorted A→Z by `name`

#### Scenario: Sort toggle

- GIVEN the current sort is `{ field: "name", direction: "asc" }`
- WHEN `sort-change` fires with `{ field: "name", direction: "desc" }`
- THEN the array is re-sorted Z→A

### Requirement: Client-side Filter

`<data-view>` MUST filter the data array when it receives a `filter-change` event. It MUST apply all active filters simultaneously. An empty filter value MUST remove the filter for that field.

#### Scenario: Filter by field

- GIVEN `data` with 10 items and no active filters
- WHEN `filter-change` fires with `{ field: "status", value: "active" }`
- THEN only items where `status === "active"` are passed to the sub-view

#### Scenario: Clear filter

- GIVEN an active filter `{ field: "status", value: "active" }`
- WHEN `filter-change` fires with `{ field: "status", value: "" }`
- THEN all items are passed to the sub-view (filter removed)
