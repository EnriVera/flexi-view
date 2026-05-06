# Delta for data-grid

## MODIFIED Requirements

### Requirement: Table Rendering

`<data-grid>` (`fv-grid`) MUST render each item in `data` as a row. Each column defined in `columns` MUST render the corresponding `control` element per cell. `<data-grid>` MUST NOT filter or sort the array. `<data-grid>` MUST accept `currentSort` and `currentFilters` as props and MUST NOT maintain its own sort or filter state.

(Previously: no explicit `currentSort`/`currentFilters` props; fv-grid held `_sortField`/`_sortDir` internally and called `_sort()` directly on header click)

#### Scenario: Basic render

- GIVEN `data=[{name:"Ana"}]` and `columns=[{control:"my-text",title:"Name"}]`
- WHEN the element renders
- THEN one row appears with one `<my-text>` element receiving the row data

#### Scenario: Sort UI on sortable column

- GIVEN a column with `sortable: true` and `currentSort: { field: "name", direction: "asc" }`
- WHEN the column header renders
- THEN the header displays a sort indicator matching the active direction
- AND clicking it opens `fv-header-menu` (or custom override) instead of sorting directly

#### Scenario: Header click fires event, not sort

- GIVEN a column with `sortable: true`
- WHEN the user clicks the column header
- THEN `fv-grid` does NOT call any internal sort function
- AND a header-trigger event (or menu open) propagates toward `fv-view`

## MODIFIED Requirements

### Requirement: Filter UI

`<data-grid>` MUST wire `filterable: true` columns so the filter input is active and dispatches events. It MUST pass `currentFilters` to `fv-header-menu` (or custom override). It MUST NOT filter the array itself.

(Previously: `filterable` field existed in `ColumnConfig` but was not wired — filter input was not rendered)

#### Scenario: Filter input triggers event

- GIVEN a column with `filterable: true`
- WHEN the user types in the filter input (via `fv-header-menu`)
- THEN `filter-change` is emitted with `{ field, value }`

#### Scenario: Previously dead filterable now active

- GIVEN `ColumnConfig` with `filterable: true` on a column
- WHEN `fv-grid` renders that column
- THEN the filter UI is presented (was previously invisible/non-functional)
