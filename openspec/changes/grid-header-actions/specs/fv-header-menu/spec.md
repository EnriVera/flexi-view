# fv-header-menu Specification

## Purpose

Built-in popup component that opens from a column header and surfaces sort, filter, and export actions. New domain — no prior spec.

## Requirements

### Requirement: Header Popup Lifecycle

`fv-header-menu` MUST open when its trigger is activated and MUST close on outside click or Escape key. It MUST use the native `[popover]` API for positioning. It MUST NOT open in browsers that do not support `[popover]` (graceful no-op).

#### Scenario: Opens on trigger activation

- GIVEN a grid with a sortable column
- WHEN the user clicks the column header trigger
- THEN `fv-header-menu` opens as a popover anchored to that header

#### Scenario: Closes on outside click

- GIVEN `fv-header-menu` is open
- WHEN the user clicks outside the popover
- THEN the popover closes

#### Scenario: Closes on Escape

- GIVEN `fv-header-menu` is open
- WHEN the user presses Escape
- THEN the popover closes

#### Scenario: No-op on unsupported browser

- GIVEN a browser where `HTMLElement.prototype.showPopover` is undefined
- WHEN the header trigger is clicked
- THEN no error is thrown and no popover appears

### Requirement: Sort Actions

`fv-header-menu` MUST display "Sort Ascending" and "Sort Descending" actions when the column has `sortable: true`. Activating an action MUST dispatch a `sort-change` event with `{ field, direction }` and close the menu.

#### Scenario: Sort ascending dispatched

- GIVEN `fv-header-menu` is open for a sortable column `field: "name"`
- WHEN the user activates "Sort Ascending"
- THEN a `sort-change` event fires with `{ field: "name", direction: "asc" }`
- AND the menu closes

#### Scenario: No sort actions for non-sortable column

- GIVEN a column with `sortable: false` (or omitted)
- WHEN `fv-header-menu` renders
- THEN "Sort Ascending" and "Sort Descending" are NOT present

### Requirement: Filter Panel

`fv-header-menu` MUST display a filter input when the column has `filterable: true`. Changing the filter value MUST dispatch `filter-change` with `{ field, value }`. An empty value MUST clear the filter.

#### Scenario: Filter change dispatched

- GIVEN `fv-header-menu` open for a filterable column `field: "status"`
- WHEN the user types "active" in the filter input
- THEN `filter-change` fires with `{ field: "status", value: "active" }`

#### Scenario: Filter cleared

- GIVEN an active filter `{ field: "status", value: "active" }`
- WHEN the user clears the filter input
- THEN `filter-change` fires with `{ field: "status", value: "" }`

### Requirement: Export Action

`fv-header-menu` MUST display an "Export" action when the column has `exportable: true` (default). Activating it MUST dispatch `fv-export` with `{ format, columns, rows }` bubbling up to `fv-view`.

#### Scenario: Export action present by default

- GIVEN a column with no explicit `exportable` setting
- WHEN `fv-header-menu` renders
- THEN "Export" action is visible

#### Scenario: Export dispatched

- GIVEN `fv-header-menu` open with CSV format configured
- WHEN the user activates "Export"
- THEN `fv-export` fires with `{ format: "csv", columns, rows }`
