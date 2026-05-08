# Spec: fv-filter-action (from change: inline-actions)

**Component**: `fv-filter-action`
**Status**: spec
**Date**: 2026-05-07
**Change**: inline-actions

---

## Delta Requirements

These requirements describe what MUST be true after the change is applied.

---

### REQ-1 — Chip Style

**REQ-1.1** The `fv-filter-action` component SHALL render as a minimalist chip with icon + label.

**REQ-1.2** The chip SHALL use `display: inline-flex` so both main button and clear button form a unified compact control.

**REQ-1.3** The chip SHALL share visual boundary between main button and clear button.

**REQ-1.4** The chip height SHALL be approximately 32px.

---

### REQ-2 — Internal Rendering Mode

**REQ-2.1** When `internalMode` property is set, `fv-filter-action` SHALL render without `for` attribute handling.

**REQ-2.2** The component SHALL NOT require a target view element when in internal mode.

**REQ-2.3** The component SHALL operate in standalone mode suitable for internal insertion.

---

### REQ-3 — State Display

**REQ-3.1** When `active=false`, a single chip button appears with filter icon and "Filter" label.

**REQ-3.2** When `active=false`, no clear button SHALL be present in the DOM.

**REQ-3.3** When `active=true`, the chip shows icon + label + clear (×) button.

**REQ-3.4** The clear button SHALL be keyboard-focusable when present.

---

### REQ-4 — Interaction

**REQ-4.1** When user clicks the main button, a filter-change event fires with { field, value: [] }.

**REQ-4.2** After clicking, active becomes true.

---

## Acceptance Scenarios

### Scenario 1 — Chip renders icon + label in inactive state

```gherkin
Given fv-filter-action with field="status" and active=false
When component renders
Then a single chip button appears with filter icon and "Filter" label
And no clear button is present in DOM
```

### Scenario 2 — Chip shows clear button when active

```gherkin
Given fv-filter-action with field="status" and active=true
When component renders
Then the chip shows icon + label + clear (×) button
And clear button is keyboard-focusable
```

### Scenario 3 — Click opens filter modal

```gherkin
Given fv-filter-action with field="status" and active=false
When user clicks the main button
Then filter-change event fires with { field: "status", value: [] }
And active becomes true
```

### Scenario 4 — Internal mode renders independently

```gherkin
Given fv-filter-action with internalMode and no for attribute
When component renders
Then it functions without dispatching to a target view
And all filter behavior works correctly
```