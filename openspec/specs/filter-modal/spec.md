# Filter Modal Specification

## Purpose

Provide a modal interface for filtering grid columns by displaying ALL unique values with multi-select checkboxes, addressing the limitation of the inline popup which has insufficient space.

## ADDED Requirements

### Requirement: Filter Modal Renders All Unique Values

The system MUST render a modal component that displays every unique value from the filtered column, without any limit on the number of displayed options.

#### Scenario: Modal displays all unique values

- GIVEN a column `status` with values `[ "active", "pending", "active", "archived", "pending" ]`
- WHEN the filter modal opens
- THEN the modal displays checkboxes for `[ "active", "archived", "pending" ]`
- AND each value appears exactly once

#### Scenario: Modal shows empty state when no values exist

- GIVEN a column `region` with empty data for all rows
- WHEN the filter modal opens
- THEN the modal displays a message indicating no values available
- AND no checkboxes are rendered

### Requirement: Filter Modal Supports Multi-Select

The system MUST allow selecting multiple values simultaneously using checkboxes, enabling OR-based filtering logic.

#### Scenario: Single value selection

- GIVEN the filter modal is open for column `status`
- WHEN the user checks "active"
- THEN the filter is applied for only "active"

#### Scenario: Multiple values selection

- GIVEN the filter modal is open for column `status`
- WHEN the user checks "active" and "pending"
- THEN the filter includes rows where status equals "active" OR "pending"

#### Scenario: Deselecting all values clears the filter

- GIVEN the filter modal has "active" selected
- WHEN the user unchecks "active"
- THEN the filter is cleared (all rows shown)

### Requirement: Filter Modal Dispatches Change Event

The system MUST dispatch a `filter-change` event with the selected values when the user modifies the selection.

#### Scenario: Selection change dispatches event

- GIVEN the filter modal is open
- WHEN the user checks a value
- THEN a `filter-change` event is dispatched with `detail: { field, value: string[] }`

### Requirement: Filter Modal Closes on User Action

The system MUST close the modal when the user presses Escape or clicks outside the modal.

#### Scenario: Modal closes on Escape key

- GIVEN the filter modal is open
- WHEN the user presses Escape
- THEN the modal closes
- AND no filter change event is dispatched (if no selection was made)

#### Scenario: Modal closes on outside click

- GIVEN the filter modal is open
- WHEN the user clicks outside the modal
- THEN the modal closes
- AND no filter change event is dispatched

### Requirement: Filter Modal Includes Scroll for Many Values

The system MUST provide a scrollable container within the modal when the number of values exceeds the visible area.

#### Scenario: Modal scrolls with many values

- GIVEN a column has 100+ unique values
- WHEN the filter modal opens
- THEN a scrollbar appears within the modal
- AND all values are accessible by scrolling

### Requirement: Header Menu Shows "Ver todos" Button

The system MUST display a "Ver todos" button in the filter section of the header menu when the column is filterable.

#### Scenario: Button appears in filter section

- GIVEN a column with `filterable: true`
- WHEN the header menu renders the filter section
- THEN a "Ver todos" button is displayed
- AND clicking it opens the filter modal

#### Scenario: Button not shown for non-filterable columns

- GIVEN a column with `filterable: false` or undefined
- WHEN the header menu renders
- THEN no "Ver todos" button appears