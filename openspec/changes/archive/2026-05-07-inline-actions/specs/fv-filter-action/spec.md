# Delta for fv-filter-action

## ADDED Requirements

### Requirement: fv-filter-action chip style

The `fv-filter-action` component SHALL render as a minimalist chip with icon + label, sharing visual boundary between main button and clear button. The chip SHALL use `display: inline-flex` so both buttons form a unified compact control.

**Scenario: Chip renders icon + label in inactive state**

- GIVEN `fv-filter-action` with `field="status"` and `active=false`
- WHEN component renders
- THEN a single chip button appears with filter icon and "Filter" label
- AND no clear button is present in DOM

**Scenario: Chip shows clear button when active**

- GIVEN `fv-filter-action` with `field="status"` and `active=true`
- WHEN component renders
- THEN the chip shows icon + label + clear (×) button
- AND clear button is keyboard-focusable

**Scenario: Click opens filter modal**

- GIVEN `fv-filter-action` with `field="status"` and `active=false`
- WHEN user clicks the main button
- THEN filter-change event fires with { field: "status", value: [] }
- AND active becomes true

---

### Requirement: fv-filter-action supports internal rendering mode

When `internalMode` property is set, `fv-filter-action` SHALL render without `for` attribute handling and SHALL NOT require a target view element. The component SHALL operate in standalone mode suitable for internal insertion.

**Scenario: Internal mode renders independently**

- GIVEN `fv-filter-action` with `internalMode` and no `for` attribute
- WHEN component renders
- THEN it functions without dispatching to a target view
- AND all filter behavior works correctly