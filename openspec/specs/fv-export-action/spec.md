# Spec: fv-export-action (from change: inline-actions)

**Component**: `fv-export-action`
**Status**: spec
**Date**: 2026-05-07
**Change**: inline-actions

---

## Delta Requirements

These requirements describe what MUST be true after the change is applied.

---

### REQ-1 — Chip Style

**REQ-1.1** The `fv-export-action` component SHALL render as a minimalist chip with icon + label.

**REQ-1.2** The chip SHALL use `display: inline-flex` forming a unified compact control with a dropdown menu for format selection.

**REQ-1.3** The chip height SHALL be approximately 32px.

---

### REQ-2 — Internal Rendering Mode

**REQ-2.1** When `internalMode` property is set, `fv-export-action` SHALL render without `for` attribute handling.

**REQ-2.2** The component SHALL NOT require a target view element when in internal mode.

**REQ-2.3** The component SHALL operate in standalone mode suitable for internal insertion.

---

### REQ-3 — Dropdown Menu

**REQ-3.1** When the chip button is clicked, a dropdown SHALL appear with format options: CSV, JSON, XLSX.

**REQ-3.2** Selecting a format from the dropdown SHALL trigger the export action with the selected format.

**REQ-3.3** The dropdown SHALL close when a format is selected.

---

## Acceptance Scenarios

### Scenario 1 — Chip renders icon + label

```gherkin
Given fv-export-action with internalMode
When component renders
Then a single chip button appears with export icon and "Export" label
```

### Scenario 2 — Click opens format dropdown

```gherkin
Given fv-export-action with internalMode
When user clicks the chip button
Then a dropdown appears with format options (csv, json, xlsx)
And selecting a format triggers export action
```

### Scenario 3 — Internal mode renders independently

```gherkin
Given fv-export-action with internalMode and no for attribute
When component renders
Then it functions without dispatching to a target view
And export dropdown behavior works correctly
```