# data-grid Specification

## Purpose

Table sub-view rendering rows with column headers. Displays sort and filter UI; emits events without processing data.

## Requirements

### Requirement: Table Rendering

`<data-grid>` MUST render each item in `data` as a row. Each column defined in `columns` MUST render the corresponding `control` element per cell. `<data-grid>` MUST NOT filter or sort the array.

#### Scenario: Basic render

- GIVEN `data=[{name:"Ana"}]` and `columns=[{control:"my-text",title:"Name"}]`
- WHEN the element renders
- THEN one row appears with one `<my-text>` element receiving the row data

#### Scenario: Sort UI on sortable column

- GIVEN a column with `sortable: true`
- WHEN the column header renders
- THEN a sort indicator is visible in the header
- AND clicking it emits `sort-change` with `{ field, direction }`

### Requirement: Filter UI

`<data-grid>` SHOULD display a filter input per column when `filterable: true`. It MUST emit `filter-change` and MUST NOT filter the array itself.

#### Scenario: Filter input triggers event

- GIVEN a column with `filterable: true`
- WHEN the user types in the filter input
- THEN `filter-change` is emitted with `{ field, value }`
