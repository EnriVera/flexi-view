# Delta for fv-export-action

## ADDED Requirements

### Requirement: fv-export-action chip style

The `fv-export-action` component SHALL render as a minimalist chip with icon + label. The chip SHALL use `display: inline-flex` forming a unified compact control with a dropdown menu for format selection.

**Scenario: Chip renders icon + label**

- GIVEN `fv-export-action` with `internalMode`
- WHEN component renders
- THEN a single chip button appears with export icon and "Export" label

**Scenario: Click opens format dropdown**

- GIVEN `fv-export-action` with `internalMode`
- WHEN user clicks the chip button
- THEN a dropdown appears with format options (csv, json, xlsx)
- AND selecting a format triggers export action

---

### Requirement: fv-export-action supports internal rendering mode

When `internalMode` property is set, `fv-export-action` SHALL render without `for` attribute handling and SHALL NOT require a target view element. The component SHALL operate in standalone mode suitable for internal insertion.

**Scenario: Internal mode renders independently**

- GIVEN `fv-export-action` with `internalMode` and no `for` attribute
- WHEN component renders
- THEN it functions without dispatching to a target view
- AND export dropdown behavior works correctly