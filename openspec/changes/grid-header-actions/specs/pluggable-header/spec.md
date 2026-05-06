# Pluggable Header Component Specification

## Purpose

Registry and per-column overrides that replace `fv-header-menu` with a custom component. New domain.

## Requirements

### Requirement: Global Header Override via Registry

`configureGrid({ headerMenu: 'my-tag' })` MUST replace `fv-header-menu` globally. `fv-grid` MUST instantiate the registered tag instead of the default. The custom component MUST receive `column`, `data`, `currentSort`, and `currentFilters` as properties.

#### Scenario: Custom header renders globally

- GIVEN `configureGrid({ headerMenu: "my-header-menu" })` called before any grid renders
- WHEN a column header is clicked
- THEN `<my-header-menu>` opens with `column`, `data`, `currentSort`, `currentFilters` set

#### Scenario: Default used when no override registered

- GIVEN `configureGrid` called with no `headerMenu` key
- WHEN a column header is clicked
- THEN `<fv-header-menu>` opens (built-in default)

### Requirement: Per-Column Header Override

`ColumnConfig.headerMenu?: string | false` MUST override the global setting for that column only. Setting `false` MUST disable the header menu entirely for that column.

#### Scenario: Per-column override wins over global

- GIVEN global `headerMenu: "global-menu"` and one column with `headerMenu: "col-menu"`
- WHEN that column's header is clicked
- THEN `<col-menu>` opens, not `<global-menu>`

#### Scenario: headerMenu false disables menu

- GIVEN a column with `headerMenu: false`
- WHEN the column header is clicked
- THEN no popup opens for that column

### Requirement: Custom Component Contract

A custom header-menu component MUST receive `column`, `data`, `currentSort`, and `currentFilters` properties. It MUST dispatch the same `sort-change`, `filter-change`, and `fv-export` events as the built-in. `fv-view` MUST handle these events regardless of which component dispatched them.

#### Scenario: Custom component events handled

- GIVEN `<my-header-menu>` mounted via per-column override
- WHEN it dispatches `sort-change` with `{ field: "age", direction: "desc" }`
- THEN `fv-view` applies the sort identically to when `fv-header-menu` dispatched it
