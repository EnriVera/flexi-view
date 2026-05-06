# Standalone Actions Specification

## Purpose

`fv-sort-action`, `fv-filter-action`, and `fv-export-action` — reusable action components that work outside `fv-grid` and emit the same events as `fv-header-menu`. New domain.

## Requirements

### Requirement: fv-sort-action

`fv-sort-action` MUST render a sort trigger for a given `field`. It MUST accept `field`, `direction` (current), and `column` props. Activating it MUST dispatch `sort-change` with `{ field, direction }`.

#### Scenario: Dispatches sort-change

- GIVEN `<fv-sort-action field="name" direction="asc">` mounted standalone
- WHEN the user activates it
- THEN `sort-change` fires with `{ field: "name", direction: "asc" }`

#### Scenario: Works outside fv-grid

- GIVEN `fv-sort-action` placed in a custom toolbar, not inside any `fv-grid`
- WHEN the user activates it
- THEN `sort-change` bubbles up to whatever ancestor listens for it

### Requirement: fv-filter-action

`fv-filter-action` MUST render a filter trigger for a given `field`. It MUST accept `field`, `value` (current), and `column` props. Changing the filter value MUST dispatch `filter-change` with `{ field, value }`.

#### Scenario: Dispatches filter-change

- GIVEN `<fv-filter-action field="status">` mounted standalone
- WHEN the user sets the value to "active"
- THEN `filter-change` fires with `{ field: "status", value: "active" }`

### Requirement: fv-export-action

`fv-export-action` MUST render an export trigger. It MUST accept `format` (default `"csv"`), `columns`, and `rows` props. Activating it MUST dispatch `fv-export` with `{ format, columns, rows }`.

#### Scenario: CSV export dispatched

- GIVEN `<fv-export-action format="csv" .columns=${cols} .rows=${rows}>` mounted
- WHEN the user activates it
- THEN `fv-export` fires with `{ format: "csv", columns: cols, rows: rows }`

#### Scenario: XLSX export opt-in

- GIVEN `format="xlsx"` and SheetJS configured via `configureGrid`
- WHEN the user activates it
- THEN `fv-export` fires with `{ format: "xlsx", columns, rows }`
- AND SheetJS is lazy-loaded only at that moment
