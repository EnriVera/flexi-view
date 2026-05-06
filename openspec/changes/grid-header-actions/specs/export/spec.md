# Export Specification

## Purpose

CSV and optional XLSX export triggered from header menu or standalone actions. New domain.

## Requirements

### Requirement: CSV Export (Built-in)

The library MUST export data as CSV with no third-party dependencies. `fv-view` MUST handle `fv-export` events with `format: "csv"` and trigger a file download.

#### Scenario: CSV download triggered

- GIVEN `fv-view` receives `fv-export` with `{ format: "csv", columns, rows }`
- WHEN the event is handled
- THEN a `.csv` file download is initiated with the column headers and row values

#### Scenario: Non-exportable column excluded

- GIVEN a column with `exportable: false`
- WHEN CSV export runs
- THEN that column's data is excluded from the file

### Requirement: XLSX Export (Opt-in)

The library MUST support XLSX export only when `configureGrid({ export: { formats: ['csv', 'xlsx'] } })` is called. SheetJS MUST be loaded lazily on first XLSX export. If loading fails, `fv-view` MUST dispatch `export-error` and MUST NOT crash.

#### Scenario: XLSX lazy load succeeds

- GIVEN SheetJS configured and available
- WHEN `fv-export` fires with `format: "xlsx"`
- THEN SheetJS is dynamically imported and an `.xlsx` file download is initiated

#### Scenario: SheetJS load failure

- GIVEN SheetJS import fails (network or CSP block)
- WHEN `fv-export` fires with `format: "xlsx"`
- THEN `export-error` event is dispatched with a descriptive message
- AND the CSV export path remains unaffected
