# Spec: fv-grid (from change: inline-actions)

**Component**: `fv-grid`
**Status**: spec
**Date**: 2026-05-07
**Change**: inline-actions

---

## Delta Requirements

These requirements describe what MUST be true after the change is applied.

---

### REQ-1 — Sort Icon Visibility

**REQ-1.1** The `fv-grid` column header SHALL display a sort direction icon (↑ or ↓) for ANY column that appears in the current sort criteria.

**REQ-1.2** The icon SHALL reflect the column's direction in the multi-sort config.

**REQ-1.3** Previously, sort icon only showed for primary/first sort column. This is now corrected.

---

### REQ-2 — Direction Button Labels

**REQ-2.1** The sort modal direction buttons SHALL display only "Asc" or "Desc" text.

**REQ-2.2** No column name SHALL appear in the direction button labels.

**REQ-2.3** The active direction button SHALL have distinct visual feedback (highlighted/filled state).

---

## Acceptance Scenarios

### Scenario 1 — Single sort column shows icon

```gherkin
Given grid with sort config [{ field: "name", direction: "asc" }]
When "name" column header renders
Then the header shows sort icon (↑)
```

### Scenario 2 — Multiple sort columns all show icons

```gherkin
Given grid with sort config [{ field: "name", direction: "asc" }, { field: "email", direction: "desc" }]
When "name" column header renders
Then the header shows sort icon (↑)
And when "email" column header renders
Then it shows sort icon (↓)
```

### Scenario 3 — Direction buttons show only text

```gherkin
Given sort modal is open for sort entry with field "name"
When user views the direction buttons
Then buttons show "Asc" and "Desc" only
And no field name appears in labels
```

### Scenario 4 — Active direction has visual feedback

```gherkin
Given sort modal has direction set to "asc" for a sort entry
When user views the direction buttons
Then "Asc" button appears highlighted/filled
And "Desc" button appears in default/unselected state
```