# data-list Specification

## Purpose

List sub-view rendering each data item as a row using the configured controls.

## Requirements

### Requirement: List Rendering

`<data-list>` MUST render each item in `data` as a list row. It MUST instantiate the configured `control` element for each visible column. It MUST emit `row-click` when a row is clicked.

#### Scenario: Basic render

- GIVEN `data` with 3 items and a `columns` config
- WHEN `<data-list>` renders
- THEN 3 rows appear, each with the correct control elements

#### Scenario: Row click

- GIVEN a rendered list
- WHEN the user clicks a row
- THEN `row-click` is emitted with `{ item, index }`
