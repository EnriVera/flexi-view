# Delta for fv-grid

## MODIFIED Requirements

### Requirement: Column header shows sort icon when column is sorted

The `fv-grid` column header SHALL display a sort direction icon (↑ or ↓) for ANY column that appears in the current sort criteria — not just the primary/first sort column. The icon SHALL reflect the column's direction in the multi-sort config.

(Previously: sort icon only showed for primary sorted column)

**Scenario: Single sort column shows icon**

- GIVEN grid with sort config `[{ field: "name", direction: "asc" }]`
- WHEN "name" column header renders
- THEN the header shows sort icon (↑)

**Scenario: Multiple sort columns all show icons**

- GIVEN grid with sort config `[{ field: "name", direction: "asc" }, { field: "email", direction: "desc" }]`
- WHEN "name" column header renders
- THEN the header shows sort icon (↑)
- AND when "email" column header renders
- THEN it shows sort icon (↓)

---

### Requirement: Sort modal direction buttons show direction-only labels

The sort modal (multi-sort interface) direction buttons SHALL display only "Asc" or "Desc" text — no column name in the label. The active direction button SHALL have distinct visual feedback (highlighted/filled state).

(Previously: buttons showed "fieldName - Asc" format)

**Scenario: Direction buttons show only text**

- GIVEN sort modal is open for sort entry with field "name"
- WHEN user views the direction buttons
- THEN buttons show "Asc" and "Desc" only
- AND no field name appears in labels

**Scenario: Active direction has visual feedback**

- GIVEN sort modal has direction set to "asc" for a sort entry
- WHEN user views the direction buttons
- THEN "Asc" button appears highlighted/filled
- AND "Desc" button appears in default/unselected state