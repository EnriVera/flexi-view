# Delta for fv-sort-action

## MODIFIED Requirements

### Requirement: fv-sort-action chip style

The `fv-sort-action` component SHALL render as a minimalist chip with icon + label, sharing visual boundary between main button and clear button. The chip SHALL use `display: inline-flex` so both buttons form a unified compact control.

(Previously: not specified — redesign from proposal inline-actions)

**Scenario: Chip renders icon + label in inactive state**

- GIVEN `fv-sort-action` with `field="name"` and `active=false`
- WHEN component renders
- THEN a single chip button appears with sort icon and "Sort" label
- AND no clear button is present in DOM

**Scenario: Chip shows clear button when active**

- GIVEN `fv-sort-action` with `field="name"` and `active=true`
- WHEN component renders
- THEN the chip shows icon + label + clear (×) button
- AND clear button is keyboard-focusable

**Scenario: Main button cycles direction on click**

- GIVEN `fv-sort-action` with `field="name"` `direction="asc"` `active=true`
- WHEN user clicks the main button
- THEN direction toggles to "desc"
- AND sort-change event fires with new direction

---

### Requirement: fv-sort-action supports internal rendering mode

When `internalMode` property is set, `fv-sort-action` SHALL render without `for` attribute handling and SHALL NOT require a target view element. The component SHALL operate in standalone mode suitable for internal insertion.

(Previously: only external standalone mode existed)

**Scenario: Internal mode renders independently**

- GIVEN `fv-sort-action` with `internalMode` and no `for` attribute
- WHEN component renders
- THEN it functions without dispatching to a target view
- AND all sort behavior (activate, cycle, clear) works correctly

---

## ADDED Requirements

### Requirement: fv-sort-action modal shows direction-only labels

The sort modal (multi-sort UI) SHALL display direction buttons with labels "Asc" and "Desc" only — no column name in the label. Active direction button SHALL have distinct visual feedback (highlighted/filled state).

**Scenario: Direction button shows only text**

- GIVEN sort modal is open with a sort entry for field "name"
- WHEN user views the direction control
- THEN buttons show "Asc" and "Desc" (no field name)
- AND active direction button is visually distinct

**Scenario: Active direction has visual feedback**

- GIVEN sort modal has "name" sorted ascending
- WHEN user views the direction buttons
- THEN "Asc" button appears highlighted/active
- AND "Desc" button appears in default state